import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLeads } from '../context/LeadContext';
import {
  Layout, Bell, Settings, BarChart3, Package, Warehouse,
  Users, LogOut, TrendingUp, DollarSign, Activity, Download, Shield,
  ChevronLeft, ChevronRight, Menu, Plus, MessageSquare
} from 'lucide-react';
import {
  ResponsiveContainer, FunnelChart, Funnel, LabelList,
  Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { Button } from '../components/Button';
import { useNavigate } from 'react-router-dom';
import LeadManager from '../components/LeadManager';
import InvoiceManager from '../components/InvoiceManager';
import ProfileSettings from '../components/ProfileSettings';
import InventoryManagement from '../components/InventoryManagement';
import Logo from '../components/Logo';
import { cn } from '../lib/utils';
import { UserRole, Order } from '../types';
import { mockDataService } from '../service/mockDataService';

// Import New Role Dashboards
import AccountsDashboard from '../components/AccountsDashboard';
import OrderManagementDashboard from '../components/OrderManagementDashboard';
import ProductionDashboard from '../components/ProductionDashboard';
import DeliveryDashboard from '../components/DeliveryDashboard';
import StaffDashboard from '../components/StaffDashboard';
import DesignDashboard from '../components/DesignDashboard';
import DigitizingDashboard from '../components/DigitizingDashboard';
import DigitizerCommunication from '../components/DigitizerCommunication';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { leads, orders, inventory, addOrder, updateOrder, deleteOrder } = useLeads();
  const navigate = useNavigate();
  const [showProfileModal, setShowProfileModal] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'dashboard' | 'reports' | 'clients' | 'invoices' | 'inventory' | 'history' | 'digitizer_comm' | 'marketing_orders'>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  const selectTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setIsMobileOpen(false);
  };

  const handleUpdateOrder = async (id: string, updates: Partial<Order>) => {
    try {
      await updateOrder(id, updates);
    } catch (error) {
      console.error("Failed to update order:", error);
      alert("Sync failed: Data might be too large (Max 1MB per order in current setup). Try using smaller images.");
      throw error;
    }
  };

  const handleCreateOrder = async (orderData: Partial<Order>) => {
    try {
      await addOrder(orderData);
    } catch (error) {
      console.error("Failed to create order:", error);
      alert("Creation failed: Data might be too large.");
      throw error;
    }
  };

  const handleDeleteOrder = async (id: string) => {
    try {
      await deleteOrder(id);
    } catch (error) {
      console.error("Failed to delete order:", error);
      alert("Delete failed.");
    }
  };

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

  const userRoleDisplay = React.useMemo(() => {
    if (!user?.role) return 'User';
    if (user.role === 'admin' || user.role === UserRole.ADMIN) return 'Pallywear';
    return String(user.role).replace('_', ' ');
  }, [user?.role]);

  return (
    <div className="flex bg-brand-light min-h-screen">
      {/* Mobile Sidebar Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden animate-fade-in"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "bg-white border-r border-gray-200 flex flex-col fixed inset-y-0 left-0 h-full overflow-hidden shadow-sm z-40 transition-all duration-300",
        isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        isSidebarCollapsed ? "md:w-20" : "md:w-64",
        "w-64"
      )}>
        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
          {(!isSidebarCollapsed || isMobileOpen) && <Logo />}
          <button
            onClick={() => {
              if (window.innerWidth < 768) {
                setIsMobileOpen(false);
              } else {
                setIsSidebarCollapsed(!isSidebarCollapsed);
              }
            }}
            className="p-2 hover:bg-gray-50 rounded-xl text-gray-400 hover:text-brand-primary transition-all flex-shrink-0"
          >
            {isSidebarCollapsed ? <Menu className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {/* Main Dashboard - Only for Marketing/Staff/Admin or generic view */}
          {/* Marketing & Admin Tabs */}
          {(user?.role === UserRole.ADMIN || user?.role === UserRole.MARKETING || user?.role === 'admin' || user?.role === 'user') && (
            <div className="space-y-1">
              <p className={cn(
                "text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 px-3",
                isSidebarCollapsed && "md:hidden"
              )}>Lead Management</p>
              <button
                onClick={() => selectTab('dashboard')}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                  isSidebarCollapsed && "md:justify-center md:px-0",
                  activeTab === 'dashboard' ? "bg-white text-brand-primary border-2 border-brand-primary/20 shadow-lg shadow-brand-primary/5" : "bg-white text-gray-400 border border-transparent hover:border-gray-100 hover:text-gray-600"
                )}
                title={isSidebarCollapsed ? "Dashboard" : ""}
              >
                <Layout className="w-4 h-4 flex-shrink-0" /> {(!isSidebarCollapsed || isMobileOpen) && <span>Dashboard</span>}
              </button>
              <button
                onClick={() => selectTab('reports')}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                  isSidebarCollapsed && "md:justify-center md:px-0",
                  activeTab === 'reports' ? "bg-white text-brand-primary border-2 border-brand-primary/20 shadow-lg shadow-brand-primary/5" : "bg-white text-gray-400 border border-transparent hover:border-gray-100 hover:text-gray-600"
                )}
                title={isSidebarCollapsed ? "Reports" : ""}
              >
                <BarChart3 className="w-4 h-4 flex-shrink-0" /> {(!isSidebarCollapsed || isMobileOpen) && <span>Reports</span>}
              </button>
              <button
                onClick={() => selectTab('clients')}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                  isSidebarCollapsed && "md:justify-center md:px-0",
                  activeTab === 'clients' ? "bg-white text-brand-primary border-2 border-brand-primary/20 shadow-lg shadow-brand-primary/5" : "bg-white text-gray-400 border border-transparent hover:border-gray-100 hover:text-gray-600"
                )}
                title={isSidebarCollapsed ? "Clients" : ""}
              >
                <Users className="w-4 h-4 flex-shrink-0" /> {(!isSidebarCollapsed || isMobileOpen) && <span>Clients</span>}
              </button>
              <button
                onClick={() => selectTab('invoices')}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                  isSidebarCollapsed && "md:justify-center md:px-0",
                  activeTab === 'invoices' ? "bg-white text-brand-primary border-2 border-brand-primary/20 shadow-lg shadow-brand-primary/5" : "bg-white text-gray-400 border border-transparent hover:border-gray-100 hover:text-gray-600"
                )}
                title={isSidebarCollapsed ? "Invoices" : ""}
              >
                <Activity className="w-4 h-4 flex-shrink-0" /> {(!isSidebarCollapsed || isMobileOpen) && <span>Invoices</span>}
              </button>
              <button
                onClick={() => selectTab('marketing_orders')}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                  isSidebarCollapsed && "md:justify-center md:px-0",
                  activeTab === 'marketing_orders' ? "bg-white text-brand-primary border-2 border-brand-primary/20 shadow-lg shadow-brand-primary/5" : "bg-white text-gray-400 border border-transparent hover:border-gray-100 hover:text-gray-600"
                )}
                title={isSidebarCollapsed ? "Create Order" : ""}
              >
                <Plus className="w-4 h-4 flex-shrink-0 text-brand-primary" /> {(!isSidebarCollapsed || isMobileOpen) && <span>Create Order</span>}
              </button>
            </div>
          )}

          {/* Digitizing Portal link in sidebar if applicable */}
          {user?.role === UserRole.DIGITIZER && (
            <div className="bg-brand-primary/5 p-3 rounded-2xl border border-brand-primary/10 mb-2">
              <p className={cn(
                "text-[10px] font-black text-brand-primary uppercase tracking-[0.2em] mb-2 px-1",
                isSidebarCollapsed && "md:hidden"
              )}>Digitizing & Embroidery</p>
              <button
                onClick={() => selectTab('dashboard')}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 bg-white rounded-xl shadow-sm border transition-all",
                  isSidebarCollapsed && "md:justify-center md:px-0",
                  activeTab === 'dashboard' ? "border-brand-primary/40 shadow-md" : "border-brand-primary/20 opacity-80 hover:opacity-100"
                )}
              >
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                {(!isSidebarCollapsed || isMobileOpen) && <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest text-left">Digitizing Hub</span>}
              </button>
            </div>
          )}

          {/* Department Portals */}
          {user?.role && ![UserRole.ADMIN, UserRole.MARKETING, UserRole.DIGITIZER, 'user', 'admin'].includes(user.role as any) && (
            <div className="bg-brand-primary/5 p-3 rounded-2xl border border-brand-primary/10 mb-2">
              <p className={cn(
                "text-[10px] font-black text-brand-primary uppercase tracking-[0.2em] mb-2 px-1",
                isSidebarCollapsed && "md:hidden"
              )}>Active Portal</p>
              <button
                onClick={() => selectTab('dashboard')}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 bg-white rounded-xl shadow-sm border transition-all",
                  isSidebarCollapsed && "md:justify-center md:px-0",
                  activeTab === 'dashboard' ? "border-brand-primary/40 shadow-md" : "border-brand-primary/20 opacity-80 hover:opacity-100"
                )}
              >
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                {(!isSidebarCollapsed || isMobileOpen) && <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">{String(user.role).replace('_', ' ')} Portal</span>}
              </button>
            </div>
          )}

          {/* Design Channel / Pending Art */}
          {user?.role && ['designer', 'staff', 'admin', UserRole.DESIGNER, UserRole.STAFF, UserRole.ADMIN].includes(user.role as any) && (
            <div className="bg-purple-50/50 p-3 rounded-2xl border border-purple-100/80 mb-2">
              <p className={cn(
                "text-[10px] font-black text-purple-700 uppercase tracking-[0.2em] mb-2 px-1",
                isSidebarCollapsed && "md:hidden"
              )}>Design Channel</p>
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('open-conversations-feed'));
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 bg-white text-purple-700 hover:text-purple-800 rounded-xl shadow-sm border border-purple-100/80 hover:border-purple-300 transition-all active:scale-[0.98]",
                  isSidebarCollapsed && "md:justify-center md:px-0"
                )}
                title={['designer', 'DESIGNER', UserRole.DESIGNER].includes(user?.role as any) ? "Pending Art" : "Talk the Designer"}
              >
                <MessageSquare className="w-4 h-4 flex-shrink-0 text-purple-600 animate-pulse" />
                {(!isSidebarCollapsed || isMobileOpen) && (
                  <span className="text-[10px] font-black uppercase tracking-widest text-left">
                    {['designer', 'DESIGNER', UserRole.DESIGNER].includes(user?.role as any) ? "Pending Art" : "Talk the Designer"}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Logistics & Inventory Section */}
          {(user?.role === UserRole.ADMIN || user?.role === 'admin' || user?.role === UserRole.ORDER_MANAGEMENT || user?.role === 'order_management' || user?.role === UserRole.STAFF || user?.role === 'staff' || user?.role === UserRole.PRODUCTION || user?.role === 'production') && (
            <div className="pt-2 space-y-1">
              <p className={cn(
                "text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 px-3",
                isSidebarCollapsed && "md:hidden"
              )}>Operations</p>
              <button
                onClick={() => selectTab('inventory')}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                  isSidebarCollapsed && "md:justify-center md:px-0",
                  activeTab === 'inventory' ? "bg-white text-brand-primary border-2 border-brand-primary/20 shadow-lg shadow-brand-primary/5" : "bg-white text-gray-400 border border-transparent hover:border-gray-100 hover:text-gray-600"
                )}
                title={isSidebarCollapsed ? "Inventory Stack" : ""}
              >
                <Package className="w-4 h-4 flex-shrink-0" /> {(!isSidebarCollapsed || isMobileOpen) && <span>Inventory Stack</span>}
              </button>
              <button
                onClick={() => selectTab('history')}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                  isSidebarCollapsed && "md:justify-center md:px-0",
                  activeTab === 'history' ? "bg-white text-brand-primary border-2 border-brand-primary/20 shadow-lg shadow-brand-primary/5" : "bg-white text-gray-400 border border-transparent hover:border-gray-100 hover:text-gray-600"
                )}
                title={isSidebarCollapsed ? "Order History" : ""}
              >
                <Activity className="w-4 h-4 flex-shrink-0" /> {(!isSidebarCollapsed || isMobileOpen) && <span>Order History</span>}
              </button>
              {(user?.role === UserRole.ORDER_MANAGEMENT || user?.role === 'order_management' || user?.role === 'admin' || user?.role === UserRole.ADMIN) && (
                <button
                  onClick={() => selectTab('digitizer_comm')}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                    isSidebarCollapsed && "md:justify-center md:px-0",
                    activeTab === 'digitizer_comm' ? "bg-white text-brand-primary border-2 border-brand-primary/20 shadow-lg shadow-brand-primary/5" : "bg-white text-gray-400 border border-transparent hover:border-gray-100 hover:text-gray-600"
                  )}
                  title={isSidebarCollapsed ? "Digitizer Comm" : ""}
                >
                  <Users className="w-4 h-4 flex-shrink-0" /> {(!isSidebarCollapsed || isMobileOpen) && <span className="truncate">Digitizer Comm</span>}
                </button>
              )}
            </div>
          )}

          {/* Security & Users link removed as requested */}
        </nav>

        <div className="mt-auto p-4 border-t border-gray-50">
          <div className={cn(
            "flex items-center gap-3 p-2 bg-gray-50 rounded-2xl transition-all",
            isSidebarCollapsed ? "flex-col py-3 px-1" : ""
          )}>
            <button onClick={() => setShowProfileModal(true)} className="relative group">
              <img src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name}&background=1A0B91&color=fff`} className="w-8 h-8 rounded-full border border-gray-200 shadow-sm flex-shrink-0" alt="Me" referrerPolicy="no-referrer" />
              <div className="absolute inset-0 bg-black/5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Settings className="w-3 h-3 text-brand-primary" />
              </div>
            </button>
            {!isSidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-800 truncate">{user?.name}</p>
                <p className="text-[10px] text-gray-400 capitalize">{String(user?.role || '')}</p>
              </div>
            )}
            <button onClick={handleLogout} className={cn(
              "text-gray-400 hover:text-red-500 transition-colors px-1",
              isSidebarCollapsed && "mt-1"
            )} title={isSidebarCollapsed ? "Logout" : ""}>
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className={cn(
        "flex-1 min-h-screen transition-all duration-300",
        isSidebarCollapsed ? "md:ml-20" : "md:ml-64",
        "ml-0"
      )}>
        <header className="h-16 bg-white border-b border-gray-200 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="p-2 -ml-1 hover:bg-gray-50 rounded-xl text-gray-500 md:hidden flex-shrink-0"
              aria-label="Toggle menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-xs md:text-sm font-medium text-gray-500">
              {userRoleDisplay} <span className="text-gray-900 font-bold">Dashboard</span>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            {user?.role === 'admin' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin')}
                className="text-[9px] md:text-[10px] h-7 md:h-8 px-2 md:px-3 font-bold uppercase tracking-wider"
              >
                Admin Panel
              </Button>
            )}
            <button className="p-2 hover:bg-gray-50 rounded-lg text-gray-500"><Bell className="w-5 h-5" /></button>
            <button className="p-2 hover:bg-gray-50 rounded-lg text-gray-500" onClick={() => setShowProfileModal(true)}><Settings className="w-5 h-5" /></button>
          </div>
        </header>

        <div className="p-8">
          {activeTab === 'inventory' ? (
            <InventoryManagement userRole={user?.role as any} />
          ) : activeTab === 'history' ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Order History</h2>
                  <p className="text-gray-500 text-sm">Full list of orders across all departments</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100 font-bold text-[10px] text-gray-400 uppercase tracking-widest">
                    <tr>
                      <th className="px-6 py-4">Order ID</th>
                      <th className="px-6 py-4">Customer</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Last Update</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {orders.length > 0 ? (
                      orders.map(order => (
                        <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 font-mono text-xs">#{order.id.slice(-8)}</td>
                          <td className="px-6 py-4 font-bold text-gray-900">{order.customerInfo.name}</td>
                          <td className="px-6 py-4 text-xs font-semibold">{order.category}</td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                              order.status === 'HOLD' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                            )}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-400 text-xs">
                            {new Date(order.updatedAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">No history found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === 'marketing_orders' ? (
            <StaffDashboard orders={orders} inventory={inventory} onCreateOrder={handleCreateOrder} onUpdateOrder={handleUpdateOrder} onDeleteOrder={handleDeleteOrder} isAdmin={user?.role === 'admin'} user={user} />
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
          ) : activeTab === 'invoices' ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Invoice Center</h2>
                  <p className="text-sm text-gray-500 font-medium">Manage your professional billing and payment records</p>
                </div>
                <span className="px-3 py-1 bg-brand-secondary text-brand-primary rounded-full text-[10px] font-bold uppercase tracking-wider">Billing & Payments</span>
              </div>
              <InvoiceManager />
            </div>
          ) : [UserRole.STAFF, 'staff'].includes(user?.role as any) ? (
            <StaffDashboard orders={orders} inventory={inventory} onCreateOrder={handleCreateOrder} onUpdateOrder={handleUpdateOrder} onDeleteOrder={handleDeleteOrder} isAdmin={user?.role === 'admin'} user={user} />
          ) : user?.role === UserRole.ACCOUNTS || user?.role === 'accounts' ? (
            <AccountsDashboard orders={orders} onUpdateOrder={handleUpdateOrder} onDeleteOrder={handleDeleteOrder} isAdmin={user?.role === 'admin'} />
          ) : user?.role === UserRole.DESIGNER || user?.role === 'designer' ? (
            <DesignDashboard orders={orders} onUpdateOrder={handleUpdateOrder} user={user} />
          ) : user?.role === UserRole.ORDER_MANAGEMENT || user?.role === 'order_management' ? (
            <OrderManagementDashboard orders={orders} inventory={inventory} onUpdateOrder={handleUpdateOrder} onDeleteOrder={handleDeleteOrder} isAdmin={user?.role === 'admin'} />
          ) : user?.role === UserRole.PRODUCTION || user?.role === 'production' ? (
            <ProductionDashboard orders={orders} onUpdateOrder={handleUpdateOrder} onDeleteOrder={handleDeleteOrder} isAdmin={user?.role === 'admin'} />
          ) : user?.role === UserRole.DIGITIZER || user?.role === 'digitizer' ? (
            <DigitizingDashboard orders={orders} onUpdateOrder={handleUpdateOrder} isAdmin={user?.role === 'admin'} />
          ) : user?.role === UserRole.DELIVERY || user?.role === 'delivery' ? (
            <DeliveryDashboard orders={orders} onUpdateOrder={handleUpdateOrder} onDeleteOrder={handleDeleteOrder} isAdmin={user?.role === 'admin'} />
          ) : activeTab === 'digitizer_comm' ? (
            <DigitizerCommunication orders={orders} onUpdateOrder={handleUpdateOrder} />
          ) : (
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
                  Marketing Dashboard
                </h2>
                <LeadManager />
              </div>
            </>
          )}
        </div>
      </main>
      <ProfileSettings isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />
    </div>
  );
}
