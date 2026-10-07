import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { toast } from 'sonner';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  KeyRound,
  Check,
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Screen flow: login -> forgot-email -> forgot-reset -> forgot-success
  const [currentScreen, setCurrentScreen] = useState<'login' | 'forgot-email' | 'forgot-reset' | 'forgot-success'>('login');
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSendingForgot, setIsSendingForgot] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const resetToLogin = () => {
    setCurrentScreen('login');
    setForgotEmail('');
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPassword(false);
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMsg('Please enter your email address');
      return;
    }

    if (!password) {
      setErrorMsg('Please enter your password');
      return;
    }

    setSubmitting(true);
    try {
      const success = await login(trimmedEmail, password);
      if (success) {
        navigate('/', { replace: true });
      } else {
        setErrorMsg('Invalid email or password. Please verify and try again.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Authentication failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendForgotPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!forgotEmail.trim()) {
      toast.error('Please enter your registered email address.');
      return;
    }
    setIsSendingForgot(true);
    try {
      const res = await api.forgotPassword(forgotEmail.trim());
      toast.success(res.message || 'If the account is eligible, a reset email will be sent.');
      setCurrentScreen('forgot-reset');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send password reset request.');
    } finally {
      setIsSendingForgot(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken.trim()) {
      toast.error('Please enter the 64-character reset token received in your email.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    setIsResetting(true);
    try {
      await api.resetPassword(resetToken.trim(), newPassword);
      setCurrentScreen('forgot-success');
      toast.success('Password has been reset successfully!');
      setTimeout(() => {
        resetToLogin();
      }, 2500);
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset password. Please verify your token.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#120422] relative flex items-center justify-center overflow-x-hidden overflow-y-auto select-none font-sans p-4 sm:p-6 lg:p-10">
      {/* BACKGROUND SPLIT LAYER: Left and Right backgrounds */}
      <div className="fixed inset-0 w-full h-full flex flex-col lg:flex-row pointer-events-none z-0">
        {/* LEFT SIDE BACKGROUND: 3D CRM Illustration */}
        <div className="relative w-full lg:w-1/2 h-1/2 lg:h-full overflow-hidden bg-[#1B0A33]">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url('/crm_illustration.jpg')`,
            }}
          />
          {/* Violet Gradient Overlay on left */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#120422] via-[#2A0845]/40 to-transparent lg:bg-gradient-to-r lg:from-[#1B0A33]/20 lg:via-[#2A0845]/40 lg:to-[#120422]/90" />
          <div className="absolute inset-0 bg-[#3B0764]/20 mix-blend-overlay" />
          
          {/* Top Logo on Left */}
          <div className="absolute top-6 left-6 sm:top-10 sm:left-10 z-10">
            <div className="inline-flex items-center gap-3 p-2.5 px-4 bg-white/95 rounded-2xl shadow-2xl shadow-purple-950/60 border border-purple-300/30">
              <img
                src="/yaa-creations-logo.png"
                alt="Yaa Creations Logo"
                className="h-9 sm:h-10 w-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          </div>

          {/* Bottom Left Highlights */}
          <div className="hidden lg:block absolute bottom-12 left-10 max-w-md z-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#2A0845]/85 backdrop-blur-md border border-[#A855F7]/40 text-xs font-semibold text-purple-200">
              <span className="w-2 h-2 rounded-full bg-[#A855F7] animate-ping" />
              Next-Gen Enterprise CRM
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight leading-tight drop-shadow-md">
              Seamless Operations & Growth
            </h2>
          </div>
        </div>

        {/* RIGHT SIDE BACKGROUND: Laptop CRM & #4309A2 shade */}
        <div className="relative w-full lg:w-1/2 h-1/2 lg:h-full overflow-hidden bg-[#120422]">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url('/crm_laptop_bg.jpg')`,
            }}
          />
          {/* #4309A2 Color Shade Tint & Ambient Glass Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#120422] via-[#4309A2]/75 to-[#120422]/85 lg:bg-gradient-to-r lg:from-[#120422]/90 lg:via-[#4309A2]/70 lg:to-[#2B085A]/85 backdrop-blur-[2px]" />
          <div className="absolute top-1/4 right-1/4 w-[350px] h-[350px] rounded-full bg-[#4309A2]/40 blur-[120px]" />
          <div className="absolute bottom-10 left-10 w-[300px] h-[300px] rounded-full bg-[#33077C]/50 blur-[100px]" />
        </div>
      </div>

      {/* FOREGROUND LAYER: Login Card Placed Dead-Center */}
      <div className="relative z-20 w-full max-w-[460px] my-auto py-6">
        <div className="bg-[#18052E]/90 backdrop-blur-2xl border border-[#A78BFA]/40 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/90 text-white ring-1 ring-white/20">
          
          {/* SCREEN 1: LOGIN */}
          {currentScreen === 'login' && (
            <div className="animate-in fade-in duration-200">
              <div className="mb-6 flex items-center justify-between pb-4 border-b border-purple-500/20">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[#C084FC]" />
                    Account Sign In
                  </h2>
                  <p className="text-xs text-purple-200/70 mt-0.5">
                    Sign in with your enterprise credentials
                  </p>
                </div>
                <div className="px-2.5 py-1 rounded-full bg-purple-900/60 border border-purple-500/40 text-[11px] font-semibold text-purple-200 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Secure
                </div>
              </div>

              {/* Error Banner */}
              {errorMsg && (
                <div className="mb-5 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in zoom-in-95 duration-150">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">{errorMsg}</div>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. admin@yaa.com"
                      autoComplete="email"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-white/[0.05] border border-white/[0.14] rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-[#4309A2] focus:ring-2 focus:ring-[#4309A2]/20 transition-all font-medium"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-300">
                      Password
                    </label>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      required
                      className="w-full pl-10 pr-10 py-2.5 bg-white/[0.05] border border-white/[0.14] rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-[#4309A2] focus:ring-2 focus:ring-[#4309A2]/20 transition-all font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-white/20 bg-white/10 text-[#4309A2] focus:ring-[#4309A2] focus:ring-offset-0 cursor-pointer"
                    />
                    <span className="text-xs text-slate-300 font-medium">Keep me signed in</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setCurrentScreen('forgot-email');
                    }}
                    className="text-xs font-semibold text-[#D8B4FE] hover:text-white hover:underline transition-colors cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting || isLoading}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#2B3991] via-[#33077C] to-[#4309A2] hover:opacity-95 active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-[#33077C]/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting || isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Signing In...</span>
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        <span>Sign In to Dashboard</span>
                        <ArrowRight className="w-4 h-4 ml-0.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SCREEN 2: FORGOT PASSWORD - ENTER EMAIL */}
          {currentScreen === 'forgot-email' && (
            <div className="animate-in fade-in duration-200">
              <div className="mb-6 pb-4 border-b border-purple-500/20">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#33077C] to-[#4309A2] border border-purple-400/40 flex items-center justify-center text-[#D8B4FE] mb-3 shadow-lg shadow-[#33077C]/40">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">Forgot Password</h2>
                <p className="text-xs text-purple-200/70 mt-1">
                  Enter your registered email address to receive a secure password reset link.
                </p>
              </div>

              <form onSubmit={handleSendForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Registered Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="e.g. admin@yaa.com"
                      className="w-full pl-10 pr-4 py-3 bg-white/[0.05] border border-white/[0.14] rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-[#4309A2] focus:ring-2 focus:ring-[#4309A2]/20 transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-3">
                  <button
                    type="button"
                    onClick={resetToLogin}
                    className="w-1/3 py-3 px-4 rounded-xl border border-white/20 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer text-center"
                  >
                    Back to Sign In
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingForgot}
                    className="w-2/3 py-3 px-4 rounded-xl bg-gradient-to-r from-[#2B3991] via-[#33077C] to-[#4309A2] hover:opacity-95 text-white text-xs font-bold shadow-lg shadow-[#33077C]/40 transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSendingForgot ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Sending Request...</span>
                      </>
                    ) : (
                      <>
                        <span>Send Reset Link</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SCREEN 3: FORGOT PASSWORD - CREATE NEW PASSWORD WITH 64-CHAR TOKEN */}
          {currentScreen === 'forgot-reset' && (
            <div className="animate-in fade-in duration-200">
              <div className="mb-6 pb-4 border-b border-purple-500/20">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 border border-emerald-400/40 flex items-center justify-center text-emerald-100 mb-3 shadow-lg shadow-emerald-900/40">
                  <Lock className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">Create New Password</h2>
                <p className="text-xs text-purple-200/70 mt-1">
                  Enter the 64-character reset token from your email and your new password.
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Reset Token (64 Hex Characters)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      placeholder="e.g. e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                      className="w-full pl-10 pr-4 py-2.5 bg-white/[0.05] border border-white/[0.14] rounded-xl text-white text-xs font-mono placeholder:text-slate-500 focus:outline-none focus:border-[#4309A2] focus:ring-2 focus:ring-[#4309A2]/20 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full pl-10 pr-10 py-2.5 bg-white/[0.05] border border-white/[0.14] rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-[#4309A2] focus:ring-2 focus:ring-[#4309A2]/20 transition-all font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full pl-10 pr-4 py-2.5 bg-white/[0.05] border border-white/[0.14] rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-[#4309A2] focus:ring-2 focus:ring-[#4309A2]/20 transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-3">
                  <button
                    type="button"
                    onClick={resetToLogin}
                    className="w-1/3 py-3 px-4 rounded-xl border border-white/20 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isResetting}
                    className="w-2/3 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white text-xs font-bold shadow-lg shadow-emerald-700/40 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isResetting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Update Password</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SCREEN 4: FORGOT PASSWORD - SUCCESS SCREEN */}
          {currentScreen === 'forgot-success' && (
            <div className="py-8 text-center space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Password Updated!</h2>
                <p className="text-xs text-purple-200/70 mt-1 max-w-xs mx-auto">
                  Your password has been successfully reset. Redirecting back to sign in...
                </p>
              </div>
              <button
                type="button"
                onClick={resetToLogin}
                className="mt-4 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#2B3991] to-[#4309A2] text-xs font-bold text-white shadow-md cursor-pointer hover:opacity-95"
              >
                Go to Sign In Now
              </button>
            </div>
          )}

          {/* Footer info */}
          <div className="mt-6 text-center text-xs text-slate-500 font-medium">
            &copy; {new Date().getFullYear()} Yaa Creations. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
};

