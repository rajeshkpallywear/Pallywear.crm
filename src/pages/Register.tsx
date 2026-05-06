import React, { useState } from 'react';
import { Button } from '../components/Button';
import { Layout, Mail, Lock, User, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import Logo from '../components/Logo';

export default function Register() {
  const [email, setEmail] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(email || 'new@onleads.com', 'user');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center hero-bg px-6">
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="glass-card p-8 rounded-2xl w-full max-w-md border-white/50"
      >
        <div className="flex flex-col items-center mb-8">
          <Logo iconOnly className="mb-4 scale-125" />
          <h2 className="text-2xl font-bold text-brand-dark tracking-tight">Create your account</h2>
          <p className="text-gray-500 text-sm mt-1">Start your 14-day free trial today</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <User className="w-4 h-4 opacity-70" /> Full Name
            </label>
            <input
              type="text"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all text-sm"
              placeholder="John Doe"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Mail className="w-4 h-4 opacity-70" /> Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all text-sm"
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
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all text-sm"
              placeholder="••••••••"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-[11px] text-gray-500">No credit card required</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-[11px] text-gray-500">Cancel at any time</span>
            </div>
          </div>

          <Button type="submit" className="w-full h-11 text-base shadow-lg shadow-brand-primary/20">
            Create account
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-8">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-brand-primary hover:underline ml-1">
            Sign in
          </Link>
        </p>

        <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-center gap-6">
          {['Intercom', 'Linear', 'Loom'].map(brand => (
            <span key={brand} className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{brand}</span>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
