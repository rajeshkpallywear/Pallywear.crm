/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import {
  Layers, Package, FileText, Download, Paperclip, ZoomIn,
  CreditCard, Trash2, Search, Plus, Users, Send, MessageSquare,
  Check, ShoppingBag, PauseCircle, RefreshCw, CheckCircle,
  Eye, ArrowRight, Play, AlertCircle, Calendar
} from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { cn, getDisplayCategory, isOrderSizeValid } from '../lib/utils';
import OrderDetailModal from './OrderDetailModal';
import FileUpload from './FileUpload';
import ImageViewer from './ImageViewer';
import Logo from './Logo';
import { db } from '../lib/firebase';
import { collection, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';

export interface ChatMessage {
  id: string;
  sender: string;
  senderRole: string;
  text: string;
  attachments: string[];
  createdAt: number;
}

interface OrderManagementDashboardProps {
  orders: Order[];
  inventory?: any[];
  onUpdateOrder: (id: string, updates: Partial<Order>) => Promise<void>;
  onDeleteOrder?: (id: string) => void;
  isAdmin?: boolean;
  onReorder?: (order: Order) => void;
}

type TabSection = 'recent' | 'hold' | 'process' | 'completed' | 'leaves';

const STATUS_BADGE: Record<string, string> = {
  'Order Mgmt': 'bg-blue-50 text-blue-800',
  'On Hold': 'bg-red-50 text-red-800',
  'Production': 'bg-amber-50 text-amber-800',
  'Design': 'bg-purple-50 text-purple-800',
  'Delivery': 'bg-amber-50 text-amber-800',
  'Delivered': 'bg-green-50 text-green-800',
};

function getStatusLabel(order: Order): string {
  switch (order.status) {
    case OrderStatus.ORDER_MANAGEMENT: return 'Order Mgmt';
    case OrderStatus.HOLD: return 'On Hold';
    case OrderStatus.PRODUCTION: return 'Production';
    case OrderStatus.DESIGN: return 'Design';
    case OrderStatus.DELIVERY: return 'Delivery';
    case OrderStatus.DELIVERED: return 'Delivered';
    default: return order.status;
  }
}

export default function OrderManagementDashboard({
  orders,
  inventory = [],
  onUpdateOrder,
  onDeleteOrder,
  isAdmin,
  onReorder,
}: OrderManagementDashboardProps) {
  const { user } = useAuth();
  const hourOfDay = new Date().getHours();
  const greeting =
    hourOfDay < 12 ? 'Good morning' : hourOfDay < 17 ? 'Good afternoon' : 'Good evening';

  const [selectedSection, setSelectedSection] = useState<TabSection>('recent');
  const [orderSearch, setOrderSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedHubOrder, setSelectedHubOrder] = useState<Order | null>(null);
  const [managementFiles, setManagementFiles] = useState<string[]>([]);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [isMsgSidebarOpen, setIsMsgSidebarOpen] = useState(false);
  const [isDesignMsgSidebarOpen, setIsDesignMsgSidebarOpen] = useState(false);
  const [msgRequest, setMsgRequest] = useState({ message: '', attachments: [] as string[] });
  const [designMsgRequest, setDesignMsgRequest] = useState({ message: '', attachments: [] as string[] });
  const [refreshChatCounter, setRefreshChatCounter] = useState(0);

  const [leavesList, setLeavesList] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'leaves'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLeavesList(list);
    }, (error) => {
      console.error("Firestore leaves subscription error:", error);
    });
    return () => unsub();
  }, []);

  const [acceptedProductIds, setAcceptedProductIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('pallywear_accepted_products');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const toggleAcceptProduct = (id: string) => {
    const next = acceptedProductIds.includes(id)
      ? acceptedProductIds.filter(x => x !== id)
      : [...acceptedProductIds, id];
    setAcceptedProductIds(next);
    localStorage.setItem('pallywear_accepted_products', JSON.stringify(next));
  };

  const productStock = Object.values(inventory.reduce((acc: any, item) => {
    const key = `${item.product}-${item.productType}-${item.sleeve || 'none'}-${item.pocket || 'none'}`;
    if (!acc[key]) {
      acc[key] = {
        id: key,
        name: item.product,
        type: item.productType,
        sleeve: item.sleeve,
        pocket: item.pocket,
        stock: 0,
        price: '---',
        status: 'Enabled'
      };
    }
    if (item.type === 'inward') acc[key].stock += item.quantity;
    else acc[key].stock -= item.quantity;
    return acc;
  }, {})) as any[];

  // ── counts ────────────────────────────────────────────────────────────────
  const recentCount = orders.filter(o => o.status === OrderStatus.ORDER_MANAGEMENT).length;
  const holdCount = orders.filter(o => o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.ORDER_MANAGEMENT).length;
  const processCount = orders.filter(o => [OrderStatus.PRODUCTION, OrderStatus.DELIVERY, OrderStatus.DESIGN].includes(o.status)).length;
  const completedCount = orders.filter(o => o.status === OrderStatus.DELIVERED).length;

  // ── filtered list ─────────────────────────────────────────────────────────
  const sectionOrders = orders.filter(o => {
    if (selectedSection === 'recent') return o.status === OrderStatus.ORDER_MANAGEMENT;
    if (selectedSection === 'hold') return o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.ORDER_MANAGEMENT;
    if (selectedSection === 'process') return [OrderStatus.PRODUCTION, OrderStatus.DELIVERY, OrderStatus.DESIGN].includes(o.status);
    if (selectedSection === 'completed') return o.status === OrderStatus.DELIVERED;
    return false;
  });

  const q = orderSearch.toLowerCase().trim();
  const filteredOrders = q
    ? sectionOrders.filter(o =>
      o.id?.toLowerCase().includes(q) ||
      o.customerInfo.name?.toLowerCase().includes(q) ||
      o.customerInfo.companyName?.toLowerCase().includes(q)
    )
    : sectionOrders;

  // ── helpers ───────────────────────────────────────────────────────────────
  const handleRemoveManagementFile = (index: number) =>
    setManagementFiles(prev => prev.filter((_, i) => i !== index));

  const handleRemoveExistingAttachment = async (field: keyof Order, index: number) => {
    if (!selectedOrder) return;
    const currentList = (selectedOrder[field] as string[]) || [];
    const newList = currentList.filter((_, i) => i !== index);
    try {
      await onUpdateOrder(selectedOrder.id, { [field]: newList, updatedAt: Date.now() });
      setSelectedOrder({ ...selectedOrder, [field]: newList });
    } catch (e) { console.error(e); }
  };

  const handleProcessOrder = async () => {
    if (!selectedOrder || isProcessing) return;
    const nextFiles = managementFiles.length > 0 ? managementFiles : (selectedOrder.machineFiles || []);
    const nextState = { ...selectedOrder, machineFiles: nextFiles };
    if (!isOrderSizeValid(nextState)) {
      alert('Error: Total order data limit exceeded (Max 1MB). Please remove some existing attachments before processing.');
      return;
    }
    setIsProcessing(true);
    try {
      await onUpdateOrder(selectedOrder.id, {
        status: OrderStatus.PRODUCTION,
        machineFiles: nextFiles,
        updatedAt: Date.now(),
      });
      setSelectedOrder(null);
      setManagementFiles([]);
      alert('Success: Order shared with Production Team.');
    } catch (e: any) {
      console.error(e);
      alert('Failed to share order. Error: ' + (e?.message?.slice(0, 50)));
    } finally {
      setIsProcessing(false);
    }
  };

  // ── chat helpers ──────────────────────────────────────────────────────────
  const parseNotesToMessages = (
    notes: string | undefined,
    targetTeam: 'DIGITIZER' | 'DESIGNER'
  ): ChatMessage[] => {
    if (!notes) return [];
    const list: ChatMessage[] = [];
    const blocks = notes.split(/\[ORDER MGMT -> /i);
    blocks.forEach((block, index) => {
      if (index === 0) return;
      const teamHeader = targetTeam === 'DIGITIZER' ? 'DIGITIZER]' : 'DESIGNER]';
      if (block.toUpperCase().startsWith(teamHeader)) {
        const cleaned = block.substring(teamHeader.length).trim();
        const firstNewline = cleaned.indexOf('\n');
        let timestampText = '';
        let text = cleaned;
        if (firstNewline !== -1) {
          timestampText = cleaned.substring(0, firstNewline).trim();
          text = cleaned.substring(firstNewline + 1).trim();
        }
        list.push({
          id: `parsed_${targetTeam}_${index}`,
          sender: 'Order Management',
          senderRole: 'order_management',
          text,
          attachments: [],
          createdAt: isNaN(Date.parse(timestampText))
            ? (selectedOrder?.createdAt || Date.now()) + index * 1000
            : Date.parse(timestampText),
        });
      }
    });
    const lines = notes.split('\n');
    lines.forEach((line, index) => {
      if (line.includes('[DIGITIZER ->') && targetTeam === 'DIGITIZER') {
        const idx = line.indexOf(']');
        list.push({
          id: `dig_resp_${index}`,
          sender: 'Digitizer Team',
          senderRole: 'digitizer',
          text: idx !== -1 ? line.substring(idx + 1).trim() : line,
          attachments: [],
          createdAt: (selectedOrder?.updatedAt || Date.now()) - 300000 + index * 1000,
        });
      } else if (line.includes('[DESIGNER ->') && targetTeam === 'DESIGNER') {
        const idx = line.indexOf(']');
        list.push({
          id: `des_resp_${index}`,
          sender: 'Designer Team',
          senderRole: 'designer',
          text: idx !== -1 ? line.substring(idx + 1).trim() : line,
          attachments: [],
          createdAt: (selectedOrder?.updatedAt || Date.now()) - 300000 + index * 1000,
        });
      }
    });
    return list;
  };

  const getCombinedMessages = (type: 'digitizer' | 'designer'): ChatMessage[] => {
    if (!selectedOrder) return [];
    const notesMsgs = parseNotesToMessages(
      selectedOrder.notes,
      type === 'digitizer' ? 'DIGITIZER' : 'DESIGNER'
    );
    const storageKey = `pallywear_om_chats_${type}_${selectedOrder.id}`;
    let storageMsgs: ChatMessage[] = [];
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) storageMsgs = JSON.parse(saved);
    } catch (e) { }
    const combined = [...notesMsgs];
    storageMsgs.forEach(item => {
      if (!combined.some(c => c.id === item.id || (c.text === item.text && Math.abs(c.createdAt - item.createdAt) < 5000))) {
        combined.push(item);
      }
    });
    return combined.sort((a, b) => a.createdAt - b.createdAt);
  };

  const sendToDigitizer = async () => {
    const textMsg = msgRequest.message.trim();
    if (!textMsg && msgRequest.attachments.length === 0) { alert('Please provide a message or attachments.'); return; }
    if (!selectedOrder) { alert('Please select an order first.'); return; }
    const timestamp = Date.now();
    const newNote = `[ORDER MGMT -> DIGITIZER] ${new Date(timestamp).toLocaleString()}\n${textMsg}`;
    const updatedNotes = selectedOrder.notes ? `${selectedOrder.notes}\n\n${newNote}` : newNote;
    const finalDesignAttachments = [...(selectedOrder.designAttachments || []), ...msgRequest.attachments];
    const nextState = { ...selectedOrder, notes: updatedNotes, designAttachments: finalDesignAttachments, updatedAt: timestamp };
    if (!isOrderSizeValid(nextState)) { alert('Error: Total order data limit exceeded.'); return; }
    setIsProcessing(true);
    try {
      const newChatMsg: ChatMessage = {
        id: `om_msg_${timestamp}_${Math.random().toString(36).substring(2, 6)}`,
        sender: 'Order Management', senderRole: 'order_management',
        text: textMsg || `Sent attachments: ${msgRequest.attachments.length} file(s)`,
        attachments: msgRequest.attachments, createdAt: timestamp,
      };
      const storageKey = `pallywear_om_chats_digitizer_${selectedOrder.id}`;
      let existingMsgs: ChatMessage[] = [];
      try { const s = localStorage.getItem(storageKey); if (s) existingMsgs = JSON.parse(s); } catch (e) { }
      existingMsgs.push(newChatMsg);
      try { localStorage.setItem(storageKey, JSON.stringify(existingMsgs)); } catch (e) { }
      await onUpdateOrder(selectedOrder.id, { notes: updatedNotes, designAttachments: finalDesignAttachments, updatedAt: timestamp });
      setSelectedOrder({ ...selectedOrder, notes: updatedNotes, designAttachments: finalDesignAttachments, updatedAt: timestamp });
      setMsgRequest({ message: '', attachments: [] });
      setRefreshChatCounter(prev => prev + 1);
      setTimeout(async () => {
        const replyKey = `pallywear_om_chats_digitizer_${selectedOrder.id}`;
        let currentMsgs: ChatMessage[] = [];
        try { const s = localStorage.getItem(replyKey); if (s) currentMsgs = JSON.parse(s); } catch (e) { }
        const responseText = `Hi, Order Management. We have received the instruction details for order #${selectedOrder.id.slice(-6)}. Reviewing specifications now.`;
        currentMsgs.push({ id: `dig_incoming_${Date.now()}`, sender: 'Digitizer Team', senderRole: 'digitizer', text: responseText, attachments: [], createdAt: Date.now() });
        try { localStorage.setItem(replyKey, JSON.stringify(currentMsgs)); } catch (e) { }
        const autoNote = `[DIGITIZER -> ORDER MGMT] ${new Date().toLocaleString()}\n${responseText}`;
        const completeNotes = updatedNotes ? `${updatedNotes}\n\n${autoNote}` : autoNote;
        try {
          await onUpdateOrder(selectedOrder.id, { notes: completeNotes, updatedAt: Date.now() });
          setSelectedOrder(prev => prev ? { ...prev, notes: completeNotes, updatedAt: Date.now() } : null);
          setRefreshChatCounter(prev => prev + 1);
        } catch (e) { }
      }, 1500);
    } catch (error) {
      alert('Failed to send message: ' + (error instanceof Error ? error.message : String(error)));
    } finally { setIsProcessing(false); }
  };

  const sendToDesigner = async () => {
    const textMsg = designMsgRequest.message.trim();
    if (!textMsg && designMsgRequest.attachments.length === 0) { alert('Please provide a message or attachments.'); return; }
    if (!selectedOrder) { alert('Please select an order first.'); return; }
    const timestamp = Date.now();
    const newNote = `[ORDER MGMT -> DESIGNER] ${new Date(timestamp).toLocaleString()}\n${textMsg}`;
    const updatedNotes = selectedOrder.notes ? `${selectedOrder.notes}\n\n${newNote}` : newNote;
    const finalStaffImages = [...(selectedOrder.staffImages || []), ...designMsgRequest.attachments];
    const nextState = { ...selectedOrder, notes: updatedNotes, staffImages: finalStaffImages, status: OrderStatus.DESIGN, updatedAt: timestamp };
    if (!isOrderSizeValid(nextState)) { alert('Error: Total order data limit exceeded.'); return; }
    setIsProcessing(true);
    try {
      const newChatMsg: ChatMessage = {
        id: `om_msg_${timestamp}_${Math.random().toString(36).substring(2, 6)}`,
        sender: 'Order Management', senderRole: 'order_management',
        text: textMsg || `Sent attachments: ${designMsgRequest.attachments.length} file(s)`,
        attachments: designMsgRequest.attachments, createdAt: timestamp,
      };
      const storageKey = `pallywear_om_chats_designer_${selectedOrder.id}`;
      let existingMsgs: ChatMessage[] = [];
      try { const s = localStorage.getItem(storageKey); if (s) existingMsgs = JSON.parse(s); } catch (e) { }
      existingMsgs.push(newChatMsg);
      try { localStorage.setItem(storageKey, JSON.stringify(existingMsgs)); } catch (e) { }
      await onUpdateOrder(selectedOrder.id, { notes: updatedNotes, staffImages: finalStaffImages, status: OrderStatus.DESIGN, updatedAt: timestamp });
      setSelectedOrder({ ...selectedOrder, notes: updatedNotes, staffImages: finalStaffImages, status: OrderStatus.DESIGN, updatedAt: timestamp });
      setDesignMsgRequest({ message: '', attachments: [] });
      setRefreshChatCounter(prev => prev + 1);
      setTimeout(async () => {
        const replyKey = `pallywear_om_chats_designer_${selectedOrder.id}`;
        let currentMsgs: ChatMessage[] = [];
        try { const s = localStorage.getItem(replyKey); if (s) currentMsgs = JSON.parse(s); } catch (e) { }
        const responseText = `Received your designer notes. I have re-opened the artwork specs and set status to 'DESIGN'. Thanks!`;
        currentMsgs.push({ id: `des_incoming_${Date.now()}`, sender: 'Designer Team', senderRole: 'designer', text: responseText, attachments: [], createdAt: Date.now() });
        try { localStorage.setItem(replyKey, JSON.stringify(currentMsgs)); } catch (e) { }
        const autoNote = `[DESIGNER -> ORDER MGMT] ${new Date().toLocaleString()}\n${responseText}`;
        const completeNotes = updatedNotes ? `${updatedNotes}\n\n${autoNote}` : autoNote;
        try {
          await onUpdateOrder(selectedOrder.id, { notes: completeNotes, updatedAt: Date.now() });
          setSelectedOrder(prev => prev ? { ...prev, notes: completeNotes, updatedAt: Date.now() } : null);
          setRefreshChatCounter(prev => prev + 1);
        } catch (e) { }
      }, 1500);
    } catch (error) {
      alert('Failed to send message: ' + (error instanceof Error ? error.message : String(error)));
    } finally { setIsProcessing(false); }
  };

  // ── tab config ────────────────────────────────────────────────────────────
  const tabs: { key: TabSection; label: string; count: number; Icon: any; notify?: boolean }[] = [
    { key: 'recent', label: 'Recent orders', count: recentCount, Icon: ShoppingBag },
    { key: 'hold', label: 'On hold', count: holdCount, Icon: PauseCircle, notify: holdCount > 0 },
    { key: 'process', label: 'In process', count: processCount, Icon: RefreshCw },
    { key: 'completed', label: 'Completed', count: completedCount, Icon: CheckCircle },
    { key: 'leaves', label: 'Leaves', count: leavesList.length, Icon: Calendar },
  ];

  const sectionTitles: Record<TabSection, string> = {
    recent: 'Recent orders',
    hold: 'On hold orders',
    process: 'In process orders',
    completed: 'Completed orders',
    leaves: 'Staff Leave Logs',
  };

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── greeting banner ── */}
      <div className="rounded-3xl bg-gradient-to-br from-[#3C3489] to-[#534AB7] px-8 py-7">
        <p className="text-[11px] font-bold uppercase tracking-widest text-white/60 mb-1">Pallywear CRM</p>
        <h2 className="text-2xl font-bold text-white mb-1">{greeting}, {user?.name || 'there'}!</h2>
        <p className="text-sm text-white/65">Here's your order management snapshot for today.</p>
      </div>

      {/* ── tab cards ── */}
      <div className="flex items-center gap-4 py-2">
        {tabs.map(({ key, count, Icon }) => (
          <button
            key={key}
            onClick={() => { setSelectedSection(key); setOrderSearch(''); setSelectedOrder(null); }}
            className={cn(
              "w-16 h-16 rounded-[22px] flex items-center justify-center transition-all relative shadow-sm",
              selectedSection === key
                ? "bg-gradient-to-tr from-[#3C3489] to-[#534AB7] text-white ring-4 ring-indigo-100"
                : "bg-white text-gray-500 hover:text-gray-800"
            )}
          >
            <Icon size={24} className={selectedSection === key ? 'text-white' : 'text-gray-400'} />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── main grid layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* ── orders table card ── */}
        <div className="lg:col-span-3 bg-white rounded-3xl border border-gray-100 overflow-hidden">
        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-900">{sectionTitles[selectedSection]}</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {selectedSection === 'leaves' 
                ? `${leavesList.length} leave request${leavesList.length !== 1 ? 's' : ''} found`
                : `${filteredOrders.length} order${filteredOrders.length !== 1 ? 's' : ''} found`
              }
            </p>
          </div>
          {selectedSection !== 'leaves' && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search orders…"
                  value={orderSearch}
                  onChange={e => setOrderSearch(e.target.value)}
                  className="pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 outline-none focus:border-[#534AB7] focus:bg-white transition-all placeholder:text-gray-400 w-44"
                />
              </div>
            </div>
          )}
        </div>

        {/* table */}
        {selectedSection === 'leaves' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-455 font-black uppercase tracking-widest text-[9px] border-b border-gray-100">
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
                        <td className="px-6 py-4 font-mono font-bold text-[#534AB7]">{leave.date}</td>
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
        ) : filteredOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  {['Order', 'Customer', 'Category', 'Qty', 'Status', 'Date', 'Amount', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 border-b border-gray-100">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(order => {
                  const statusLabel = getStatusLabel(order);
                  const badgeClass = STATUS_BADGE[statusLabel] || 'bg-gray-50 text-gray-700';
                  return (
                    <tr
                      key={order.id}
                      className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs text-gray-400">#{order.id.slice(-6)}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          {order.isUrgent && (
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                          )}
                          <div>
                            <p className="text-sm font-bold text-gray-900 truncate max-w-[130px]">{order.customerInfo.name}</p>
                            {order.customerInfo.companyName && (
                              <p className="text-[11px] text-gray-400 truncate max-w-[130px]">{order.customerInfo.companyName}</p>
                            )}
                            {order.status === OrderStatus.HOLD && order.holdReason && (
                              <p className="text-[10px] text-red-500 italic mt-0.5 truncate max-w-[130px]">{order.holdReason}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs text-gray-600">{getDisplayCategory(order)}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-bold text-gray-900">{order.quantity || 1}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold', badgeClass)}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs text-gray-400">{new Date(order.updatedAt).toLocaleDateString()}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-bold text-gray-900">
                          ₹{(order.financials?.totalAmount || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          {/* View detail */}
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-[11px] font-bold text-gray-600 transition-colors"
                          >
                            <Eye size={12} /> View
                          </button>
                          {/* Move to production (recent only) */}
                          {selectedSection === 'recent' && order.status !== OrderStatus.HOLD && (
                            <button
                              onClick={async () => {
                                if (window.confirm('Move this order to Production?')) {
                                  setIsProcessing(true);
                                  try {
                                    await onUpdateOrder(order.id, { status: OrderStatus.PRODUCTION, updatedAt: Date.now() });
                                  } catch (e) { alert('Action failed.'); }
                                  finally { setIsProcessing(false); }
                                }
                              }}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-black hover:bg-gray-800 text-white rounded-lg text-[11px] font-bold transition-colors"
                            >
                              <ArrowRight size={12} />
                            </button>
                          )}
                          {/* Release hold */}
                          {selectedSection === 'hold' && (
                            <button
                              onClick={async () => {
                                const newStatus = order.previousStatus || OrderStatus.ORDER_MANAGEMENT;
                                if (window.confirm(`Release order back to ${newStatus}?`)) {
                                  setIsProcessing(true);
                                  try {
                                    await onUpdateOrder(order.id, { status: newStatus, previousStatus: undefined, updatedAt: Date.now() });
                                  } catch (e) { alert('Action failed.'); }
                                  finally { setIsProcessing(false); }
                                }
                              }}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 rounded-lg text-[11px] font-bold transition-colors"
                            >
                              <Play size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="text-gray-200 mb-3" size={40} />
            <p className="text-sm font-bold text-gray-500">
              {orderSearch ? 'No orders match your search' : 'No orders in this category'}
            </p>
            <p className="text-xs text-gray-400 mt-1">Orders will appear here once they move to this stage.</p>
          </div>
        )}
        </div>

        {/* ── sidebar inventory stock card ── */}
        <div className="lg:col-span-1 bg-white rounded-3xl border border-gray-100 p-5 flex flex-col h-fit">
          <div className="mb-4">
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Package className="text-[#3C3489]" size={16} /> Inventory Stock
            </h4>
            <p className="text-[10px] text-gray-400 mt-0.5">Toggle to display on user dashboard</p>
          </div>
          
          {productStock.length > 0 ? (
            <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
              {productStock.map((prod) => {
                const isAccepted = acceptedProductIds.includes(prod.id);
                return (
                  <div key={prod.id} className="p-3 bg-gray-50 border border-gray-100 rounded-2xl flex flex-col gap-2 hover:border-gray-200 transition-all">
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="text-xs font-bold text-gray-800">{prod.name}</h5>
                        <p className="text-[9px] text-gray-400 font-medium uppercase mt-0.5">{prod.type}</p>
                      </div>
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full",
                        prod.stock > 10 ? "bg-green-50 text-green-700" :
                        prod.stock > 0 ? "bg-amber-50 text-amber-700" :
                        "bg-red-50 text-red-700"
                      )}>
                        {prod.stock} left
                      </span>
                    </div>
                    
                    <button
                      onClick={() => toggleAcceptProduct(prod.id)}
                      className={cn(
                        "w-full py-1.5 rounded-xl text-[10px] font-bold border transition-all flex items-center justify-center gap-1",
                        isAccepted
                          ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                          : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                      )}
                    >
                      {isAccepted ? (
                        <>
                          <Check size={12} /> Accepted (Visible)
                        </>
                      ) : (
                        "Click to Accept"
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic text-center py-6">No inventory products found.</p>
          )}
        </div>
      </div>

      {/* ── Order detail modal (slide-over) ── */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSelectedOrder(null)}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="relative w-full max-w-2xl bg-white h-full overflow-y-auto shadow-2xl flex flex-col"
          >
            {/* slide-over header */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <div>
                <h4 className="text-base font-bold text-gray-900">
                  Order #{selectedOrder.id.slice(-8)}
                  {selectedOrder.isUrgent && (
                    <span className="ml-2 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-lg animate-pulse">URGENT</span>
                  )}
                </h4>
                <p className="text-xs text-gray-400 mt-0.5">{selectedOrder.customerInfo.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-blue-50 text-blue-800 rounded-full text-[10px] font-bold uppercase">
                  {getStatusLabel(selectedOrder)}
                </span>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 p-6 space-y-6">
              {/* customer + specs */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Customer</p>
                    <p className="font-bold text-gray-900 text-sm">{selectedOrder.customerInfo.name}</p>
                    <p className="text-xs text-gray-500">{selectedOrder.customerInfo.address}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Specifications</p>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="px-2 py-1 bg-black text-white rounded text-[10px] font-bold">{getDisplayCategory(selectedOrder)}</span>
                      <span className="px-2 py-1 bg-gray-800 text-white rounded text-[10px] font-bold">Qty: {selectedOrder.quantity || 1}</span>
                    </div>
                  </div>

                  {selectedOrder.sizeBreakdown && selectedOrder.sizeBreakdown.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {selectedOrder.sizeBreakdown.map((item, idx) => (
                        <div key={idx} className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-[11px]">
                          <div className="flex justify-between mb-1">
                            <span className="font-black text-[#534AB7] uppercase">{item.category}</span>
                            <span className="font-black text-gray-900">{item.size}</span>
                          </div>
                          {item.colour && <div className="text-gray-500">Col: {item.colour}</div>}
                          {item.printType && <div className="text-gray-500">Print: {item.printType}</div>}
                          <div className="flex justify-between mt-2 pt-2 border-t border-gray-100 font-black">
                            <span>Qty: {item.quantity}</span>
                            <span className="text-[#534AB7]">₹{item.price}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* financials */}
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Financials</p>
                    <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl space-y-2.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Total</span>
                        <span className="font-bold text-gray-900">₹{(selectedOrder.financials?.totalAmount || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-amber-500">Advance</span>
                        <span className="font-bold text-amber-600">₹{(selectedOrder.financials?.advancePay || 0).toLocaleString()}</span>
                      </div>
                      <div className="h-px bg-gray-200" />
                      <div className="flex justify-between text-sm text-red-600">
                        <span className="font-black uppercase text-xs">Balance</span>
                        <span className="font-black">₹{(selectedOrder.financials?.balanceAmount || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* assets */}
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Available assets</p>
                    <div className="space-y-2">
                      {/* staff images */}
                      <div className="p-3 bg-white border border-gray-100 rounded-xl">
                        <p className="text-xs font-bold text-gray-600 mb-2 flex items-center gap-1.5">
                          <Paperclip size={13} /> Staff images ({(selectedOrder.staffImages || []).length})
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {(selectedOrder.staffImages || []).map((img, idx) => (
                            <div key={idx} className="group relative w-10 h-10 rounded-lg overflow-hidden border border-gray-100">
                              <img src={img} className="w-full h-full object-cover" alt="" />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-0.5">
                                <button onClick={() => setViewingImage(img)} className="p-0.5 text-white"><ZoomIn size={10} /></button>
                                <a href={img} download={`Staff_${idx + 1}.png`} className="p-0.5 text-white"><Download size={10} /></a>
                                <button onClick={() => handleRemoveExistingAttachment('staffImages', idx)} className="p-0.5 text-red-300"><Trash2 size={10} /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* billing docs */}
                      <div className="p-3 bg-white border border-gray-100 rounded-xl">
                        <p className="text-xs font-bold text-gray-600 mb-2 flex items-center gap-1.5">
                          <CreditCard size={13} /> Billing docs ({selectedOrder.accountsAttachments.length})
                        </p>
                        <div className="space-y-1">
                          {selectedOrder.accountsAttachments.map((f, idx) => (
                            <div key={idx} className="flex items-center justify-between p-1.5 bg-gray-50 rounded-lg group text-[11px]">
                              <span className="text-gray-500 truncate max-w-[100px]">Doc_{idx + 1}</span>
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100">
                                <button onClick={() => setViewingImage(f)} className="text-blue-600 font-bold">View</button>
                                <a href={f} download={`Billing_${idx + 1}.png`} className="text-green-600 font-bold">Down</a>
                                <button onClick={() => handleRemoveExistingAttachment('accountsAttachments', idx)} className="text-red-500"><Trash2 size={11} /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* design output */}
                      {(selectedOrder.designAttachments?.length || 0) > 0 && (
                        <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl">
                          <p className="text-xs font-bold text-purple-700 mb-2 flex items-center gap-1.5">
                            <FileText size={13} /> Design output ({selectedOrder.designAttachments?.length})
                          </p>
                          <div className="space-y-1">
                            {selectedOrder.designAttachments?.map((f, idx) => (
                              <div key={idx} className="flex items-center justify-between p-1.5 bg-white/60 rounded-lg text-[11px]">
                                <span className="text-purple-600">Art_{idx + 1}</span>
                                <div className="flex items-center gap-2">
                                  <button onClick={() => setViewingImage(f)} className="text-purple-700 font-black">View</button>
                                  <a href={f} download={`Artwork_${idx + 1}.png`} className="text-purple-900 font-black">Down</a>
                                  <button onClick={() => handleRemoveExistingAttachment('designAttachments', idx)} className="text-red-500 font-black">Delete</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* machine files (Garage ZIP) */}
                      {(selectedOrder.machineFiles?.length || 0) > 0 && (
                        <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                          <p className="text-xs font-bold text-indigo-700 mb-2 flex items-center gap-1.5">
                            <Package size={13} /> Garage ZIP files ({selectedOrder.machineFiles?.length})
                          </p>
                          <div className="space-y-1">
                            {selectedOrder.machineFiles?.map((f, idx) => (
                              <div key={idx} className="flex items-center justify-between p-1.5 bg-white/60 rounded-lg text-[11px]">
                                <span className="text-indigo-600">Garage_{idx + 1}</span>
                                <div className="flex items-center gap-2">
                                  <a href={f} download={`Garage_${idx + 1}.zip`} className="text-indigo-900 font-black">Down</a>
                                  <button onClick={() => handleRemoveExistingAttachment('machineFiles', idx)} className="text-red-500 font-black">Delete</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* communication logs */}
              {selectedOrder.notes && (
                <div className="p-4 bg-[#534AB7]/5 border border-[#534AB7]/10 rounded-2xl">
                  <p className="text-[10px] font-black text-[#534AB7] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <Users size={12} /> Communication logs
                  </p>
                  <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedOrder.notes}</p>
                </div>
              )}

              {/* garage zip upload */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-bold text-gray-900">Final production file (Garage ZIP only)</p>
                  <p className="text-xs text-gray-400">Only .zip files permitted</p>
                </div>
                <FileUpload
                  label="Upload Garage ZIP file"
                  accept=".zip"
                  maxFiles={1}
                  onFilesSelected={(files) => setManagementFiles(files)}
                />
                {managementFiles.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {managementFiles.map((file, i) => (
                      <div key={i} className="group relative w-20 h-16 rounded-xl border border-gray-100 bg-gray-50 flex flex-col items-center justify-center gap-1">
                        <Package size={22} className="text-indigo-500" />
                        <span className="text-[9px] font-bold text-gray-400 uppercase">ZIP {i + 1}</span>
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-1.5">
                          <a href={file} download={`Garage_${i + 1}.zip`} className="p-1 bg-white/20 rounded text-white"><Download size={13} /></a>
                          <button onClick={() => handleRemoveManagementFile(i)} className="p-1 bg-red-500/80 rounded text-white"><Trash2 size={13} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* communicate buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setIsMsgSidebarOpen(true)}
                  className="flex-1 py-3 border border-gray-200 hover:bg-gray-50 rounded-2xl text-xs font-bold text-gray-600 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <MessageSquare size={14} /> Digitizer
                </button>
                <button
                  onClick={() => setIsDesignMsgSidebarOpen(true)}
                  className="flex-1 py-3 border border-purple-200 bg-purple-50 hover:bg-purple-100 rounded-2xl text-xs font-bold text-purple-700 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <MessageSquare size={14} /> Designer
                </button>
              </div>

              {/* action buttons */}
              <div className="flex gap-2 pt-2">
                {onReorder && user?.role === 'user' && (
                  <button
                    onClick={() => onReorder(selectedOrder)}
                    className="px-4 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition-colors"
                  >
                    Re-order
                  </button>
                )}

                {selectedOrder.status === OrderStatus.HOLD ? (
                  <button
                    disabled={isProcessing}
                    onClick={async () => {
                      const newStatus = selectedOrder.previousStatus || OrderStatus.ORDER_MANAGEMENT;
                      if (window.confirm(`Release order back to ${newStatus}?`)) {
                        setIsProcessing(true);
                        try {
                          await onUpdateOrder(selectedOrder.id, { status: newStatus, previousStatus: undefined, updatedAt: Date.now() });
                          setSelectedOrder(prev => prev ? { ...prev, status: newStatus, previousStatus: undefined } : null);
                          alert('Order released.');
                        } catch (e) { alert('Action failed.'); }
                        finally { setIsProcessing(false); }
                      }
                    }}
                    className="px-5 py-3.5 bg-green-50 text-green-700 border border-green-200 rounded-2xl text-xs font-bold hover:bg-green-100 transition-colors disabled:opacity-50"
                  >
                    Release
                  </button>
                ) : (
                  <button
                    disabled={isProcessing}
                    onClick={async () => {
                      const reason = window.prompt('Enter hold reason:');
                      if (reason === null) return;
                      if (!reason.trim()) { alert('Reason is required.'); return; }
                      setIsProcessing(true);
                      try {
                        const newNote = `[HOLD] ${new Date().toLocaleString()}: ${reason.trim()}`;
                        const updatedNotes = selectedOrder.notes ? `${selectedOrder.notes}\n${newNote}` : newNote;
                        await onUpdateOrder(selectedOrder.id, {
                          status: OrderStatus.HOLD,
                          holdReason: reason.trim(),
                          previousStatus: selectedOrder.status,
                          notes: updatedNotes,
                          updatedAt: Date.now(),
                        });
                        setSelectedOrder({ ...selectedOrder, status: OrderStatus.HOLD, holdReason: reason.trim(), previousStatus: selectedOrder.status, notes: updatedNotes } as Order);
                        alert('Order put on HOLD.');
                      } catch (e) { alert('Action failed.'); }
                      finally { setIsProcessing(false); }
                    }}
                    className="px-5 py-3.5 bg-red-50 text-red-700 border border-red-200 rounded-2xl text-xs font-bold hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    Hold
                  </button>
                )}

                <button
                  onClick={handleProcessOrder}
                  disabled={isProcessing || selectedOrder.status === OrderStatus.HOLD}
                  className="flex-1 py-3.5 bg-black text-white rounded-2xl text-xs font-bold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Moving…</>
                  ) : (
                    <><Package size={16} /> {selectedOrder.status === OrderStatus.HOLD ? 'Hold active' : 'Move to factory'}</>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── image viewer ── */}
      {viewingImage && (
        <ImageViewer
          src={viewingImage}
          onClose={() => setViewingImage(null)}
          fileName={`Order_${selectedOrder?.id || ''}`}
        />
      )}

      {/* ── hub order modal ── */}
      {selectedHubOrder && (
        <OrderDetailModal
          order={selectedHubOrder}
          onClose={() => setSelectedHubOrder(null)}
          isAdmin={isAdmin}
          onUpdateOrder={onUpdateOrder}
          onReorder={onReorder}
          onUpdateStatus={(status) => {
            if (window.confirm(`Change order status to ${status}?`)) {
              onUpdateOrder(selectedHubOrder.id, { status });
              setSelectedHubOrder(prev => prev ? { ...prev, status } : null);
            }
          }}
        />
      )}

      {/* ── Digitizer communication sidebar ── */}
      {isMsgSidebarOpen && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setIsMsgSidebarOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-black text-white">
              <div className="flex items-center gap-3">
                <Logo iconOnly />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-white/90">Communicate to digitizer</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    {selectedOrder ? `Order #${selectedOrder.id.slice(-6)} · ${selectedOrder.customerInfo.name}` : 'Interactive chat'}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsMsgSidebarOpen(false)} className="p-2 hover:bg-white/10 rounded-full text-white/75">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-gray-50">
              {selectedOrder ? (() => {
                const msgs = getCombinedMessages('digitizer');
                return msgs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 py-16">
                    <MessageSquare className="mx-auto mb-2 opacity-50" size={28} />
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Conversation thread</p>
                    <p className="text-xs max-w-xs">Initialize chat with digitizing team below.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {msgs.map((msg, i) => {
                      const isOM = msg.senderRole === 'order_management';
                      return (
                        <div key={msg.id || i} className={cn('flex flex-col max-w-[85%] rounded-2xl p-3.5 shadow-sm', isOM ? 'bg-black text-white ml-auto rounded-tr-none' : 'bg-white text-gray-800 mr-auto rounded-tl-none border border-gray-100')}>
                          <div className="flex items-center justify-between gap-4 mb-1">
                            <span className={cn('text-[9px] font-black uppercase tracking-wider', isOM ? 'text-gray-400' : 'text-blue-600')}>{msg.sender}</span>
                            <span className="text-[8px] opacity-60 font-mono">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-xs font-medium leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                          {msg.attachments?.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5 pt-2 border-t border-white/10">
                              {msg.attachments.map((att, ai) => (
                                <div key={ai} className="group relative w-10 h-10 rounded border border-gray-200 overflow-hidden bg-gray-100">
                                  <img src={att} className="w-full h-full object-cover" alt="" />
                                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button onClick={() => setViewingImage(att)} className="text-white"><ZoomIn size={10} /></button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })() : <p className="text-center text-xs text-gray-400 py-8">Select an order first</p>}
            </div>
            <div className="p-4 border-t border-gray-100 bg-white space-y-3">
              <div>
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Type instructions</label>
                <textarea rows={3} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none text-xs font-medium resize-none" placeholder="Ask a question or specify stitching details…" value={msgRequest.message} onChange={e => setMsgRequest(prev => ({ ...prev, message: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendToDigitizer(); } }} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Share files</span>
                {msgRequest.attachments.length > 0 && <span className="text-[9px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1"><Check size={9} /> {msgRequest.attachments.length} ready</span>}
              </div>
              <FileUpload label="Upload artwork references" accept="image/*,.pdf" onFilesSelected={files => setMsgRequest(prev => ({ ...prev, attachments: files }))} />
              <button disabled={isProcessing || !selectedOrder || (!msgRequest.message.trim() && msgRequest.attachments.length === 0)} onClick={sendToDigitizer} className="w-full py-3 bg-black text-white rounded-xl text-xs font-bold hover:bg-gray-800 flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none transition-colors">
                {isProcessing ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={13} />} Send to digitizer
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Designer communication sidebar ── */}
      {isDesignMsgSidebarOpen && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setIsDesignMsgSidebarOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-purple-900 text-white">
              <div className="flex items-center gap-3">
                <Logo iconOnly />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-white/95">Communicate to designer</h3>
                  <p className="text-[10px] text-purple-300 font-bold uppercase tracking-widest">
                    {selectedOrder ? `Order #${selectedOrder.id.slice(-6)} · ${selectedOrder.customerInfo.name}` : 'Interactive chat'}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsDesignMsgSidebarOpen(false)} className="p-2 hover:bg-white/10 rounded-full text-white/75">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-gray-50">
              {selectedOrder ? (() => {
                const msgs = getCombinedMessages('designer');
                return msgs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 py-16">
                    <MessageSquare className="mx-auto mb-2 text-purple-400 opacity-50" size={28} />
                    <p className="text-xs font-bold uppercase tracking-widest mb-1 text-purple-700">Conversation thread</p>
                    <p className="text-xs max-w-xs">Initialize design feedback below.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {msgs.map((msg, i) => {
                      const isOM = msg.senderRole === 'order_management';
                      return (
                        <div key={msg.id || i} className={cn('flex flex-col max-w-[85%] rounded-2xl p-3.5 shadow-sm', isOM ? 'bg-purple-900 text-white ml-auto rounded-tr-none' : 'bg-white text-gray-800 mr-auto rounded-tl-none border border-gray-100')}>
                          <div className="flex items-center justify-between gap-4 mb-1">
                            <span className={cn('text-[9px] font-black uppercase tracking-wider', isOM ? 'text-purple-300' : 'text-purple-700')}>{msg.sender}</span>
                            <span className="text-[8px] opacity-60 font-mono">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-xs font-medium leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                          {msg.attachments?.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5 pt-2 border-t border-purple-100">
                              {msg.attachments.map((att, ai) => (
                                <div key={ai} className="group relative w-10 h-10 rounded border border-gray-100 overflow-hidden bg-gray-50">
                                  <img src={att} className="w-full h-full object-cover" alt="" />
                                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button onClick={() => setViewingImage(att)} className="text-white"><ZoomIn size={10} /></button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })() : <p className="text-center text-xs text-gray-400 py-8">Select an order first</p>}
            </div>
            <div className="p-4 border-t border-gray-100 bg-white space-y-3">
              <div>
                <label className="text-[9px] font-black text-purple-900 uppercase tracking-widest block mb-1">Type brand / design instructions</label>
                <textarea rows={3} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none text-xs font-medium resize-none" placeholder="Give placement advice, material comments, or feedback…" value={designMsgRequest.message} onChange={e => setDesignMsgRequest(prev => ({ ...prev, message: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendToDesigner(); } }} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Design files</span>
                {designMsgRequest.attachments.length > 0 && <span className="text-[9px] text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded-full flex items-center gap-1"><Check size={9} /> {designMsgRequest.attachments.length} ready</span>}
              </div>
              <FileUpload label="Upload brand guidelines / refs" accept="image/*,.pdf text/plain" onFilesSelected={files => setDesignMsgRequest(prev => ({ ...prev, attachments: files }))} />
              <button disabled={isProcessing || !selectedOrder || (!designMsgRequest.message.trim() && designMsgRequest.attachments.length === 0)} onClick={sendToDesigner} className="w-full py-3 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none transition-colors">
                {isProcessing ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={13} />} Send to design team
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

const getStatusStyles = (status: OrderStatus) => {
  switch (status) {
    case OrderStatus.DRAFT: return 'bg-gray-100 text-gray-600';
    case OrderStatus.ACCOUNTS: return 'bg-amber-100 text-amber-700';
    case OrderStatus.DESIGN: return 'bg-purple-100 text-purple-700';
    case OrderStatus.ORDER_MANAGEMENT: return 'bg-blue-100 text-blue-700';
    case OrderStatus.PRODUCTION: return 'bg-purple-100 text-purple-700';
    case OrderStatus.DELIVERY: return 'bg-orange-100 text-orange-700';
    case OrderStatus.DELIVERED: return 'bg-green-100 text-green-700';
    case OrderStatus.HOLD: return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-600';
  }
};