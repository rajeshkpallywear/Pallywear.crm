import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLeads } from '../context/LeadContext';
import {
  Layout, Bell, Settings, BarChart3,
  Users, LogOut, TrendingUp, DollarSign, Activity
} from 'lucide-react';
import {
  ResponsiveContainer, FunnelChart, Funnel, LabelList,
  Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { Button } from '../components/Button';
import { useNavigate } from 'react-router-dom';
import LeadManager from '../components/LeadManager';
import ProfileSettings from '../components/ProfileSetting';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { leads } = useLeads();
  const navigate = useNavigate();
  const [showProfileModal, setShowProfileModal] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/Pallywear');
  };

  const funnelData = [
    { value: leads.length * 10 || 10, name: 'Lead', fill: '#3291B6' },
    { value: leads.filter(l => l.leadType === 'Warm' || l.leadType === 'Hot').length * 8 || 8, name: 'Contact', fill: '#48A9C5' },
    { value: leads.filter(l => l.leadType === 'Hot').length * 5 || 5, name: 'Quote', fill: '#5CBFD4' },
    { value: leads.filter(l => l.convertedValue > 0).length * 2 || 2, name: 'Deal', fill: '#70D5E3' },
  ];

  const totalForecast = leads.reduce((sum, l) => sum + l.forecastedValue, 0);
  const totalConverted = leads.reduce((sum, l) => sum + l.convertedValue, 0);

  return (
    <div className="flex bg-brand-light min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed inset-y-0 h-full overflow-hidden">
        <div className="p-6 flex items-center gap-2 border-b border-gray-50">
          <div className="w-8 h-8 bg-brand-dark rounded-lg flex items-center justify-center">
            <Layout className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-lg">Pallywear</span>
        </div>

        <nav className="p-4 space-y-1">
          <button className="w-full flex items-center gap-3 px-3 py-2 bg-brand-secondary text-brand-primary rounded-xl font-medium text-sm">
            <Layout className="w-4 h-4" /> Dashboard
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 text-gray-400 hover:bg-gray-50 rounded-xl text-sm transition-colors">
            <BarChart3 className="w-4 h-4" /> Reports
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 text-gray-400 hover:bg-gray-50 rounded-xl text-sm transition-colors">
            <Users className="w-4 h-4" /> Clients
          </button>
        </nav>

        <div className="mt-auto p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 p-2 bg-gray-50/50 rounded-xl">
            <button onClick={() => setShowProfileModal(true)} className="relative group">
              <img src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name}&background=3291B6&color=fff`} className="w-8 h-8 rounded-full border border-white shadow-sm" alt="Me" />
              <div className="absolute inset-0 bg-black/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Settings className="w-3 h-3 text-white" />
              </div>
            </button>
            <div className="flex-1">
              <p className="text-xs font-bold text-gray-800">{user?.name}</p>
              <p className="text-[10px] text-gray-400 capitalize">{user?.role}</p>
            </div>
            <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 ml-64 min-h-screen">
        <header className="h-16 bg-white border-b border-gray-200 px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="text-sm font-medium text-gray-500">
            Welcome back, <span className="text-gray-900 font-bold">{user?.name}</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-gray-50 rounded-lg text-gray-500"><Bell className="w-5 h-5" /></button>
            <button className="p-2 hover:bg-gray-50 rounded-lg text-gray-500" onClick={() => setShowProfileModal(true)}><Settings className="w-5 h-5" /></button>
          </div>
        </header>

        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[
              { label: 'Active Leads', val: leads.length, icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-50' },
              { label: 'Total Forecast', val: `₹${totalForecast.toLocaleString()}`, icon: DollarSign, color: 'text-green-500', bg: 'bg-green-50' },
              { label: 'Conversion', val: `${leads.length > 0 ? Math.round((totalConverted / totalForecast || 0) * 100) : 0}%`, icon: Activity, color: 'text-purple-500', bg: 'bg-purple-50' }
            ].map((stat, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                <div className={`w-12 h-12 ${stat.bg} rounded-xl flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.val}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-sm text-gray-800 mb-6">Value Overview</h3>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={leads.slice(0, 7)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" hide />
                    <YAxis hide />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="totalOrderValue" fill="#3291B6" radius={[6, 6, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-sm text-gray-800 mb-6">Funnel</h3>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <FunnelChart>
                    <Funnel dataKey="value" data={funnelData} isAnimationActive>
                      <LabelList position="right" fill="#888" stroke="none" dataKey="name" />
                    </Funnel>
                  </FunnelChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <div className="w-1.5 h-6 bg-brand-primary rounded-full" />
              Lead Management
            </h2>
            <LeadManager />
          </div>
        </div>
      </main>
      <ProfileSettings isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />
    </div>
  );
}
