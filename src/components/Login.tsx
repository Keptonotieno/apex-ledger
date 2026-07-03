import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole, UserProfile } from '../types';
import { 
  Lock, Mail, Eye, EyeOff, ShieldCheck, 
  ChevronRight, Users, CheckCircle, Database, Smartphone,
  Store, Plus, Shield, ArrowUpRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const Login: React.FC = () => {
  const { login, registerTenant, profiles } = useApp();
  
  // Start on the Register Tenant screen by default as requested
  const [isRegistering, setIsRegistering] = useState(true);
  
  // Registration States
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Login States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);



  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !businessName || !email || !password) {
      setErrorMessage('Please fill in all registration fields.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const success = await registerTenant(fullName.trim(), businessName.trim(), email.trim(), password);
      if (success) {
        setSuccessMessage('Business Registered & Provisioned! Opening Secure Slate...');
      } else {
        setErrorMessage('Registration failed. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setErrorMessage('Please fill in all credentials fields.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Find a matching pre-seeded local profile first
      const matchedProfile = profiles.find(
        p => p.email.toLowerCase() === loginEmail.toLowerCase().trim()
      );

      let success = false;
      if (matchedProfile) {
        success = await login(matchedProfile.id, loginEmail.trim(), loginPassword);
      } else {
        // Fallback login attempt
        success = await login('', loginEmail.trim(), loginPassword);
      }

      if (success) {
        setSuccessMessage('Access Granted. Opening Secure Vault...');
      } else {
        setErrorMessage('Invalid credentials or unauthorized email.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };



  return (
    <div className="min-h-screen bg-gray-950 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden font-sans select-none">
      
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-cyan-500/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-[480px] z-10 flex flex-col items-center"
      >
        
        {/* Custom Glowing Squircle Logo exactly matching screenshot */}
        <div className="mb-6 relative">
          <div className="w-24 h-24 bg-[#0a0d16] rounded-[2rem] border-2 border-cyan-400/40 flex flex-col items-center justify-center p-3.5 shadow-[0_0_35px_rgba(34,211,238,0.3)] ring-4 ring-cyan-500/5">
            {/* Double-inner-ring aesthetic */}
            <div className="absolute inset-1.5 border border-cyan-400/10 rounded-[1.7rem] pointer-events-none" />
            
            {/* Dynamic bar growth with trending arrow */}
            <div className="flex items-end gap-2 h-10 w-12 justify-center relative mt-1">
              <div className="w-2 h-4 bg-cyan-400/90 rounded-sm shadow-[0_0_6px_rgba(34,211,238,0.4)]"></div>
              <div className="w-2 h-7 bg-cyan-400/90 rounded-sm shadow-[0_0_8px_rgba(34,211,238,0.4)]"></div>
              <div className="w-2 h-10 bg-cyan-400/90 rounded-sm shadow-[0_0_10px_rgba(34,211,238,0.4)] relative">
                {/* Glowing arrow line floating */}
                <div className="absolute -top-3.5 -right-3.5 text-cyan-400 animate-pulse">
                  <ArrowUpRight className="w-7 h-7 stroke-[2.5]" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Branding header in professional clean typography */}
        <div className="text-center mb-8">
          <h1 className="font-sans text-3xl font-extrabold tracking-tight text-white uppercase">
            APEX LEDGER
          </h1>
          <p className="font-mono text-[10px] text-cyan-400 uppercase tracking-widest mt-2">
            Enterprise Vault & Real-Time Performance Analytics
          </p>
        </div>

        {/* Main interactive Card container */}
        <div className="w-full bg-[#111622]/90 border border-gray-800/80 rounded-[2.2rem] p-8 sm:p-10 shadow-2xl relative">
          
          <AnimatePresence mode="wait">
            {successMessage ? (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="py-12 text-center flex flex-col items-center justify-center"
              >
                <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 glow-cyan mb-4 animate-pulse">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-100">{successMessage}</h3>
                <p className="text-xs text-gray-400 mt-2 font-mono">Initializing local sync & refreshing caches...</p>
              </motion.div>
            ) : isRegistering ? (
              
              /* 1. NEW BUSINESS REGISTRATION DASHBOARD FORM */
              <motion.div 
                key="register"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Form header */}
                <div className="flex justify-end pb-1.5 border-b border-gray-800/40">
                  <span className="font-mono text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
                    Register Business Tenant
                  </span>
                </div>

                <form onSubmit={handleRegister} className="space-y-5">
                  
                  {/* Full Name (Business Owner) */}
                  <div className="relative group">
                    {(focusedField === 'fullName' || fullName) && (
                      <span className="absolute -top-2 right-4 px-2 bg-[#111622] text-[9px] text-cyan-400 font-mono font-bold uppercase tracking-wider z-10">
                        Full Name (Business Owner)
                      </span>
                    )}
                    <input
                      type="text"
                      required
                      value={fullName}
                      onFocus={() => setFocusedField('fullName')}
                      onBlur={() => setFocusedField(null)}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={focusedField === 'fullName' ? '' : 'Full Name (Business Owner)'}
                      className={`w-full bg-[#0a0d16] border ${
                        focusedField === 'fullName' ? 'border-cyan-400/80 shadow-[0_0_10px_rgba(34,211,238,0.1)]' : 'border-gray-800/90'
                      } rounded-xl px-4 py-3.5 text-right placeholder:text-right font-sans text-gray-100 outline-none transition duration-200 text-sm`}
                    />
                  </div>

                  {/* Business / Enterprise Name */}
                  <div className="relative group">
                    {(focusedField === 'businessName' || businessName) && (
                      <span className="absolute -top-2 right-4 px-2 bg-[#111622] text-[9px] text-cyan-400 font-mono font-bold uppercase tracking-wider z-10">
                        Business / Enterprise Name
                      </span>
                    )}
                    <input
                      type="text"
                      required
                      value={businessName}
                      onFocus={() => setFocusedField('businessName')}
                      onBlur={() => setFocusedField(null)}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder={focusedField === 'businessName' ? '' : 'Business / Enterprise Name'}
                      className={`w-full bg-[#0a0d16] border ${
                        focusedField === 'businessName' ? 'border-cyan-400/80 shadow-[0_0_10px_rgba(34,211,238,0.1)]' : 'border-gray-800/90'
                      } rounded-xl px-4 py-3.5 text-right placeholder:text-right font-sans text-gray-100 outline-none transition duration-200 text-sm`}
                    />
                  </div>

                  {/* Work Email Address with Cyan border by default or on focus */}
                  <div className="relative group">
                    {(focusedField === 'email' || email || true) && (
                      <span className="absolute -top-2 right-4 px-2 bg-[#111622] text-[9px] text-cyan-400 font-mono font-bold uppercase tracking-wider z-10">
                        Work Email Address
                      </span>
                    )}
                    <input
                      type="email"
                      required
                      value={email}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={focusedField === 'email' ? '' : 'e.g. owner@company.com'}
                      className={`w-full bg-[#0a0d16] border ${
                        focusedField === 'email' || !email ? 'border-cyan-400/80 shadow-[0_0_10px_rgba(34,211,238,0.1)]' : 'border-gray-800/90'
                      } rounded-xl px-4 py-3.5 text-right placeholder:text-right font-sans text-gray-100 outline-none transition duration-200 text-sm`}
                    />
                  </div>

                  {/* Secure Password */}
                  <div className="relative group">
                    {(focusedField === 'password' || password) && (
                      <span className="absolute -top-2 right-4 px-2 bg-[#111622] text-[9px] text-cyan-400 font-mono font-bold uppercase tracking-wider z-10">
                        Secure Password
                      </span>
                    )}
                    <input
                      type="password"
                      required
                      value={password}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={focusedField === 'password' ? '' : 'Secure Password'}
                      className={`w-full bg-[#0a0d16] border ${
                        focusedField === 'password' ? 'border-cyan-400/80 shadow-[0_0_10px_rgba(34,211,238,0.1)]' : 'border-gray-800/90'
                      } rounded-xl px-4 py-3.5 text-right placeholder:text-right font-sans text-gray-100 outline-none transition duration-200 text-sm`}
                    />
                  </div>

                  {errorMessage && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs text-center font-mono"
                    >
                      {errorMessage}
                    </motion.div>
                  )}

                  {/* Register & Provision Slate solid cyan button with Store+Plus icon */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 bg-[#76dbdb] hover:bg-[#5bc8c8] text-gray-950 font-sans font-bold text-xs uppercase tracking-wider py-4 rounded-xl shadow-[0_4px_20px_rgba(118,219,219,0.25)] transition duration-200 disabled:opacity-50 cursor-pointer"
                  >
                    <span>{isSubmitting ? 'Provisioning Vault...' : 'Register & Provision Slate'}</span>
                    <div className="relative flex items-center justify-center shrink-0">
                      <Store className="w-4 h-4 text-gray-950" />
                      <Plus className="w-2.5 h-2.5 text-gray-950 absolute -top-1 -right-1 stroke-[3]" />
                    </div>
                  </button>

                </form>

                {/* Already registered? Sign-In Instead */}
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegistering(false);
                      setErrorMessage(null);
                    }}
                    className="font-mono text-xs text-gray-300 hover:text-cyan-400 transition cursor-pointer uppercase tracking-wider"
                  >
                    Already registered? Sign-In Instead
                  </button>
                </div>

              </motion.div>
            ) : (
              
              /* 2. SIGN IN / LOGIN WORKSPACE */
              <motion.div 
                key="login"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center pb-2 border-b border-gray-800/40">
                  <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
                    Secure Workspace Login
                  </span>
                  <span className="font-mono text-[10px] text-gray-400 uppercase tracking-wider">
                    Identity Verification
                  </span>
                </div>

                <form onSubmit={handleFormLogin} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      Business Email Address
                    </label>
                    <div className="relative flex items-center bg-gray-950/50 border border-gray-800 rounded-xl px-3 py-3 text-xs text-gray-200 focus-within:border-cyan-500/50 transition">
                      <Mail className="w-4 h-4 text-gray-500 mr-2.5 shrink-0" />
                      <input 
                        type="email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="e.g. sarah@apex.com"
                        className="bg-transparent text-gray-100 outline-none w-full font-sans"
                      />
                    </div>
                    <p className="text-[9px] text-gray-500 mt-1 font-mono">
                      Manager: <span className="text-cyan-400">sarah@apex.com</span> or Employee: <span className="text-cyan-400">john@apex.com</span>
                    </p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      Password Credentials
                    </label>
                    <div className="relative flex items-center bg-gray-950/50 border border-gray-800 rounded-xl px-3 py-3 text-xs text-gray-200 focus-within:border-cyan-500/50 transition">
                      <Lock className="w-4 h-4 text-gray-500 mr-2.5 shrink-0" />
                      <input 
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="bg-transparent text-gray-100 outline-none w-full font-sans"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-gray-500 hover:text-cyan-400 transition"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {errorMessage && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs text-center font-mono"
                    >
                      {errorMessage}
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs py-3 rounded-xl shadow-lg transition duration-200 disabled:opacity-50 cursor-pointer uppercase tracking-wider"
                  >
                    <span>{isSubmitting ? 'Authenticating...' : 'Authenticate Into Workspace'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </form>

                {/* Don't have an account link */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegistering(true);
                      setErrorMessage(null);
                    }}
                    className="font-mono text-xs text-gray-300 hover:text-cyan-400 transition cursor-pointer uppercase tracking-wider"
                  >
                    Don't have a workspace? Register Tenant instead
                  </button>
                </div>



              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* Footer info line with Shield exactly matching the screenshot */}
        <div className="mt-8 flex items-center justify-center gap-2 text-[10px] text-gray-500 font-mono uppercase tracking-wider">
          <span>End-to-End JWT Offline Validation Active</span>
          <Shield className="w-3.5 h-3.5 text-cyan-400 animate-pulse shrink-0" />
        </div>

      </motion.div>
    </div>
  );
};
