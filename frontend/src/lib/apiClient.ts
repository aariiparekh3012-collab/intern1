import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { auth } from "./auth";

/** Single configured axios instance. Attaches auth + correlation headers.
 *  Auto-refreshes expired access tokens using the stored refresh token. */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api/v1",
  timeout: 15000,
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((p) => {
    if (error) p.reject(error);
    else p.resolve(token!);
  });
  failedQueue = [];
}

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = auth.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers["X-Correlation-ID"] = crypto.randomUUID();
  return config;
});

apiClient.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If 401 and we have a refresh token, try to refresh
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      auth.hasRefreshToken()
    ) {
      if (isRefreshing) {
        // Queue this request while another refresh is in progress
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(apiClient(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = auth.getRefreshToken()!;
        const { data } = await axios.post(`${import.meta.env.VITE_API_URL || "/api/v1"}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const user = auth.getUser();
        if (user) {
          auth.setTokens(
            data.access_token,
            data.refresh_token,
            data.expires_in,
            user
          );
        }

        processQueue(null, data.access_token);
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        auth.clear();
        if (location.pathname !== "/login") location.assign("/login");
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // No refresh token or non-401 error
    if (error.response?.status === 401) {
      auth.clear();
      if (location.pathname !== "/login") location.assign("/login");
    }

    const apiError = (error.response?.data as Record<string, unknown>)?.error as
      | { message?: string }
      | undefined;
    return Promise.reject(
      new Error(apiError?.message ?? error.message ?? "Request failed")
    );
  }
);
