import React, { useState } from 'react';
import { Button } from '../components/Button';
import { Layout, Mail, Lock, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import Logo from '../components/Logo';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Default admin: username 'admin', password 'admin 123'
    let role: 'user' | 'admin' = 'user';
    if (email === 'admin' && password === 'admin 123') {
      role = 'admin';
    } else if (email.includes('admin')) {
      role = 'admin';
    }

    login(email || 'demo@pallywear.com', role);
    navigate(role === 'admin' ? '/admin' : '/dashboard');
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
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Mail className="w-4 h-4 opacity-70" /> Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
              placeholder="name@company.com"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Lock className="w-4 h-4 opacity-70" /> Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
              placeholder="••••••••"
              required
            />
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
            <Button variant="outline" className="bg-white gap-2 text-sm h-10">
              <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" /> Google
            </Button>
            <Button variant="outline" className="bg-white gap-2 text-sm h-10">
              <Layout className="w-4 h-4 text-gray-600" /> Microsoft
            </Button>
          </div>
        </form>

        <p className="text-center text-sm text-gray-500 mt-8">
          Don't have an account?{' '}
          <Link to="/register" className="font-bold text-brand-primary hover:underline ml-1">
            Sign up for free
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
