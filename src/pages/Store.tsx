import React from 'react';
import { Button } from '../components/Button';
import { ChevronDown, Play, ArrowRight, Layout } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';

export default function Store() {
  return (
    <div className="min-height-screen hero-bg">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between backdrop-blur-md bg-white/30 border-bottom border-white/20">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-brand-dark rounded-xl flex items-center justify-center">
            <Layout className="text-white w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight text-brand-dark">Pallywear</span>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          {['Product', 'Resource', 'Pricing', 'Features'].map((item) => (
            <button key={item} className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-brand-primary transition-colors">
              {item} <ChevronDown className="w-4 h-4 opacity-50" />
            </button>
          ))}
        </nav>

        <Link to="/login">
          <Button variant="outline" size="sm" className="bg-white/50">Sign in</Button>
        </Link>
      </header>

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
          <Button variant="outline" size="lg" className="bg-white gap-2">
            See in Action
          </Button>
          <Button variant="primary" size="lg" className="gap-2">
            Start Free Trial <ArrowRight className="w-4 h-4" />
          </Button>
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
