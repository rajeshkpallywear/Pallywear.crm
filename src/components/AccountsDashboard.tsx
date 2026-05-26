/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ClipboardCheck,
  LayoutDashboard,
  Calendar,
  BarChart3,
  Building2,
  UserCheck,
  Receipt,
  Truck,
  Coins,
  Search,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  FileText,
  MoreVertical,
  Plus,
  AlertCircle,
  CheckCircle,
  Activity,
  CreditCard,
  Filter,
  X,
} from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { cn, isOrderSizeValid } from '../lib/utils';
import FileUpload from './FileUpload';
import ImageViewer from './ImageViewer';

interface AccountsDashboardProps {
  orders: Order[];
  onUpdateOrder: (id: string, updates: Partial<Order>) => Promise<void>;
  isAdmin?: boolean;
  activeSubTab?: SidebarTab;
  onSubTabChange?: (tab: SidebarTab) => void;
}

type SidebarTab = 'billing' | 'overview' | 'calendar' | 'graph' | 'office';
type GraphPeriod = 'today' | 'week' | 'month';
type OfficeTab = 'expense' | 'vendor' | 'salary' | 'delivery' | 'courier' | 'loss';

type LedgerEntry = {
  id: string;
  title: string;
  amount: number;
  date: string;
  note?: string;
  total?: number;

  // Expense fields
  details?: string;
  whyBuying?: string;
  pdfFile?: string;

  // Salary fields
  accountNumber?: string;
  bankName?: string;
  ifscCode?: string;
  workDetails?: string;
  leaveDays?: number;
  workingDays?: number;

  // Delivery fields
  bike?: string;
  petrol?: number;
  courierDetail?: string;

  // Loss fields
  whyReturn?: string;
  fault?: string;

  // Vendor fields
  category?: string;
  qty?: number;
  expectAmount?: number;
  buyingAmount?: number;
  color?: string;

  // Courier fields
  courierProvider?: string;
  courierTrackingId?: string;
};

type StatCardProps = {
  label: string;
  value: string;
  icon: React.ElementType;
  tone?: 'slate' | 'emerald' | 'rose' | 'indigo';
  hint?: string;
};

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const todayInputValue = () => new Date().toISOString().slice(0, 10);

const loadStoredArray = <T,>(key: string): T[] => {
  try {
    if (typeof window === 'undefined') return [];
    const stored = window.localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveStoredArray = <T,>(key: string, value: T[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

const StatCard = ({ label, value, icon: Icon, tone = 'slate', hint }: StatCardProps) => {
  const toneClasses = {
    slate: 'bg-slate-100 text-slate-700',
    emerald: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600',
    indigo: 'bg-indigo-50 text-indigo-600',
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        <span className={cn('w-9 h-9 rounded-2xl flex items-center justify-center', toneClasses[tone])}>
          <Icon size={17} />
        </span>
      </div>
      <p className="text-2xl font-black text-slate-900 mt-3">{value}</p>
      {hint && <p className="text-xs font-bold text-slate-400 mt-1">{hint}</p>}
    </div>
  );
};

export default function AccountsDashboard({
  orders,
  onUpdateOrder,
  isAdmin,
  activeSubTab,
  onSubTabChange,
}: AccountsDashboardProps) {
  const [internalActiveSidebarTab, setInternalActiveSidebarTab] = useState<SidebarTab>('overview');
  const activeSidebarTab = activeSubTab !== undefined ? activeSubTab : internalActiveSidebarTab;
  const setActiveSidebarTab = onSubTabChange !== undefined ? onSubTabChange : setInternalActiveSidebarTab;

  const [activeOfficeTab, setActiveOfficeTab] = useState<OfficeTab>('expense');
  const [graphPeriod, setGraphPeriod] = useState<GraphPeriod>('month');

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [billingFiles, setBillingFiles] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [orderQueryFilter, setOrderQueryFilter] = useState<'total' | 'recent' | 'hold' | 'processed' | 'completed'>('total');

  const [expenses, setExpenses] = useState<LedgerEntry[]>(() => loadStoredArray('pw_accounts_expenses'));
  const [salaries, setSalaries] = useState<LedgerEntry[]>(() => loadStoredArray('pw_accounts_salaries'));
  const [deliveryExpenses, setDeliveryExpenses] = useState<LedgerEntry[]>(() => loadStoredArray('pw_accounts_delivery_expenses'));
  const [vendors, setVendors] = useState<LedgerEntry[]>(() => loadStoredArray('pw_accounts_vendors'));
  const [courierExpenses, setCourierExpenses] = useState<LedgerEntry[]>(() => {
    const cached = loadStoredArray<LedgerEntry>('pw_accounts_couriers');
    if (cached && cached.length > 0) return cached;
    return loadStoredArray<LedgerEntry>('pw_accounts_losses'); // Backward compatibility fallback
  });
  const [losses, setLosses] = useState<LedgerEntry[]>(() => loadStoredArray('pw_accounts_losses_v2'));

  // Custom states for each dynamically guided bookkeeping forms
  // Expense
  const [expenseDetails, setExpenseDetails] = useState('');
  const [expenseWhyBuying, setExpenseWhyBuying] = useState('');
  const [expensePdf, setExpensePdf] = useState<string | null>(null);

  // Salary
  const [salaryAccountNumber, setSalaryAccountNumber] = useState('');
  const [salaryBankName, setSalaryBankName] = useState('');
  const [salaryIfscCode, setSalaryIfscCode] = useState('');
  const [salaryWorkDetails, setSalaryWorkDetails] = useState('');
  const [salaryLeaveDays, setSalaryLeaveDays] = useState('');
  const [salaryWorkingDays, setSalaryWorkingDays] = useState('');

  // Delivery expense
  const [deliveryBike, setDeliveryBike] = useState('');
  const [deliveryPetrol, setDeliveryPetrol] = useState('');
  const [deliveryCourierVal, setDeliveryCourierVal] = useState('');

  // Loss
  const [lossWhyReturn, setLossWhyReturn] = useState('');
  const [lossFault, setLossFault] = useState('');

  // Vendor
  const [vendorCategory, setVendorCategory] = useState('');
  const [vendorQty, setVendorQty] = useState('');
  const [vendorExpectAmount, setVendorExpectAmount] = useState('');
  const [vendorBuyingAmount, setVendorBuyingAmount] = useState('');
  const [vendorColor, setVendorColor] = useState('');
  const [vendorTotalAmount, setVendorTotalAmount] = useState('');

  // Courier
  const [courierProvider, setCourierProvider] = useState('');
  const [courierTrackingId, setCourierTrackingId] = useState('');

  const [entryTitle, setEntryTitle] = useState('');
  const [entryAmount, setEntryAmount] = useState('');
  const [entryDate, setEntryDate] = useState(todayInputValue());
  const [entryNote, setEntryNote] = useState('');
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  useEffect(() => saveStoredArray('pw_accounts_expenses', expenses), [expenses]);
  useEffect(() => saveStoredArray('pw_accounts_salaries', salaries), [salaries]);
  useEffect(() => saveStoredArray('pw_accounts_delivery_expenses', deliveryExpenses), [deliveryExpenses]);
  useEffect(() => saveStoredArray('pw_accounts_vendors', vendors), [vendors]);
  useEffect(() => saveStoredArray('pw_accounts_losses_v2', losses), [losses]);
  useEffect(() => {
    saveStoredArray('pw_accounts_couriers', courierExpenses);
    saveStoredArray('pw_accounts_losses', courierExpenses);
  }, [courierExpenses]);

  const accountsOrders = useMemo(
    () => orders.filter((order) => order.status === OrderStatus.ACCOUNTS || (order.status === OrderStatus.HOLD && order.previousStatus === OrderStatus.ACCOUNTS)),
    [orders],
  );

  const completedOrders = useMemo(
    () => orders.filter((order) => order.status === OrderStatus.DELIVERED),
    [orders],
  );

  const processedOrders = useMemo(
    () => orders.filter((order) => order.status === OrderStatus.ORDER_MANAGEMENT),
    [orders],
  );

  const grossRevenue = useMemo(
    () => completedOrders.reduce((sum, order) => sum + (order.financials?.totalAmount || 0), 0),
    [completedOrders],
  );

  const pendingBalance = useMemo(
    () => accountsOrders.reduce((sum, order) => sum + (order.financials?.balanceAmount || 0), 0),
    [accountsOrders],
  );

  const totalOut =
    expenses.reduce((sum, entry) => sum + entry.amount, 0) +
    salaries.reduce((sum, entry) => sum + entry.amount, 0) +
    deliveryExpenses.reduce((sum, entry) => sum + entry.amount, 0) +
    vendors.reduce((sum, entry) => sum + (entry.total || entry.amount), 0) +
    courierExpenses.reduce((sum, entry) => sum + entry.amount, 0) +
    losses.reduce((sum, entry) => sum + entry.amount, 0);

  const netAmount = grossRevenue - totalOut;

  // Period based calculations (Today, This Week, This Month) for Analytics Graph view
  const filterByPeriod = (dateVal: string | number, period: GraphPeriod) => {
    const date = new Date(dateVal);
    const today = new Date();

    if (period === 'today') {
      return date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();
    }

    if (period === 'week') {
      const diffTime = Math.abs(today.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    }

    if (period === 'month') {
      return date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();
    }

    return true;
  };

  const periodGrossRevenue = useMemo(() => {
    return completedOrders
      .filter((order) => filterByPeriod(order.updatedAt || order.createdAt, graphPeriod))
      .reduce((sum, order) => sum + (order.financials?.totalAmount || 0), 0);
  }, [completedOrders, graphPeriod]);

  const periodExpenditure = useMemo(() => {
    const allExpenditures = [
      ...expenses,
      ...salaries,
      ...deliveryExpenses,
      ...vendors,
      ...courierExpenses,
      ...losses,
    ];
    return allExpenditures
      .filter((entry) => filterByPeriod(entry.date, graphPeriod))
      .reduce((sum, entry) => sum + (entry.total || entry.amount), 0);
  }, [expenses, salaries, deliveryExpenses, vendors, courierExpenses, losses, graphPeriod]);

  const periodNetAmount = periodGrossRevenue - periodExpenditure;

  const filteredOrders = orders.filter((order) => {
    const search = orderSearchTerm.toLowerCase();
    const matchesSearch =
      order.customerInfo.name.toLowerCase().includes(search) ||
      order.id.toLowerCase().includes(search);

    if (!matchesSearch) return false;

    if (orderQueryFilter === 'total') return true;
    if (orderQueryFilter === 'hold') return order.status === OrderStatus.HOLD;
    if (orderQueryFilter === 'completed') return order.status === OrderStatus.DELIVERED;
    if (orderQueryFilter === 'recent') return Date.now() - order.createdAt <= 7 * 24 * 60 * 60 * 1000;
    if (orderQueryFilter === 'processed') {
      // Processed status represents any orders progress beyond accounts-wait but not completed yet
      return order.status !== OrderStatus.ACCOUNTS && order.status !== OrderStatus.DELIVERED && order.status !== OrderStatus.HOLD;
    }

    return order.status === OrderStatus.ACCOUNTS || (order.status === OrderStatus.HOLD && order.previousStatus === OrderStatus.ACCOUNTS);
  });

  const activeLedger = {
    expense: expenses,
    vendor: vendors,
    salary: salaries,
    delivery: deliveryExpenses,
    courier: courierExpenses,
    loss: losses,
  }[activeOfficeTab];

  const officeCopy = {
    expense: {
      title: 'Office Expense',
      label: 'Expense Name',
      placeholder: 'Rent, electricity, general items to buy...',
      amount: 'Amount',
      icon: Coins,
    },
    vendor: {
      title: 'Vendor Payouts',
      label: 'Vendor Name',
      placeholder: 'Vendor or workshop name...',
      amount: 'Vendor Amount',
      icon: Receipt,
    },
    salary: {
      title: 'Staff Salary',
      label: 'Staff Name',
      placeholder: 'Employee description name...',
      amount: 'Salary Amount',
      icon: UserCheck,
    },
    delivery: {
      title: 'Logistics / Delivery',
      label: 'Delivery Detail',
      placeholder: 'Delivery vehicle, petrol amount, driver...',
      amount: 'Delivery Expense',
      icon: Truck,
    },
    courier: {
      title: 'Courier',
      label: 'Courier Detail',
      placeholder: 'DTDC, safe dispatch postage list...',
      amount: 'Courier Price',
      icon: CreditCard,
    },
    loss: {
      title: 'Loss / Returns',
      label: 'Return Item Name',
      placeholder: 'Product return detail, damages...',
      amount: 'Loss Amount',
      icon: ArrowDownRight,
    },
  }[activeOfficeTab];

  const resetEntryForm = () => {
    setEntryTitle('');
    setEntryAmount('');
    setEntryDate(todayInputValue());
    setEntryNote('');

    setExpenseDetails('');
    setExpenseWhyBuying('');
    setExpensePdf(null);

    setSalaryAccountNumber('');
    setSalaryBankName('');
    setSalaryIfscCode('');
    setSalaryWorkDetails('');
    setSalaryLeaveDays('');
    setSalaryWorkingDays('');

    setDeliveryBike('');
    setDeliveryPetrol('');
    setDeliveryCourierVal('');

    setLossWhyReturn('');
    setLossFault('');

    setVendorCategory('');
    setVendorQty('');
    setVendorExpectAmount('');
    setVendorBuyingAmount('');
    setVendorColor('');
    setVendorTotalAmount('');

    setCourierProvider('');
    setCourierTrackingId('');
  };

  const addLedgerEntry = () => {
    let titleVal = entryTitle.trim();
    if (activeOfficeTab === 'loss' && !titleVal) {
      // Use standard title if provided
      titleVal = 'Loss Return Entry';
    }
    const amount = Number(entryAmount);
    if (!titleVal && !Number.isFinite(amount)) return;

    const entry: LedgerEntry = {
      id: `${activeOfficeTab}_${Date.now()}`,
      title: titleVal,
      amount,
      total: activeOfficeTab === 'vendor' && vendorTotalAmount ? Number(vendorTotalAmount) : amount,
      date: entryDate || todayInputValue(),
      note: entryNote.trim(),

      // Form payload
      details: expenseDetails.trim() || undefined,
      whyBuying: expenseWhyBuying.trim() || undefined,
      pdfFile: expensePdf || undefined,

      accountNumber: salaryAccountNumber.trim() || undefined,
      bankName: salaryBankName.trim() || undefined,
      ifscCode: salaryIfscCode.trim() || undefined,
      workDetails: salaryWorkDetails.trim() || undefined,
      leaveDays: salaryLeaveDays ? Number(salaryLeaveDays) : undefined,
      workingDays: salaryWorkingDays ? Number(salaryWorkingDays) : undefined,

      bike: deliveryBike.trim() || undefined,
      petrol: deliveryPetrol ? Number(deliveryPetrol) : undefined,
      courierDetail: deliveryCourierVal.trim() || undefined,

      whyReturn: lossWhyReturn.trim() || undefined,
      fault: lossFault.trim() || undefined,

      category: vendorCategory.trim() || undefined,
      qty: vendorQty ? Number(vendorQty) : undefined,
      expectAmount: vendorExpectAmount ? Number(vendorExpectAmount) : undefined,
      buyingAmount: vendorBuyingAmount ? Number(vendorBuyingAmount) : undefined,
      color: vendorColor.trim() || undefined,

      courierProvider: courierProvider.trim() || undefined,
      courierTrackingId: courierTrackingId.trim() || undefined,
    };

    if (activeOfficeTab === 'expense') setExpenses((items) => [entry, ...items]);
    if (activeOfficeTab === 'vendor') setVendors((items) => [entry, ...items]);
    if (activeOfficeTab === 'salary') setSalaries((items) => [entry, ...items]);
    if (activeOfficeTab === 'delivery') setDeliveryExpenses((items) => [entry, ...items]);
    if (activeOfficeTab === 'courier') setCourierExpenses((items) => [entry, ...items]);
    if (activeOfficeTab === 'loss') setLosses((items) => [entry, ...items]);

    resetEntryForm();
  };

  const removeLedgerEntry = (id: string) => {
    if (activeOfficeTab === 'expense') setExpenses((items) => items.filter((entry) => entry.id !== id));
    if (activeOfficeTab === 'vendor') setVendors((items) => items.filter((entry) => entry.id !== id));
    if (activeOfficeTab === 'salary') setSalaries((items) => items.filter((entry) => entry.id !== id));
    if (activeOfficeTab === 'delivery') setDeliveryExpenses((items) => items.filter((entry) => entry.id !== id));
    if (activeOfficeTab === 'courier') setCourierExpenses((items) => items.filter((entry) => entry.id !== id));
    if (activeOfficeTab === 'loss') setLosses((items) => items.filter((entry) => entry.id !== id));
  };

  const handleProcessOrder = async () => {
    if (!selectedOrder || isProcessing) return;

    const nextState = { ...selectedOrder, accountsAttachments: billingFiles };
    if (!isOrderSizeValid(nextState)) {
      alert('Error: File limit exceeded (Max 1MB).');
      return;
    }

    setIsProcessing(true);
    try {
      await onUpdateOrder(selectedOrder.id, {
        status: OrderStatus.ORDER_MANAGEMENT,
        accountsAttachments: billingFiles,
        updatedAt: Date.now(),
      });
      setSelectedOrder(null);
      setBillingFiles([]);
      alert('Order moved to Management Hub.');
    } finally {
      setIsProcessing(false);
    }
  };

  const SidebarItem = ({ id, icon: Icon, label }: { id: SidebarTab; icon: React.ElementType; label: string }) => (
    <button
      onClick={() => setActiveSidebarTab(id)}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 group',
        activeSidebarTab === id
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900',
      )}
    >
      <Icon size={20} className={activeSidebarTab === id ? 'text-white' : 'text-slate-400 group-hover:text-slate-900'} />
      <span className="text-sm font-bold tracking-tight">{label}</span>
    </button>
  );

  return (
    <div className="flex min-h-[85vh] bg-slate-50/50 rounded-[32px] overflow-hidden border border-slate-200 animate-in fade-in duration-500 font-sans">
      {activeSubTab === undefined && (
        <aside className="w-72 bg-white border-r border-slate-100 p-6 flex flex-col gap-6 flex-shrink-0">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Core Workflow</p>
            <nav className="space-y-1.5">
              <SidebarItem id="overview" icon={LayoutDashboard} label="Overview Board" />
              <SidebarItem id="calendar" icon={Calendar} label="Intake Calendar" />
              <SidebarItem id="graph" icon={BarChart3} label="Performance Graph" />
            </nav>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Office Bookkeeping</label>
            <div className="flex flex-col gap-1">
              {[
                { id: 'expense' as const, label: 'Office Expense', icon: Coins },
                { id: 'vendor' as const, label: 'Vendor Payouts', icon: Receipt },
                { id: 'salary' as const, label: 'Staff Salary', icon: UserCheck },
                { id: 'delivery' as const, label: 'Logistics/Delivery', icon: Truck },
                { id: 'courier' as const, label: 'Courier (Coriur)', icon: CreditCard },
                { id: 'loss' as const, label: 'Loss / Returns', icon: ArrowDownRight },
              ].map((sub) => {
                const SubIcon = sub.icon;
                const isActive = activeSidebarTab === 'office' && activeOfficeTab === sub.id;
                return (
                  <button
                    key={sub.id}
                    onClick={() => {
                      setActiveSidebarTab('office');
                      setActiveOfficeTab(sub.id);
                    }}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-left border-none bg-transparent cursor-pointer',
                      isActive
                        ? 'bg-slate-900 text-white shadow shadow-slate-200 font-black text-[11px]'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950 font-bold text-[11px]',
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <SubIcon size={14} className={isActive ? 'text-white' : 'text-slate-400'} />
                      <span>{sub.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-auto space-y-4 shrink-0 font-sans">
            <div className="p-4 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl text-white shadow-sm">
              <p className="text-[9px] font-black uppercase opacity-60">Expenditure Total</p>
              <p className="text-sm font-black mt-0.5">{currency.format(totalOut)} Spent</p>
            </div>
          </div>
        </aside>
      )}

      <main className="flex-1 p-8 overflow-y-auto">
        {activeSidebarTab === 'billing' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Accounts Dashboard</h2>
                <p className="text-sm text-slate-500">Verify payments, upload invoices and send approved orders to production.</p>
              </div>

              <div className="flex flex-wrap gap-1 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
                {[
                  { id: 'total', label: 'Total Orders', icon: ClipboardCheck },
                  { id: 'recent', label: 'Recent Orders', icon: Activity },
                  { id: 'hold', label: 'Hold Orders', icon: AlertCircle },
                  { id: 'processed', label: 'Processed Orders', icon: Coins },
                  { id: 'completed', label: 'Completed Orders', icon: CheckCircle },
                ].map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setOrderQueryFilter(filter.id as typeof orderQueryFilter)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all',
                      orderQueryFilter === filter.id ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50',
                    )}
                  >
                    <filter.icon size={12} />
                    {filter.label}
                  </button>
                ))}
              </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-4 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search orders..."
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-100 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={orderSearchTerm}
                    onChange={(event) => setOrderSearchTerm(event.target.value)}
                  />
                </div>

                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                  {filteredOrders.length > 0 ? (
                    filteredOrders.map((order) => (
                      <button
                        key={order.id}
                        onClick={() => {
                          setSelectedOrder(order);
                          setBillingFiles(order.accountsAttachments || []);
                        }}
                        className={cn(
                          'w-full text-left p-4 rounded-2xl border transition-all',
                          selectedOrder?.id === order.id
                            ? 'bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-100'
                            : 'bg-white border-slate-100 hover:border-indigo-200',
                        )}
                      >
                        <div className="flex justify-between items-start">
                          <span className={cn('text-[10px] font-bold uppercase', selectedOrder?.id === order.id ? 'text-indigo-100' : 'text-slate-400')}>
                            #{order.id.slice(-6)}
                          </span>
                          <span className="text-[10px] font-black text-emerald-500 px-2 py-0.5 bg-emerald-50 rounded-lg">
                            {currency.format(order.financials?.totalAmount || 0)}
                          </span>
                        </div>
                        <p className={cn('text-sm font-black mt-1', selectedOrder?.id === order.id ? 'text-white' : 'text-slate-900')}>
                          {order.customerInfo.name}
                        </p>
                        <p className={cn('text-[11px] font-bold mt-1', selectedOrder?.id === order.id ? 'text-indigo-100' : 'text-slate-400')}>
                          Balance {currency.format(order.financials?.balanceAmount || 0)}
                        </p>
                      </button>
                    ))
                  ) : (
                    <div className="bg-white border border-slate-100 rounded-2xl p-6 text-center">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No matching orders</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-8">
                {selectedOrder ? (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-8 bg-slate-50/50 border-b border-slate-100">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-xl font-black text-slate-900">Billing Verification</h3>
                          <p className="text-xs font-bold text-slate-400 mt-1">
                            {selectedOrder.customerInfo.name} - #{selectedOrder.id.slice(-6)}
                          </p>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-white border border-slate-100 text-[10px] font-black text-slate-500 uppercase">
                          {selectedOrder.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-6">
                        <div className="p-4 bg-white rounded-2xl border border-slate-100">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Balance Amount</p>
                          <p className="text-xl font-black text-rose-500">{currency.format(selectedOrder.financials?.balanceAmount || 0)}</p>
                        </div>
                        <div className="p-4 bg-white rounded-2xl border border-slate-100">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Advance Paid</p>
                          <p className="text-xl font-black text-emerald-500">{currency.format(selectedOrder.financials?.advancePay || 0)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-8 space-y-6">
                      {selectedOrder.accountsAttachments?.length ? (
                        <div className="space-y-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Existing Attachments</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedOrder.accountsAttachments.map((file, index) => (
                              <button
                                key={`${file}_${index}`}
                                onClick={() => setViewingImage(file)}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 text-xs font-bold text-slate-600"
                              >
                                <FileText size={14} />
                                Receipt {index + 1}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <FileUpload label="Upload Payment Proof / Invoice Copy" onFilesSelected={setBillingFiles} />

                      <button
                        onClick={handleProcessOrder}
                        disabled={isProcessing || isAdmin === false}
                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isProcessing ? 'Processing...' : <>Confirm & Send to Production <ArrowUpRight size={16} /></>}
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <div className="min-h-[520px] border-2 border-dashed border-slate-100 rounded-[32px] flex flex-col items-center justify-center text-slate-300">
                    <ClipboardCheck size={48} className="mb-4 opacity-20" />
                    <p className="font-bold text-sm uppercase tracking-widest">Select an order to verify billing</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeSidebarTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <header>
              <h2 className="text-2xl font-black text-slate-900">Financial Snapshot</h2>
              <p className="text-sm text-slate-500">Quick totals across billing, revenue and internal spending.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              <StatCard label="Gross Revenue" value={currency.format(grossRevenue)} icon={TrendingUp} tone="emerald" hint={`${completedOrders.length} delivered orders`} />
              <StatCard label="Pending Balance" value={currency.format(pendingBalance)} icon={CreditCard} tone="rose" hint={`${accountsOrders.length} awaiting billing`} />
              <StatCard label="Total Expenditure" value={currency.format(totalOut)} icon={ArrowDownRight} tone="indigo" hint="Office, vendor, salary and logistics" />
              <StatCard label="Net Amount" value={currency.format(netAmount)} icon={Activity} tone="slate" hint="Revenue minus expenditure" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-slate-900">Billing Queue</h3>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{accountsOrders.length} open</span>
                </div>
                <div className="mt-5 space-y-3">
                  {accountsOrders.slice(0, 5).map((order) => (
                    <button
                      key={order.id}
                      onClick={() => {
                        setActiveSidebarTab('billing');
                        setSelectedOrder(order);
                      }}
                      className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 text-left"
                    >
                      <div>
                        <p className="text-sm font-black text-slate-900">{order.customerInfo.name}</p>
                        <p className="text-[11px] font-bold text-slate-400">#{order.id.slice(-6)}</p>
                      </div>
                      <p className="text-sm font-black text-rose-500">{currency.format(order.financials?.balanceAmount || 0)}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                <h3 className="text-lg font-black text-slate-900">Workflow Status</h3>
                <div className="mt-5 space-y-4">
                  {[
                    { label: 'Awaiting Billing', value: accountsOrders.length, color: 'bg-indigo-500' },
                    { label: 'Processed', value: processedOrders.length, color: 'bg-emerald-500' },
                    { label: 'Delivered', value: completedOrders.length, color: 'bg-slate-900' },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="flex justify-between text-xs font-black text-slate-500 mb-2">
                        <span>{item.label}</span>
                        <span>{item.value}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full', item.color)}
                          style={{ width: `${Math.min(100, orders.length ? (item.value / orders.length) * 100 : 0)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSidebarTab === 'calendar' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <header className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Accounts Calendar</h2>
                <p className="text-sm text-slate-500">Orders grouped by billing creation date.</p>
              </div>
              <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-100 rounded-2xl text-xs font-black text-slate-500">
                <Filter size={14} />
                This Month
              </button>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-7 gap-4">
              {Array.from({ length: 7 }).map((_, index) => {
                const date = new Date();
                date.setDate(date.getDate() + index);
                const dayOrders = orders.filter((order) => new Date(order.createdAt).toDateString() === date.toDateString());

                return (
                  <div key={date.toISOString()} className="bg-white rounded-3xl border border-slate-100 shadow-sm min-h-56 p-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {date.toLocaleDateString('en-IN', { weekday: 'short' })}
                    </p>
                    <p className="text-2xl font-black text-slate-900">{date.getDate()}</p>
                    <div className="mt-4 space-y-2">
                      {dayOrders.length > 0 ? (
                        dayOrders.slice(0, 3).map((order) => (
                          <button
                            key={order.id}
                            onClick={() => {
                              setActiveSidebarTab('billing');
                              setSelectedOrder(order);
                            }}
                            className="w-full text-left p-3 rounded-2xl bg-indigo-50 text-indigo-700"
                          >
                            <p className="text-[11px] font-black truncate">{order.customerInfo.name}</p>
                            <p className="text-[10px] font-bold opacity-70">{currency.format(order.financials?.totalAmount || 0)}</p>
                          </button>
                        ))
                      ) : (
                        <p className="text-[11px] font-bold text-slate-300">No billing items</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeSidebarTab === 'graph' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <header className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Analytics</h2>
                <p className="text-sm text-slate-500">Revenue and expense comparison for the selected period.</p>
              </div>
              <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
                {(['today', 'week', 'month'] as GraphPeriod[]).map((period) => (
                  <button
                    key={period}
                    onClick={() => setGraphPeriod(period)}
                    className={cn(
                      'px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all',
                      graphPeriod === period ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50',
                    )}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </header>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900">Money Flow</h3>
                <MoreVertical size={18} className="text-slate-300" />
              </div>
              <div className="mt-8 grid grid-cols-3 gap-6 items-end min-h-72">
                {[
                  { label: 'Revenue', value: periodGrossRevenue, color: 'bg-emerald-500' },
                  { label: 'Expenditure', value: periodExpenditure, color: 'bg-rose-500' },
                  { label: 'Net Flow', value: Math.max(periodNetAmount, 0), color: 'bg-indigo-600' },
                ].map((bar) => {
                  const maxValue = Math.max(periodGrossRevenue, periodExpenditure, periodNetAmount, 1);
                  const height = Math.max(12, (bar.value / maxValue) * 220);

                  return (
                    <div key={bar.label} className="flex flex-col items-center justify-end gap-3">
                      <p className="text-xs font-black text-slate-500">{currency.format(bar.value)}</p>
                      <div className={cn('w-full max-w-32 rounded-t-3xl', bar.color)} style={{ height }} />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{bar.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeSidebarTab === 'office' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <header className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Office Account</h2>
                <p className="text-sm text-slate-500">Manage office expenses, vendor payouts, salary, delivery costs and losses.</p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-slate-100">
                <officeCopy.icon size={16} className="text-indigo-600" />
                <span className="text-xs font-black text-slate-700">{officeCopy.title}</span>
              </div>
            </header>

            {activeSubTab !== undefined && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                {[
                  { id: 'expense' as const, label: 'Office Expense', icon: Coins },
                  { id: 'vendor' as const, label: 'Vendor Payouts', icon: Receipt },
                  { id: 'salary' as const, label: 'Staff Salary', icon: UserCheck },
                  { id: 'delivery' as const, label: 'Logistics/Delivery', icon: Truck },
                  { id: 'courier' as const, label: 'Courier', icon: CreditCard },
                  { id: 'loss' as const, label: 'Loss / Returns', icon: ArrowDownRight },
                ].map((sub) => {
                  const SubIcon = sub.icon;
                  const isActive = activeOfficeTab === sub.id;
                  return (
                    <button
                      key={sub.id}
                      onClick={() => setActiveOfficeTab(sub.id)}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all font-sans whitespace-nowrap cursor-pointer border border-slate-100',
                        isActive
                          ? 'bg-slate-900 text-white font-extrabold text-xs shadow-md shadow-slate-200'
                          : 'bg-white text-slate-600 hover:bg-slate-50 font-bold text-xs hover:text-slate-900'
                      )}
                    >
                      <SubIcon size={14} className={isActive ? 'text-white' : 'text-slate-400'} />
                      <span>{sub.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
              <div className="xl:col-span-4 bg-white rounded-3xl border border-slate-100 shadow-sm p-6 self-start">
                <h3 className="text-lg font-black text-slate-900">Add {officeCopy.title}</h3>
                <div className="mt-5 space-y-4">
                  <label className="block">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{officeCopy.label}</span>
                    <input
                      value={entryTitle}
                      onChange={(event) => setEntryTitle(event.target.value)}
                      placeholder={officeCopy.placeholder}
                      className="mt-2 w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </label>

                  {/* Dynamic Fields of Sub accounts */}
                  {activeOfficeTab === 'expense' && (
                    <>
                      <label className="block">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Expense Details</span>
                        <textarea
                          value={expenseDetails}
                          onChange={(event) => setExpenseDetails(event.target.value)}
                          placeholder="What did you buy or pay for in detail?"
                          rows={2}
                          className="mt-1.5 w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Why Buying</span>
                        <textarea
                          value={expenseWhyBuying}
                          onChange={(event) => setExpenseWhyBuying(event.target.value)}
                          placeholder="Purpose of this purchase..."
                          rows={2}
                          className="mt-1.5 w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        />
                      </label>
                      <div className="block">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Attach PDF File / Receipt</span>
                        <div className="mt-1.5 relative border border-dashed border-slate-200 rounded-2xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-all text-center flex flex-col items-center justify-center cursor-pointer">
                          <input
                            type="file"
                            accept="application/pdf,image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                if (file.size > 1024 * 1024) {
                                  alert("File size exceeds 1MB limit.");
                                  return;
                                }
                                const reader = new FileReader();
                                reader.onload = () => {
                                  setExpensePdf(reader.result as string);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                          <FileText size={20} className={expensePdf ? "text-indigo-600" : "text-slate-400"} />
                          <p className="text-[11px] font-black mt-1.5 text-slate-700">
                            {expensePdf ? "✓ PDF/Receipt Loaded" : "Click or Drag PDF invoice"}
                          </p>
                        </div>
                      </div>
                    </>
                  )}

                  {activeOfficeTab === 'salary' && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="block">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Account Number</span>
                          <input
                            value={salaryAccountNumber}
                            onChange={(event) => setSalaryAccountNumber(event.target.value)}
                            placeholder="Bank account no."
                            className="mt-1.5 w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </label>
                        <label className="block">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bank Name</span>
                          <input
                            value={salaryBankName}
                            onChange={(event) => setSalaryBankName(event.target.value)}
                            placeholder="e.g. SBI, HDFC"
                            className="mt-1.5 w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </label>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        <label className="block">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">IFSC Code</span>
                          <input
                            value={salaryIfscCode}
                            onChange={(event) => setSalaryIfscCode(event.target.value.toUpperCase())}
                            placeholder="IFSC Code (e.g. SBIN0001234)"
                            className="mt-1.5 w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </label>
                      </div>

                      <label className="block">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Work Details / Role</span>
                        <input
                          value={salaryWorkDetails}
                          onChange={(event) => setSalaryWorkDetails(event.target.value)}
                          placeholder="e.g. Pattern Designer, Stitcheer"
                          className="mt-1.5 w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </label>

                      <div className="grid grid-cols-2 gap-3">
                        <label className="block">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Leave Days</span>
                          <input
                            type="number"
                            min="0"
                            value={salaryLeaveDays}
                            onChange={(event) => setSalaryLeaveDays(event.target.value)}
                            placeholder="0"
                            className="mt-1.5 w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </label>
                        <label className="block">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Working Days</span>
                          <input
                            type="number"
                            min="0"
                            value={salaryWorkingDays}
                            onChange={(event) => setSalaryWorkingDays(event.target.value)}
                            placeholder="26"
                            className="mt-1.5 w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </label>
                      </div>
                    </>
                  )}

                  {activeOfficeTab === 'delivery' && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="block">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bike No/Name</span>
                          <input
                            value={deliveryBike}
                            onChange={(event) => setDeliveryBike(event.target.value)}
                            placeholder="e.g. Activa, MH-12..."
                            className="mt-1.5 w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </label>
                        <label className="block">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Petrol Cost</span>
                          <input
                            type="number"
                            min="0"
                            value={deliveryPetrol}
                            onChange={(event) => setDeliveryPetrol(event.target.value)}
                            placeholder="INR 200"
                            className="mt-1.5 w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </label>
                      </div>

                      <label className="block">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Courier Dispatch Detail</span>
                        <input
                          value={deliveryCourierVal}
                          onChange={(event) => setDeliveryCourierVal(event.target.value)}
                          placeholder="Courier details or speedpost batch..."
                          className="mt-1.5 w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </label>
                    </>
                  )}

                  {activeOfficeTab === 'loss' && (
                    <>
                      <label className="block">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Why Returned</span>
                        <textarea
                          value={lossWhyReturn}
                          onChange={(event) => setLossWhyReturn(event.target.value)}
                          placeholder="e.g. Client color misfit, sizing issue..."
                          rows={2}
                          className="mt-1.5 w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Whose Fault</span>
                        <input
                          value={lossFault}
                          onChange={(event) => setLossFault(event.target.value)}
                          placeholder="Tailor, courier damage, etc."
                          className="mt-1.5 w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </label>
                    </>
                  )}

                  {activeOfficeTab === 'vendor' && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="block">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</span>
                          <select
                            value={vendorCategory}
                            onChange={(event) => setVendorCategory(event.target.value)}
                            className="mt-1.5 w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                          >
                            <option value="">Select Category</option>
                            <option value="Fabric">Fabric Material</option>
                            <option value="Dyeing">Dyeing Services</option>
                            <option value="Printing">Printing / Digits</option>
                            <option value="Buttons">Buttons/Zippers</option>
                            <option value="Tailor Payout">Tailoring Cost</option>
                            <option value="Other">Other Workshop</option>
                          </select>
                        </label>
                        <label className="block">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantity (Qty)</span>
                          <input
                            type="number"
                            min="0"
                            value={vendorQty}
                            onChange={(event) => {
                              const qty = event.target.value;
                              setVendorQty(qty);
                              const bAmt = vendorBuyingAmount;
                              if (qty && bAmt) {
                                setVendorTotalAmount(String(Number(qty) * Number(bAmt)));
                              }
                            }}
                            placeholder="1"
                            className="mt-1.5 w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </label>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <label className="block">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Expect Amount</span>
                          <input
                            type="number"
                            min="0"
                            value={vendorExpectAmount}
                            onChange={(event) => setVendorExpectAmount(event.target.value)}
                            placeholder="INR"
                            className="mt-1.5 w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </label>
                        <label className="block">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Actual Unit Cost</span>
                          <input
                            type="number"
                            min="0"
                            value={vendorBuyingAmount}
                            onChange={(event) => {
                              const bAmt = event.target.value;
                              setVendorBuyingAmount(bAmt);
                              const qty = vendorQty || '1';
                              if (bAmt) {
                                setVendorTotalAmount(String(Number(qty) * Number(bAmt)));
                              }
                            }}
                            placeholder="INR"
                            className="mt-1.5 w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </label>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <label className="block">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Colour Group</span>
                          <input
                            value={vendorColor}
                            onChange={(event) => setVendorColor(event.target.value)}
                            placeholder="e.g. Blue"
                            className="mt-1.5 w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </label>
                        <label className="block">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Payout</span>
                          <input
                            type="number"
                            min="0"
                            value={vendorTotalAmount}
                            onChange={(event) => setVendorTotalAmount(event.target.value)}
                            placeholder="Auto-calculated"
                            className="mt-1.5 w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none font-black text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                          />
                        </label>
                      </div>
                    </>
                  )}

                  {activeOfficeTab === 'courier' && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="block">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Courier Provider</span>
                          <input
                            value={courierProvider}
                            onChange={(event) => setCourierProvider(event.target.value)}
                            placeholder="e.g. DTDC, Blue Dart"
                            className="mt-1.5 w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </label>
                        <label className="block">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tracking ID</span>
                          <input
                            value={courierTrackingId}
                            onChange={(event) => setCourierTrackingId(event.target.value)}
                            placeholder="AWB Tracking #"
                            className="mt-1.5 w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </label>
                      </div>
                    </>
                  )}

                  <label className="block">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{officeCopy.amount}</span>
                    <input
                      type="number"
                      min="0"
                      value={activeOfficeTab === 'vendor' ? vendorTotalAmount : entryAmount}
                      disabled={activeOfficeTab === 'vendor'}
                      onChange={(event) => setEntryAmount(event.target.value)}
                      placeholder="0"
                      className="mt-2 w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                    />
                  </label>

                  <label className="block">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</span>
                    <input
                      type="date"
                      value={entryDate}
                      onChange={(event) => setEntryDate(event.target.value)}
                      className="mt-2 w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </label>

                  <label className="block">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Note</span>
                    <textarea
                      value={entryNote}
                      onChange={(event) => setEntryNote(event.target.value)}
                      placeholder="Optional general note"
                      rows={2}
                      className="mt-2 w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    />
                  </label>

                  <button
                    onClick={addLedgerEntry}
                    className="w-full py-4 rounded-2xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-600 transition-all font-sans cursor-pointer border-none"
                  >
                    <Plus size={16} />
                    Submit {officeCopy.title}
                  </button>
                </div>
              </div>

              <div className="xl:col-span-8 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">{officeCopy.title} Entries</h3>
                    <p className="text-xs font-bold text-slate-400">
                      {activeLedger.length} entries - {currency.format(activeLedger.reduce((sum, entry) => sum + (entry.total || entry.amount), 0))}
                    </p>
                  </div>
                  <button onClick={resetEntryForm} className="w-9 h-9 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center cursor-pointer border-none">
                    <X size={16} />
                  </button>
                </div>

                <div className="divide-y divide-slate-100 max-h-[75vh] overflow-y-auto">
                  {activeLedger.length > 0 ? (
                    activeLedger.map((entry) => (
                      <div key={entry.id} className="p-6 flex flex-col gap-3 hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-sm font-black text-slate-900">{entry.title}</p>
                            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mt-0.5">
                              {new Date(entry.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <p className="text-base font-black text-slate-900">{currency.format(entry.total || entry.amount)}</p>
                            <button
                              onClick={() => removeLedgerEntry(entry.id)}
                              className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-500 flex items-center justify-center transition-all cursor-pointer border-none"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Expandable Custom Meta Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600">
                          {entry.note && (
                            <p className="col-span-1 md:col-span-2 font-bold text-slate-500">
                              <span className="font-extrabold text-slate-400 text-[10px] uppercase tracking-wider block">Admin Note</span>
                              {entry.note}
                            </p>
                          )}

                          {activeOfficeTab === 'expense' && (
                            <>
                              {entry.details && (
                                <p className="font-bold">
                                  <span className="font-extrabold text-slate-400 text-[10px] uppercase tracking-wider block">Details</span>
                                  {entry.details}
                                </p>
                              )}
                              {entry.whyBuying && (
                                <p className="font-bold">
                                  <span className="font-extrabold text-slate-400 text-[10px] uppercase tracking-wider block">Why Buying</span>
                                  {entry.whyBuying}
                                </p>
                              )}
                              {entry.pdfFile && (
                                <div className="col-span-1 md:col-span-2 mt-1">
                                  <button
                                    onClick={() => setViewingImage(entry.pdfFile || null)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-black uppercase text-indigo-600 bg-indigo-50 border-none rounded-xl cursor-pointer hover:bg-indigo-100 transition-all font-sans"
                                  >
                                    <FileText size={12} />
                                    View Attached PDF / Receipt
                                  </button>
                                </div>
                              )}
                            </>
                          )}

                          {activeOfficeTab === 'salary' && (
                            <>
                              {entry.accountNumber && (
                                <p className="font-bold">
                                  <span className="font-extrabold text-slate-400 text-[10px] uppercase tracking-wider block">A/C Number</span>
                                  {entry.accountNumber}
                                </p>
                              )}
                              {entry.bankName && (
                                <p className="font-bold">
                                  <span className="font-extrabold text-slate-400 text-[10px] uppercase tracking-wider block">Bank</span>
                                  {entry.bankName}
                                </p>
                              )}
                              {entry.ifscCode && (
                                <p className="font-bold col-span-1 md:col-span-2">
                                  <span className="font-extrabold text-slate-400 text-[10px] uppercase tracking-wider block">IFSC Code</span>
                                  {entry.ifscCode}
                                </p>
                              )}
                              {entry.workDetails && (
                                <p className="font-bold">
                                  <span className="font-extrabold text-slate-400 text-[10px] uppercase tracking-wider block">Work Details / Role</span>
                                  {entry.workDetails}
                                </p>
                              )}
                              {entry.leaveDays !== undefined && (
                                <p className="font-bold">
                                  <span className="font-extrabold text-slate-400 text-[10px] uppercase tracking-wider block">Leave Days</span>
                                  {entry.leaveDays} Days
                                </p>
                              )}
                              {entry.workingDays !== undefined && (
                                <p className="font-bold">
                                  <span className="font-extrabold text-slate-400 text-[10px] uppercase tracking-wider block">Working Days</span>
                                  {entry.workingDays} Days
                                </p>
                              )}
                            </>
                          )}

                          {activeOfficeTab === 'delivery' && (
                            <>
                              {entry.bike && (
                                <p className="font-bold">
                                  <span className="font-extrabold text-slate-400 text-[10px] uppercase tracking-wider block">Bike / Vehicle</span>
                                  {entry.bike}
                                </p>
                              )}
                              {entry.petrol && (
                                <p className="font-bold">
                                  <span className="font-extrabold text-slate-400 text-[10px] uppercase tracking-wider block">Petrol Expense</span>
                                  {currency.format(entry.petrol)}
                                </p>
                              )}
                              {entry.courierDetail && (
                                <p className="font-bold">
                                  <span className="font-extrabold text-slate-400 text-[10px] uppercase tracking-wider block">Courier / Dispatch Detail</span>
                                  {entry.courierDetail}
                                </p>
                              )}
                            </>
                          )}

                          {activeOfficeTab === 'loss' && (
                            <>
                              {entry.whyReturn && (
                                <p className="font-bold">
                                  <span className="font-extrabold text-slate-400 text-[10px] uppercase tracking-wider block">Why Returned</span>
                                  {entry.whyReturn}
                                </p>
                              )}
                              {entry.fault && (
                                <p className="font-bold">
                                  <span className="font-extrabold text-slate-400 text-[10px] uppercase tracking-wider block">Whose Fault</span>
                                  {entry.fault}
                                </p>
                              )}
                            </>
                          )}

                          {activeOfficeTab === 'vendor' && (
                            <>
                              {entry.category && (
                                <p className="font-bold">
                                  <span className="font-extrabold text-slate-400 text-[10px] uppercase tracking-wider block">Category</span>
                                  <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 font-extrabold text-[10px]">
                                    {entry.category}
                                  </span>
                                </p>
                              )}
                              {entry.qty !== undefined && (
                                <p className="font-bold">
                                  <span className="font-extrabold text-slate-400 text-[10px] uppercase tracking-wider block">Quantity</span>
                                  {entry.qty} items
                                </p>
                              )}
                              {entry.expectAmount !== undefined && (
                                <p className="font-bold">
                                  <span className="font-extrabold text-slate-400 text-[10px] uppercase tracking-wider block">Expected Payout</span>
                                  {currency.format(entry.expectAmount)}
                                </p>
                              )}
                              {entry.buyingAmount !== undefined && (
                                <p className="font-bold">
                                  <span className="font-extrabold text-slate-400 text-[10px] uppercase tracking-wider block">Actual Unit Cost</span>
                                  {currency.format(entry.buyingAmount)}
                                </p>
                              )}
                              {entry.color && (
                                <p className="font-bold text-slate-700">
                                  <span className="font-extrabold text-slate-400 text-[10px] uppercase tracking-wider block">Colour Group</span>
                                  {entry.color}
                                </p>
                              )}
                            </>
                          )}

                          {activeOfficeTab === 'courier' && (
                            <>
                              {entry.courierProvider && (
                                <p className="font-bold">
                                  <span className="font-extrabold text-slate-400 text-[10px] uppercase tracking-wider block">Courier Provider</span>
                                  {entry.courierProvider}
                                </p>
                              )}
                              {entry.courierTrackingId && (
                                <p className="font-bold">
                                  <span className="font-extrabold text-slate-400 text-[10px] uppercase tracking-wider block">Tracking ID</span>
                                  <span className="font-mono text-slate-850 bg-slate-200 px-1.5 py-0.5 rounded">
                                    {entry.courierTrackingId}
                                  </span>
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-12 text-center">
                      <officeCopy.icon size={42} className="mx-auto text-slate-200 animate-pulse" />
                      <p className="text-xs font-black text-slate-300 uppercase tracking-widest mt-4">No entries yet</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {viewingImage && (
        <ImageViewer src={viewingImage} onClose={() => setViewingImage(null)} fileName={`Receipt_${Date.now()}`} />
      )}
    </div>
  );
}
