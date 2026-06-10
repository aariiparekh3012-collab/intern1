import type React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, homeFor } from "../../lib/auth";
import { authApi } from "./api";
import { Button, Card, Field, SelectField, useToast } from "../../components/ui";

type View = "login" | "register" | "forgot";

export function LoginPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [view, setView] = useState<View>("login");

  // Login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Register state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [regRole, setRegRole] = useState("investor");

  // Forgot state
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await authApi.login({ email, password });
      auth.setTokens(data.access_token, data.refresh_token, data.expires_in, {
        subject: email,
        role: "", // will be filled from /me
        email,
      });
      // Fetch user profile to get role
      const me = await authApi.me();
      auth.updateUser({
        role: me.role,
        id: me.id,
        full_name: me.full_name,
        email_verified: me.email_verified,
      });
      navigate(homeFor(me.role));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regPassword !== regConfirm) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const data = await authApi.register({
        email: regEmail,
        password: regPassword,
        full_name: regName,
        role: regRole,
      });
      auth.setTokens(data.access_token, data.refresh_token, data.expires_in, {
        subject: regEmail,
        role: regRole,
        email: regEmail,
        full_name: regName,
      });
      navigate(homeFor(regRole));
      toast.success("Account created! Check your email to verify.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword(forgotEmail);
      setForgotSent(true);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="center" style={{ marginBottom: 28 }}>
          <div
            className="brand__mark"
            style={{
              margin: "0 auto 16px",
              width: 60,
              height: 60,
              fontSize: "1.8rem",
              boxShadow: "0 12px 40px -6px rgba(212,175,55,0.35)",
            }}
          >
            P
          </div>
          <h1 style={{ fontSize: "2.2rem", letterSpacing: "-0.02em" }}>Aurum PMS</h1>
          <p className="muted" style={{ marginTop: 6 }}>
            Discretionary Portfolio Management Service
          </p>
          <div
            style={{
              width: 48,
              height: 2,
              background: "linear-gradient(90deg, transparent, var(--gold), transparent)",
              margin: "16px auto 0",
              borderRadius: 2,
            }}
          />
        </div>

        <Card glass>
          {/* ── LOGIN ── */}
          {view === "login" && (
            <>
              <h2 style={{ marginBottom: 20 }}>Sign in</h2>
              <form onSubmit={handleLogin}>
                <Field
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
                <Field
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <div style={{ marginTop: 8 }}>
                  <Button variant="primary" block loading={loading} type="submit">
                    Sign In
                  </Button>
                </div>
              </form>
              <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", fontSize: ".82rem" }}>
                <button
                  className="btn--link"
                  style={{ background: "none", border: "none", color: "var(--gold-2)", cursor: "pointer", padding: 0, font: "inherit" }}
                  onClick={() => setView("forgot")}
                >
                  Forgot password?
                </button>
                <button
                  className="btn--link"
                  style={{ background: "none", border: "none", color: "var(--gold-2)", cursor: "pointer", padding: 0, font: "inherit" }}
                  onClick={() => setView("register")}
                >
                  Create account
                </button>
              </div>
            </>
          )}

          {/* ── REGISTER ── */}
          {view === "register" && (
            <>
              <h2 style={{ marginBottom: 20 }}>Create account</h2>
              <form onSubmit={handleRegister}>
                <Field
                  label="Full Name"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Your full name"
                />
                <Field
                  label="Email"
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="you@example.com"
                />
                <SelectField label="Role" value={regRole} onChange={(e) => setRegRole(e.target.value)}>
                  <option value="investor">Investor</option>
                  <option value="rm">Relationship Manager</option>
                  <option value="compliance">Compliance Officer</option>
                </SelectField>
                <Field
                  label="Password"
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Min 8 characters"
                />
                <Field
                  label="Confirm Password"
                  type="password"
                  value={regConfirm}
                  onChange={(e) => setRegConfirm(e.target.value)}
                  placeholder="Re-enter password"
                />
                <div style={{ marginTop: 8 }}>
                  <Button variant="primary" block loading={loading} type="submit">
                    Create Account
                  </Button>
                </div>
              </form>
              <div className="center" style={{ marginTop: 16, fontSize: ".82rem" }}>
                <button
                  style={{ background: "none", border: "none", color: "var(--gold-2)", cursor: "pointer", padding: 0, font: "inherit" }}
                  onClick={() => setView("login")}
                >
                  Already have an account? Sign in
                </button>
              </div>
            </>
          )}

          {/* ── FORGOT PASSWORD ── */}
          {view === "forgot" && (
            <>
              <h2 style={{ marginBottom: 20 }}>Reset password</h2>
              {forgotSent ? (
                <div>
                  <div className="success-check">✓</div>
                  <p className="center muted" style={{ marginBottom: 16 }}>
                    If an account exists with that email, we&rsquo;ve sent a reset link.
                  </p>
                  <Button variant="ghost" block onClick={() => { setView("login"); setForgotSent(false); }}>
                    Back to sign in
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleForgot}>
                  <p className="muted" style={{ marginBottom: 16, fontSize: ".88rem" }}>
                    Enter your email and we&rsquo;ll send a password reset link.
                  </p>
                  <Field
                    label="Email"
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                  <div style={{ marginTop: 8 }}>
                    <Button variant="primary" block loading={loading} type="submit">
                      Send Reset Link
                    </Button>
                  </div>
                  <div className="center" style={{ marginTop: 16, fontSize: ".82rem" }}>
                    <button
                      style={{ background: "none", border: "none", color: "var(--gold-2)", cursor: "pointer", padding: 0, font: "inherit" }}
                      onClick={() => setView("login")}
                    >
                      Back to sign in
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

          <p className="faint center" style={{ fontSize: ".74rem", marginTop: 18, marginBottom: 0 }}>
            SEBI-registered PMS · Secure authentication
          </p>
        </Card>
      </div>
    </div>
  );
}
