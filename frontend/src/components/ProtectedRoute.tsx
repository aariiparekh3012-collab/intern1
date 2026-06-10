import { Navigate, Outlet, useLocation } from "react-router-dom";
import { auth, canAccess, homeFor } from "../lib/auth";

/**
 * Gate routes behind a token, then enforce role-based access. Unauthenticated
 * users go to /login; authenticated users hitting a page their role can't access
 * are redirected to their role's home (investor -> /onboarding, rm -> /applications).
 */
export function ProtectedRoute() {
  const location = useLocation();

  if (!auth.isAuthenticated()) return <Navigate to="/login" replace />;

  const role = auth.getUser()?.role;
  if (!canAccess(role, location.pathname)) {
    return <Navigate to={homeFor(role)} replace />;
  }

  return <Outlet />;
}
