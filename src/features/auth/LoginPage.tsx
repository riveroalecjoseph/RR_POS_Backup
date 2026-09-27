import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import {
  Store,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  X,
  Loader2,
} from "lucide-react";

interface LoginPageProps {
  onLoginSuccess?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const {
    login,
    logout,
    resetPasswordForEmail,
    updateUserPassword,
    isRecoveryMode,
    setIsRecoveryMode,
  } = useApp();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Forgot password modal state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState<boolean>(false);
  const [forgotEmail, setForgotEmail] = useState<string>("");
  const [forgotLoading, setForgotLoading] = useState<boolean>(false);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);

  // Recovery / Reset password state
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [resetLoading, setResetLoading] = useState<boolean>(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    setIsLoading(true);
    const result = await login(cleanEmail, password);
    setIsLoading(false);

    if (result.success) {
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } else {
      setErrorMessage(result.error || "Invalid credentials. Please verify your email and password.");
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);

    const clean = forgotEmail.trim();
    if (!clean) {
      setForgotError("Please enter your email address.");
      return;
    }

    setForgotLoading(true);
    const result = await resetPasswordForEmail(clean);
    setForgotLoading(false);

    if (result.success) {
      setForgotSuccess(
        "A password reset link has been dispatched to your email address. Please inspect your inbox.",
      );
    } else {
      setForgotError(result.error || "Failed to send reset link. Please try again.");
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetSuccess(null);

    if (!newPassword || newPassword.length < 6) {
      setResetError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError("Passwords do not match.");
      return;
    }

    setResetLoading(true);
    const result = await updateUserPassword(newPassword);
    setResetLoading(false);

    if (result.success) {
      setResetSuccess("Password successfully updated! Logging you in...");
      window.history.replaceState(null, "", window.location.pathname);
      setTimeout(() => {
        setIsRecoveryMode(false);
        if (onLoginSuccess) onLoginSuccess();
      }, 1000);
    } else {
      setResetError(result.error || "Failed to update password.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 shadow-xl shadow-emerald-950/60 mb-3">
            <Store className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            RR Multi-Branch POS
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Enterprise Multi-Branch Point of Sale &amp; Inventory System
          </p>
        </div>

        {/* Card Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/50">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-100">
              Staff Portal Sign In
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Sign in with your registered email and password to access the system
            </p>
          </div>

          {/* Standard Email & Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Staff Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  id="login-email-input"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Password
                </label>
                <button
                  type="button"
                  id="forgot-password-link"
                  onClick={() => {
                    setForgotEmail(email);
                    setForgotSuccess(null);
                    setForgotError(null);
                    setIsForgotModalOpen(true);
                  }}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  id="login-password-input"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              id="login-submit-btn"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Terminal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Multi-Tenant Auth &amp; PostgreSQL RLS Protected</span>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative text-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setIsForgotModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800/80 transition"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 text-emerald-400 mb-2">
              <KeyRound className="w-6 h-6" />
              <h2 className="text-lg font-bold">Reset Password</h2>
            </div>
            <p className="text-xs text-slate-400 mb-5">
              Enter your registered staff email address. We will dispatch an
              official Supabase link allowing you to securely set a new password.
            </p>

            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Staff Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    id="forgot-email-input"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {forgotSuccess ? (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{forgotSuccess}</span>
                </div>
              ) : forgotError ? (
                <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                  <div className="flex items-center gap-2 font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{forgotError}</span>
                  </div>
                  {forgotError.toLowerCase().includes("rate limit") && (
                    <div className="mt-1 pt-1.5 border-t border-red-500/20 text-[11px] text-slate-300 leading-relaxed">
                      <p className="font-semibold text-amber-300 mb-0.5">Why this happens &amp; instant fix:</p>
                      <p>
                        Supabase's default shared email service caps resets at 3-4 emails/hr. If you are currently logged in, use the Key (<span className="text-emerald-400 font-bold">🔑</span>) in the top navbar to set your password with no emails needed. Or update it immediately in <span className="text-slate-100 font-semibold">Supabase Dashboard &gt; Authentication &gt; Users &gt; Change password</span>.
                      </p>
                    </div>
                  )}
                </div>
              ) : null}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Close
                </button>
                <button
                  type="submit"
                  id="send-reset-btn"
                  disabled={forgotLoading}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {forgotLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <span>Send Reset Link</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Set New Password Landing Modal (When opening recovery email or invite link) */}
      {isRecoveryMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative text-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2.5 text-emerald-400 mb-2">
              <KeyRound className="w-6 h-6" />
              <h2 className="text-lg font-bold">
                {typeof window !== "undefined" && window.location.hash.includes("type=invite")
                  ? "Set Your Account Password"
                  : "Configure New Password"}
              </h2>
            </div>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              {typeof window !== "undefined" && window.location.hash.includes("type=invite")
                ? "Create a secure password for your new workstation account to complete setup."
                : "Enter your new confidential password to restore access to your workstation."}
            </p>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  id="recovery-new-password-input"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="recovery-confirm-password-input"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              {resetSuccess ? (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{resetSuccess}</span>
                </div>
              ) : resetError ? (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{resetError}</span>
                </div>
              ) : null}

              <div className="pt-2">
                <button
                  type="submit"
                  id="save-recovery-password-btn"
                  disabled={resetLoading}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {resetLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Password...</span>
                    </>
                  ) : (
                    <span>Save &amp; Enter Terminal</span>
                  )}
                </button>
              </div>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={async () => {
                    await logout();
                    setIsRecoveryMode(false);
                    window.history.replaceState(null, "", window.location.pathname);
                  }}
                  className="text-xs text-slate-400 hover:text-slate-200 transition underline cursor-pointer"
                >
                  Cancel &amp; Return to Sign In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
