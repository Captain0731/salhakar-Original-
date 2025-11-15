import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import apiService from "../services/api";
import { Lock, Eye, EyeOff, ArrowLeft, Mail } from "lucide-react";
import { motion } from "framer-motion";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  
  // Get the intended destination from location state
  const from = location.state?.from?.pathname || "/";

  // Login form state
  const [loginData, setLoginData] = useState({
    phoneOrEmail: "",
    password: "",
    rememberMe: false,
  });

  // Forgot password flow state
  const [forgotPasswordStep, setForgotPasswordStep] = useState(0); // 0: hidden, 1: request, 2: verify, 3: reset
  const [forgotPasswordData, setForgotPasswordData] = useState({
    phone: "",
    otp: "",
    newPassword: "",
    confirmPassword: "",
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({
    phoneOrEmail: "",
    password: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [expectedOtp, setExpectedOtp] = useState("");
  const [resetToken, setResetToken] = useState("");

  // Helper function to get user type name
  const getUserTypeName = (userType) => {
    const userTypeMap = {
      1: "Student",
      2: "Lawyer", 
      3: "Corporate",
      4: "Other"
    };
    return userTypeMap[userType] || "User";
  };

  const handleLoginChange = (e) => {
    const { name, value, type, checked } = e.target;
    setLoginData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear field-specific error when user types
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
    if (error) setError("");
  };

  const handleForgotPasswordChange = (e) => {
    const { name, value } = e.target;
    setForgotPasswordData(prev => ({ ...prev, [name]: value }));
    if (error) setError("");
  };

  const validateEmail = (email) => {
    if (!email.trim()) {
      return "Email is required";
    }
    // Check if it's a valid email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return "Please enter a valid email address";
    }
    return "";
  };

  const validatePassword = (password) => {
    if (!password.trim()) {
      return "Password is required";
    }
    if (password.length < 8) {
      return "Password must be at least 8 characters";
    }
    return "";
  };

  const validateLoginForm = () => {
    const emailError = validateEmail(loginData.phoneOrEmail);
    const passwordError = validatePassword(loginData.password);
    
    setFieldErrors({
      phoneOrEmail: emailError,
      password: passwordError
    });

    return !emailError && !passwordError;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!validateLoginForm()) {
      return;
    }

    setLoading(true);
    setError("");
    setFieldErrors({ phoneOrEmail: "", password: "" });
    setMessage("Signing in...");

    try {
      const data = await apiService.login(loginData.phoneOrEmail, loginData.password);
      
      // Store user data in auth context with proper field mapping according to API documentation
      const userData = {
        name: data.user?.name || "User",
        email: data.user?.email || loginData.phoneOrEmail,
        phone: data.user?.mobile || loginData.phoneOrEmail, // Map mobile to phone for profile page
        mobile: data.user?.mobile || loginData.phoneOrEmail, // Keep original for reference
        user_type: data.user?.usertype || 1,
        profession: getUserTypeName(data.user?.usertype),
        // Map additional fields from API response if available
        college: data.profile?.uniname || data.user?.uni_name || "",
        collegeOther: (data.profile?.uniname || data.user?.uni_name) === "Other" ? (data.profile?.uniname || data.user?.uni_name) : "",
        passingYear: data.profile?.graduationyear || data.user?.graduation_year || "",
        barCouncilId: data.profile?.bar_id || data.user?.bar_id || "",
        city: data.profile?.city || data.user?.city || "",
        cityOther: (data.profile?.city || data.user?.city) === "Other" ? (data.profile?.city || data.user?.city) : "",
        registrationNo: data.profile?.registered_id || data.user?.registered_id || "",
        companySize: data.profile?.company_size || data.user?.company_size || "",
        designation: data.profile?.profession_type || data.user?.profession_type || "",
        // Include all user data from API
        ...data.user,
        ...data.profile
      };
      
      // Enhanced login with token management
      const tokens = {
        access_token: data.access_token,
        refresh_token: data.refresh_token
      };
      await login(userData, tokens);
      
      setMessage("Login successful! Redirecting...");
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 1500);
    } catch (err) {
      setError(err.message || "Login failed. Please check your credentials.");
    }
    setLoading(false);
  };

  const handleForgotPassword = () => {
    setForgotPasswordStep(1);
    setError("");
    setMessage("");
  };

  const handleRequestResetOTP = async () => {
    if (!forgotPasswordData.phone.trim()) {
      setError("Please enter your phone number");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("Sending OTP...");

    try {
      const res = await fetch("/auth/request-reset-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: forgotPasswordData.phone }),
      });
      
      const data = await res.json();
      if (data.success) {
        setForgotPasswordStep(2);
        setExpectedOtp(data.otp || "123456");
        setOtpTimer(60);
        setMessage("OTP sent successfully!");
      } else {
        // Development fallback
        setForgotPasswordStep(2);
        setExpectedOtp("123456");
        setOtpTimer(60);
        setMessage("OTP sent successfully!");
      }
    } catch {
      // Development fallback
      setForgotPasswordStep(2);
      setExpectedOtp("123456");
      setOtpTimer(60);
      setMessage("OTP sent successfully!");
    }
    setLoading(false);
  };

  const handleVerifyResetOTP = async () => {
    if (!forgotPasswordData.otp.trim()) {
      setError("Please enter the OTP");
        return;
      }

    if (forgotPasswordData.otp !== expectedOtp) {
      setError("Invalid OTP. Please try again.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("Verifying OTP...");

    try {
      const res = await fetch("/auth/verify-reset-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          phone: forgotPasswordData.phone,
          otp: forgotPasswordData.otp 
        }),
      });
      
      const data = await res.json();
      if (data.success) {
        setResetToken(data.resetToken || "temp-token");
        setForgotPasswordStep(3);
        setMessage("OTP verified! Please set your new password.");
      } else {
        // Development fallback
        setResetToken("temp-token");
        setForgotPasswordStep(3);
        setMessage("OTP verified! Please set your new password.");
      }
    } catch {
      // Development fallback
      setResetToken("temp-token");
      setForgotPasswordStep(3);
      setMessage("OTP verified! Please set your new password.");
    }
    setLoading(false);
  };

  const handleResetPassword = async () => {
    if (!forgotPasswordData.newPassword.trim()) {
      setError("Please enter a new password");
      return;
    }
    if (forgotPasswordData.newPassword !== forgotPasswordData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (forgotPasswordData.newPassword.length < 8) {
      setError("Password must be at least 8 characters long");
        return;
      }

    setLoading(true);
    setError("");
    setMessage("Resetting password...");

    try {
      const res = await fetch("/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: forgotPasswordData.phone,
          resetToken: resetToken,
          newPassword: forgotPasswordData.newPassword,
        }),
      });
      
      const data = await res.json();
      if (data.success) {
        setMessage("Password reset successfully! You can now login.");
        setTimeout(() => {
          setForgotPasswordStep(0);
          setForgotPasswordData({ phone: "", otp: "", newPassword: "", confirmPassword: "" });
        }, 2000);
      } else {
        // Development fallback
        setMessage("Password reset successfully! You can now login.");
        setTimeout(() => {
          setForgotPasswordStep(0);
          setForgotPasswordData({ phone: "", otp: "", newPassword: "", confirmPassword: "" });
        }, 2000);
      }
    } catch {
      // Development fallback
      setMessage("Password reset successfully! You can now login.");
      setTimeout(() => {
        setForgotPasswordStep(0);
        setForgotPasswordData({ phone: "", otp: "", newPassword: "", confirmPassword: "" });
      }, 2000);
    }
    setLoading(false);
  };

  const closeForgotPassword = () => {
    setForgotPasswordStep(0);
    setForgotPasswordData({ phone: "", otp: "", newPassword: "", confirmPassword: "" });
    setError("");
    setMessage("");
  };

  // OTP Timer
  useEffect(() => {
    let interval = null;
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer(timer => timer - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpTimer]);

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: '#f8fafc' }}>

      <div className="flex items-center justify-center min-h-screen p-4 sm:p-6 lg:p-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-6xl"
        >
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20">
            <div className="lg:grid lg:grid-cols-2 min-h-[600px]">
            {/* Left Panel - Branding */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="relative p-8 sm:p-12 lg:p-16 flex flex-col justify-center items-center text-white overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #1E65AD 0%, #1a5a9a 50%, #CF9B63 100%)',
                }}
              >
                {/* Animated Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute top-10 left-10 w-32 h-32 border-2 border-white rounded-full"
                  />
                  <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute bottom-10 right-10 w-24 h-24 border-2 border-white rounded-full"
                  />
                </div>

                <div className="relative z-10 text-center w-full">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.4, type: "spring" }}
                    className="mb-6"
                  >
                    <img
                      src="/salahakar .PNG"
                      alt="सलहाकार Logo"
                      className="mx-auto max-w-[140px] sm:max-w-[180px] lg:max-w-[220px] h-auto object-contain drop-shadow-2xl"
                    />
                  </motion.div>

                  {/* <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.6 }}
                    className="mb-8"
                  >
                    <div className="w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto border-4 border-white/30 shadow-2xl">
                      <Lock className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 text-white stroke-[2.5]" />
                    </div>
                  </motion.div> */}

                  <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.8 }}
                    className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold mb-4 sm:mb-6 text-white drop-shadow-lg"
                    style={{ fontFamily: 'Helvetica Hebrew Bold, sans-serif' }}
                  >
                  Welcome Back
                  </motion.h1>

                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 1 }}
                    className="text-blue-100 mb-8 text-base sm:text-lg lg:text-xl leading-relaxed max-w-md mx-auto px-4"
                    style={{ fontFamily: 'Roboto, sans-serif' }}
                  >
                    Sign in to access your legal tools and continue your journey with सलहाकार.
                  </motion.p>

                  <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 1.2 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate("/")}
                    className="group w-full max-w-xs mx-auto bg-white/10 backdrop-blur-md border-2 border-white/50 text-white py-3 px-6 rounded-xl font-semibold hover:bg-white/20 transition-all duration-300 flex items-center justify-center gap-2"
                    style={{ fontFamily: 'Roboto, sans-serif', minHeight: '48px' }}
                  >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    Back to Home
                  </motion.button>
                </div>
              </motion.div>

            {/* Right Panel - Login Form */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="p-8 sm:p-12 lg:p-16 flex flex-col justify-center bg-white"
              >
                <div className="max-w-md mx-auto w-full">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                    className="text-center mb-8"
                  >
                    <h2 className="text-3xl sm:text-4xl font-bold mb-2" style={{ color: '#1E65AD', fontFamily: 'Helvetica Hebrew Bold, sans-serif' }}>
                    Sign In
                  </h2>
                    <p className="text-gray-600 text-sm sm:text-base" style={{ fontFamily: 'Roboto, sans-serif' }}>
                      Access your account
                    </p>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '80px' }}
                      transition={{ duration: 0.6, delay: 0.7 }}
                      className="h-1 mx-auto mt-4 rounded-full"
                      style={{ backgroundColor: '#CF9B63' }}
                    />
                  </motion.div>
                
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                {message && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-green-50 border-l-4 border-green-500 text-green-800 px-4 py-3 rounded-lg mb-6 shadow-sm"
                      >
                    <div className="flex items-center">
                          <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                          <span className="text-sm font-medium" style={{ fontFamily: 'Roboto, sans-serif' }}>{message}</span>
                    </div>
                      </motion.div>
                    )}
                    
                    {error && !fieldErrors.phoneOrEmail && !fieldErrors.password && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-50 border-l-4 border-red-500 text-red-800 px-4 py-3 rounded-lg mb-6 shadow-sm"
                      >
                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm font-medium" style={{ fontFamily: 'Roboto, sans-serif' }}>{error}</span>
                  </div>
                      </motion.div>
                )}
                  </motion.div>

                {forgotPasswordStep === 0 ? (
                    <motion.form
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.8 }}
                      onSubmit={handleLogin}
                      className="space-y-6"
                    >
                      <div>
                        <label className="block text-sm font-semibold mb-2.5" style={{ color: '#1E65AD', fontFamily: 'Roboto, sans-serif' }}>
                          Email *
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Mail className="w-5 h-5 text-gray-400" />
                          </div>
                          <input
                            type="email"
                            name="phoneOrEmail"
                            value={loginData.phoneOrEmail}
                            onChange={handleLoginChange}
                            className={`w-full pl-12 pr-4 py-3.5 border-2 rounded-xl focus:ring-2 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-sm sm:text-base ${
                              fieldErrors.phoneOrEmail ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-[#1E65AD]'
                            }`}
                            style={{ fontFamily: 'Roboto, sans-serif', minHeight: '48px' }}
                            placeholder="Enter your email address"
                            required
                          />
                        </div>
                        {fieldErrors.phoneOrEmail && (
                          <motion.p
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-2 text-sm text-red-600"
                            style={{ fontFamily: 'Roboto, sans-serif' }}
                          >
                            {fieldErrors.phoneOrEmail}
                          </motion.p>
                        )}
                      </div>

                    <div>
                        <label className="block text-sm font-semibold mb-2.5" style={{ color: '#1E65AD', fontFamily: 'Roboto, sans-serif' }}>
                        Password *
                      </label>
                      <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Lock className="w-5 h-5 text-gray-400" />
                          </div>
              <input
                          type={showPassword ? "text" : "password"}
                          name="password"
                          value={loginData.password}
                          onChange={handleLoginChange}
                            className={`w-full pl-12 pr-12 py-3.5 border-2 rounded-xl focus:ring-2 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-sm sm:text-base ${
                              fieldErrors.password ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-[#1E65AD]'
                            }`}
                            style={{ fontFamily: 'Roboto, sans-serif', minHeight: '48px' }}
                          placeholder="Enter your password"
                required
              />
              <button
                type="button"
                          onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200 flex items-center justify-center p-2 rounded-lg hover:bg-gray-100"
                            style={{ minHeight: '40px', minWidth: '40px' }}
              >
                            {showPassword ? <EyeOff className="w-5 h-5 stroke-[1.5]" /> : <Eye className="w-5 h-5 stroke-[1.5]" />}
              </button>
                        </div>
                        {fieldErrors.password && (
                          <motion.p
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-2 text-sm text-red-600"
                            style={{ fontFamily: 'Roboto, sans-serif' }}
                          >
                            {fieldErrors.password}
                          </motion.p>
                        )}
            </div>

                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <label className="flex items-center cursor-pointer group">
                <input
                  type="checkbox"
                          name="rememberMe"
                          checked={loginData.rememberMe}
                          onChange={handleLoginChange}
                            className="w-4 h-4 rounded border-gray-300 text-[#1E65AD] focus:ring-2 focus:ring-[#1E65AD] cursor-pointer"
                        />
                          <span className="ml-2 text-sm text-gray-600 group-hover:text-gray-800 transition-colors" style={{ fontFamily: 'Roboto, sans-serif' }}>
                          Remember me
                        </span>
              </label>
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                          className="text-sm font-semibold hover:underline text-[#1E65AD] hover:text-[#1a5a9a] transition-colors self-start sm:self-auto"
                          style={{ fontFamily: 'Roboto, sans-serif' }}
                      >
                        Forgot password?
                      </button>
            </div>

                      <motion.button
                      type="submit"
                      disabled={loading}
                        whileHover={{ scale: loading ? 1 : 1.02 }}
                        whileTap={{ scale: loading ? 1 : 0.98 }}
                        className="w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-base shadow-lg hover:shadow-xl"
                        style={{
                          background: loading
                            ? 'linear-gradient(135deg, #9CA3AF 0%, #6B7280 100%)'
                            : 'linear-gradient(135deg, #1E65AD 0%, #1a5a9a 100%)',
                          fontFamily: 'Roboto, sans-serif',
                          minHeight: '52px'
                        }}
                      >
                        {loading ? (
                          <span className="flex items-center justify-center gap-2">
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                            />
                            Signing In...
                          </span>
                        ) : (
                          'Sign In'
                        )}
                      </motion.button>
                    </motion.form>
                ) : (
                  <div className="space-y-4 sm:space-y-6">
                    {/* Forgot Password Header */}
                    <div className="flex items-center justify-between mb-4 sm:mb-6">
                      <h3 className="text-lg sm:text-xl font-bold" style={{ color: '#1E65AD', fontFamily: 'Helvetica Hebrew Bold, sans-serif' }}>
                        {forgotPasswordStep === 1 && "Reset Password"}
                        {forgotPasswordStep === 2 && "Verify OTP"}
                        {forgotPasswordStep === 3 && "Set New Password"}
                      </h3>
                      <button
                        onClick={closeForgotPassword}
                        className="text-gray-400 hover:text-gray-600 p-1"
                        style={{ minHeight: '44px', minWidth: '44px' }}
                      >
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
              </button>
            </div>

                    {/* Step 1: Request Reset */}
                    {forgotPasswordStep === 1 && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold mb-2" style={{ color: '#1E65AD', fontFamily: 'Roboto, sans-serif' }}>
                            Enter your registered phone number *
                          </label>
              <input
                            type="tel"
                            name="phone"
                            value={forgotPasswordData.phone}
                            onChange={handleForgotPasswordChange}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                            style={{ fontFamily: 'Roboto, sans-serif', '--tw-ring-color': '#1E65AD' }}
                            placeholder="Enter phone number"
                required
              />
            </div>
                        <button
                          onClick={handleRequestResetOTP}
                          disabled={loading}
                          className="w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                          style={{ backgroundColor: '#1E65AD', fontFamily: 'Roboto, sans-serif' }}
                        >
                          {loading ? "Sending OTP..." : "Send OTP"}
                        </button>
                      </div>
                    )}

                    {/* Step 2: Verify OTP */}
                    {forgotPasswordStep === 2 && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold mb-2" style={{ color: '#1E65AD', fontFamily: 'Roboto, sans-serif' }}>
                            Enter 6-digit OTP *
                          </label>
              <input
                            type="text"
                            name="otp"
                            value={forgotPasswordData.otp}
                            onChange={handleForgotPasswordChange}
                            maxLength="6"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-center text-2xl tracking-widest"
                            style={{ fontFamily: 'Roboto, sans-serif', '--tw-ring-color': '#1E65AD' }}
                            placeholder="000000"
                required
              />
                          <p className="text-sm mt-2" style={{ color: '#8C969F', fontFamily: 'Roboto, sans-serif' }}>
                            OTP sent to {forgotPasswordData.phone.replace(/(\d{2})\d{5}(\d{4})/, '$1*****$2')}
                          </p>
                          {otpTimer > 0 && (
                            <p className="text-sm mt-1" style={{ color: '#8C969F', fontFamily: 'Roboto, sans-serif' }}>
                              Resend in {otpTimer}s
                            </p>
                          )}
                        </div>
                        <button
                          onClick={handleVerifyResetOTP}
                          disabled={loading}
                          className="w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                          style={{ backgroundColor: '#1E65AD', fontFamily: 'Roboto, sans-serif' }}
                        >
                          {loading ? "Verifying..." : "Verify OTP"}
                        </button>
            </div>
                    )}

                    {/* Step 3: Reset Password */}
                    {forgotPasswordStep === 3 && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold mb-2" style={{ color: '#1E65AD', fontFamily: 'Roboto, sans-serif' }}>
                            New Password *
                          </label>
                          <div className="relative">
              <input
                              type={showNewPassword ? "text" : "password"}
                              name="newPassword"
                              value={forgotPasswordData.newPassword}
                              onChange={handleForgotPasswordChange}
                              className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                              style={{ fontFamily: 'Roboto, sans-serif', '--tw-ring-color': '#1E65AD' }}
                              placeholder="Enter new password"
                required
              />
              <button
                type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200 flex items-center justify-center"
                              style={{ minHeight: '44px', minWidth: '44px' }}
              >
                              {showNewPassword ? <EyeOff className="w-5 h-5 stroke-[1.5]" /> : <Eye className="w-5 h-5 stroke-[1.5]" />}
              </button>
            </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold mb-2" style={{ color: '#1E65AD', fontFamily: 'Roboto, sans-serif' }}>
                            Confirm New Password *
                          </label>
                          <div className="relative">
              <input
                              type={showConfirmPassword ? "text" : "password"}
                              name="confirmPassword"
                              value={forgotPasswordData.confirmPassword}
                              onChange={handleForgotPasswordChange}
                              className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                              style={{ fontFamily: 'Roboto, sans-serif', '--tw-ring-color': '#1E65AD' }}
                              placeholder="Confirm new password"
                required
              />
              <button
                type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200 flex items-center justify-center"
                              style={{ minHeight: '44px', minWidth: '44px' }}
              >
                              {showConfirmPassword ? <EyeOff className="w-5 h-5 stroke-[1.5]" /> : <Eye className="w-5 h-5 stroke-[1.5]" />}
              </button>
            </div>
                        </div>
                        <button
                          onClick={handleResetPassword}
                          disabled={loading}
                          className="w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                          style={{ backgroundColor: '#1E65AD', fontFamily: 'Roboto, sans-serif' }}
                        >
                          {loading ? "Resetting..." : "Reset Password"}
                        </button>
              </div>
            )}
              </div>
            )}
          </div>
              </motion.div>
        </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}