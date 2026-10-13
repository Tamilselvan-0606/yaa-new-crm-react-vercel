import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { toast } from 'sonner';
import { FormError } from '../../components/common/FormError';
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
  Clock,
  RotateCw,
  ArrowLeft,
  Grid,
} from 'lucide-react';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,15}$/;

const LoginValidationSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Please enter your mobile number or email address')
    .refine(
      (val) => emailRegex.test(val) || phoneRegex.test(val.replace(/[\s-]/g, '')),
      {
        message: 'Please enter a valid mobile number or email address',
      }
    ),
  password: z.string().min(1, 'Please enter your password'),
  rememberMe: z.boolean().optional(),
});
type LoginFields = z.infer<typeof LoginValidationSchema>;

const ForgotEmailValidationSchema = z.object({
  forgotEmail: z.string().trim().min(1, 'Please enter your registered email address').email('Please enter a valid email address'),
});
type ForgotEmailFields = z.infer<typeof ForgotEmailValidationSchema>;

const SetNewPasswordValidationSchema = z.object({
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});
type SetNewPasswordFields = z.infer<typeof SetNewPasswordValidationSchema>;

type Screen = 'login' | 'forgot-email' | 'forgot-otp' | 'forgot-password' | 'forgot-success';

export const LoginView: React.FC = () => {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Screen flow: login -> forgot-email -> forgot-otp -> forgot-password -> forgot-success
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');

  // Forgot password & OTP state
  const [submittedEmail, setSubmittedEmail] = useState<string>('');
  const [otpValues, setOtpValues] = useState<string[]>(['', '', '', '', '', '']);
  const [otpTimer, setOtpTimer] = useState<number>(60);
  const [canResendOtp, setCanResendOtp] = useState<boolean>(false);
  const [isResendingOtp, setIsResendingOtp] = useState<boolean>(false);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // OTP Countdown Timer
  useEffect(() => {
    if (currentScreen !== 'forgot-otp') return;
    if (otpTimer <= 0) {
      setCanResendOtp(true);
      return;
    }
    const timer = setTimeout(() => {
      setOtpTimer((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [currentScreen, otpTimer]);

  // Focus the first OTP box upon opening the OTP screen
  useEffect(() => {
    if (currentScreen === 'forgot-otp') {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    }
  }, [currentScreen]);

  // React Hook Form for Login
  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors, isSubmitting: isLoginSubmitting },
    getValues: getLoginValues,
  } = useForm<LoginFields>({
    resolver: zodResolver(LoginValidationSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
    mode: 'onSubmit',
  });

  // React Hook Form for Forgot Email
  const {
    register: registerForgot,
    handleSubmit: handleForgotSubmit,
    setValue: setForgotValue,
    formState: { errors: forgotErrors, isSubmitting: isSendingForgot },
  } = useForm<ForgotEmailFields>({
    resolver: zodResolver(ForgotEmailValidationSchema),
    defaultValues: {
      forgotEmail: '',
    },
    mode: 'onSubmit',
  });

  // React Hook Form for Set New Password
  const {
    register: registerReset,
    handleSubmit: handleResetSubmit,
    reset: resetResetForm,
    formState: { errors: resetErrors, isSubmitting: isResetting },
  } = useForm<SetNewPasswordFields>({
    resolver: zodResolver(SetNewPasswordValidationSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
    mode: 'onSubmit',
  });

  const resetToLogin = () => {
    setCurrentScreen('login');
    setShowPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setErrorMsg(null);
    setOtpValues(['', '', '', '', '', '']);
    setOtpTimer(60);
    setCanResendOtp(false);
    resetResetForm();
  };

  const onLoginSubmit = async (data: LoginFields) => {
    setErrorMsg(null);
    try {
      const success = await login(data.email, data.password);
      if (success) {
        if (typeof window !== 'undefined' && 'PasswordCredential' in window && navigator.credentials) {
          try {
            const cred = new (window as any).PasswordCredential({
              id: data.email,
              password: data.password,
              name: data.email,
            });
            await navigator.credentials.store(cred);
          } catch {
            // Context insecure or user denied, safe to ignore
          }
        }
        navigate('/', { replace: true });
      } else {
        setErrorMsg('Invalid email or password. Please verify and try again.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Authentication failed. Please try again.');
    }
  };

  const onForgotSubmit = async (data: ForgotEmailFields) => {
    try {
      const res = await api.forgotPassword(data.forgotEmail);
      setSubmittedEmail(data.forgotEmail);
      setOtpValues(['', '', '', '', '', '']);
      setOtpTimer(60);
      setCanResendOtp(false);
      toast.success(res.message || 'A 6-digit verification code has been sent to your email.');
      setCurrentScreen('forgot-otp');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send password reset request.');
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    const cleanVal = val.replace(/\D/g, '');
    if (!cleanVal) {
      const newOtp = [...otpValues];
      newOtp[index] = '';
      setOtpValues(newOtp);
      return;
    }

    if (cleanVal.length > 1) {
      const digits = cleanVal.slice(0, 6).split('');
      const newOtp = [...otpValues];
      digits.forEach((digit, dIdx) => {
        if (index + dIdx < 6) {
          newOtp[index + dIdx] = digit;
        }
      });
      setOtpValues(newOtp);
      const nextIdx = Math.min(index + digits.length, 5);
      otpInputRefs.current[nextIdx]?.focus();
      return;
    }

    const newOtp = [...otpValues];
    newOtp[index] = cleanVal;
    setOtpValues(newOtp);

    if (index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otpValues[index] && index > 0) {
        e.preventDefault();
        const newOtp = [...otpValues];
        newOtp[index - 1] = '';
        setOtpValues(newOtp);
        otpInputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      e.preventDefault();
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasteData) return;
    const digits = pasteData.split('');
    const newOtp = [...otpValues];
    digits.forEach((digit, dIdx) => {
      if (dIdx < 6) {
        newOtp[dIdx] = digit;
      }
    });
    setOtpValues(newOtp);
    const nextIdx = Math.min(digits.length, 5);
    otpInputRefs.current[nextIdx]?.focus();
  };

  const handleResendOtp = async () => {
    if (!submittedEmail || isResendingOtp || !canResendOtp) return;
    setIsResendingOtp(true);
    try {
      await api.forgotPassword(submittedEmail);
      toast.success('A new 6-digit verification code has been sent to your email.');
      setOtpValues(['', '', '', '', '', '']);
      setOtpTimer(60);
      setCanResendOtp(false);
      otpInputRefs.current[0]?.focus();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setIsResendingOtp(false);
    }
  };

  const onVerifyOtpSubmit = () => {
    const fullOtp = otpValues.join('');
    if (fullOtp.length !== 6) {
      toast.error('Please enter the complete 6-digit verification code.');
      return;
    }
    setCurrentScreen('forgot-password');
  };

  const onResetSubmit = async (data: SetNewPasswordFields) => {
    try {
      const fullOtp = otpValues.join('');
      await api.resetPassword(fullOtp, data.newPassword);
      setCurrentScreen('forgot-success');
      toast.success('Password has been reset successfully!');
      setTimeout(() => {
        resetToLogin();
      }, 2500);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to reset password. Please check your OTP and try again.');
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
        <div className="bg-[#ffffff] border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-purple-950/25 text-slate-900 ring-1 ring-slate-900/5">

          {/* SCREEN 1: LOGIN */}
          {currentScreen === 'login' && (
            <div className="animate-in fade-in duration-200">
              {/* Header */}
              <div className="mb-6 text-center">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-[#33077C] flex items-center justify-center text-white mb-3 shadow-md shadow-[#33077C]/25">
                  <Lock className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-extrabold text-[#0B1536] tracking-tight">
                  Account Sign In
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Sign in with your enterprise credentials
                </p>
              </div>

              {/* Error Banner */}
              {errorMsg && (
                <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in zoom-in-95 duration-150">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">{errorMsg}</div>
                </div>
              )}

              {/* Form */}
              <form noValidate onSubmit={handleLoginSubmit(onLoginSubmit)} className="space-y-4">
                {/* Mobile / Email Input */}
                <div>
                  <label htmlFor="email" className="block text-xs font-bold text-slate-700 mb-1.5">
                    Mobile Number / Email Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="email"
                      type="text"
                      {...registerLogin('email')}
                      placeholder="user@login.com"
                      autoComplete="username"
                      className={`w-full pl-10 pr-4 py-3 bg-[#33077C]/[0.06] hover:bg-[#33077C]/[0.09] border rounded-xl text-slate-900 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:bg-white transition-all ${
                        loginErrors.email ? 'border-rose-400 focus:ring-rose-500/20' : 'border-[#33077C]/20 focus:border-[#33077C] focus:ring-[#33077C]/20'
                      }`}
                    />
                  </div>
                  <FormError message={loginErrors.email?.message} />
                </div>

                {/* Password Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="password" className="block text-xs font-bold text-slate-700">
                      Password <span className="text-rose-500">*</span>
                    </label>
                  </div>
                  <div className="relative flex items-center">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      {...registerLogin('password')}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      className={`w-full pl-10 pr-10 py-3 bg-[#33077C]/[0.06] hover:bg-[#33077C]/[0.09] border rounded-xl text-slate-900 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:bg-white transition-all ${
                        loginErrors.password ? 'border-rose-400 focus:ring-rose-500/20' : 'border-[#33077C]/20 focus:border-[#33077C] focus:ring-[#33077C]/20'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <FormError message={loginErrors.password?.message} />
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      id="rememberMe"
                      type="checkbox"
                      {...registerLogin('rememberMe')}
                      className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C] focus:ring-offset-0 cursor-pointer"
                    />
                    <span className="text-xs text-slate-600 font-medium">Remember me</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setForgotValue('forgotEmail', getLoginValues('email') || '');
                      setCurrentScreen('forgot-email');
                    }}
                    className="text-xs font-semibold text-[#33077C] hover:text-[#25045B] hover:underline transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoginSubmitting || isLoading}
                    className="w-full py-3.5 px-4 rounded-xl bg-[#33077C] hover:bg-[#280564] active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-[#33077C]/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoginSubmitting || isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Signing In...</span>
                      </>
                    ) : (
                      <span>Sign In to Dashboard</span>
                    )}
                  </button>
                </div>

                {/* Trust / Encryption Badge */}
                <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-500">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#33077C]" />
                  <span>Secured with enterprise-grade encryption</span>
                </div>
              </form>
            </div>
          )}

          {/* SCREEN 2: FORGOT PASSWORD - ENTER EMAIL */}
          {currentScreen === 'forgot-email' && (
            <div className="animate-in fade-in duration-200">
              <div className="mb-6 pb-4 border-b border-slate-100 text-center">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-[#33077C] flex items-center justify-center text-white mb-3 shadow-md shadow-[#33077C]/25">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Forgot Password</h2>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Enter your registered email address to receive a secure password reset link.
                </p>
              </div>

              <form noValidate onSubmit={handleForgotSubmit(onForgotSubmit)} className="space-y-4">
                <div>
                  <label htmlFor="forgotEmail" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Registered Email Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="forgotEmail"
                      type="email"
                      {...registerForgot('forgotEmail')}
                      placeholder="e.g. admin@yaa.com"
                      className={`w-full pl-10 pr-4 py-3 bg-slate-50/80 border rounded-xl text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:bg-white transition-all font-medium ${
                        forgotErrors.forgotEmail ? 'border-rose-400 focus:ring-rose-500/20' : 'border-slate-200 focus:border-[#4309A2] focus:ring-[#4309A2]/20'
                      }`}
                    />
                  </div>
                  <FormError message={forgotErrors.forgotEmail?.message} />
                </div>

                <div className="space-y-4 pt-3">
                  <button
                    type="submit"
                    disabled={isSendingForgot}
                    className="w-full py-3.5 px-4 rounded-xl bg-[#33077C] hover:bg-[#280564] active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-[#33077C]/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={resetToLogin}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4 text-slate-500" />
                      <span>Back to Sign In</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* SCREEN 3: FORGOT PASSWORD - 6-DIGIT OTP VERIFICATION WITH TIMER */}
          {currentScreen === 'forgot-otp' && (
            <div className="animate-in fade-in duration-200">
              <div className="mb-6 pb-4 border-b border-slate-100 text-center">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-[#33077C] flex items-center justify-center text-white mb-3 shadow-md shadow-[#33077C]/25">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Enter Verification Code</h2>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  We sent a 6-digit verification code to{' '}
                  <span className="font-semibold text-[#4309A2]">{submittedEmail || 'your email'}</span>.
                </p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-3 text-center">
                    6-Digit Verification Code <span className="text-rose-500">*</span>
                  </label>

                  {/* 6 Individual Digit Input Boxes */}
                  <div className="flex items-center justify-center gap-2 sm:gap-3">
                    {otpValues.map((val, idx) => (
                      <input
                        key={idx}
                        ref={(el) => {
                          otpInputRefs.current[idx] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={val}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        onPaste={handleOtpPaste}
                        className={`w-11 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold rounded-xl bg-slate-50/80 border transition-all outline-none select-text ${
                          val
                            ? 'border-[#4309A2] text-slate-900 shadow-md shadow-purple-900/15 ring-2 ring-[#4309A2]/30 bg-purple-50/50'
                            : 'border-slate-200 text-slate-800 hover:border-slate-300 focus:border-[#4309A2] focus:ring-2 focus:ring-[#4309A2]/20'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Countdown Timer and Resend Link */}
                <div className="flex items-center justify-center text-xs pt-1">
                  {canResendOtp ? (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={isResendingOtp}
                      className="inline-flex items-center gap-1.5 font-bold text-[#33077C] hover:text-[#25045B] transition-all cursor-pointer"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${isResendingOtp ? 'animate-spin' : ''}`} />
                      <span>{isResendingOtp ? 'Resending...' : 'Resend Code'}</span>
                    </button>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 font-bold text-[#2B3991]">
                      <span>Resend in {formatTimer(otpTimer)}</span>
                      <RotateCw className="w-3.5 h-3.5 text-[#2B3991] animate-spin" />
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="space-y-4 pt-3">
                  <button
                    type="button"
                    onClick={onVerifyOtpSubmit}
                    disabled={otpValues.join('').length !== 6}
                    className="w-full py-3.5 px-4 rounded-xl bg-[#33077C] hover:bg-[#280564] active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-[#33077C]/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>Verify OTP</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => setCurrentScreen('forgot-email')}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4 text-slate-500" />
                      <span>Back</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SCREEN 4: FORGOT PASSWORD - CREATE NEW PASSWORD (TWO FIELDS ONLY) */}
          {currentScreen === 'forgot-password' && (
            <div className="animate-in fade-in duration-200">
              <div className="mb-6 pb-4 border-b border-slate-100 text-center">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-[#33077C] flex items-center justify-center text-white mb-3 shadow-md shadow-[#33077C]/25">
                  <Lock className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Set New Password</h2>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Enter and confirm your new account password.
                </p>
              </div>

              <form noValidate onSubmit={handleResetSubmit(onResetSubmit)} className="space-y-4">
                {/* Field 1: New Password */}
                <div>
                  <label htmlFor="newPassword" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    New Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      {...registerReset('newPassword')}
                      placeholder="At least 6 characters"
                      autoComplete="new-password"
                      className={`w-full pl-10 pr-10 py-2.5 bg-slate-50/80 border rounded-xl text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:bg-white transition-all font-medium ${
                        resetErrors.newPassword ? 'border-rose-400 focus:ring-rose-500/20' : 'border-slate-200 focus:border-[#4309A2] focus:ring-[#4309A2]/20'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <FormError message={resetErrors.newPassword?.message} />
                </div>

                {/* Field 2: Confirm Password */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Confirm Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      {...registerReset('confirmPassword')}
                      placeholder="Re-enter your new password"
                      autoComplete="new-password"
                      className={`w-full pl-10 pr-10 py-2.5 bg-slate-50/80 border rounded-xl text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:bg-white transition-all font-medium ${
                        resetErrors.confirmPassword ? 'border-rose-400 focus:ring-rose-500/20' : 'border-slate-200 focus:border-[#4309A2] focus:ring-[#4309A2]/20'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <FormError message={resetErrors.confirmPassword?.message} />
                </div>

                {/* Actions */}
                <div className="space-y-4 pt-3">
                  <button
                    type="submit"
                    disabled={isResetting}
                    className="w-full py-3.5 px-4 rounded-xl bg-[#33077C] hover:bg-[#280564] active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-[#33077C]/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => setCurrentScreen('forgot-otp')}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4 text-slate-500" />
                      <span>Back</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* SCREEN 4: FORGOT PASSWORD - SUCCESS SCREEN */}
          {currentScreen === 'forgot-success' && (
            <div className="py-8 text-center space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-500 flex items-center justify-center">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Password Updated!</h2>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
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
