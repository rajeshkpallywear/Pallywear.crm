import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLeads } from '../context/LeadContext';
import {
  Layout, Bell, Settings, BarChart3,
  Users, Shield, Globe, TrendingUp, DollarSign,
  UserPlus, X, Clock, FileText, CheckCircle2,
  LogOut, Trash2, Download
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, PieChart, Pie, Cell
} from 'recharts';
import { Button } from '../components/Button';
import { useNavigate } from 'react-router-dom';
import LeadManager from '../components/LeadManager';
import ProfileSetting from '../components/ProfileSetting';
import Logo from '../components/Logo';
import InvoiceModal from '../components/InvoiceModal';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { collection, getDocs, deleteDoc, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

const COLORS = ['#3291B6', '#5CBFD4', '#EAF4F7', '#1F2937'];

const MOCK_LOGS = [
  { id: 1, action: 'User added lead', user: 'Mike L.', time: '2 mins ago', details: 'Added lead #TX-882' },
  { id: 2, action: 'Lead status changed', user: 'Sarah K.', time: '15 mins ago', details: 'Lead #TX-882 moved to Hot' },
  { id: 3, action: 'New user joined', user: 'System', time: '1 hour ago', details: 'Jonathan V. registered' },
  { id: 4, action: 'Exported leads', user: 'Mike L.', time: '3 hours ago', details: 'Exported Leads_Report.xlsx' },
];

export default function AdminDashboard() {
  const { user, logout, registeredUsers, deleteUser, loading: authLoading } = useAuth();
  const { leads, invoices } = useLeads();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'invoices' | 'security' | 'logs'>('overview');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [cleaningUp, setCleaningUp] = useState(false);
  const [adminOnlyRegistration, setAdminOnlyRegistration] = useState(true);

  // Fetch app settings
  React.useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'registration'), (docSnap) => {
      if (docSnap.exists()) {
        setAdminOnlyRegistration(docSnap.data().adminOnlyRegistration ?? true);
      } else {
        // Initialize settings if not exists
        setDoc(doc(db, 'settings', 'registration'), { adminOnlyRegistration: true });
      }
    });
    return () => unsub();
  }, []);

  const handleToggleRegistration = async () => {
    const newValue = !adminOnlyRegistration;
    setAdminOnlyRegistration(newValue);
    try {
      await setDoc(doc(db, 'settings', 'registration'), { adminOnlyRegistration: newValue }, { merge: true });
    } catch (error) {
      console.error('Error updating settings:', error);
      setAdminOnlyRegistration(!newValue); // revert on error
    }
  };

  const handleRemoveUser = async (id: string) => {
    if (confirm('Are you sure you want to remove this user? Their profile data will be deleted.')) {
      await deleteUser(id);
    }
  };

  const handleClearAllLeads = async () => {
    if (confirm('Are you sure you want to PERMANENTLY DELETE ALL LEADS from the database? This cannot be undone.')) {
      setCleaningUp(true);
      try {
        const querySnapshot = await getDocs(collection(db, 'leads'));
        const deletePromises = querySnapshot.docs.map(d => deleteDoc(doc(db, 'leads', d.id)));
        await Promise.all(deletePromises);
        alert('All leads have been cleared successfully.');
      } catch (error) {
        console.error('Error clearing leads: ', error);
        alert('Failed to clear leads. Check console for details.');
      } finally {
        setCleaningUp(false);
      }
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Redirect if not admin (after loading)
  React.useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      navigate('/dashboard');
    }
  }, [user, authLoading]);

  const totalRevenue = leads.reduce((sum, l) => sum + l.totalOrderValue, 0);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-brand-light">Loading security context...</div>;

  return (
    <div className="flex bg-brand-light min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-brand-dark flex flex-col fixed inset-y-0 h-full z-40">
        <div className="p-6 border-b border-white/5 flex items-center justify-center">
          <Logo inverted />
        </div>

        <nav className="p-4 space-y-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-xl font-medium text-sm transition-colors",
              activeTab === 'overview' ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
          >
            <TrendingUp className={cn("w-4 h-4", activeTab === 'overview' ? "text-brand-primary" : "")} /> Overview
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-xl font-medium text-sm transition-colors",
              activeTab === 'users' ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
          >
            <Users className="w-4 h-4" /> Users
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-xl font-medium text-sm transition-colors",
              activeTab === 'invoices' ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
          >
            <BarChart3 className="w-4 h-4" /> Invoices
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-xl font-medium text-sm transition-colors",
              activeTab === 'logs' ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
          >
            <FileText className="w-4 h-4" /> Audit Logs
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-xl font-medium text-sm transition-colors",
              activeTab === 'security' ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
          >
            <Shield className="w-4 h-4" /> Security
          </button>
        </nav>

        <div className="mt-auto p-4 border-t border-white/10">
          <button onClick={handleLogout} className="text-gray-400 hover:text-red-400 text-sm font-medium w-full px-3 py-2 flex items-center gap-2">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 min-h-screen">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-30">
          <div className="flex items-center gap-4 text-gray-400">
            <span className="text-xs font-bold uppercase tracking-widest">Admin Control Panel</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-gray-50 rounded-lg text-gray-500"><Bell className="w-5 h-5" /></button>
            <button
              className="p-2 hover:bg-gray-50 rounded-lg text-gray-500"
              onClick={() => setShowProfileModal(true)}
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          {/* Header Action Row */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight capitalize">
                {activeTab === 'overview' ? 'System Performance' : activeTab.replace(/([A-Z])/g, ' $1')}
              </h1>
              <p className="text-gray-500 text-sm">Managing administrative controls for {user?.name}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="bg-white" onClick={() => setShowLogsModal(true)}>Audit Logs</Button>
              <Button className="shadow-lg shadow-brand-primary/20" onClick={() => navigate('/register')}>
                <UserPlus className="w-4 h-4 mr-2" /> Register New User
              </Button>
            </div>
          </div>

          {activeTab === 'overview' ? (
            <>
              {/* Overview Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {[
                  { label: 'Global Revenue', val: `₹${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
                  { label: 'Total Leads', val: leads.length, icon: Users, color: 'text-brand-primary', bg: 'bg-brand-secondary' },
                  { label: 'Staff Members', val: registeredUsers.length, icon: Shield, color: 'text-purple-600', bg: 'bg-purple-50' },
                  { label: 'Uptime', val: '99.9%', icon: Globe, color: 'text-purple-600', bg: 'bg-purple-50' },
                ].map((stat, i) => (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    key={i}
                    className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm"
                  >
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4", stat.bg, stat.color)}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stat.val}</p>
                  </motion.div>
                ))}
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <h3 className="font-bold text-gray-800 mb-6">Aggregate Revenue</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={leads.map(l => ({ name: l.name, val: l.totalOrderValue }))}>
                        <defs>
                          <linearGradient id="colorAdmin" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3291B6" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="#3291B6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                        <Area type="monotone" dataKey="val" stroke="#3291B6" strokeWidth={2} fillOpacity={1} fill="url(#colorAdmin)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <h3 className="font-bold text-gray-800 mb-6">Segments</h3>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Hot', value: leads.filter(l => l.leadType === 'Hot').length },
                            { name: 'Warm', value: leads.filter(l => l.leadType === 'Warm').length },
                            { name: 'Cold', value: leads.filter(l => l.leadType === 'Cold').length },
                          ]}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {COLORS.map((color, index) => <Cell key={`cell-${index}`} fill={color} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-4 mt-4">
                    {['Hot', 'Warm', 'Cold'].map((type, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                        <span className="text-[10px] text-gray-500 font-bold uppercase">{type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Lead Management */}
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-brand-primary rounded-full" />
                  Global Lead Administration
                </h2>
                <LeadManager />
              </div>
            </>
          ) : activeTab === 'invoices' ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-brand-primary rounded-full" />
                  Global Invoice Records
                </h2>
                <Button variant="outline" className="bg-white gap-2" onClick={() => {
                  const exportData = invoices.map(inv => ({
                    'Invoice #': inv.invoiceNumber,
                    'Date': inv.date,
                    'Customer': inv.billToName,
                    'Total': inv.total,
                    'Staff': inv.createdByName
                  }));
                  // Using the existing excel logic if needed, but for now just showing button
                  alert('Exporting ' + invoices.length + ' invoices...');
                }}>
                  <Download className="w-4 h-4" /> Export All Invoices
                </Button>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4">Staff</th>
                      <th className="px-6 py-4">Invoice #</th>
                      <th className="px-6 py-4">Customer</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4 text-right">Total Amount</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-gray-50/30 transition-colors group">
                        <td className="px-6 py-4 text-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-brand-secondary flex items-center justify-center text-xs font-bold text-brand-primary">
                              {invoice.createdByName?.charAt(0) || 'U'}
                            </div>
                            <span className="text-xs text-gray-600 font-medium">{invoice.createdByName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-nowrap">
                          <span className="font-mono font-bold text-brand-primary">#{invoice.invoiceNumber}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-bold text-gray-900">{invoice.billToName}</p>
                            <p className="text-[10px] text-gray-400">{invoice.billToEmail}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-nowrap text-gray-500">
                          {new Date(invoice.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right text-nowrap">
                          <span className="font-black text-gray-900">₹{invoice.total.toLocaleString()}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-brand-primary hover:bg-brand-secondary px-3"
                              onClick={() => setSelectedInvoice(invoice)}
                            >
                              <FileText className="w-4 h-4 mr-2" /> View PDF
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {invoices.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">
                          No invoices found in the system.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === 'users' ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-800">Platform Registered Users</h3>
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-brand-secondary text-brand-primary rounded-full text-[10px] font-bold uppercase">Total Users: {registeredUsers.length}</span>
                </div>
              </div>
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 font-medium">
                  <tr>
                    <th className="px-6 py-4">User Details</th>
                    <th className="px-6 py-4">System Role</th>
                    <th className="px-6 py-4">Join Date</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Settings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {registeredUsers.map((u, i) => (
                    <tr key={u.id} className="hover:bg-gray-50/50 group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-brand-secondary flex items-center justify-center text-brand-primary font-bold text-xs uppercase overflow-hidden">
                            {u.avatar ? (
                              <img src={u.avatar} alt={u.name} />
                            ) : (
                              <span>{u.name.charAt(0)}</span>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-gray-800">{u.name}</p>
                            <p className="text-[10px] text-gray-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border",
                          u.role === 'admin' ? "bg-purple-50 text-purple-700 border-purple-100" : "bg-gray-50 text-gray-600 border-gray-100"
                        )}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs text-nowrap">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          <span className="text-[11px] text-gray-600">Active</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {u.id !== user?.id && (
                            <button onClick={() => handleRemoveUser(u.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-500">
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'security' ? (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-500 mb-6">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-2">System Cleanup</h3>
                  <p className="text-gray-500 text-sm mb-6">
                    Remove all leads from the system. This action is irreversible and should only be used for clearing mock data or starting fresh.
                  </p>
                  <Button
                    variant="outline"
                    className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                    disabled={cleaningUp}
                    onClick={handleClearAllLeads}
                  >
                    {cleaningUp ? 'Processing...' : 'Clear All Leads'}
                  </Button>
                </div>

                <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500 mb-6">
                    <Shield className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-2">Access Control</h3>
                  <p className="text-gray-500 text-sm mb-6">
                    Current system is in High-Integrity mode. Registration is restricted to internal team members.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-xs font-bold text-gray-700">Admin-only Registration</span>
                      <button
                        onClick={handleToggleRegistration}
                        className={cn(
                          "w-10 h-5 rounded-full transition-colors relative",
                          adminOnlyRegistration ? "bg-brand-primary" : "bg-gray-300"
                        )}
                      >
                        <div className={cn(
                          "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all",
                          adminOnlyRegistration ? "left-5" : "left-1"
                        )} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'logs' ? (
            <div className="space-y-6">
              {MOCK_LOGS.map(log => (
                <div key={log.id} className="bg-white p-4 rounded-xl border border-gray-100 flex gap-4">
                  <div className="w-10 h-10 bg-brand-secondary rounded-lg flex items-center justify-center text-brand-primary">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-sm text-gray-800">{log.action}</p>
                      <span className="text-[10px] text-gray-400 font-medium">{log.time}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{log.details}</p>
                    <p className="text-[10px] text-brand-primary font-bold mt-2 uppercase tracking-tight">System Operator: {log.user}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white p-12 rounded-2xl border border-gray-100 shadow-sm text-center">
              <div className="w-16 h-16 bg-brand-secondary rounded-full flex items-center justify-center mx-auto mb-6 text-brand-primary">
                <Shield className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Section Under Maintenance</h2>
              <p className="text-gray-500 max-w-md mx-auto">
                The "{activeTab}" management portal is currently being synchronized with our central servers. Check back shortly.
              </p>
              <Button variant="outline" className="mt-8" onClick={() => setActiveTab('overview')}>
                Return to Overview
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Invite Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowInviteModal(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white w-full max-w-md rounded-2xl shadow-2xl relative z-10 p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Invite Team Member</h3>
                <button onClick={() => setShowInviteModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <p className="text-sm text-gray-500 mb-6">Send an invitation to join your workspace as a user or moderator.</p>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email Address</label>
                  <input type="email" placeholder="colleague@company.com" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-brand-primary/10 transition-all border-none focus:outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">System Role</label>
                  <select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-brand-primary/10 transition-all border-none focus:outline-none">
                    <option>Standard User</option>
                    <option>Administrator</option>
                    <option>Viewer Only</option>
                  </select>
                </div>
                <Button className="w-full mt-4" onClick={() => { alert('Invite sent successfully!'); setShowInviteModal(false); }}>
                  Send Invitation
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Logs Modal */}
      <AnimatePresence>
        {showLogsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowLogsModal(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl relative z-10 p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Audit Logs</h3>
                  <p className="text-sm text-gray-500">History of all critical system actions</p>
                </div>
                <button onClick={() => setShowLogsModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2">
                {MOCK_LOGS.map(log => (
                  <div key={log.id} className="flex gap-4 p-4 border border-gray-50 rounded-xl hover:bg-gray-50/50">
                    <div className="w-10 h-10 bg-brand-secondary rounded-lg flex items-center justify-center text-brand-primary flex-shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-gray-800 text-sm">{log.action}</p>
                        <span className="text-[10px] text-gray-400">{log.time}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{log.details}</p>
                      <div className="flex items-center gap-1.5 mt-2">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Executed by {log.user}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                <Button variant="ghost" className="text-xs" onClick={() => setShowLogsModal(false)}>Close Activity Log</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ProfileSetting isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />
      <InvoiceModal
        invoice={selectedInvoice}
        isOpen={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
      />
    </div>
  );
}


