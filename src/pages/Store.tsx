import React, { useState } from 'react';
import { Button } from '../components/Button';
import { ChevronDown, Play, ArrowRight, Layout, Zap, Users, Shield, Globe, Book, Newspaper, HelpCircle, BarChart3, AppWindow, Puzzle, Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import Logo from '../components/Logo';

const navItems = [
  {
    label: 'Product',
    items: [
      { name: 'Core Platform', desc: 'Powerful sales reporting & tracking', icon: Layout },
      { name: 'Mobile Apps', desc: 'Manage leads on the go', icon: AppWindow },
      { name: 'Integrations', desc: 'Connect your favorite tools', icon: Puzzle },
    ],
  },
  {
    label: 'Resource',
    items: [
      { name: 'Documentation', desc: 'How to use Pallywear', icon: Book },
      { name: 'Product Blog', desc: 'Latest updates & insights', icon: Newspaper },
      { name: 'Help Center', desc: '24/7 technical support', icon: HelpCircle },
    ],
  },
  {
    label: 'Pricing',
    items: [
      { name: 'Individual', desc: 'For solo entrepreneurs', icon: Zap },
      { name: 'Team Plan', desc: 'Scale with your team', icon: Users },
      { name: 'Enterprise', desc: 'Custom enterprise solutions', icon: Shield },
    ],
  },
  {
    label: 'Features',
    items: [
      { name: 'Real-time Analytics', desc: 'Track performance live', icon: BarChart3 },
      { name: 'Team Sync', desc: 'Collaborate effortlessly', icon: Globe },
      { name: 'Security', desc: 'Enterprise-grade protection', icon: Shield },
    ],
  },
];

export default function Store() {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen hero-bg">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between backdrop-blur-md bg-white/30 border-b border-white/20">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden p-2 hover:bg-white/50 rounded-lg transition-colors"
          >
            <Menu className="w-6 h-6 text-gray-600" />
          </button>
          <Logo />
        </div>

        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <div
              key={item.label}
              className="relative"
              onMouseEnter={() => setActiveMenu(item.label)}
              onMouseLeave={() => setActiveMenu(null)}
            >
              <button className="flex items-center gap-1 py-2 text-sm font-medium text-gray-600 hover:text-brand-primary transition-colors outline-none cursor-pointer">
                {item.label} <ChevronDown className={`w-3.5 h-3.5 opacity-50 transition-transform duration-200 ${activeMenu === item.label ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {activeMenu === item.label && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="absolute top-full left-1/2 -translate-x-1/2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 overflow-hidden"
                  >
                    <div className="space-y-1">
                      {item.items.map((subItem) => (
                        <button
                          key={subItem.name}
                          className="w-full flex items-start gap-3 p-3 text-left hover:bg-gray-50 rounded-xl transition-colors group cursor-pointer"
                        >
                          <div className="p-2 bg-gray-50 group-hover:bg-brand-secondary/30 rounded-lg text-gray-400 group-hover:text-brand-primary transition-colors">
                            <subItem.icon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{subItem.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{subItem.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="bg-gray-50/50 p-4 border-t border-gray-50">
                      <button className="text-xs font-bold text-brand-primary uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all cursor-pointer text-left w-full">
                        See all {item.label} <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Link to="/login" className="hidden sm:block">
            <Button variant="outline" size="sm" className="bg-white/50">Sign in</Button>
          </Link>
          <Link to="/register">
            <Button variant="primary" size="sm">Get Started</Button>
          </Link>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-full max-w-sm bg-white z-[70] shadow-2xl p-6 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <Logo />
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>

              <div className="space-y-8">
                {navItems.map((category) => (
                  <div key={category.label}>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 px-2">
                      {category.label}
                    </p>
                    <div className="space-y-2">
                      {category.items.map((item) => (
                        <button
                          key={item.name}
                          className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors text-left group"
                        >
                          <div className="p-2 bg-gray-50 group-hover:bg-brand-secondary/30 rounded-lg text-gray-400 group-hover:text-brand-primary transition-colors">
                            <item.icon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                            <p className="text-xs text-gray-400">{item.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-8 border-t border-gray-100 space-y-4">
                <Link to="/login" className="block">
                  <Button variant="outline" className="w-full py-4 text-base">Sign in</Button>
                </Link>
                <Link to="/register" className="block">
                  <Button variant="primary" className="w-full py-4 text-base">Get Started Free</Button>
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <main className="pt-40 pb-20 px-6 max-w-7xl mx-auto text-center">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-5xl md:text-7xl font-bold text-brand-dark mb-6 leading-[1.1] tracking-tight"
        >
          Unlock Insights and <br /> Collaborate Better
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="text-lg md:text-xl text-gray-500 mb-10 max-w-2xl mx-auto"
        >
          Powerful reporting tools and team features designed for growth.
          Manage leads, track performance, and scale your sales funnel.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          <Link to="/login">
            <Button variant="outline" size="lg" className="bg-white gap-2">
              See in Action
            </Button>
          </Link>
          <Link to="/register">
            <Button variant="primary" size="lg" className="gap-2">
              Start Free Trial <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </motion.div>

        {/* Dashboard Preview Mockup - as seen in the image */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 1 }}
          className="mt-20 glass-card rounded-2xl overflow-hidden shadow-2xl border-white/40 max-w-5xl mx-auto relative group"
        >
          <img
            src="https://picsum.photos/seed/dashboard/1200/800?blur=1"
            alt="Dashboard Preview"
            className="w-full opacity-80 group-hover:opacity-100 transition-opacity duration-700"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white/60 to-transparent pointer-events-none" />
        </motion.div>
      </main>
    </div>
  );
}
