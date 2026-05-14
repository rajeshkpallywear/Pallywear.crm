import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLeads } from '../context/LeadContext';
import {
  Layout, Bell, Settings, BarChart3,
  Users, LogOut, TrendingUp, DollarSign, Activity, Download, Shield
} from 'lucide-react';
import {
  ResponsiveContainer, FunnelChart, Funnel, LabelList,
  Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { Button } from '../components/Button';
import { useNavigate } from 'react-router-dom';
import LeadManager from '../components/LeadManager';
import InvoiceManager from '../components/InvoiceManager';
import ProfileSetting from '../components/ProfileSetting';
import Logo from '../components/Logo';
import { cn } from '../lib/utils';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { leads } = useLeads();
  const navigate = useNavigate();
  const [showProfileModal, setShowProfileModal] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'dashboard' | 'reports' | 'clients' | 'invoices'>('dashboard');

  const filteredLeads = user?.role === 'admin'
    ? leads
    : leads.filter(l => l.createdBy === user?.id);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const funnelData = [
    { value: filteredLeads.length * 10 || 0, name: 'Lead', fill: '#1A0B91' },
    { value: filteredLeads.filter(l => l.leadType === 'Warm' || l.leadType === 'Hot').length * 8 || 0, name: 'Contact', fill: '#4D109E' },
    { value: filteredLeads.filter(l => l.leadType === 'Hot').length * 5 || 0, name: 'Quote', fill: '#7F14AB' },
    { value: filteredLeads.filter(l => l.convertedValue > 0).length * 2 || 0, name: 'Deal', fill: '#B117B1' },
  ];

  const totalForecast = filteredLeads.reduce((sum, l) => sum + l.forecastedValue, 0);
  const totalConverted = filteredLeads.reduce((sum, l) => sum + l.convertedValue, 0);

  return (
    <div className="flex bg-brand-light min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed inset-y-0 h-full overflow-hidden shadow-sm z-40">
        <div className="p-6 border-b border-gray-50 flex items-center justify-center">
          <Logo />
        </div>

        <nav className="p-4 space-y-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-xl font-bold text-sm transition-all",
              activeTab === 'dashboard' ? "bg-white text-brand-primary border border-brand-primary/10 shadow-sm" : "text-gray-500 hover:bg-gray-50"
            )}
          >
            <Layout className="w-4 h-4" /> Dashboard
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-xl font-bold text-sm transition-all",
              activeTab === 'reports' ? "bg-white text-brand-primary border border-brand-primary/10 shadow-sm" : "text-gray-500 hover:bg-gray-50"
            )}
          >
            <BarChart3 className="w-4 h-4" /> Reports
          </button>
          <button
            onClick={() => setActiveTab('clients')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-xl font-bold text-sm transition-all",
              activeTab === 'clients' ? "bg-white text-brand-primary border border-brand-primary/10 shadow-sm" : "text-gray-500 hover:bg-gray-50"
            )}
          >
            <Users className="w-4 h-4" /> Clients
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-xl font-bold text-sm transition-all",
              activeTab === 'invoices' ? "bg-white text-brand-primary border border-brand-primary/10 shadow-sm" : "text-gray-500 hover:bg-gray-50"
            )}
          >
            <Activity className="w-4 h-4" /> Invoices
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={() => navigate('/admin')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl font-bold text-sm text-gray-500 hover:text-brand-primary hover:bg-brand-secondary transition-all"
            >
              <Shield className="w-4 h-4" /> Admin Dashboard
            </button>
          )}
        </nav>

        <div className="mt-auto p-4 border-t border-gray-50">
          <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-2xl">
            <button onClick={() => setShowProfileModal(true)} className="relative group">
              <img src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name}&background=1A0B91&color=fff`} className="w-8 h-8 rounded-full border border-gray-200 shadow-sm" alt="Me" />
              <div className="absolute inset-0 bg-black/5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Settings className="w-3 h-3 text-brand-primary" />
              </div>
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-800 truncate">{user?.name}</p>
              <p className="text-[10px] text-gray-400 capitalize">{user?.role}</p>
            </div>
            <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition-colors px-1">
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
            {user?.role === 'admin' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin')}
                className="text-[10px] h-8 px-3 font-bold uppercase tracking-wider"
              >
                Admin Panel
              </Button>
            )}
            <button className="p-2 hover:bg-gray-50 rounded-lg text-gray-500"><Bell className="w-5 h-5" /></button>
            <button className="p-2 hover:bg-gray-50 rounded-lg text-gray-500" onClick={() => setShowProfileModal(true)}><Settings className="w-5 h-5" /></button>
          </div>
        </header>

        <div className="p-8">
          {activeTab === 'dashboard' ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {[
                  { label: 'Total Leads', val: filteredLeads.length, icon: TrendingUp, color: 'text-white', bg: 'bg-brand-primary' },
                  { label: 'Total Forecast', val: `₹${totalForecast.toLocaleString()}`, icon: DollarSign, color: 'text-white', bg: 'bg-brand-secondary' },
                  { label: 'Conversion', val: `${filteredLeads.length > 0 ? Math.round((totalConverted / totalForecast || 0) * 100) : 0}%`, icon: Activity, color: 'text-white', bg: 'bg-brand-dark' }
                ].map((stat, i) => (
                  <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className={`w-12 h-12 ${stat.bg} rounded-full flex items-center justify-center ${stat.color} shadow-lg shadow-brand-primary/10`}>
                      <stat.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{stat.label}</p>
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
                      <BarChart data={filteredLeads.slice(0, 7).map(l => ({ ...l, displayValue: l.netTotal || l.totalOrderValue }))}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="name" hide />
                        <YAxis hide />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="displayValue" fill="#1A0B91" radius={[6, 6, 0, 0]} barSize={40} />
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
            </>
          ) : activeTab === 'reports' ? (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Personal Reports</h2>
                <Button variant="outline" className="gap-2">
                  <Download className="w-4 h-4" /> Download All
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                  <h3 className="font-bold text-gray-800 mb-6">Monthly Conversions</h3>
                  <div className="h-64 flex items-end gap-3">
                    {[40, 70, 45, 90, 65, 80].map((h, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-2">
                        <div className="w-full bg-brand-secondary rounded-lg transition-all hover:bg-brand-primary" style={{ height: `${h}%` }} />
                        <span className="text-[10px] text-gray-400 font-bold uppercase">M{i + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                  <h3 className="font-bold text-gray-800 mb-6">Performance Matrix</h3>
                  <div className="space-y-4">
                    {[
                      { label: 'Follow-up Rate', pct: 92 },
                      { label: 'Closing Speed', pct: 75 },
                      { label: 'Client Satisfaction', pct: 88 }
                    ].map((m, i) => (
                      <div key={i} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold text-gray-500 uppercase">
                          <span>{m.label}</span>
                          <span>{m.pct}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-primary rounded-full" style={{ width: `${m.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'clients' ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">My Clients</h2>
                <span className="px-3 py-1 bg-brand-secondary text-brand-primary rounded-full text-[10px] font-bold uppercase">Active Portfolios</span>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-500 font-medium">
                    <tr>
                      <th className="px-6 py-4 border-b border-gray-100">Client Info</th>
                      <th className="px-6 py-4 border-b border-gray-100">Company</th>
                      <th className="px-6 py-4 border-b border-gray-100">Total Value</th>
                      <th className="px-6 py-4 border-b border-gray-100">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredLeads.map((l, i) => (
                      <tr key={i} className="hover:bg-gray-50/50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center text-white font-bold text-xs shadow-sm shadow-brand-primary/20">
                              {l.name.charAt(0)}
                            </div>
                            <span className="font-bold text-gray-800">{l.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-500">{l.companyName}</td>
                        <td className="px-6 py-4 font-bold text-brand-primary">₹{l.totalOrderValue.toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-bold uppercase rounded-full border border-green-100">
                            <div className="w-1 h-1 bg-green-500 rounded-full" />
                            Active
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filteredLeads.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic">No clients assigned yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Invoice Center</h2>
                <span className="px-3 py-1 bg-brand-secondary text-brand-primary rounded-full text-[10px] font-bold uppercase">Billing & Payments</span>
              </div>
              <InvoiceManager />
            </div>
          )}
        </div>
      </main>
      <ProfileSetting isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />
    </div>
  );
}
