import React, { useState } from 'react';
import { Button } from '../components/Button';
import { Menu, X, TrendingUp, User, Zap, BarChart3, Layout, Globe, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import Logo from '../components/Logo';
import { cn } from '../lib/utils';

export default function Store() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white relative selection:bg-brand-primary/10 overflow-x-hidden">
      {/* Background Image with Overlay */}
      <div className="fixed inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2015&auto=format&fit=crop"
          className="w-full h-full object-cover opacity-10"
          alt="background"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-white via-white/95 to-indigo-50/30" />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 md:px-12 py-6 flex items-center justify-between border-b border-gray-100 bg-white/50 backdrop-blur-xl">
        <div className="flex items-center gap-12">
          <Logo />
        </div>

        <div className="flex items-center gap-6">
          <Link to="/login">
            <Button className="bg-gray-900 text-white hover:bg-black rounded-xl px-8 py-2.5 font-bold shadow-xl shadow-gray-200 transition-all hover:scale-105">
              Login
            </Button>
          </Link>
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden p-2 text-gray-900"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Hero Content */}
      <main className="relative pt-40 pb-20 px-6 md:px-12 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 min-h-screen">
        <div className="flex-1 text-left z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 rounded-full border border-indigo-100 mb-6"
          >
            <Zap className="w-3 h-3 text-indigo-600 fill-indigo-600" />
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600"> now live</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-6xl md:text-8xl font-black text-gray-900 mb-8 leading-[0.95] tracking-tight"
          >
            Analytics at <br /> the <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">next level</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-xl text-gray-500 mb-10 max-w-md leading-relaxed font-medium"
          >
            Predict outcomes, automate leads, and scale your business with the world's most powerful sales engine.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="flex flex-wrap items-center gap-4"
          >
            <Link to="/login">
              <Button size="lg" className="bg-[#4F46E5] text-white hover:bg-indigo-700 px-10 py-5 rounded-2xl font-black text-lg shadow-2xl shadow-indigo-200 transition-all hover:scale-105 active:scale-95">
                Join the team
              </Button>
            </Link>
          </motion.div>

          {/* Stats Badge removed */}
        </div>

        {/* Isometric Visuals */}
        <div className="flex-1 relative w-full h-[650px] hidden lg:block perspective-[2000px]">
          {/* Primary Card */}
          <motion.div
            initial={{ opacity: 0, y: 40, rotateX: 45, rotateZ: -10 }}
            animate={{ opacity: 1, y: 0, rotateX: 25, rotateZ: -15, rotateY: 5 }}
            whileHover={{ y: -20, rotateX: 15, rotateY: 10 }}
            transition={{ type: 'spring', damping: 20 }}
            className="absolute top-0 right-0 w-[550px] h-80 bg-white/80 backdrop-blur-2xl border border-white rounded-[40px] shadow-[0_50px_100px_rgba(0,0,0,0.1)] p-8 z-30"
            style={{
              transformStyle: 'preserve-3d',
            }}
          >
            <div className="flex justify-between items-start mb-12">
              <div>
                <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Live Revenue Stream</h3>
                <p className="text-5xl font-black text-gray-900 tracking-tighter">$14,058,362.00</p>
              </div>
              <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
            <div className="h-24 w-full flex items-end gap-1.5 px-2">
              {[40, 20, 60, 45, 80, 50, 90, 70, 85, 45, 65, 55].map((h, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  className="flex-1 bg-indigo-600/10 rounded-t-xl relative group overflow-hidden"
                >
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
                    className="absolute inset-0 bg-gradient-to-t from-indigo-500/20 to-transparent"
                  />
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(79,70,229,0.5)]" />
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* User List Card */}
          <motion.div
            initial={{ opacity: 0, x: -40, rotateX: 45, rotateZ: -10 }}
            animate={{ opacity: 1, x: 0, rotateX: 25, rotateZ: -15, rotateY: 5 }}
            whileHover={{ x: -20, rotateY: 0 }}
            className="absolute -bottom-5 left-0 w-[420px] bg-white/90 backdrop-blur-2xl border border-white rounded-[32px] shadow-[0_40px_80px_rgba(0,0,0,0.1)] p-8 z-40 overflow-hidden"
            style={{
              transformStyle: 'preserve-3d',
            }}
          >
            <div className="flex items-center justify-between mb-8">
              <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">Active Leads</h4>
            </div>
            <div className="space-y-4">
              {[
                { name: 'Jane Cooper', status: 'Completed', val: '$935.66', color: 'bg-green-100 text-green-600' },
                { name: 'Arlene McCoy', status: 'Completed', val: '$120.99', color: 'bg-green-100 text-green-600' },
                { name: 'Dianne Russell', status: 'Pending', val: '$1,733.81', color: 'bg-gray-100 text-gray-600' }
              ].map((u, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-3xl hover:bg-indigo-50/50 transition-all border border-transparent hover:border-indigo-100 group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 p-2 text-indigo-500 group-hover:scale-110 transition-transform">
                      <User className="w-full h-full" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-gray-900">{u.name}</p>
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${u.status === 'Completed' ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]' : 'bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.5)]'}`} />
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{u.status}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm font-black text-gray-900 tracking-tighter">{u.val}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Decor Elements */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-400/5 blur-[120px] rounded-full pointer-events-none" />
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-20 px-6 max-w-7xl mx-auto border-t border-gray-100">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <Logo />
          <nav className="flex items-center gap-8">
            {['Privacy', 'Contact'].map(item => (
              <button key={item} className="text-xs font-bold text-gray-400 hover:text-gray-900 uppercase tracking-widest transition-colors cursor-pointer">{item}</button>
            ))}
          </nav>
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all cursor-pointer">
              <Globe className="w-5 h-5" />
            </div>
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all cursor-pointer">
              <Shield className="w-5 h-5" />
            </div>
          </div>
        </div>
        <p className="text-center text-[10px] text-gray-400 font-bold mt-12 uppercase tracking-[0.3em]">© 2024 Pallywear Analytics. All rights reserved.</p>
      </footer>


      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-sm bg-white z-[110] shadow-2xl p-8 flex flex-col"
            >
              <div className="flex items-center justify-between mb-12">
                <Logo />
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-3 hover:bg-gray-100 rounded-2xl transition-colors"
                >
                  <X className="w-8 h-8 text-gray-900" />
                </button>
              </div>

              <div className="space-y-8 flex-1">
              </div>

              <div className="pt-8 border-t border-gray-100">
                <Link to="/login">
                  <Button className="w-full py-5 text-lg font-bold rounded-2xl">Sign In</Button>
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
