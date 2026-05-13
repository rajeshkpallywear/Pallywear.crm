import React, { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import { Layout, Mail, Lock, ArrowRight, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth } from '../lib/firebase';
import { motion } from 'motion/react';
import Logo from '../components/Logo';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const { login, googleLogin, user: authUser, adminOnlyRegistration } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.message) {
      setSuccessMsg(location.state.message);
      // Clean up state
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleGoogleLogin = async () => {
    setError('');
    const result = await googleLogin();
    if (result.success) {
      // The user role is already set in the context during onAuthStateChanged or googleLogin
      // We'll wait a brief moment for the state to settle or check the email again
      const currentUser = auth.currentUser;
      if (currentUser) {
        const email = (currentUser.email || '').toLowerCase().trim();
        const isAdmin = email === 'ceo@pallywear.com' || email === 'rajeshkpallywear@gmail.com' || email === 'daniel.smpallywear@gmail.com' || email.startsWith('admin') || email.startsWith('ceo');
        navigate(isAdmin ? '/admin' : '/dashboard');
      } else {
        navigate('/dashboard');
      }
    } else {
      let message = result.message || 'Google login failed';
      if (message.includes('auth/operation-not-allowed')) {
        message = 'Google sign-in is not enabled in Firebase Console. Please enable it in Authentication > Sign-in method.';
      }
      setError(message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const result = await login(email.trim(), password);
      if (result.success) {
        const normalizedEmail = email.toLowerCase().trim();
        const isAdmin = normalizedEmail === 'ceo@pallywear.com' || normalizedEmail === 'rajeshkpallywear@gmail.com' || normalizedEmail === 'daniel.smpallywear@gmail.com' || normalizedEmail.startsWith('admin') || normalizedEmail.startsWith('ceo');
        navigate(isAdmin ? '/admin' : '/dashboard');
      } else {
        let message = result.message || 'Login failed';
        if (message.includes('auth/operation-not-allowed')) {
          message = 'Email/Password login is not enabled in Firebase Console. Please enable it in Authentication > Sign-in method.';
        } else if (message.includes('auth/invalid-credential') || message.includes('auth/user-not-found') || message.includes('auth/wrong-password')) {
          message = 'Invalid email or password. If you haven\'t registered yet, please contact an administrator.';
        }
        setError(message);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center hero-bg px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card p-8 rounded-2xl w-full max-w-md border-white/50"
      >
        <div className="flex flex-col items-center mb-8">
          <Logo iconOnly className="mb-4 scale-125" />
          <h2 className="text-2xl font-bold text-brand-dark tracking-tight">Welcome back</h2>
          <p className="text-gray-500 text-sm mt-1">Please enter your details to sign in</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {successMsg && (
            <div className="p-3 bg-green-50 border border-green-100 rounded-xl text-green-600 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {successMsg}
            </div>
          )}
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-medium">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Mail className="w-4 h-4 opacity-70" /> Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all shadow-sm"
              placeholder="name@company.com"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Lock className="w-4 h-4 opacity-70" /> Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all pr-12 shadow-sm"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-brand-primary transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm py-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="rounded border-gray-300 text-brand-primary focus:ring-brand-primary" />
              <span className="text-gray-600">Remember me</span>
            </label>
            <a href="#" className="font-medium text-brand-primary hover:underline">Forgot password?</a>
          </div>

          <Button type="submit" className="w-full h-11 text-base shadow-lg shadow-brand-primary/20">
            Sign in
          </Button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-transparent text-gray-400">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button
              type="button"
              variant="outline"
              className="bg-white gap-2 text-sm h-10"
              onClick={handleGoogleLogin}
            >
              <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" /> Google
            </Button>
            <Button variant="outline" className="bg-white gap-2 text-sm h-10">
              <Layout className="w-4 h-4 text-gray-600" /> Microsoft
            </Button>
          </div>
        </form>

        {!adminOnlyRegistration && (
          <p className="text-center text-sm text-gray-500 mt-8">
            Don't have an account?{' '}
            <Link to="/register" className="font-bold text-brand-primary hover:underline ml-1">
              Sign up for free
            </Link>
          </p>
        )}
      </motion.div>
    </div>
  );
}
