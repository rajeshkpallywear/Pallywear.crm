import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLeads } from '../context/LeadContext';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, setDoc, deleteDoc, doc } from 'firebase/firestore';
import {
  LayoutDashboard, Bell, Settings, BarChart3, Package,
  Users, LogOut, TrendingUp, Activity, Download, ShieldCheck,
  ChevronLeft, ChevronRight, Menu, Plus, MessageSquare, X, Check,
  Calendar, Search, ArrowUpRight, ArrowDownRight, Clock, Zap,
  ShoppingBag, CheckCircle2, PauseCircle, RefreshCw, DollarSign, Palette,
  Factory, Truck, ClipboardCheck, FolderOpen
} from 'lucide-react';
import {
  ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area, PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import { Button } from '../components/Button';
import { useNavigate } from 'react-router-dom';
import LeadManager from '../components/LeadManager';
import InvoiceManager from '../components/InvoiceManager';
import ProfileSettings from '../components/ProfileSettings';
import InventoryManagement from '../components/InventoryManagement';
import Logo from '../components/Logo';
import { cn } from '../lib/utils';
import { UserRole, Order, OrderStatus } from '../types';
import { downloadOrderPDF } from '../lib/pdfHelper';

import AccountsDashboard from '../components/AccountsDashboard';
import OrderManagementDashboard from '../components/OrderManagementDashboard';
import ProductionDashboard from '../components/ProductionDashboard';
import DeliveryDashboard from '../components/DeliveryDashboard';
import NewOrderForm from '../components/NewOrderForm';
import DesignDashboard from '../components/DesignDashboard';
import DigitizingDashboard from '../components/DigitizingDashboard';
import DigitizerCommunication from '../components/DigitizerCommunication';
import ConversationDashboard from '../components/ConversationDashboard';
import OrderDetailModal from '../components/OrderDetailModal';
import TelecallerDashboard from '../components/TelecallerDashboard';
import LeadAssignment from '../components/LeadAssignment';

interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'order' | 'message' | 'lead';
  createdAt: number;
  read: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  hold: 'bg-amber-50 text-amber-700 border-amber-200',
  HOLD: 'bg-amber-50 text-amber-700 border-amber-200',
  delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  DELIVERED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  draft: 'bg-slate-100 text-slate-500 border-slate-200',
  DRAFT: 'bg-slate-100 text-slate-500 border-slate-200',
  pending: 'bg-blue-50 text-blue-700 border-blue-200',
  PENDING: 'bg-blue-50 text-blue-700 border-blue-200',
  accounts: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  production: 'bg-purple-50 text-purple-700 border-purple-200',
  design: 'bg-pink-50 text-pink-700 border-pink-200',
  delivery: 'bg-orange-50 text-orange-700 border-orange-200',
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const isSidebarCollapsed = true;
  const { leads, orders, inventory, addOrder, updateOrder, deleteOrder } = useLeads();

  const myOrders = React.useMemo(() => {
    const role = user?.role;
    const isStaffOrDept = [
      'admin', UserRole.ADMIN,
      'staff', UserRole.STAFF,
      'accounts', UserRole.ACCOUNTS,
      'designer', UserRole.DESIGNER,
      'digitizer', UserRole.DIGITIZER,
      'production', UserRole.PRODUCTION,
      'delivery', UserRole.DELIVERY,
      'order_management', UserRole.ORDER_MANAGEMENT,
      'telecaller', UserRole.TELECALLER
    ].includes(role as any);

    if (isStaffOrDept) return orders;
    return orders.filter(o => o.createdBy === user?.id);
  }, [orders, user]);
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user && (user.role === 'admin' || user.role === UserRole.ADMIN)) {
      navigate('/admin', { replace: true });
    }
  }, [user, navigate]);

  const [showProfileModal, setShowProfileModal] = React.useState(false);

  const defaultTab = React.useMemo(() => {
    if (!user?.role) return 'dashboard';
    const role = user.role as string;
    if (role === 'order_management' || role === UserRole.ORDER_MANAGEMENT) return 'order_mgmt_board';
    if (role === 'production' || role === UserRole.PRODUCTION || role === 'staff' || role === UserRole.STAFF) return 'production_board';
    if (role === 'delivery' || role === UserRole.DELIVERY) return 'delivery_board';
    if (['admin', UserRole.ADMIN, 'marketing', UserRole.MARKETING, 'user', 'telecaller', UserRole.TELECALLER].includes(role)) return 'dashboard';
    if ([UserRole.DIGITIZER, 'digitizer'].includes(role)) return 'dashboard';
    if ([UserRole.DESIGNER, 'designer'].includes(role)) return 'design_staff_comm';
    if ([UserRole.ACCOUNTS, 'accounts'].includes(role)) return 'dashboard';
    return 'history';
  }, [user?.role]);

  const [activeTab, setActiveTab] = React.useState<string>('dashboard');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [prefillOrderData, setPrefillOrderData] = React.useState<any | null>(null);

  const handleReorder = React.useCallback((order: Order) => {
    setPrefillOrderData({
      customerInfo: {
        name: order.customerInfo.name || '',
        companyName: order.customerInfo.companyName || '',
        phone: order.customerInfo.phone || '',
        address: order.customerInfo.address || '',
      },
      category: order.category,
      sizeBreakdown: order.sizeBreakdown || [],
      financials: {
        totalAmount: order.financials?.totalAmount || 0,
        advancePay: 0,
      },
      isUrgent: order.isUrgent || false,
    });
    setActiveTab('marketing_orders');
  }, []);
  const [calendarMonth, setCalendarMonth] = React.useState(() => new Date());
  
  const [selectedLeaveDate, setSelectedLeaveDate] = React.useState<Date | null>(null);
  const [showLeaveModal, setShowLeaveModal] = React.useState(false);
  const [leaveType, setLeaveType] = React.useState<'half_day' | 'full_day' | 'hours_permission'>('full_day');
  const [permissionHours, setPermissionHours] = React.useState('2');
  const [leaveReason, setLeaveReason] = React.useState('');
  const [isSavingLeave, setIsSavingLeave] = React.useState(false);
  const [leavesList, setLeavesList] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, 'leaves'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLeavesList(list);
    }, (error) => {
      console.error("Firestore leaves subscription error:", error);
    });
    return () => unsub();
  }, [user]);

  const handleSaveLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeaveDate || !user) return;

    setIsSavingLeave(true);
    try {
      const yyyy = selectedLeaveDate.getFullYear();
      const mm = String(selectedLeaveDate.getMonth() + 1).padStart(2, '0');
      const dd = String(selectedLeaveDate.getDate()).padStart(2, '0');
      const dateString = `${yyyy}-${mm}-${dd}`;
      
      // Use auth.currentUser.uid as a reliable fallback since user.id may not always be set
      const { auth: firebaseAuth } = await import('../lib/firebase');
      const uid = user.id || firebaseAuth.currentUser?.uid;
      if (!uid) {
        alert("Error: Could not identify your user account. Please log out and log back in.");
        return;
      }

      const docId = `${uid}_${dateString}_${Date.now()}`;
      
      const newLeave = {
        id: docId,
        userId: uid,
        userName: user.name,
        userRole: user.role,
        date: dateString,
        type: leaveType,
        permissionHours: leaveType === 'hours_permission' ? parseInt(permissionHours, 10) || 1 : null,
        reason: leaveReason.trim() || null,
        status: 'pending',
        createdAt: Date.now()
      };

      await setDoc(doc(db, 'leaves', docId), newLeave);
      setShowLeaveModal(false);
      setSelectedLeaveDate(null);
      setLeaveReason('');
      alert("Leave request saved successfully!");
    } catch (err: any) {
      console.error("Failed to save leave:", err);
      const detail = err?.message || String(err);
      alert(`Failed to save leave request: ${detail.includes('permission') ? 'Permission denied — please contact admin.' : detail.slice(0, 80)}`);
    } finally {
      setIsSavingLeave(false);
    }
  };

  const handleDeleteLeave = async (leaveId: string) => {
    try {
      await deleteDoc(doc(db, 'leaves', leaveId));
    } catch (err) {
      console.error("Failed to delete leave:", err);
      alert("Failed to delete leave.");
    }
  };
  const [graphPeriod, setGraphPeriod] = React.useState<'today' | 'week' | 'month'>('week');
  const [selectedOrderCategory, setSelectedOrderCategory] = React.useState<'all' | 'recent' | 'create_order' | 'hold' | 'process' | 'completed' | null>('recent');
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const [isInboxOpen, setIsInboxOpen] = React.useState(false);
  const [inboxSelectedId, setInboxSelectedId] = React.useState<string | null>(null);
  const [selectedDetailOrder, setSelectedDetailOrder] = React.useState<Order | null>(null);
  const [sharingOrder, setSharingOrder] = React.useState<Order | null>(null);
  const [sharingNotes, setSharingNotes] = React.useState('');

  // Notifications State & Sound Chime
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [notifications, setNotifications] = React.useState<AppNotification[]>(() => [
    {
      id: 'notif_1',
      title: 'New Message from Arun (Designer)',
      message: 'Artwork mockups have been uploaded for Client Rajesh.',
      type: 'message',
      createdAt: Date.now() - 10 * 60 * 1000,
      read: false
    },
    {
      id: 'notif_2',
      title: 'New Raw Order Intake',
      message: 'Order #ORD-77A91 has been created and is pending advance.',
      type: 'order',
      createdAt: Date.now() - 45 * 60 * 1000,
      read: false
    },
    {
      id: 'notif_3',
      title: 'Lead Qualified',
      message: 'Gaurav Nair qualified as a Hot Lead.',
      type: 'lead',
      createdAt: Date.now() - 3 * 3600 * 1000,
      read: true
    }
  ]);

  const playNotificationSound = React.useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc1.frequency.exponentialRampToValueAtTime(880.00, audioCtx.currentTime + 0.1); // A5

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(293.66, audioCtx.currentTime); // D4
      osc2.frequency.exponentialRampToValueAtTime(440.00, audioCtx.currentTime + 0.1); // A4

      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc1.start();
      osc2.start();

      osc1.stop(audioCtx.currentTime + 0.45);
      osc2.stop(audioCtx.currentTime + 0.45);
    } catch (e) {
      console.error("Audio Context failed to play", e);
    }
  }, []);

  // Listen to new orders and simulate periodic incoming message notifications
  const prevOrdersCount = React.useRef(myOrders.length);
  React.useEffect(() => {
    if (myOrders.length > prevOrdersCount.current) {
      const newOrder = myOrders[0];
      if (newOrder) {
        setNotifications(prev => [
          {
            id: `notif_${Date.now()}_${Math.random()}`,
            title: 'New Order Created',
            message: `Order #${newOrder.id.slice(-6)} for ${newOrder.customerInfo.name} was successfully launched.`,
            type: 'order',
            createdAt: Date.now(),
            read: false
          },
          ...prev
        ]);
        playNotificationSound();
      }
    }
    prevOrdersCount.current = myOrders.length;
  }, [myOrders, playNotificationSound]);

  React.useEffect(() => {
    const messages = [
      { title: 'New Message from Gaurav', message: 'Hi, can you update the sleeve length for my order?' },
      { title: 'Artwork Approved', message: 'Client Priya approved design mockup for order #ORD-44B' },
      { title: 'New Message from Arun', message: 'Ready to send design file to digitizer desk.' },
    ];

    let msgIndex = 0;
    const interval = setInterval(() => {
      const msg = messages[msgIndex % messages.length];
      setNotifications(prev => [
        {
          id: `sim_${Date.now()}`,
          title: msg.title,
          message: msg.message,
          type: 'message',
          createdAt: Date.now(),
          read: false
        },
        ...prev
      ]);
      playNotificationSound();
      msgIndex++;
    }, 45000); // every 45 seconds

    return () => clearInterval(interval);
  }, [playNotificationSound]);

  React.useEffect(() => {
    if (defaultTab && defaultTab !== 'dashboard') setActiveTab(defaultTab as any);
  }, [defaultTab]);

  React.useEffect(() => {
    const handleOpenFeed = (e: Event) => {
      const customEvent = e as CustomEvent;
      setInboxSelectedId(customEvent.detail && typeof customEvent.detail === 'string' ? customEvent.detail : null);
      setIsInboxOpen(true);
    };
    window.addEventListener('open-conversations-feed', handleOpenFeed);
    return () => window.removeEventListener('open-conversations-feed', handleOpenFeed);
  }, []);

  const selectTab = (tab: typeof activeTab) => { 
    if (tab === 'marketing_orders') {
      setPrefillOrderData(null);
    }
    setActiveTab(tab); 
    setIsMobileOpen(false); 
  };

  const handleUpdateOrder = async (id: string, updates: Partial<Order>) => {
    try { await updateOrder(id, updates); }
    catch (error) { console.error('Failed to update order:', error); alert('Sync failed.'); throw error; }
  };
  const handleCreateOrder = async (orderData: Partial<Order>) => {
    try {
      const newOrder = await addOrder(orderData);
      return newOrder;
    }
    catch (error) { console.error('Failed to create order:', error); alert('Creation failed.'); throw error; }
  };
  const handleDeleteOrder = async (id: string) => {
    try { await deleteOrder(id); }
    catch (error) { console.error('Failed to delete order:', error); alert('Delete failed.'); }
  };

  const handleOpenOrderDetail = React.useCallback((order: Order) => {
    if (order.status === OrderStatus.DELIVERED) {
      const allowedRoles = ['admin', 'accounts', 'order_management', UserRole.ADMIN, UserRole.ACCOUNTS, UserRole.ORDER_MANAGEMENT];
      if (!user?.role || !allowedRoles.includes(user.role)) {
        alert("Access Denied: Completed orders can only be viewed by Admin, Accounts, or Order Management.");
        return;
      }
    }
    setSelectedDetailOrder(order);
  }, [user]);

  const query = searchQuery.toLowerCase().trim();

  const filteredOrders = React.useMemo(() => {
    if (!query) return myOrders;
    return myOrders.filter(o => {
      const name = o.customerInfo?.name?.toLowerCase() || '';
      const company = o.customerInfo?.companyName?.toLowerCase() || '';
      const phone = o.customerInfo?.phone?.toLowerCase() || '';
      const id = o.id?.toLowerCase() || '';
      const cat = o.category?.toLowerCase() || '';
      const status = o.status?.toLowerCase() || '';
      return name.includes(query) || company.includes(query) || phone.includes(query) || id.includes(query) || cat.includes(query) || status.includes(query);
    });
  }, [myOrders, query]);

  const filteredLeads = React.useMemo(() => {
    const baseLeads = user?.role === 'admin' ? leads : leads.filter(l => l.createdBy === user?.id);
    if (!query) return baseLeads;
    return baseLeads.filter(l => {
      const name = l.name?.toLowerCase() || '';
      const company = l.companyName?.toLowerCase() || '';
      const type = l.leadType?.toLowerCase() || '';
      return name.includes(query) || company.includes(query) || type.includes(query);
    });
  }, [leads, user?.role, user?.id, query]);
  const handleLogout = () => { logout(); navigate('/login'); };

  const userRoleDisplay = React.useMemo(() => {
    if (!user?.role) return 'User';
    if (user.role === 'admin' || user.role === UserRole.ADMIN) return 'Admin';
    return String(user.role).replace('_', ' ');
  }, [user?.role]);

  const showMarketing = React.useMemo(() => {
    const role = user?.role;
    return ['admin', 'marketing', 'user', UserRole.ADMIN, UserRole.MARKETING].includes(role as any);
  }, [user?.role]);

  const navGroups = React.useMemo(() => {
    const role = user?.role;
    const isOrderMgmt = ['order_management', UserRole.ORDER_MANAGEMENT].includes(role as any);
    const isProduction = ['production', 'staff', UserRole.PRODUCTION, UserRole.STAFF].includes(role as any);
    const isDelivery = ['delivery', UserRole.DELIVERY].includes(role as any);
    const isTelecaller = ['telecaller', UserRole.TELECALLER].includes(role as any);
    const showOps = ['admin', 'order_management', UserRole.ADMIN, UserRole.ORDER_MANAGEMENT].includes(role as any);

    const groups: { title: string; items: { id: string; label: string; icon: any; action?: () => void }[] }[] = [];

    if (isDelivery) {
      groups.push({
        title: 'Core Workflow',
        items: [
          { id: 'delivery_board', label: 'Delivery Board', icon: Truck },
          { id: 'calendar', label: 'Calendar', icon: Calendar },
          { id: 'analytics', label: 'Graph', icon: BarChart3 },
        ]
      });
    } else if (isProduction) {
      groups.push({
        title: 'Core Workflow',
        items: [
          { id: 'production_board', label: 'Production Board', icon: Factory },
          { id: 'calendar', label: 'Calendar', icon: Calendar },
          { id: 'analytics', label: 'Graph', icon: BarChart3 },
        ]
      });
    } else if (isTelecaller) {
      groups.push({
        title: 'Main Desk',
        items: [
          { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
          { id: 'calendar', label: 'Intake Calendar', icon: Calendar },
          { id: 'analytics', label: 'Performance Graph', icon: BarChart3 },
        ]
      });
      groups.push({
        title: 'Lead Desk',
        items: [
          { id: 'add_leads', label: 'Add Lead', icon: Plus },
        ]
      });
    } else if (isOrderMgmt) {
      groups.push({
        title: 'Main',
        items: [
          { id: 'order_mgmt_board', label: 'Order Board', icon: ClipboardCheck },
          { id: 'calendar', label: 'Calendar', icon: Calendar },
          { id: 'analytics', label: 'Graph', icon: BarChart3 },
        ]
      });
    } else if (showMarketing) {
      groups.push({
        title: 'Main',
        items: [
          { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
          { id: 'calendar', label: 'Calendar', icon: Calendar },
          { id: 'analytics', label: 'Graph', icon: BarChart3 },
        ]
      });
      groups.push({
        title: 'Business',
        items: [
          { id: 'clients', label: 'Clients', icon: Users },
          { id: 'invoices', label: 'Invoices', icon: DollarSign },
          { id: 'marketing_orders', label: 'Create Order', icon: ShoppingBag },
          { id: 'add_leads', label: 'Add Leads', icon: Plus },
          { id: 'inventory', label: 'Inventory', icon: Package },
        ]
      });
    }

    if (role === UserRole.DIGITIZER || role === 'digitizer') {
      groups.push({
        title: 'Main',
        items: [
          { id: 'dashboard', label: 'Digitizing Hub', icon: Activity },
          { id: 'calendar', label: 'Calendar', icon: Calendar }
        ]
      });
    }

    if (role === UserRole.ACCOUNTS || role === 'accounts') {
      groups.push({
        title: 'Core Workflow',
        items: [
          { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
          { id: 'accounts_billing', label: 'Accounts Dashboard', icon: ClipboardCheck },
          { id: 'accounts_calendar', label: 'Intake Calendar', icon: Calendar },
          { id: 'calendar', label: 'Leave Calendar', icon: Calendar },
          { id: 'accounts_graph', label: 'Performance Graph', icon: BarChart3 },
        ]
      });
      groups.push({
        title: 'Accounting',
        items: [
          { id: 'accounts_office', label: 'Office Bookkeeping', icon: DollarSign },
        ]
      });
    }

    if (showOps) {
      groups.push({
        title: 'Operations',
        items: [{ id: 'inventory', label: 'Inventory', icon: Package }]
      });
    }

    if (role === UserRole.DESIGNER || role === 'designer') {
      groups.push({
        title: 'Design Desk',
        items: [
          { id: 'design_staff_comm', label: 'Staff Conversation', icon: MessageSquare },
          { id: 'calendar', label: 'Intake Calendar', icon: Calendar },
          { id: 'analytics', label: 'Performance Graph', icon: BarChart3 },
        ]
      });
    }

    const inboxLabel = ['designer', 'DESIGNER', UserRole.DESIGNER].includes(role as any) ? 'Pending Art' : 'Inbox';
    groups.push({
      title: 'Communication',
      items: [{ id: 'design_channel', label: inboxLabel, icon: MessageSquare, action: () => { setIsInboxOpen(true); setIsMobileOpen(false); } }]
    });

    return groups;
  }, [user?.role]);

  const allNavItems = navGroups.flatMap(g => g.items);

  const showAmountDetails = React.useMemo(() => {
    return ['admin', 'accounts', 'order_management', 'delivery', UserRole.ADMIN, UserRole.ACCOUNTS, UserRole.ORDER_MANAGEMENT, UserRole.DELIVERY].includes(user?.role || '');
  }, [user?.role]);

  // === COMPUTED STATS ===
  const totalOrderValue = filteredOrders.reduce((s, o) => s + (o.financials?.totalAmount || 0), 0);
  const holdOrders = filteredOrders.filter(o => ['hold', 'HOLD'].includes(o.status));
  const completedOrders = filteredOrders.filter(o => ['delivered', 'DELIVERED'].includes(o.status));
  const processOrders = filteredOrders.filter(o => !['hold', 'HOLD', 'delivered', 'DELIVERED', 'draft', 'DRAFT', 'pending', 'PENDING'].includes(o.status));
  const recentOrders = filteredOrders.filter(o => [
    'order_management', 'production', 'delivery', 'pending', 'draft',
    OrderStatus.ORDER_MANAGEMENT, OrderStatus.PRODUCTION, OrderStatus.DELIVERY, OrderStatus.PENDING, OrderStatus.DRAFT
  ].includes(o.status));

  const hourOfDay = new Date().getHours();
  const greeting = hourOfDay < 12 ? 'Good morning' : hourOfDay < 17 ? 'Good afternoon' : 'Good evening';
  const todayStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="flex bg-[#f0f2f5] min-h-screen text-slate-800 font-sans antialiased">
      {/* ===== SIDEBAR ===== */}
      <aside className={cn(
        "hidden lg:flex flex-col bg-white border-r border-slate-100 shadow-sm sticky top-0 h-screen overflow-y-auto overflow-x-hidden flex-shrink-0 transition-all duration-300 no-scrollbar",
        isSidebarCollapsed ? "w-20" : "w-64"
      )}>
        {/* Nav Groups */}
        <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto overflow-x-hidden no-scrollbar">
          {navGroups.map((group) => (
            <div key={group.title}>
              {!isSidebarCollapsed && (
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] px-3 mb-2">{group.title}</p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isInbox = item.id === 'design_channel';
                  const isActive = !isInbox && activeTab === item.id;
                  return (
                    <button
                      key={item.label}
                      onClick={() => item.action ? item.action() : selectTab(item.id as any)}
                      className={cn(
                        'w-full flex items-center rounded-xl text-xs font-semibold transition-all group relative',
                        isSidebarCollapsed ? 'justify-center py-2.5 px-0' : 'gap-3 px-3 py-2.5 text-left',
                        isActive
                          ? 'bg-brand-primary text-white shadow-sm'
                          : isInbox
                            ? 'bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-100'
                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-55'
                      )}
                    >
                      <Icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-white' : '')} />
                      {!isSidebarCollapsed && <span>{item.label}</span>}
                      {isActive && !isSidebarCollapsed && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60" />}

                      {isSidebarCollapsed && (
                        <div className="absolute left-20 bg-slate-900 text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap shadow-md">
                          {item.label}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className={cn("p-3 border-t border-slate-100 bg-slate-55/60", isSidebarCollapsed ? "space-y-3" : "space-y-1")}>
          <button
            onClick={() => setShowProfileModal(true)}
            className={cn(
              "w-full flex items-center rounded-xl transition-all hover:bg-slate-105 relative group",
              isSidebarCollapsed ? "justify-center py-2 px-0" : "gap-3 px-3 py-2"
            )}
          >
            <img
              src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=1A0B91&color=fff`}
              className="w-8 h-8 rounded-full border-2 border-white shadow-sm flex-shrink-0"
              alt="Me"
              referrerPolicy="no-referrer"
            />
            {!isSidebarCollapsed && (
              <div className="text-left min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-800 truncate leading-none">{user?.name}</p>
                <p className="text-[10px] text-slate-400 capitalize truncate mt-0.5">{userRoleDisplay}</p>
              </div>
            )}
            {isSidebarCollapsed && (
              <div className="absolute left-20 bg-slate-900 text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap shadow-md">
                Profile
              </div>
            )}
          </button>
          <button
            onClick={handleLogout}
            className={cn(
              "w-full text-red-500 hover:bg-red-55 rounded-xl flex items-center transition-colors text-xs font-semibold relative group",
              isSidebarCollapsed ? "justify-center py-2.5 px-0" : "gap-3 px-3 py-2.5 text-left"
            )}
          >
            <LogOut className="w-4 h-4" />
            {!isSidebarCollapsed && <span>Sign Out</span>}
            {isSidebarCollapsed && (
              <div className="absolute left-20 bg-slate-900 text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap shadow-md">
                Sign Out
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* ===== MAIN ===== */}
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-y-auto bg-[#f0f2f5]">

        {/* Top Header */}
        <header className="bg-white border-b border-slate-100 px-6 md:px-8 py-4 flex items-center justify-between gap-4 sticky top-0 z-10 shadow-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile menu */}
            <button onClick={() => setIsMobileOpen(true)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 lg:hidden">
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden md:block flex items-center gap-3">
              <Logo className="h-8" />
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                id="header-search"
                type="text"
                placeholder="Search…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none w-36 focus:border-brand-primary focus:bg-white transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Bell Notifications Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors cursor-pointer"
              >
                <Bell className="w-4.5 h-4.5" />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                )}
              </button>

              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowNotifications(false)} />
                  <div className="absolute right-0 mt-2.5 w-80 bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden z-30 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900 uppercase tracking-wider">Notifications</span>
                      {notifications.filter(n => !n.read).length > 0 && (
                        <button
                          onClick={() => {
                            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                          }}
                          className="text-[9px] font-black text-brand-primary hover:underline uppercase tracking-wider cursor-pointer"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                      {notifications.length === 0 ? (
                        <p className="p-8 text-center text-xs text-slate-400 italic">No notifications yet.</p>
                      ) : (
                        notifications.map(notif => {
                          const Icon = notif.type === 'order' ? Package : notif.type === 'message' ? MessageSquare : Users;
                          const iconColor = notif.type === 'order' ? 'bg-indigo-50 text-indigo-650'
                            : notif.type === 'message' ? 'bg-purple-50 text-purple-650'
                              : 'bg-emerald-50 text-emerald-650';

                          return (
                            <div
                              key={notif.id}
                              onClick={() => {
                                setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
                                if (notif.type === 'message') {
                                  setIsInboxOpen(true);
                                }
                                setShowNotifications(false);
                              }}
                              className={cn(
                                "p-4 text-left transition-colors cursor-pointer flex gap-3 hover:bg-slate-50",
                                !notif.read ? "bg-indigo-50/15" : "bg-white"
                              )}
                            >
                              <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0", iconColor)}>
                                <Icon size={14} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex justify-between items-baseline">
                                  <p className="text-xs font-bold text-slate-800 truncate pr-2">{notif.title}</p>
                                  <span className="text-[8px] font-bold text-slate-400">
                                    {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-normal">{notif.message}</p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-6 md:p-8">
          {/* ==================== OVERVIEW ==================== */}
          {activeTab === 'dashboard' || ((user?.role === 'accounts' || user?.role === UserRole.ACCOUNTS) && (activeTab === 'accounts' || activeTab.startsWith('accounts_'))) ? (
            (() => {
              const role = user?.role;
              if (role === 'accounts' || role === UserRole.ACCOUNTS) {
                return (
                  <AccountsDashboard
                    orders={orders}
                    onUpdateOrder={handleUpdateOrder}
                    isAdmin={user?.role === 'admin'}
                    activeSubTab={activeTab === 'dashboard' ? 'overview' : (activeTab.replace('accounts_', '') as any)}
                    onSubTabChange={(subTab) => setActiveTab(`accounts_${subTab}`)}
                  />
                );
              }
              // Custom dashboards are rendered on specific tab matches in the else branch below
              if (role === 'designer' || role === UserRole.DESIGNER) {
                return (
                  <DesignDashboard
                    orders={orders}
                    onUpdateOrder={handleUpdateOrder}
                    user={user}
                    activeChannel={activeTab === 'design_om_comm' ? 'order_management' : 'staff'}
                  />
                );
              }
              if (role === 'digitizer' || role === UserRole.DIGITIZER) {
                return <DigitizingDashboard orders={orders} onUpdateOrder={handleUpdateOrder} isAdmin={user?.role === 'admin'} />;
              }
              if (role === 'telecaller' || role === UserRole.TELECALLER) {
                return <TelecallerDashboard />;
              }

              return (
                <div className="space-y-6 animate-in fade-in duration-300">

                  {/* Welcome Banner */}
                  <div className="relative bg-gradient-to-r from-[#1A0B91] via-[#2d1ab8] to-[#4a2bd4] rounded-3xl p-6 md:p-8 overflow-hidden shadow-lg">
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, #ffffff 0%, transparent 60%)' }} />
                    <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-1">Pallywear CRM</p>
                        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">{greeting}, {user?.name?.split(' ')[0]}!</h2>
                        <p className="text-white/70 text-sm mt-1 font-medium">Here's your business snapshot for today.</p>
                      </div>
                    </div>
                  </div>

                  {/* Summary Stats Section (Icon-only) */}
                  <div className="flex gap-4 mb-6">
                    {([
                      {
                        key: 'recent' as const,
                        label: 'Order Management',
                        title: 'Order Management Board',
                        count: recentOrders.length,
                        icon: ShoppingBag,
                        activeBg: 'bg-brand-primary text-white border-brand-primary shadow-md scale-105',
                        hoverBg: 'hover:border-brand-primary/50',
                        badgeActive: 'bg-white text-brand-primary border-white',
                        badgeNormal: 'bg-brand-primary text-white border-brand-primary',
                        navTab: 'order_mgmt_board',
                      },
                      {
                        key: 'hold' as const,
                        label: 'Hold Orders',
                        title: 'Hold Orders',
                        count: holdOrders.length,
                        icon: PauseCircle,
                        activeBg: 'bg-amber-500 text-white border-amber-500 shadow-md scale-105',
                        hoverBg: 'hover:border-amber-400',
                        badgeActive: 'bg-white text-amber-500 border-white',
                        badgeNormal: 'bg-amber-500 text-white border-amber-500',
                        navTab: null,
                      },
                      {
                        key: 'process' as const,
                        label: 'Production',
                        title: 'Production Board',
                        count: processOrders.length,
                        icon: RefreshCw,
                        activeBg: 'bg-blue-500 text-white border-blue-500 shadow-md scale-105',
                        hoverBg: 'hover:border-blue-400',
                        badgeActive: 'bg-white text-blue-500 border-white',
                        badgeNormal: 'bg-blue-500 text-white border-blue-500',
                        navTab: 'production_board',
                      },
                      {
                        key: 'completed' as const,
                        label: 'Delivery',
                        title: 'Delivery Board',
                        count: completedOrders.length,
                        icon: CheckCircle2,
                        activeBg: 'bg-emerald-500 text-white border-emerald-500 shadow-md scale-105',
                        hoverBg: 'hover:border-emerald-400',
                        badgeActive: 'bg-white text-emerald-500 border-white',
                        badgeNormal: 'bg-emerald-500 text-white border-emerald-500',
                        navTab: 'delivery_board',
                      },
                    ]).map(cat => {
                      const Icon = cat.icon;
                      const isOpen = selectedOrderCategory === cat.key;
                      return (
                        <button
                          key={cat.key}
                          type="button"
                          onClick={() => {
                            if (cat.navTab && user?.role !== 'user') {
                              selectTab(cat.navTab);
                            } else {
                              setSelectedOrderCategory(isOpen ? null : cat.key);
                            }
                          }}
                          className={cn(
                            "w-14 h-14 rounded-full border transition-all flex items-center justify-center relative shadow-sm cursor-pointer border-dashed outline-none",
                            isOpen ? cat.activeBg : `bg-white border-gray-200 ${cat.hoverBg}`
                          )}
                          title={cat.title}
                        >
                          <Icon size={20} />
                          {cat.count > 0 && (
                            <span className={cn(
                              "absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border shadow-sm",
                              isOpen ? cat.badgeActive : cat.badgeNormal
                            )}>
                              {cat.count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Order Detail Table (drawer) */}
                  {selectedOrderCategory && selectedOrderCategory !== 'create_order' && (() => {
                    const catOrders = selectedOrderCategory === 'all' ? filteredOrders
                      : selectedOrderCategory === 'recent' ? recentOrders
                        : selectedOrderCategory === 'hold' ? holdOrders
                          : selectedOrderCategory === 'process' ? processOrders
                            : completedOrders;
                    const titles = { all: 'All Orders', recent: 'Recent Orders', hold: 'On Hold', process: 'In Process', completed: 'Completed' };
                    return (
                      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                          <div>
                            <h3 className="text-sm font-black text-slate-900">{titles[selectedOrderCategory]}</h3>
                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">{catOrders.length} orders found</p>
                          </div>
                          <button onClick={() => setSelectedOrderCategory(null)} className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-400 font-bold text-[9px] uppercase tracking-widest border-b border-slate-100">
                              <tr>
                                <th className="px-6 py-3">Order</th>
                                <th className="px-6 py-3">Customer</th>
                                <th className="px-6 py-3">Category</th>
                                <th className="px-6 py-3">Qty</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Designer</th>
                                <th className="px-6 py-3">Actions</th>
                                <th className="px-6 py-3">Date</th>
                                {showAmountDetails && <th className="px-6 py-3">Amount</th>}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 text-xs">
                              {catOrders.length === 0 ? (
                                <tr><td colSpan={showAmountDetails ? 9 : 8} className="px-6 py-12 text-center text-slate-400 italic">No orders in this category.</td></tr>
                              ) : catOrders.slice(0, 15).map(o => (
                                <tr
                                  key={o.id}
                                  onClick={() => {
                                    if (selectedOrderCategory !== 'process') {
                                      handleOpenOrderDetail(o);
                                    }
                                  }}
                                  className={cn(
                                    "transition-colors",
                                    selectedOrderCategory === 'process' ? "hover:bg-slate-50/30" : "hover:bg-slate-50/50 cursor-pointer"
                                  )}
                                >
                                  <td className="px-6 py-3.5 font-mono font-bold text-slate-700">#{o.id.slice(-7)}</td>
                                  <td className="px-6 py-3.5">
                                    <p className="font-bold text-slate-800 leading-none">{o.customerInfo.name}</p>
                                    <p className="text-[9px] text-slate-400 mt-0.5">{o.customerInfo.phone}</p>
                                  </td>
                                  <td className="px-6 py-3.5 text-slate-500 font-semibold">{o.category}</td>
                                  <td className="px-6 py-3.5 font-black text-slate-900">{o.quantity}</td>
                                  <td className="px-6 py-3.5">
                                    <span className={cn('px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border', STATUS_COLORS[o.status] || 'bg-slate-100 text-slate-500')}>
                                      {o.status}
                                    </span>
                                  </td>
                                  <td className="px-6 py-3.5 font-bold text-slate-700">
                                    {o.assignedDesigner || <span className="text-slate-350 font-normal italic text-[10px]">Unassigned</span>}
                                  </td>
                                  <td className="px-6 py-3.5">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {['pending', 'hold', 'draft', 'PENDING', 'HOLD', 'DRAFT'].includes(o.status) && (
                                        <>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); setSharingOrder(o); }}
                                            className="bg-pink-50 hover:bg-pink-100 text-pink-700 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md border border-pink-200 transition-colors cursor-pointer"
                                          >
                                            Share to Designers
                                          </button>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handleUpdateOrder(o.id, { status: 'accounts' as any }); }}
                                            className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md border border-yellow-200 transition-colors cursor-pointer"
                                          >
                                            Move to Accounts
                                          </button>
                                        </>
                                      )}
                                      <button
                                        onClick={(e) => { e.stopPropagation(); downloadOrderPDF(o); }}
                                        className="bg-slate-50 hover:bg-slate-100 text-slate-700 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md border border-slate-200 transition-colors cursor-pointer flex items-center gap-1"
                                        title="Download PDF Order Sheet"
                                      >
                                        <Download className="w-3 h-3" />
                                        PDF
                                      </button>
                                    </div>
                                  </td>
                                  <td className="px-6 py-3.5 text-slate-400">{new Date(o.createdAt).toLocaleDateString()}</td>
                                  {showAmountDetails && (
                                    <td className="px-6 py-3.5 font-black text-slate-900">₹{(o.financials?.totalAmount || 0).toLocaleString()}</td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Metrics + Pipeline Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Revenue Chart */}
                    <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="text-sm font-black text-slate-900">Order Trend</h3>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5">Monthly order volume — last 6 months</p>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 rounded-full border border-emerald-100">
                          <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                          <span className="text-[10px] font-black text-emerald-700">Live</span>
                        </div>
                      </div>
                      <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={(() => {
                            return Array.from({ length: 6 }, (_, i) => {
                              const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
                              const month = d.getMonth(); const year = d.getFullYear();
                              return {
                                name: d.toLocaleDateString('en-US', { month: 'short' }),
                                orders: orders.filter(o => { const od = new Date(o.createdAt); return od.getMonth() === month && od.getFullYear() === year; }).length,
                                value: orders.filter(o => { const od = new Date(o.createdAt); return od.getMonth() === month && od.getFullYear() === year; }).reduce((s, o) => s + (o.financials?.totalAmount || 0), 0),
                              };
                            });
                          })()}>
                            <defs>
                              <linearGradient id="orderGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                            <YAxis tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} allowDecimals={false} />
                            <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.08)', fontSize: 11 }} />
                            <Area type="monotone" dataKey="orders" stroke="#6366f1" strokeWidth={2.5} fill="url(#orderGrad)" dot={{ fill: '#6366f1', r: 4, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} name="Orders" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Order Pipeline */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                      <div className="mb-5">
                        <h3 className="text-sm font-black text-slate-900">Order Pipeline</h3>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">Current status distribution</p>
                      </div>
                      <div className="space-y-3">
                        {[
                          { label: 'Delivered', count: completedOrders.length, color: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-700' },
                          { label: 'In Process', count: processOrders.length, color: 'bg-blue-500', light: 'bg-blue-50 text-blue-700' },
                          { label: 'On Hold', count: holdOrders.length, color: 'bg-amber-500', light: 'bg-amber-50 text-amber-700' },
                          { label: 'Draft/Pending', count: myOrders.filter(o => ['draft', 'DRAFT', 'pending', 'PENDING'].includes(o.status)).length, color: 'bg-slate-300', light: 'bg-slate-100 text-slate-600' },
                        ].map(item => {
                          const pct = myOrders.length > 0 ? Math.round((item.count / myOrders.length) * 100) : 0;
                          return (
                            <div key={item.label}>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-bold text-slate-700">{item.label}</span>
                                <div className="flex items-center gap-2">
                                  <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-full', item.light)}>{item.count}</span>
                                  <span className="text-[10px] text-slate-400 font-medium w-8 text-right">{pct}%</span>
                                </div>
                              </div>
                              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className={cn('h-full rounded-full transition-all duration-500', item.color)} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                        <div className="pt-3 border-t border-slate-100 mt-4">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-600">Total Orders</span>
                            <span className="font-black text-slate-900">{myOrders.length}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Active Deals + Recent Activity */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Active Deals Table */}
                    <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                        <div>
                          <h3 className="text-sm font-black text-slate-900">Active Clients</h3>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5">High-priority leads in your pipeline</p>
                        </div>
                        <button onClick={() => selectTab('clients')} className="text-[10px] font-black text-brand-primary hover:text-brand-primary/70 uppercase tracking-wider flex items-center gap-1 transition">
                          View all <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-slate-50 text-[9px] text-slate-400 font-black uppercase tracking-widest border-b border-slate-100">
                            <tr>
                              <th className="px-6 py-3">Client</th>
                              <th className="px-6 py-3">Company</th>
                              {showAmountDetails && <th className="px-6 py-3">Value</th>}
                              <th className="px-6 py-3">Type</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 text-xs">
                            {filteredLeads.slice(0, 5).map((l, i) => (
                              <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-3.5">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-white font-black text-[10px] shadow-sm">
                                      {l.name.charAt(0)}
                                    </div>
                                    <div>
                                      <p className="font-bold text-slate-800 leading-none">{l.name}</p>
                                      <p className="text-[9px] text-slate-400 mt-0.5 truncate max-w-[100px]">{(l as any).email || ''}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-3.5 text-slate-500 font-medium">{l.companyName}</td>
                                {showAmountDetails && (
                                  <td className="px-6 py-3.5 font-black text-slate-900">₹{l.totalOrderValue.toLocaleString()}</td>
                                )}
                                <td className="px-6 py-3.5">
                                  <span className={cn('px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border',
                                    l.leadType === 'Hot' ? 'bg-red-50 text-red-700 border-red-100' :
                                      l.leadType === 'Warm' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                        'bg-slate-100 text-slate-500 border-slate-200'
                                  )}>
                                    {l.leadType}
                                  </span>
                                </td>
                              </tr>
                            ))}
                            {filteredLeads.length === 0 && (
                              <tr><td colSpan={showAmountDetails ? 4 : 3} className="px-6 py-10 text-center text-slate-400 italic">No active clients yet.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Recent Orders Activity Feed */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                      <div className="flex items-center justify-between mb-5">
                        <div>
                          <h3 className="text-sm font-black text-slate-900">Recent Activity</h3>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5">Latest order updates</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="text-[9px] text-slate-400 font-bold uppercase">Live</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {myOrders.slice().sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 6).map(o => (
                          <div key={o.id} onClick={() => handleOpenOrderDetail(o)} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                            <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-[10px] font-black',
                              o.status === 'delivered' || o.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-700' :
                                o.status === 'hold' || o.status === 'HOLD' ? 'bg-amber-105 text-amber-700' :
                                  'bg-blue-100 text-blue-700'
                            )}>
                              {o.customerInfo.name.charAt(0)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-800 truncate">{o.customerInfo.name}</p>
                              <p className="text-[9px] text-slate-400 mt-0.5">{o.category} · #{o.id.slice(-5)}</p>
                            </div>
                            <span className={cn('text-[8px] font-black px-2 py-0.5 rounded-full border flex-shrink-0', STATUS_COLORS[o.status] || 'bg-slate-100 text-slate-550')}>
                              {o.status}
                            </span>
                          </div>
                        ))}
                        {myOrders.length === 0 && <p className="text-center text-slate-400 italic text-xs py-6">No orders yet.</p>}
                      </div>
                    </div>
                  </div>

                  {/* Lead Manager & Side Inventory Stock */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                      <div className="mb-4">
                        <h3 className="text-sm font-black text-slate-900">Lead Management</h3>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">Manage, qualify, and convert your leads</p>
                      </div>
                      <LeadManager />
                    </div>

                    <div className="lg:col-span-1 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col h-fit">
                      <div className="mb-4">
                        <h3 className="text-sm font-black text-slate-900">Warehouse Stock</h3>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">Active inventory stock levels</p>
                      </div>
                      {(() => {
                        const productStock = Object.values((inventory || []).reduce((acc: any, item: any) => {
                          const key = `${item.product}-${item.productType}-${item.sleeve || 'none'}-${item.pocket || 'none'}`;
                          if (!acc[key]) {
                            acc[key] = {
                              id: key,
                              name: item.product,
                              type: item.productType,
                              sleeve: item.sleeve,
                              pocket: item.pocket,
                              stock: 0,
                            };
                          }
                          if (item.type === 'inward') acc[key].stock += item.quantity;
                          else acc[key].stock -= item.quantity;
                          return acc;
                        }, {})) as any[];

                        let acceptedIds: string[] = [];
                        try {
                          const saved = localStorage.getItem('pallywear_accepted_products');
                          if (saved) acceptedIds = JSON.parse(saved);
                        } catch (e) {}

                        const acceptedStock = productStock.filter(p => acceptedIds.includes(p.id));

                        return acceptedStock.length > 0 ? (
                          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                            {acceptedStock.map(prod => (
                              <div key={prod.id} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between group hover:border-slate-200 transition-all animate-in fade-in duration-200">
                                <div className="min-w-0">
                                  <h4 className="text-xs font-bold text-slate-800 truncate">{prod.name}</h4>
                                  <p className="text-[9px] text-slate-400 font-medium uppercase mt-0.5 truncate">{prod.type}</p>
                                </div>
                                <span className={cn(
                                  "text-[10px] font-black px-2 py-0.5 rounded-full border shrink-0",
                                  prod.stock > 10 ? "bg-green-50 text-green-700 border-green-100" :
                                  prod.stock > 0 ? "bg-amber-50 text-amber-700 border-amber-100" :
                                  "bg-rose-50 text-rose-700 border-rose-100"
                                )}>
                                  {prod.stock} left
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <p className="text-xs text-slate-400 italic">No products approved for display.</p>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              );
            })()

            /* ==================== CALENDAR ==================== */
          ) : activeTab === 'calendar' ? (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Order Calendar</h2>
                  <p className="text-sm text-slate-500 font-medium mt-0.5">Orders plotted by creation date</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCalendarMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))} className="p-2 hover:bg-white rounded-xl transition-colors border border-slate-200 bg-white shadow-sm">
                    <ChevronLeft className="w-4 h-4 text-slate-600" />
                  </button>
                  <span className="text-sm font-black text-slate-800 uppercase tracking-wider px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-sm">
                    {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                  <button onClick={() => setCalendarMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))} className="p-2 hover:bg-white rounded-xl transition-colors border border-slate-200 bg-white shadow-sm">
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-100">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} className="py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">{d}</div>
                  ))}
                </div>
                {(() => {
                  const year = calendarMonth.getFullYear();
                  const month = calendarMonth.getMonth();
                  const firstDay = new Date(year, month, 1).getDay();
                  const daysInMonth = new Date(year, month + 1, 0).getDate();
                  const cells: React.ReactNode[] = [];
                  for (let i = 0; i < firstDay; i++) cells.push(<div key={`blank-${i}`} className="h-28 border-b border-r border-slate-50 bg-slate-50/30" />);
                  for (let d = 1; d <= daysInMonth; d++) {
                    const dayDate = new Date(year, month, d);
                    const yyyy = dayDate.getFullYear();
                    const mm = String(dayDate.getMonth() + 1).padStart(2, '0');
                    const dd = String(dayDate.getDate()).padStart(2, '0');
                    const dayDateString = `${yyyy}-${mm}-${dd}`;
                    
                    const dayOrders = myOrders.filter(o => {
                      const oDate = new Date(o.createdAt);
                      return oDate.getFullYear() === year && oDate.getMonth() === month && oDate.getDate() === d;
                    });
                    
                    const dayLeaves = leavesList.filter(l => l.date === dayDateString);
                    const isToday = new Date().toDateString() === dayDate.toDateString();
                    
                    cells.push(
                      <div 
                        key={d} 
                        onClick={() => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const dateToCompare = new Date(year, month, d);
                          if (dateToCompare < today) {
                            return;
                          }
                          setSelectedLeaveDate(dayDate);
                          setLeaveType('full_day');
                          setPermissionHours('2');
                          setLeaveReason('');
                          setShowLeaveModal(true);
                        }}
                        className={cn('h-28 p-2 border-b border-r border-slate-50 flex flex-col gap-1 overflow-hidden transition-colors cursor-pointer', isToday ? 'bg-indigo-50' : 'hover:bg-slate-50/60')}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className={cn('text-xs font-black w-6 h-6 flex items-center justify-center rounded-full', isToday ? 'bg-brand-primary text-white shadow-sm' : 'text-slate-500')}>{d}</span>
                        </div>

                        {/* Leave Logs list */}
                        {dayLeaves.map(l => {
                          const isApproved = l.status === 'approved' || !l.status;
                          const isRejected = l.status === 'rejected';
                          if (isRejected) return null;

                          let label = '';
                          let colorClass = '';
                          if (l.type === 'full_day') {
                            label = `Full Day (${l.userName})`;
                            colorClass = isApproved ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-slate-100 text-slate-500 border-slate-200 border-dashed';
                          } else if (l.type === 'half_day') {
                            label = `Half Day (${l.userName})`;
                            colorClass = isApproved ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-slate-100 text-slate-500 border-slate-200 border-dashed';
                          } else {
                            label = `Perm: ${l.permissionHours}h (${l.userName})`;
                            colorClass = isApproved ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-slate-100 text-slate-500 border-slate-200 border-dashed';
                          }

                          if (!isApproved) {
                            label = `[Pending] ${label}`;
                          }

                          return (
                            <div 
                              key={l.id} 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Delete this leave log for ${l.userName}?`)) {
                                  handleDeleteLeave(l.id);
                                }
                              }}
                              className={cn("text-[8px] font-black px-1.5 py-0.5 rounded-md truncate border cursor-pointer hover:opacity-80 transition-opacity", colorClass)}
                              title={`${l.userName} (${l.userRole}) leave${l.reason ? `: ${l.reason}` : ''}. Status: ${l.status || 'pending'}. Click to delete.`}
                            >
                              {l.userName ? `${label}${l.reason ? ` (${l.reason})` : ''}` : 'Leave log'}
                            </div>
                          );
                        })}

                        {dayOrders.slice(0, 2).map(o => (
                          <div key={o.id} onClick={(e) => { e.stopPropagation(); handleOpenOrderDetail(o); }} className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 truncate border border-indigo-100 cursor-pointer hover:bg-indigo-100 transition-colors">
                            #{o.id.slice(-4)} {o.customerInfo.name}
                          </div>
                        ))}
                        {dayOrders.length > 2 && <span className="text-[8px] font-black text-slate-400">+{dayOrders.length - 2} more</span>}
                      </div>
                    );
                  }
                  return <div className="grid grid-cols-7">{cells}</div>;
                })()}
              </div>
            </div>

            /* ==================== GRAPH ==================== */
          ) : activeTab === 'analytics' ? (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Graph</h2>
                  <p className="text-sm text-slate-500 font-medium mt-0.5">Order performance charts and business insights</p>
                </div>
                <div className="flex gap-1 p-1 bg-white border border-slate-200 rounded-xl shadow-sm">
                  {([['today', 'Today'], ['week', 'This Week'], ['month', 'This Month']] as const).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setGraphPeriod(key)}
                      className={cn('px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all',
                        graphPeriod === key ? 'bg-brand-primary text-white shadow-sm' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {(() => {
                const now = new Date();
                const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                const weekStart = todayStart - 6 * 24 * 60 * 60 * 1000;
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
                const rangeStart = graphPeriod === 'today' ? todayStart : graphPeriod === 'week' ? weekStart : monthStart;
                const periodOrders = myOrders.filter(o => o.createdAt >= rangeStart);
                const prevStart = rangeStart - (rangeStart - (graphPeriod === 'today' ? todayStart - 86400000 : graphPeriod === 'week' ? weekStart - 7 * 86400000 : monthStart - 30 * 86400000));

                let chartData: { name: string; orders: number; delivered: number; hold: number }[] = [];
                if (graphPeriod === 'today') {
                  chartData = Array.from({ length: 12 }, (_, h) => {
                    const hour = h * 2;
                    const hourOrders = myOrders.filter(o => { const d = new Date(o.createdAt); return d.getTime() >= todayStart && d.getHours() === hour; });
                    return { name: `${hour}:00`, orders: hourOrders.length, delivered: hourOrders.filter(o => ['delivered', 'DELIVERED'].includes(o.status)).length, hold: hourOrders.filter(o => ['hold', 'HOLD'].includes(o.status)).length };
                  });
                } else if (graphPeriod === 'week') {
                  chartData = Array.from({ length: 7 }, (_, i) => {
                    const ds = todayStart - (6 - i) * 86400000; const de = ds + 86400000;
                    const dayOrders = myOrders.filter(o => o.createdAt >= ds && o.createdAt < de);
                    return { name: new Date(ds).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }), orders: dayOrders.length, delivered: dayOrders.filter(o => ['delivered', 'DELIVERED'].includes(o.status)).length, hold: dayOrders.filter(o => ['hold', 'HOLD'].includes(o.status)).length };
                  });
                } else {
                  const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                  chartData = Array.from({ length: dim }, (_, i) => {
                    const ds = new Date(now.getFullYear(), now.getMonth(), i + 1).getTime(); const de = ds + 86400000;
                    const dayOrders = myOrders.filter(o => o.createdAt >= ds && o.createdAt < de);
                    return { name: `${i + 1}`, orders: dayOrders.length, delivered: dayOrders.filter(o => ['delivered', 'DELIVERED'].includes(o.status)).length, hold: dayOrders.filter(o => ['hold', 'HOLD'].includes(o.status)).length };
                  });
                }

                const periodLabel = graphPeriod === 'today' ? 'Today' : graphPeriod === 'week' ? 'This Week' : 'This Month';
                const barSize = graphPeriod === 'today' ? 20 : graphPeriod === 'week' ? 30 : 8;

                return (
                  <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { label: 'Total Orders', val: periodOrders.length, icon: ShoppingBag, color: 'indigo' },
                        { label: 'Delivered', val: periodOrders.filter(o => ['delivered', 'DELIVERED'].includes(o.status)).length, icon: CheckCircle2, color: 'emerald' },
                        { label: 'On Hold', val: periodOrders.filter(o => ['hold', 'HOLD'].includes(o.status)).length, icon: PauseCircle, color: 'amber' },
                        { label: 'In Process', val: periodOrders.filter(o => !['hold', 'HOLD', 'delivered', 'DELIVERED', 'draft', 'DRAFT'].includes(o.status)).length, icon: RefreshCw, color: 'blue' },
                      ].map((kpi, idx) => {
                        const Icon = kpi.icon;
                        const colors: Record<string, string> = { indigo: 'from-indigo-500 to-violet-500', emerald: 'from-emerald-500 to-teal-500', amber: 'from-amber-500 to-orange-500', blue: 'from-blue-500 to-cyan-500' };
                        const lightColors: Record<string, string> = { indigo: 'bg-indigo-50 text-indigo-600', emerald: 'bg-emerald-50 text-emerald-600', amber: 'bg-amber-50 text-amber-600', blue: 'bg-blue-50 text-blue-600' };
                        return (
                          <div key={idx} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                            <div className="flex items-center justify-between mb-4">
                              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', lightColors[kpi.color])}>
                                <Icon className="w-5 h-5" />
                              </div>
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{periodLabel}</span>
                            </div>
                            <p className="text-3xl font-black text-slate-900">{kpi.val}</p>
                            <p className="text-xs font-bold text-slate-500 mt-1">{kpi.label}</p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Main Chart */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
                        <div>
                          <h3 className="text-sm font-black text-slate-900">Orders Graph</h3>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                            {graphPeriod === 'today' ? 'Hourly breakdown' : graphPeriod === 'week' ? 'Last 7 days' : 'This month — daily'}
                          </p>
                        </div>
                        <div className="flex gap-4 items-center flex-wrap">
                          {[['#6366f1', 'Total'], ['#10b981', 'Delivered'], ['#f59e0b', 'Hold']].map(([color, label]) => (
                            <div key={label} className="flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                              <span className="text-[10px] font-bold text-slate-500 uppercase">{label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} barGap={3}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }} interval="preserveStartEnd" />
                            <YAxis tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} allowDecimals={false} />
                            <Tooltip cursor={{ fill: 'rgba(99,102,241,0.04)' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.08)', fontSize: 11 }} />
                            <Bar dataKey="orders" fill="#6366f1" radius={[5, 5, 0, 0]} barSize={barSize} name="Total" />
                            <Bar dataKey="delivered" fill="#10b981" radius={[5, 5, 0, 0]} barSize={barSize} name="Delivered" />
                            <Bar dataKey="hold" fill="#f59e0b" radius={[5, 5, 0, 0]} barSize={barSize} name="Hold" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Status Breakdown + Lead Distribution */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                        <h3 className="text-sm font-black text-slate-900 mb-5">Status Breakdown</h3>
                        <div className="h-56 flex items-center justify-center">
                          {periodOrders.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie data={[
                                  { name: 'Delivered', value: periodOrders.filter(o => ['delivered', 'DELIVERED'].includes(o.status)).length || 1 },
                                  { name: 'Hold', value: periodOrders.filter(o => ['hold', 'HOLD'].includes(o.status)).length || 1 },
                                  { name: 'Active', value: periodOrders.filter(o => !['delivered', 'DELIVERED', 'hold', 'HOLD'].includes(o.status)).length || 1 },
                                ]} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                                  <Cell fill="#10b981" />
                                  <Cell fill="#f59e0b" />
                                  <Cell fill="#6366f1" />
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.08)', fontSize: 11 }} />
                                <Legend iconType="circle" iconSize={8} formatter={(value) => <span style={{ fontSize: 10, fontWeight: 700 }}>{value}</span>} />
                              </PieChart>
                            </ResponsiveContainer>
                          ) : <p className="text-slate-400 italic text-sm">No data for this period.</p>}
                        </div>
                      </div>

                      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                        <h3 className="text-sm font-black text-slate-900 mb-5">Lead Distribution</h3>
                        <div className="h-56">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[
                              { name: 'Hot', value: filteredLeads.filter(l => l.leadType === 'Hot').length },
                              { name: 'Warm', value: filteredLeads.filter(l => l.leadType === 'Warm').length },
                              { name: 'Cold', value: filteredLeads.filter(l => l.leadType === 'Cold').length },
                            ]} barGap={8}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                              <YAxis tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} allowDecimals={false} />
                              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.08)', fontSize: 11 }} />
                              <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={50}>
                                <Cell fill="#ef4444" />
                                <Cell fill="#f59e0b" />
                                <Cell fill="#3b82f6" />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            /* ==================== INVOICES ==================== */
          ) : activeTab === 'invoices' ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Invoice Center</h2>
                  <p className="text-sm text-slate-500 font-medium mt-0.5">Manage billing and payment records</p>
                </div>
                <span className="px-3 py-1.5 bg-brand-primary/10 text-brand-primary rounded-full text-[10px] font-black uppercase tracking-wider border border-brand-primary/20">Billing & Payments</span>
              </div>
              <InvoiceManager />
            </div>

            /* ==================== CLIENTS ==================== */
          ) : activeTab === 'clients' ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">My Clients</h2>
                  <p className="text-sm text-slate-500 font-medium mt-0.5">Manage your active client relationships</p>
                </div>
                <span className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-black uppercase tracking-wider border border-indigo-100">{filteredLeads.length} Active</span>
              </div>
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-[9px] text-slate-400 font-black uppercase tracking-widest border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Client</th>
                      <th className="px-6 py-4">Company</th>
                      <th className="px-6 py-4">Total Value</th>
                      <th className="px-6 py-4">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs">
                    {filteredLeads.map((l, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-white font-black text-xs shadow-sm">
                              {l.name.charAt(0)}
                            </div>
                            <span className="font-bold text-slate-800">{l.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-500 font-medium">{l.companyName}</td>
                        <td className="px-6 py-4 font-black text-slate-900">₹{l.totalOrderValue.toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <span className={cn('px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border',
                            l.leadType === 'Hot' ? 'bg-red-50 text-red-700 border-red-100' :
                              l.leadType === 'Warm' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                'bg-slate-100 text-slate-500 border-slate-200'
                          )}>
                            {l.leadType}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filteredLeads.length === 0 && <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">No clients yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            /* ==================== HISTORY ==================== */
          ) : activeTab === 'history' ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Order History</h2>
                  <p className="text-slate-500 text-sm font-medium mt-0.5">Full list of orders across all departments</p>
                </div>
              </div>
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100 font-black text-[9px] text-slate-400 uppercase tracking-widest">
                    <tr>
                      <th className="px-6 py-4">Order ID</th>
                      <th className="px-6 py-4">Customer</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Last Update</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs">
                    {orders.length > 0 ? orders.map(order => (
                      <tr key={order.id} onClick={() => handleOpenOrderDetail(order)} className="hover:bg-slate-50/50 cursor-pointer transition-colors">
                        <td className="px-6 py-3.5 font-mono font-bold text-slate-700">#{order.id.slice(-8)}</td>
                        <td className="px-6 py-3.5 font-bold text-slate-900">{order.customerInfo.name}</td>
                        <td className="px-6 py-3.5 font-medium text-slate-500">{order.category}</td>
                        <td className="px-6 py-3.5">
                          <span className={cn('px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border', STATUS_COLORS[order.status] || 'bg-slate-100 text-slate-500')}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-slate-400">{new Date(order.updatedAt).toLocaleDateString()}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">No history found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            /* ==================== OTHER TABS ==================== */
          ) : activeTab === 'inventory' ? (
            <InventoryManagement userRole={['admin', 'order_management', UserRole.ADMIN, UserRole.ORDER_MANAGEMENT].includes(user?.role as any) ? user?.role : 'staff'} />
          ) : activeTab === 'marketing_orders' ? (
            <NewOrderForm
              onCreateOrder={handleCreateOrder}
              onSuccessRedirect={() => {
                setPrefillOrderData(null);
                setActiveTab('dashboard');
              }}
              initialData={prefillOrderData}
            />
          ) : activeTab === 'add_leads' ? (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                <h2 className="text-lg font-black text-slate-900 mb-4">Lead Board</h2>
                <LeadManager autoOpenAdd={true} />
              </div>
            </div>
          ) : activeTab === 'assign_leads' ? (
            <LeadAssignment />
          ) : activeTab === 'digitizer_comm' ? (
            <DigitizerCommunication orders={orders} onUpdateOrder={handleUpdateOrder} />
          ) : activeTab === 'designer' || user?.role === UserRole.DESIGNER || user?.role === 'designer' ? (
            <DesignDashboard
              orders={orders}
              onUpdateOrder={handleUpdateOrder}
              user={user}
              activeChannel={activeTab === 'design_om_comm' ? 'order_management' : 'staff'}
            />
          ) : activeTab === 'order_mgmt_board' ? (
            <OrderManagementDashboard orders={orders} inventory={inventory} onUpdateOrder={handleUpdateOrder} onDeleteOrder={handleDeleteOrder} isAdmin={user?.role === 'admin'} onReorder={handleReorder} />
          ) : activeTab === 'production_board' ? (
            <ProductionDashboard orders={orders} onUpdateOrder={handleUpdateOrder} onDeleteOrder={handleDeleteOrder} isAdmin={user?.role === 'admin'} onReorder={handleReorder} />
          ) : user?.role === UserRole.DIGITIZER || user?.role === 'digitizer' ? (
            <DigitizingDashboard orders={orders} onUpdateOrder={handleUpdateOrder} isAdmin={user?.role === 'admin'} />
          ) : activeTab === 'delivery_board' ? (
            <DeliveryDashboard orders={orders} onUpdateOrder={handleUpdateOrder} onDeleteOrder={handleDeleteOrder} isAdmin={user?.role === 'admin'} onReorder={handleReorder} />
          ) : (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                <h2 className="text-lg font-black text-slate-900 mb-4">Lead Board</h2>
                <LeadManager />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ===== MOBILE DRAWER ===== */}
      {isMobileOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setIsMobileOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-72 bg-white shadow-2xl z-40 lg:hidden flex flex-col">
            <div className="px-5 py-5 border-b border-slate-100 flex items-center justify-between">
              <Logo />
              <button onClick={() => setIsMobileOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
              {navGroups.map((group) => (
                <div key={group.title}>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] px-3 mb-2">{group.title}</p>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isInbox = item.id === 'design_channel';
                      const isActive = !isInbox && activeTab === item.id;
                      return (
                        <button
                          key={item.label}
                          onClick={() => item.action ? item.action() : selectTab(item.id as any)}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left',
                            isActive ? 'bg-brand-primary text-white shadow-sm' :
                              isInbox ? 'bg-violet-50 text-violet-700 border border-violet-100' :
                                'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                          )}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
            <div className="p-4 border-t border-slate-100 space-y-2 bg-slate-50/60">
              <button
                onClick={() => { setIsMobileOpen(false); setShowProfileModal(true); }}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-100 rounded-xl transition-all"
              >
                <img
                  src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=1A0B91&color=fff`}
                  className="w-8 h-8 rounded-full border border-slate-200 shadow-sm flex-shrink-0"
                  alt="Me"
                  referrerPolicy="no-referrer"
                />
                <div className="text-left min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-800 truncate leading-none">{user?.name}</p>
                  <p className="text-[10px] text-slate-400 capitalize truncate mt-0.5">{userRoleDisplay}</p>
                </div>
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </div>
        </>
      )}

      <ProfileSettings isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />
      <ConversationDashboard
        isOpen={isInboxOpen}
        onClose={() => { setIsInboxOpen(false); setInboxSelectedId(null); }}
        currentUser={user}
        orders={orders}
        onUpdateOrder={handleUpdateOrder}
        onCreateOrder={handleCreateOrder}
        initialSelectedId={inboxSelectedId}
      />
      {selectedDetailOrder && (
        <OrderDetailModal
          order={selectedDetailOrder}
          onClose={() => setSelectedDetailOrder(null)}
          isAdmin={user?.role === 'admin'}
          onReorder={handleReorder}
          onUpdateOrder={async (id, updates) => {
            await handleUpdateOrder(id, updates);
            setSelectedDetailOrder(prev => prev && prev.id === id ? { ...prev, ...updates } : null);
          }}
        />
      )}

      {sharingOrder && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-hidden border border-slate-100 p-6 space-y-4">
            <h3 className="text-lg font-black text-slate-900 text-center">Share Order to Designers</h3>
            
            {sharingOrder.notes && (
              <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 max-h-32 overflow-y-auto">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Previous Notes</p>
                <p className="text-[10.5px] text-gray-650 font-medium whitespace-pre-wrap">{sharingOrder.notes}</p>
              </div>
            )}

            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-black text-indigo-950 uppercase tracking-wider">Design Instructions / Notes</label>
              <textarea
                rows={4}
                className="w-full px-3 py-2 bg-slate-55 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-650 focus:bg-white outline-none text-xs font-medium resize-none text-slate-800"
                placeholder="Enter details, requirements, or changes for designers..."
                value={sharingNotes}
                onChange={(e) => setSharingNotes(e.target.value)}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={async () => {
                  const textMsg = sharingNotes.trim();
                  const timestamp = new Date().toLocaleString();
                  const newNote = `[STAFF -> DESIGNER] ${timestamp}: ${textMsg || 'No notes specified.'}`;
                  const updatedNotes = sharingOrder.notes ? `${sharingOrder.notes}\n\n${newNote}` : newNote;
                  try {
                    await handleUpdateOrder(sharingOrder.id, {
                      status: 'design' as any,
                      notes: updatedNotes,
                      updatedAt: Date.now()
                    });
                    setSharingOrder(null);
                    setSharingNotes('');
                    alert("Order successfully shared to Designers.");
                  } catch (e) {
                    alert("Failed to share order.");
                  }
                }}
                className="px-4 py-3 bg-[#534AB7] hover:bg-[#3C3489] text-white rounded-2xl font-black text-xs uppercase tracking-wider cursor-pointer flex-1 text-center border-none"
              >
                Confirm Share
              </button>
              <button
                onClick={() => {
                  setSharingOrder(null);
                  setSharingNotes('');
                }}
                className="px-4 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl font-black text-xs uppercase tracking-wider cursor-pointer flex-1 text-center"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave request modal */}
      <AnimatePresence>
        {showLeaveModal && selectedLeaveDate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-hidden border border-slate-100"
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-650 flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Leave Logs</h3>
                    <p className="text-[10px] text-slate-450 font-medium">Log your leaves or hourly permissions for {selectedLeaveDate.toLocaleDateString()}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setShowLeaveModal(false); setSelectedLeaveDate(null); }}
                  className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveLeave} className="p-6 space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Select Leave Option</label>
                  <select
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value as any)}
                    className="border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  >
                    <option value="full_day">🌴 Full Day Leave</option>
                    <option value="half_day">🌤️ Half Day Leave</option>
                    <option value="hours_permission">⏱️ Hours Permission</option>
                  </select>
                </div>

                {leaveType === 'hours_permission' && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">How many hours?</label>
                    <input
                      type="number"
                      min="1"
                      max="8"
                      value={permissionHours}
                      onChange={(e) => setPermissionHours(e.target.value)}
                      className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50/40"
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Reason for Leave</label>
                  <textarea
                    rows={2}
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                    placeholder="Provide a brief reason..."
                    className="border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50/40 placeholder:text-slate-400"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => { setShowLeaveModal(false); setSelectedLeaveDate(null); }}
                    className="px-4 py-2 border border-slate-250 text-slate-650 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingLeave}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                  >
                    {isSavingLeave ? 'Saving...' : 'Save Leave Logs'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
