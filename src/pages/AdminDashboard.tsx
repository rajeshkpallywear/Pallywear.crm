import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLeads } from '../context/LeadContext';
import {
  Layout, Bell, Settings, BarChart3,
  Users, Shield, Globe, TrendingUp, DollarSign,
  UserPlus, X, Clock, FileText, CheckCircle2,
  LogOut, Trash2, Download, ChevronLeft, ChevronRight, Menu, Zap, MessageSquare,
  Search, Calendar
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, PieChart, Pie, Cell
} from 'recharts';
import { Button } from '../components/Button';
import { useNavigate } from 'react-router-dom';
import LeadManager from '../components/LeadManager';
import ProfileSettings from '../components/ProfileSettings';
import Logo from '../components/Logo';
import InvoiceModal from '../components/InvoiceModal';
import OrderDetailModal from '../components/OrderDetailModal';
import { Order, OrderStatus } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { collection, getDocs, deleteDoc, doc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import ConversationDashboard from '../components/ConversationDashboard';

const COLORS = ['#3291B6', '#5CBFD4', '#EAF4F7', '#1F2937'];

const MOCK_LOGS = [
  { id: 1, action: 'User added lead', user: 'Mike L.', time: '2 mins ago', details: 'Added lead #TX-882' },
  { id: 2, action: 'Lead status changed', user: 'Sarah K.', time: '15 mins ago', details: 'Lead #TX-882 moved to Hot' },
  { id: 3, action: 'New user joined', user: 'System', time: '1 hour ago', details: 'Jonathan V. registered' },
  { id: 4, action: 'Exported leads', user: 'Mike L.', time: '3 hours ago', details: 'Exported Leads_Report.xlsx' },
];

export default function AdminDashboard() {
  const { user, logout, registeredUsers, deleteUser, loading: authLoading } = useAuth();
  const { leads, invoices, orders, updateOrder, deleteOrder } = useLeads();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'invoices' | 'security' | 'logs' | 'orders' | 'leaves'>('overview');
  const [selectedDept, setSelectedDept] = useState<'staff' | 'accounts' | 'order_management' | 'production' | 'delivery' | 'designers'>('staff');
  const [selectedSection, setSelectedSection] = useState<'total' | 'hold' | 'completed'>('total');
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<Order | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const isSidebarCollapsed = true;
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [cleaningUp, setCleaningUp] = useState(false);
  const [adminOnlyRegistration, setAdminOnlyRegistration] = useState(true);
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [inboxSelectedId, setInboxSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('last_month');
  const [loginLogs, setLoginLogs] = useState<any[]>([]);
  const [leavesList, setLeavesList] = React.useState<any[]>([]);

  React.useEffect(() => {
    const unsub = onSnapshot(collection(db, 'pallywear_login_logs'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLoginLogs(list);
    });
    return () => unsub();
  }, []);

  React.useEffect(() => {
    const unsub = onSnapshot(collection(db, 'leaves'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLeavesList(list);
    }, (error) => {
      console.error("Firestore leaves subscription error:", error);
    });
    return () => unsub();
  }, []);

  // Fetch app settings
  React.useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'registration'), (docSnap) => {
      if (docSnap.exists()) {
        setAdminOnlyRegistration(docSnap.data().adminOnlyRegistration ?? true);
      } else {
        setDoc(doc(db, 'settings', 'registration'), { adminOnlyRegistration: true });
      }
    });
    return () => unsub();
  }, []);

  // Listen to inbox trigger
  React.useEffect(() => {
    const handleOpenFeed = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && typeof customEvent.detail === 'string') {
        setInboxSelectedId(customEvent.detail);
      } else {
        setInboxSelectedId(null);
      }
      setIsInboxOpen(true);
    };
    window.addEventListener('open-conversations-feed', handleOpenFeed);
    return () => {
      window.removeEventListener('open-conversations-feed', handleOpenFeed);
    };
  }, []);

  const handleToggleRegistration = async () => {
    const newValue = !adminOnlyRegistration;
    setAdminOnlyRegistration(newValue);
    try {
      await setDoc(doc(db, 'settings', 'registration'), { adminOnlyRegistration: newValue }, { merge: true });
    } catch (error) {
      console.error('Error updating settings:', error);
      setAdminOnlyRegistration(!newValue);
    }
  };

  const isStaff = user?.role === 'staff';

  const handleRemoveUser = async (id: string) => {
    if (isStaff) {
      alert('Only administrators can remove users.');
      return;
    }
    if (confirm('Are you sure you want to remove this user? Their profile data will be deleted.')) {
      await deleteUser(id);
    }
  };

  const handleToggleUserRole = async (userId: string, currentRole: string) => {
    if (isStaff) {
      alert('Only administrators can change roles.');
      return;
    }
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
      try {
        await setDoc(doc(db, 'users', userId), { role: newRole }, { merge: true });
      } catch (error) {
        console.error('Error updating user role:', error);
        alert('Failed to update user role.');
      }
    }
  };

  const handleClearAllLeads = async () => {
    if (isStaff) {
      alert('Only administrators can clear all leads.');
      return;
    }
    if (confirm('Are you sure you want to PERMANENTLY DELETE ALL LEADS from the database? This cannot be undone.')) {
      setCleaningUp(true);
      try {
        const querySnapshot = await getDocs(collection(db, 'leads'));
        const deletePromises = querySnapshot.docs.map(d => deleteDoc(doc(db, 'leads', d.id)));
        await Promise.all(deletePromises);
        alert('All leads have been cleared successfully.');
      } catch (error) {
        console.error('Error clearing leads: ', error);
        alert('Failed to clear leads.');
      } finally {
        setCleaningUp(false);
      }
    }
  };

  const handleDeleteOrder = async (id: string) => {
    if (user?.role !== 'admin') {
      alert('Only administrators can delete orders.');
      return;
    }
    if (confirm('Are you sure you want to delete this order?')) {
      try {
        await deleteOrder(id);
      } catch (error) {
        console.error('Error deleting order:', error);
        alert('Failed to delete order.');
      }
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Redirect if not admin or staff
  React.useEffect(() => {
    if (!authLoading && (!user || (user.role !== 'admin' && user.role !== 'staff'))) {
      navigate('/dashboard');
    }
  }, [user, authLoading]);

  const totalRevenue = leads.reduce((sum, l) => sum + l.totalOrderValue, 0);
  const totalOrdersValue = orders.reduce((sum, o) => sum + (o.financials?.totalAmount || 0), 0);
  const aggregateTotal = totalRevenue + totalOrdersValue;

  const getFilteredDeptOrders = () => {
    switch (selectedDept) {
      case 'staff':
        if (selectedSection === 'hold') {
          return orders.filter(o => o.status === OrderStatus.HOLD && (!o.previousStatus || o.previousStatus === OrderStatus.PENDING || o.previousStatus === OrderStatus.DRAFT));
        } else if (selectedSection === 'completed') {
          return orders.filter(o => o.status !== OrderStatus.PENDING && o.status !== OrderStatus.DRAFT && o.status !== OrderStatus.HOLD);
        } else {
          return orders;
        }
      case 'accounts':
        if (selectedSection === 'hold') {
          return orders.filter(o => o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.ACCOUNTS);
        } else if (selectedSection === 'completed') {
          return orders.filter(o => ![OrderStatus.DRAFT, OrderStatus.PENDING, OrderStatus.ACCOUNTS, OrderStatus.HOLD].includes(o.status));
        } else {
          return orders.filter(o => ![OrderStatus.DRAFT, OrderStatus.PENDING].includes(o.status));
        }
      case 'order_management':
        if (selectedSection === 'hold') {
          return orders.filter(o => o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.ORDER_MANAGEMENT);
        } else if (selectedSection === 'completed') {
          return orders.filter(o => o.status === OrderStatus.DELIVERED);
        } else {
          return orders.filter(o => o.status === OrderStatus.ORDER_MANAGEMENT);
        }
      case 'production':
        if (selectedSection === 'hold') {
          return orders.filter(o => o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.PRODUCTION);
        } else if (selectedSection === 'completed') {
          return orders.filter(o => [OrderStatus.DELIVERY, OrderStatus.DELIVERED].includes(o.status));
        } else {
          return orders.filter(o => ![OrderStatus.DRAFT, OrderStatus.PENDING, OrderStatus.ACCOUNTS, OrderStatus.DESIGN, OrderStatus.ORDER_MANAGEMENT].includes(o.status));
        }
      case 'delivery':
        if (selectedSection === 'hold') {
          return orders.filter(o => o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.DELIVERY);
        } else if (selectedSection === 'completed') {
          return orders.filter(o => o.status === OrderStatus.DELIVERED);
        } else {
          return orders.filter(o => [OrderStatus.DELIVERY, OrderStatus.DELIVERED].includes(o.status) || (o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.DELIVERY));
        }
      case 'designers':
        if (selectedSection === 'hold') {
          return orders.filter(o => o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.DESIGN);
        } else if (selectedSection === 'completed') {
          return orders.filter(o => ![OrderStatus.DRAFT, OrderStatus.PENDING, OrderStatus.ACCOUNTS, OrderStatus.DESIGN, OrderStatus.HOLD].includes(o.status));
        } else {
          return orders.filter(o => ![OrderStatus.DRAFT, OrderStatus.PENDING, OrderStatus.ACCOUNTS].includes(o.status));
        }
      default:
        return orders;
    }
  };

  const getDeptStats = (dept: 'staff' | 'accounts' | 'order_management' | 'production' | 'delivery' | 'designers') => {
    let totalCount = 0;
    let holdCount = 0;
    let completedCount = 0;

    switch (dept) {
      case 'staff':
        holdCount = orders.filter(o => o.status === OrderStatus.HOLD && (!o.previousStatus || o.previousStatus === OrderStatus.PENDING || o.previousStatus === OrderStatus.DRAFT)).length;
        completedCount = orders.filter(o => o.status !== OrderStatus.PENDING && o.status !== OrderStatus.DRAFT && o.status !== OrderStatus.HOLD).length;
        totalCount = orders.length;
        break;
      case 'accounts':
        holdCount = orders.filter(o => o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.ACCOUNTS).length;
        completedCount = orders.filter(o => ![OrderStatus.DRAFT, OrderStatus.PENDING, OrderStatus.ACCOUNTS, OrderStatus.HOLD].includes(o.status)).length;
        totalCount = orders.filter(o => ![OrderStatus.DRAFT, OrderStatus.PENDING].includes(o.status)).length;
        break;
      case 'order_management':
        holdCount = orders.filter(o => o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.ORDER_MANAGEMENT).length;
        completedCount = orders.filter(o => o.status === OrderStatus.DELIVERED).length;
        totalCount = orders.filter(o => o.status === OrderStatus.ORDER_MANAGEMENT).length;
        break;
      case 'production':
        holdCount = orders.filter(o => o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.PRODUCTION).length;
        completedCount = orders.filter(o => [OrderStatus.DELIVERY, OrderStatus.DELIVERED].includes(o.status)).length;
        totalCount = orders.filter(o => ![OrderStatus.DRAFT, OrderStatus.PENDING, OrderStatus.ACCOUNTS, OrderStatus.DESIGN, OrderStatus.ORDER_MANAGEMENT].includes(o.status)).length;
        break;
      case 'delivery':
        holdCount = orders.filter(o => o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.DELIVERY).length;
        completedCount = orders.filter(o => o.status === OrderStatus.DELIVERED).length;
        totalCount = orders.filter(o => [OrderStatus.DELIVERY, OrderStatus.DELIVERED].includes(o.status) || (o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.DELIVERY)).length;
        break;
      case 'designers':
        holdCount = orders.filter(o => o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.DESIGN).length;
        completedCount = orders.filter(o => ![OrderStatus.DRAFT, OrderStatus.PENDING, OrderStatus.ACCOUNTS, OrderStatus.DESIGN, OrderStatus.HOLD].includes(o.status)).length;
        totalCount = orders.filter(o => ![OrderStatus.DRAFT, OrderStatus.PENDING, OrderStatus.ACCOUNTS].includes(o.status)).length;
        break;
    }

    return { totalCount, holdCount, completedCount };
  };

  const selectTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setIsMobileOpen(false);
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-brand-light">Loading security context...</div>;

  const adminNavItems = [
    { id: 'overview' as const, label: 'Overview', icon: TrendingUp },
    { id: 'users' as const, label: 'Users', icon: Users },
    { id: 'orders' as const, label: 'Global Orders', icon: Zap },
    { id: 'invoices' as const, label: 'Invoices', icon: BarChart3 },
    { id: 'logs' as const, label: 'Audit Logs', icon: FileText },
    { id: 'leaves' as const, label: 'Leaves Logs', icon: Calendar },
    { id: 'security' as const, label: 'Security', icon: Shield },
    { id: 'inbox' as const, label: 'Inbox', icon: MessageSquare, action: () => setIsInboxOpen(true) },
    { id: 'user_app' as const, label: 'User App', icon: Layout, action: () => navigate('/dashboard') }
  ];

  return (
    <div className="flex bg-[#f8f9fa] min-h-screen text-slate-800 font-sans antialiased">
      {/* Left Sidebar on Desktop */}
      <aside className={cn(
        "bg-white border-r border-slate-100 flex flex-col z-20 shadow-md transition-all duration-300 flex-shrink-0 sticky top-0 h-screen overflow-y-auto overflow-x-hidden hidden lg:flex relative",
        isSidebarCollapsed ? "w-20" : "w-60"
      )}>


        {/* Navigation Items */}
        <nav className="p-4 space-y-2 flex-1">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            const isInbox = item.id === 'inbox';
            const isAction = !!item.action;
            const isActive = !isInbox && !isAction && activeTab === item.id;
            return (
              <button
                key={item.label}
                onClick={() => item.action ? item.action() : selectTab(item.id as any)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all cursor-pointer text-left relative group",
                  isSidebarCollapsed ? "justify-center px-0" : "",
                  isActive
                    ? "bg-brand-secondary text-brand-primary border border-brand-primary/20 shadow-sm"
                    : isInbox
                      ? "bg-purple-55 text-purple-750 hover:bg-purple-100 border border-purple-100"
                      : "text-slate-455 hover:text-slate-700 hover:bg-slate-50"
                )}
                title={isSidebarCollapsed ? item.label : ""}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!isSidebarCollapsed && <span>{item.label}</span>}
                
                {isSidebarCollapsed && (
                  <div className="absolute left-20 bg-slate-900 text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap shadow-md">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Bottom (Profile & Logout) */}
        <div className="p-4 border-t border-slate-50 space-y-2 shrink-0 bg-slate-55/50">
          <button
            onClick={() => setShowProfileModal(true)}
            className={cn(
              "w-full flex items-center gap-3 p-1.5 hover:bg-slate-100 rounded-xl transition-all relative group",
              isSidebarCollapsed ? "justify-center" : ""
            )}
          >
            <img
              src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name}&background=1A0B91&color=fff`}
              className="w-8 h-8 rounded-full border border-slate-200 shadow-sm flex-shrink-0"
              alt="Me"
              referrerPolicy="no-referrer"
            />
            {!isSidebarCollapsed && (
              <div className="text-left min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-800 truncate leading-none">{user?.name}</p>
                <p className="text-[9px] text-slate-455 capitalize truncate mt-0.5">{String(user?.role || '')}</p>
              </div>
            )}
          </button>
          
          <button
            onClick={handleLogout}
            className={cn(
              "w-full text-red-600 hover:bg-red-50 p-2.5 rounded-xl flex items-center gap-3 transition-colors text-xs font-bold uppercase",
              isSidebarCollapsed ? "justify-center" : ""
            )}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!isSidebarCollapsed && <span>Logout</span>}
          </button>
        </div>


      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 min-w-0 p-6 md:p-8 lg:p-10 overflow-y-auto flex flex-col h-screen bg-[#f8f9fa] relative select-text">
        {/* Top Header Panel */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <Logo className="h-10" />
            {/* Mobile menu hamburger */}
            <button
              onClick={() => setIsMobileOpen(true)}
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 lg:hidden flex-shrink-0"
              aria-label="Toggle menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap select-none">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                id="admin-header-search"
                type="text"
                placeholder="Search orders, users…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none shadow-sm w-44 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 placeholder:text-slate-400 transition-colors"
              />
            </div>

            {/* Time-period filter */}
            <select
              id="admin-header-period-filter"
              value={filterPeriod}
              onChange={e => setFilterPeriod(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-650 outline-none shadow-sm cursor-pointer hover:border-slate-300 transition-colors"
            >
              <option value="last_month">Last month</option>
              <option value="this_month">This month</option>
              <option value="last_quarter">Last quarter</option>
              <option value="this_year">This year</option>
            </select>

            {/* Clients filter */}
            <select
              id="admin-header-clients-filter"
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-650 outline-none shadow-sm cursor-pointer hover:border-slate-300 transition-colors"
            >
              <option value="">All Clients</option>
              {leads.slice(0, 10).map((l: any) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>

            {/* Export */}
            <button
              id="admin-header-export-btn"
              onClick={() => {
                const rows = [['Lead', 'Company', 'Value', 'Type'], ...leads.map((l: any) => [l.name, l.companyName, l.totalOrderValue, l.leadType])];
                const csv = rows.map((r: any[]) => r.join(',')).join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = 'admin_export.csv'; a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-brand-primary text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-brand-primary/90 transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>

            <Button variant="secondary" size="sm" className="shadow-sm" onClick={() => navigate('/register')}>
              <UserPlus className="w-3.5 h-3.5 mr-1" /> Register New User
            </Button>
          </div>
        </div>

        {/* Tab view containers */}
        <div className="flex-1 w-full">
          {activeTab === 'overview' ? (
            <div className="space-y-6">
              {/* Premium overview stats metrics grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { label: 'Aggregate Value', val: `₹${aggregateTotal.toLocaleString()}`, trend: '+7.4%', isPositive: true },
                  { label: 'Total Leads', val: leads.length, trend: '+2.0%', isPositive: true },
                  { label: 'Global Orders', val: orders.length, trend: '+3.5%', isPositive: true },
                  { label: 'Registered Team', val: registeredUsers.length, trend: 'Online', isPositive: true },
                  { label: 'Invoices Issued', val: invoices.length, trend: '+5.0%', isPositive: true }
                ].map((s, idx) => (
                  <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between text-left">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{s.label}</span>
                    <div className="flex items-baseline gap-2 mt-3 justify-between flex-wrap">
                      <span className="text-xl font-black text-slate-800 tracking-tight">{s.val}</span>
                      <span className={cn(
                        "text-[9px] font-black px-1.5 py-0.5 rounded-full",
                        s.isPositive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-650"
                      )}>
                        {s.trend}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Charts grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-left">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Aggregate Revenue</h3>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={leads.map(l => ({ name: l.name, val: l.totalOrderValue }))}>
                        <defs>
                          <linearGradient id="colorAdmin" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }} />
                        <Area type="monotone" dataKey="val" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorAdmin)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-left">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Lead Segments</h3>
                  <div className="h-[220px] flex items-center justify-center">
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
                  <div className="flex justify-center gap-4 mt-2">
                    {['Hot', 'Warm', 'Cold'].map((type, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                        <span className="text-[9px] text-slate-450 font-black uppercase tracking-wider">{type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Global Lead Management */}
              <div className="space-y-4">
                <h2 className="text-lg font-black text-slate-850 tracking-tight flex items-center gap-2 text-left">
                  Global Lead Administration
                </h2>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <LeadManager />
                </div>
              </div>
            </div>
          ) : activeTab === 'invoices' ? (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="text-left">
                  <h2 className="text-lg font-black text-slate-850 tracking-tight">Global Invoice Management</h2>
                  <p className="text-xs text-slate-450 mt-0.5">Monitoring all generated invoices across the platform</p>
                </div>
                <Button variant="outline" size="sm" className="bg-white gap-1.5 shadow-sm" onClick={() => {
                  alert('Exporting ' + invoices.length + ' invoices...');
                }}>
                  <Download className="w-3.5 h-3.5" /> Export All
                </Button>
              </div>

              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden overflow-x-auto text-left">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-450 font-black uppercase tracking-widest text-[9px] border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Creator</th>
                      <th className="px-6 py-4">Invoice Reference</th>
                      <th className="px-6 py-4">Customer Entity</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4 text-right">Value</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center text-xs font-bold text-white shadow-sm">
                              {invoice.createdByName?.charAt(0) || 'U'}
                            </div>
                            <span className="text-xs text-slate-700 font-bold">{invoice.createdByName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-nowrap">
                          <span className="font-mono font-bold text-brand-primary bg-brand-secondary/50 px-2.5 py-1 rounded-lg">#{invoice.invoiceNumber}</span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-800">{invoice.billToName}</p>
                          <p className="text-[10px] text-slate-400 font-medium truncate max-w-[150px]">{invoice.billToEmail}</p>
                        </td>
                        <td className="px-6 py-4 text-nowrap text-slate-450 font-medium">
                          {new Date(invoice.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right text-nowrap font-black text-slate-800">
                          ₹{invoice.total.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button variant="ghost" size="sm" className="text-brand-primary font-bold hover:bg-slate-100" onClick={() => setSelectedInvoice(invoice)}>
                            <FileText className="w-3.5 h-3.5 mr-1" /> View PDF
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {invoices.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-450 italic">No invoices recorded yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === 'users' ? (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden text-left">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800">Platform Registered Users</h3>
                <span className="px-3 py-1 bg-brand-secondary text-brand-primary rounded-full text-[10px] font-bold uppercase">Total: {registeredUsers.length}</span>
              </div>
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-450 font-black uppercase tracking-widest text-[9px] border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">User Details</th>
                    <th className="px-6 py-4">System Role</th>
                    <th className="px-6 py-4">Join Date</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Settings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs">
                  {registeredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-brand-primary flex items-center justify-center text-white font-bold text-xs uppercase overflow-hidden shadow-sm">
                            {u.avatar ? <img src={u.avatar} alt={u.name} /> : <span>{u.name.charAt(0)}</span>}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 leading-none">{u.name}</p>
                            <p className="text-[10px] text-slate-400 mt-1">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border shadow-sm",
                          u.role === 'admin' ? "text-purple-750 border-purple-100 bg-purple-50" :
                          u.role === 'staff' ? "text-green-700 border-green-105 bg-green-50" :
                          "text-slate-500 border-slate-100 bg-slate-50"
                        )}>
                          {u.role?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-nowrap">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          <span className="text-[11px] text-slate-500 font-bold">Active</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {u.id !== user?.id && (
                            <button onClick={() => handleRemoveUser(u.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-500">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'orders' ? (
            <div className="space-y-6 text-left">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-850 tracking-tight">Global Workflow Auditing</h2>
                  <p className="text-xs text-slate-450 mt-0.5">Overrides and production overrides</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Refresh App Data</Button>
              </div>

              {/* Department Tabs */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {(
                  [
                    { id: 'staff', label: '1. Staff Desk', icon: Users },
                    { id: 'accounts', label: '2. Accounts Team', icon: DollarSign },
                    { id: 'designers', label: '3. Designers Pool', icon: Shield },
                    { id: 'order_management', label: '4. Order Mgmt', icon: Settings },
                    { id: 'production', label: '5. Production Line', icon: BarChart3 },
                    { id: 'delivery', label: '6. Delivery Phase', icon: Globe },
                  ] as const
                ).map((dept) => {
                  const isActive = selectedDept === dept.id;
                  const { totalCount, holdCount, completedCount } = getDeptStats(dept.id);
                  const Icon = dept.icon;

                  return (
                    <button
                      key={dept.id}
                      onClick={() => {
                        setSelectedDept(dept.id);
                        setSelectedSection('total');
                      }}
                      className={cn(
                        "p-4 rounded-2xl border text-left flex flex-col gap-3 transition-all relative overflow-hidden group cursor-pointer shadow-sm",
                        isActive
                          ? "bg-gradient-to-br from-[#3C3489] to-[#534AB7] border-transparent text-white scale-[1.02] shadow-lg"
                          : "bg-white border-slate-100 hover:bg-slate-50"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <Icon className={cn("w-5 h-5", isActive ? "text-white/80" : "text-slate-400")} />
                        <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-full", isActive ? "bg-white/20 text-white" : "bg-slate-50 text-slate-500")}>
                          {totalCount}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-[10px] font-black uppercase tracking-wider">{dept.label}</h4>
                        <p className={cn("text-[9px] font-bold mt-1", isActive ? "text-white/60" : "text-slate-400")}>
                          Hold: {holdCount} • Done: {completedCount}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Subsection Filters */}
              <div className="flex gap-2 p-1 bg-white border border-slate-100 rounded-xl w-fit text-xs select-none shadow-sm">
                {[
                  { id: 'total', label: 'All Audits' },
                  { id: 'hold', label: 'Held Blocks' },
                  { id: 'completed', label: 'Finished Blocks' }
                ].map((sec) => (
                  <button
                    key={sec.id}
                    onClick={() => setSelectedSection(sec.id as any)}
                    className={cn(
                      "px-4 py-1.5 rounded-lg font-bold uppercase tracking-wider text-[10px] transition-all cursor-pointer border-none",
                      selectedSection === sec.id
                        ? "bg-gradient-to-r from-[#3C3489] to-[#534AB7] text-white shadow-sm"
                        : "text-slate-450 hover:text-slate-700 bg-transparent"
                    )}
                  >
                    {sec.label}
                  </button>
                ))}
              </div>

              {/* Order Auditing Table */}
              <div className="bg-white rounded-3xl border border-slate-105 shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-450 font-black uppercase tracking-widest text-[9px] border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Order Details</th>
                      <th className="px-6 py-4">Customer Entity</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Qty</th>
                      <th className="px-6 py-4">Current Pipeline</th>
                      <th className="px-6 py-4 text-right">Administrative Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs">
                    {getFilteredDeptOrders().map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-6 py-4">
                          <p className="font-mono font-bold text-slate-800">#{order.id.slice(-8)}</p>
                          <p className="text-[9px] text-slate-400 font-semibold uppercase mt-0.5">{new Date(order.createdAt).toLocaleDateString()}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-800">{order.customerInfo.name}</p>
                          <p className="text-[9px] text-slate-450">{order.customerInfo.phone}</p>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-500">{order.category}</td>
                        <td className="px-6 py-4 font-black text-slate-800">{order.quantity}</td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider",
                            getStatusStyles(order.status)
                          )}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => setSelectedOrderDetail(order)}>Override Status</Button>
                          <button onClick={() => handleDeleteOrder(order.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {getFilteredDeptOrders().length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-450 italic">No auditing orders match this query filters.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === 'logs' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl">
              {/* Column 1: Live Login Logs with GPS */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-left">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Live Login Locations</h3>
                  <span className="text-[9px] bg-emerald-50 text-emerald-700 font-black px-2 py-0.5 rounded-full uppercase border border-emerald-200">GPS Tracked</span>
                </div>
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                  {loginLogs.length === 0 ? (
                    <p className="text-center text-slate-400 italic text-xs py-8">No login logs recorded yet.</p>
                  ) : (
                    [...loginLogs]
                      .sort((a, b) => b.timestamp - a.timestamp)
                      .map((log) => (
                        <div key={log.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col gap-2 transition-all hover:shadow-sm">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-xs font-black text-slate-800">{log.userName}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{log.userRole} · {log.userEmail}</p>
                            </div>
                            <span className="text-[9px] text-slate-400 font-bold tabular-nums">
                              {new Date(log.timestamp).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: 'short' })}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-[10px] bg-indigo-50/50 text-indigo-700 p-2.5 rounded-xl border border-indigo-100">
                            {log.latitude && log.longitude ? (
                              <>
                                <Globe className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                <a 
                                  href={`https://www.google.com/maps?q=${log.latitude},${log.longitude}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="font-bold underline hover:text-indigo-800 flex items-center gap-1"
                                >
                                  📍 View Location: {log.latitude.toFixed(6)}, {log.longitude.toFixed(6)}
                                </a>
                              </>
                            ) : (
                              <>
                                <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="font-semibold text-slate-500">GPS location not shared</span>
                              </>
                            )}
                          </div>
                          <p className="text-[9px] text-slate-450 truncate" title={log.userAgent}>Device: {log.userAgent}</p>
                        </div>
                      ))
                  )}
                </div>
              </div>

              {/* Column 2: System Audit Logs */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-left">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Security System Logs</h3>
                  <span className="text-[10px] bg-red-50 text-red-700 font-bold px-2 py-0.5 rounded uppercase">Encrypted logs</span>
                </div>
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                  {MOCK_LOGS.map((log) => (
                    <div key={log.id} className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100 flex items-start gap-3">
                      <Clock className="w-4 h-4 text-slate-455 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-slate-800">{log.action}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{log.details}</p>
                        <span className="text-[9px] text-slate-400 font-medium uppercase block mt-1.5">{log.user} • {log.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : activeTab === 'leaves' ? (
            <div className="space-y-6 text-left">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-850 tracking-tight">Staff Leave Logs</h2>
                  <p className="text-xs text-slate-450 mt-0.5">Monitoring all leave requests and hourly permissions</p>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden overflow-x-auto text-left">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-455 font-black uppercase tracking-widest text-[9px] border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">User</th>
                      <th className="px-6 py-4">Role</th>
                      <th className="px-6 py-4">Leave Date</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Details</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Created At</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs">
                    {[...leavesList].sort((a,b) => b.createdAt - a.createdAt).map((leave) => (
                      <tr key={leave.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-800">{leave.userName}</td>
                        <td className="px-6 py-4 capitalize font-semibold text-slate-500">{leave.userRole?.replace('_', ' ')}</td>
                        <td className="px-6 py-4 font-mono font-bold text-brand-primary">{leave.date}</td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border shadow-sm",
                            leave.type === 'full_day' ? "bg-rose-50 text-rose-700 border-rose-100" :
                            leave.type === 'half_day' ? "bg-amber-50 text-amber-700 border-amber-100" :
                            "bg-indigo-50 text-indigo-700 border-indigo-100"
                          )}>
                            {leave.type === 'full_day' ? 'Full Day' : leave.type === 'half_day' ? 'Half Day' : `Permission (${leave.permissionHours} hrs)`}
                          </span>
                        </td>
                        <td className="px-6 py-4 max-w-[200px] truncate text-slate-500" title={leave.reason || ''}>{leave.reason || <span className="italic text-slate-400">No reason provided</span>}</td>
                        <td className="px-6 py-4 text-nowrap">
                          <span className={cn(
                            "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border shadow-sm",
                            leave.status === 'approved' ? "bg-green-50 text-green-700 border-green-100" :
                            leave.status === 'rejected' ? "bg-red-50 text-red-700 border-red-100" :
                            "bg-yellow-50 text-yellow-700 border-yellow-105"
                          )}>
                            {leave.status || 'pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-400">{new Date(leave.createdAt).toLocaleString()}</td>
                        <td className="px-6 py-4 text-right flex justify-end items-center gap-2">
                          {(leave.status === 'pending' || !leave.status) && (
                            <>
                              <button
                                onClick={async () => {
                                  if (confirm(`Approve leave request for ${leave.userName} on ${leave.date}?`)) {
                                    try {
                                      await updateDoc(doc(db, 'leaves', leave.id), { status: 'approved' });
                                    } catch (e) {
                                      alert("Failed to approve leave request.");
                                    }
                                  }
                                }}
                                className="px-2.5 py-1 bg-green-55 hover:bg-green-100 border border-green-200 text-green-700 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                onClick={async () => {
                                  if (confirm(`Reject leave request for ${leave.userName} on ${leave.date}?`)) {
                                    try {
                                      await updateDoc(doc(db, 'leaves', leave.id), { status: 'rejected' });
                                    } catch (e) {
                                      alert("Failed to reject leave request.");
                                    }
                                  }
                                }}
                                className="px-2.5 py-1 bg-red-55 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          <button
                            onClick={async () => {
                              if (confirm(`Delete leave request for ${leave.userName} on ${leave.date}?`)) {
                                try {
                                  await deleteDoc(doc(db, 'leaves', leave.id));
                                } catch (e) {
                                  alert("Failed to delete leave request.");
                                }
                              }
                            }}
                            className="p-2 hover:bg-red-50 rounded-lg text-red-500 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {leavesList.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">No leave logs recorded yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            // Security settings view
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-left max-w-xl space-y-6">
              <div>
                <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs mb-1">Administrative Security Controls</h3>
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Global parameters overrides</p>
              </div>

              <div className="space-y-4 text-xs font-bold">
                <div className="flex justify-between items-center p-4 bg-slate-50/50 border border-slate-100 rounded-2xl">
                  <div>
                    <p className="text-slate-800">Registration Protection Gate</p>
                    <p className="text-[10px] text-slate-455 font-medium mt-0.5">Restrict signup creation to administrative users only</p>
                  </div>
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded text-brand-primary outline-none"
                    checked={adminOnlyRegistration}
                    onChange={handleToggleRegistration}
                  />
                </div>

                <div className="flex justify-between items-center p-4 bg-slate-50/50 border border-slate-100 rounded-2xl">
                  <div>
                    <p className="text-slate-800">Clear Leads Database</p>
                    <p className="text-[10px] text-slate-455 font-medium mt-0.5">Permanently delete all marketing leads records</p>
                  </div>
                  <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" onClick={handleClearAllLeads} disabled={cleaningUp}>
                    {cleaningUp ? 'Clearing...' : 'Clear All'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-30 lg:hidden animate-fade-in"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 w-64 bg-white shadow-2xl z-45 lg:hidden flex flex-col p-6 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <Logo />
              <button
                onClick={() => setIsMobileOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-2 flex-1 overflow-y-auto">
              {adminNavItems.map((item) => {
                const Icon = item.icon;
                const isInbox = item.id === 'inbox';
                const isActive = !isInbox && activeTab === item.id;
                return (
                  <button
                    key={item.label}
                    onClick={() => item.action ? item.action() : selectTab(item.id as any)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all text-left w-full",
                      isActive
                        ? "bg-brand-secondary text-brand-primary border border-brand-primary/20"
                        : isInbox
                          ? "bg-purple-50 text-purple-750 border border-purple-100"
                          : "text-slate-550 hover:bg-slate-50"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="border-t border-slate-100 pt-4 flex flex-col gap-2 bg-slate-55/50 -mx-6 px-6 -mb-6 pb-6">
              <div className="px-2">
                <p className="text-xs font-bold text-slate-800">{user?.name}</p>
                <p className="text-[9px] text-slate-400 capitalize">{String(user?.role || '')}</p>
              </div>
              <button
                onClick={() => {
                  setIsMobileOpen(false);
                  setShowProfileModal(true);
                }}
                className="w-full text-left px-3 py-2 text-xs font-bold text-slate-650 hover:bg-slate-100 rounded-xl flex items-center gap-2 transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span>Profile Settings</span>
              </button>
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl flex items-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Override Status Order Modal */}
      {selectedOrderDetail && (
        <OrderDetailModal
          order={selectedOrderDetail}
          onClose={() => setSelectedOrderDetail(null)}
          onUpdateOrder={async (id, updates) => {
            try {
              await updateOrder(id, updates);
              setSelectedOrderDetail(prev => prev ? { ...prev, ...updates } : null);
              alert("Order updated successfully.");
            } catch (e) {
              console.error(e);
              alert("Failed to save changes.");
            }
          }}
          isAdmin={true}
        />
      )}

      {/* Invoice modal */}
      {selectedInvoice && (
        <InvoiceModal
          isOpen={!!selectedInvoice}
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}

      <ProfileSettings isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />
      <ConversationDashboard
        isOpen={isInboxOpen}
        onClose={() => {
          setIsInboxOpen(false);
          setInboxSelectedId(null);
        }}
        currentUser={user}
        orders={orders}
        onUpdateOrder={updateOrder}
        initialSelectedId={inboxSelectedId}
      />
    </div>
  );
}

const getStatusStyles = (status: string) => {
  switch (status) {
    case 'draft': return 'bg-gray-100 text-gray-600';
    case 'accounts': return 'bg-amber-105 text-amber-700 border border-amber-200';
    case 'design': return 'bg-purple-105 text-purple-700 border border-purple-200';
    case 'order_management': return 'bg-blue-105 text-blue-700 border border-blue-200';
    case 'production': return 'bg-purple-105 text-purple-700 border border-purple-200';
    case 'delivery': return 'bg-orange-105 text-orange-700 border border-orange-200';
    case 'delivered': return 'bg-green-105 text-green-700 border border-green-200';
    default: return 'bg-gray-100 text-gray-600';
  }
};
