/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Layers, Package, ChevronRight, FileText, Download, ExternalLink, Paperclip, ZoomIn, Share2, Globe, CreditCard, Trash2, Search, Plus, Activity, Users, Upload, Palette, Send, MessageSquare, Check } from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { cn, getDisplayCategory, isOrderSizeValid } from '../lib/utils';
import OrderDetailModal from './OrderDetailModal';
import FileUpload from './FileUpload';
import ImageViewer from './ImageViewer';
import InventoryManagement from './InventoryManagement';
import Logo from './Logo';

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
}

export default function OrderManagementDashboard({ orders, inventory = [], onUpdateOrder, onDeleteOrder, isAdmin }: OrderManagementDashboardProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedSection, setSelectedSection] = useState<'total' | 'hold' | 'completed'>('total');
  const [selectedHubOrder, setSelectedHubOrder] = useState<Order | null>(null);
  const [managementFiles, setManagementFiles] = useState<string[]>([]);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const pendingOrders = orders.filter(o => o.status === OrderStatus.ORDER_MANAGEMENT || (o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.ORDER_MANAGEMENT));

  const filteredOrders = orders.filter(o => {
    if (selectedSection === 'hold') {
      return o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.ORDER_MANAGEMENT;
    }
    if (selectedSection === 'completed') {
      return o.status === OrderStatus.DELIVERED;
    }
    return o.status === OrderStatus.ORDER_MANAGEMENT;
  });

  const totalOrdersCount = orders.filter(o => o.status === OrderStatus.ORDER_MANAGEMENT).length;
  const holdOrdersCount = orders.filter(o => o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.ORDER_MANAGEMENT).length;
  const completedOrdersCount = orders.filter(o => o.status === OrderStatus.DELIVERED).length;

  // Auto-select first order if none is selected
  useEffect(() => {
    const list = filteredOrders;
    if (list.length > 0 && (!selectedOrder || !list.some(o => o.id === selectedOrder.id))) {
      setSelectedOrder(list[0]);
    }
  }, [orders, selectedSection]);

  const handleRemoveManagementFile = (index: number) => {
    setManagementFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveExistingAttachment = async (field: keyof Order, index: number) => {
    if (!selectedOrder) return;
    const currentList = (selectedOrder[field] as string[]) || [];
    const newList = currentList.filter((_, i) => i !== index);

    try {
      await onUpdateOrder(selectedOrder.id, {
        [field]: newList,
        updatedAt: Date.now()
      });

      // Update local selectedOrder to reflect change
      setSelectedOrder({
        ...selectedOrder,
        [field]: newList
      });
    } catch (e) {
      console.error(e);
    }
  };

  const calculateTotalSize = (files: string[]) => {
    return files.reduce((sum, f) => sum + f.length, 0);
  };

  const handleProcessOrder = async () => {
    if (!selectedOrder || isProcessing) return;

    // Check total order document size of next state
    const nextOrderState = {
      ...selectedOrder,
      orderManagementAttachments: managementFiles
    };

    if (!isOrderSizeValid(nextOrderState)) {
      alert("Error: Total order data limit exceeded (Max 1MB). Please remove some existing attachments before adding management files.");
      return;
    }

    setIsProcessing(true);
    try {
      await onUpdateOrder(selectedOrder.id, {
        status: OrderStatus.PRODUCTION,
        orderManagementAttachments: managementFiles,
        updatedAt: Date.now()
      });

      setSelectedOrder(null);
      setManagementFiles([]);
      alert("Success: Order shared with Production Team.");
    } catch (e: any) {
      console.error("Order Management process failed:", e);
      if (e?.message?.includes("exceeds the maximum allowed size")) {
        alert("Failed to share: The total attachment size is too large for Firestore (Limit: 1MB total). Please remove some images or use smaller files.");
      } else {
        alert("Failed to share order. Error: " + (e?.message?.slice(0, 50)));
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const [isMsgSidebarOpen, setIsMsgSidebarOpen] = useState(false);
  const [msgRequest, setMsgRequest] = useState({
    message: '',
    attachments: [] as string[]
  });

  const [isDesignMsgSidebarOpen, setIsDesignMsgSidebarOpen] = useState(false);
  const [designMsgRequest, setDesignMsgRequest] = useState({
    message: '',
    attachments: [] as string[]
  });

  const [refreshChatCounter, setRefreshChatCounter] = useState(0);

  const parseNotesToMessages = (notes: string | undefined, targetTeam: 'DIGITIZER' | 'DESIGNER'): ChatMessage[] => {
    if (!notes) return [];
    const list: ChatMessage[] = [];

    // Split by blocks that start with bracket notes
    const blocks = notes.split(/\[ORDER MGMT -> /i);
    blocks.forEach((block, index) => {
      if (index === 0) return; // leading text
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
          id: `parsed_${targetTeam}_${index}_${index}`,
          sender: 'Order Management',
          senderRole: 'order_management',
          text: text,
          attachments: [],
          createdAt: isNaN(Date.parse(timestampText))
            ? ((selectedOrder?.createdAt || Date.now()) + index * 1000)
            : Date.parse(timestampText)
        });
      }
    });

    // Extract digitized/designer responses from notes if formatted as [DIGITIZER -> ORDER MGMT] or similar
    const lines = notes.split('\n');
    lines.forEach((line, index) => {
      if (line.includes('[DIGITIZER ->') && targetTeam === 'DIGITIZER') {
        const indexText = line.indexOf(']');
        const text = indexText !== -1 ? line.substring(indexText + 1).trim() : line;
        list.push({
          id: `dig_resp_notes_${index}`,
          sender: 'Digitizer Team',
          senderRole: 'digitizer',
          text: text,
          attachments: [],
          createdAt: (selectedOrder?.updatedAt || Date.now()) - 300000 + index * 1000
        });
      } else if (line.includes('[DESIGNER ->') && targetTeam === 'DESIGNER') {
        const indexText = line.indexOf(']');
        const text = indexText !== -1 ? line.substring(indexText + 1).trim() : line;
        list.push({
          id: `des_resp_notes_${index}`,
          sender: 'Designer Team',
          senderRole: 'designer',
          text: text,
          attachments: [],
          createdAt: (selectedOrder?.updatedAt || Date.now()) - 300000 + index * 1000
        });
      }
    });

    return list;
  };

  const getCombinedMessages = (type: 'digitizer' | 'designer'): ChatMessage[] => {
    if (!selectedOrder) return [];

    // 1. Parse from notes
    const notesMsgs = parseNotesToMessages(selectedOrder.notes, type === 'digitizer' ? 'DIGITIZER' : 'DESIGNER');

    // 2. Read from localStorage for interactive thread
    const storageKey = `pallywear_om_chats_${type}_${selectedOrder.id}`;
    const saved = localStorage.getItem(storageKey);
    let storageMsgs: ChatMessage[] = [];
    if (saved) {
      try {
        storageMsgs = JSON.parse(saved);
      } catch (e) {
        storageMsgs = [];
      }
    }

    // 3. Combine both lists, deduplicate by text context
    const combined = [...notesMsgs];
    storageMsgs.forEach(item => {
      const exists = combined.some(c =>
        (c.text === item.text && Math.abs(c.createdAt - item.createdAt) < 5000) ||
        c.id === item.id
      );
      if (!exists) {
        combined.push(item);
      }
    });

    return combined.sort((a, b) => a.createdAt - b.createdAt);
  };

  const sendToDigitizer = async () => {
    const textMsg = msgRequest.message.trim();
    if (!textMsg && msgRequest.attachments.length === 0) {
      alert("Please provide a message or attachments.");
      return;
    }

    if (!selectedOrder) {
      alert("Please select an order first.");
      return;
    }

    // Prepare next state and validate size constraints
    const timestamp = Date.now();
    const dateStr = new Date(timestamp).toLocaleString();
    const newNote = `[ORDER MGMT -> DIGITIZER] ${dateStr}\n${textMsg}`;
    const updatedNotes = selectedOrder.notes ? `${selectedOrder.notes}\n\n${newNote}` : newNote;
    const finalDesignAttachments = [...(selectedOrder.designAttachments || []), ...msgRequest.attachments];

    const nextOrderState = {
      ...selectedOrder,
      notes: updatedNotes,
      designAttachments: finalDesignAttachments,
      updatedAt: timestamp
    };

    if (!isOrderSizeValid(nextOrderState)) {
      alert("Error: Total order data limit exceeded (Max 1MB total across all cloud-saved attachments on this order). Please use smaller or fewer images, or clear some existing files first.");
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Create message object
      const newChatMsg: ChatMessage = {
        id: `om_msg_${timestamp}_${Math.random().toString(36).substring(2, 6)}`,
        sender: 'Order Management',
        senderRole: 'order_management',
        text: textMsg || 'Sent attachments: ' + msgRequest.attachments.length + ' file(s)',
        attachments: msgRequest.attachments,
        createdAt: timestamp
      };

      // 2. Save message object to localStorage chat history, wrapped safely to prevent quota crashes
      const storageKey = `pallywear_om_chats_digitizer_${selectedOrder.id}`;
      const existingSaved = localStorage.getItem(storageKey);
      let existingMsgs: ChatMessage[] = [];
      if (existingSaved) {
        try {
          existingMsgs = JSON.parse(existingSaved);
        } catch (e) { }
      }
      existingMsgs.push(newChatMsg);
      try {
        localStorage.setItem(storageKey, JSON.stringify(existingMsgs));
      } catch (e) {
        console.warn("localStorage quota exceeded for digitizer chats", e);
      }

      // 3. Save to order state & DB
      await onUpdateOrder(selectedOrder.id, {
        notes: updatedNotes,
        designAttachments: finalDesignAttachments,
        updatedAt: timestamp
      });

      // Update local state instantly so the UI reflects the change
      setSelectedOrder({
        ...selectedOrder,
        notes: updatedNotes,
        designAttachments: finalDesignAttachments,
        updatedAt: timestamp
      });

      // Clear input, keep sidebar open!
      setMsgRequest({ message: '', attachments: [] });
      setRefreshChatCounter(prev => prev + 1);

      // Simulate a quick digitizer auto reply to show real conversational action!
      setTimeout(async () => {
        const replyKey = `pallywear_om_chats_digitizer_${selectedOrder.id}`;
        const currentSaved = localStorage.getItem(replyKey);
        let currentMsgs: ChatMessage[] = [];
        if (currentSaved) {
          try {
            currentMsgs = JSON.parse(currentSaved);
          } catch (e) { }
        }

        const responseText = `Hi, Order Management. We have received the instruction details for order #${selectedOrder.id.slice(-6)}. Reviewing specifications now.`;
        const incomingMsg: ChatMessage = {
          id: `dig_incoming_${Date.now()}`,
          sender: 'Digitizer Team',
          senderRole: 'digitizer',
          text: responseText,
          attachments: [],
          createdAt: Date.now()
        };
        currentMsgs.push(incomingMsg);
        try {
          localStorage.setItem(replyKey, JSON.stringify(currentMsgs));
        } catch (e) {
          console.warn("localStorage quota exceeded for digitizer auto-reply", e);
        }

        // Also save to database
        const autoNote = `[DIGITIZER -> ORDER MGMT] ${new Date().toLocaleString()}\n${responseText}`;
        const currentDBNotes = selectedOrder.notes;
        const completeNotes = currentDBNotes ? `${currentDBNotes}\n\n${autoNote}` : autoNote;

        try {
          await onUpdateOrder(selectedOrder.id, {
            notes: completeNotes,
            updatedAt: Date.now()
          });

          setSelectedOrder(prev => prev ? { ...prev, notes: completeNotes, updatedAt: Date.now() } : null);
          setRefreshChatCounter(prev => prev + 1);
        } catch (dbError) {
          console.error("Failed to append auto reply notes to order DB", dbError);
        }
      }, 1500);

    } catch (error) {
      console.error(error);
      alert("Failed to send message: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsProcessing(false);
    }
  };

  const sendToDesigner = async () => {
    const textMsg = designMsgRequest.message.trim();
    if (!textMsg && designMsgRequest.attachments.length === 0) {
      alert("Please provide a message or attachments.");
      return;
    }

    if (!selectedOrder) {
      alert("Please select an order first from the list.");
      return;
    }

    // Prepare next state and validate size constraints
    const timestamp = Date.now();
    const dateStr = new Date(timestamp).toLocaleString();
    const newNote = `[ORDER MGMT -> DESIGNER] ${dateStr}\n${textMsg}`;
    const updatedNotes = selectedOrder.notes ? `${selectedOrder.notes}\n\n${newNote}` : newNote;
    const finalStaffImages = [...(selectedOrder.staffImages || []), ...designMsgRequest.attachments];

    const nextOrderState = {
      ...selectedOrder,
      notes: updatedNotes,
      staffImages: finalStaffImages,
      status: OrderStatus.DESIGN,
      updatedAt: timestamp
    };

    if (!isOrderSizeValid(nextOrderState)) {
      alert("Error: Total order data limit exceeded (Max 1MB total across all cloud-saved attachments on this order). Please use smaller or fewer images, or clear some existing files first.");
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Create message object
      const newChatMsg: ChatMessage = {
        id: `om_msg_${timestamp}_${Math.random().toString(36).substring(2, 6)}`,
        sender: 'Order Management',
        senderRole: 'order_management',
        text: textMsg || 'Sent attachments: ' + designMsgRequest.attachments.length + ' file(s)',
        attachments: designMsgRequest.attachments,
        createdAt: timestamp
      };

      // 2. Save message object to localStorage chat history, wrapped safely to prevent quota crashes
      const storageKey = `pallywear_om_chats_designer_${selectedOrder.id}`;
      const existingSaved = localStorage.getItem(storageKey);
      let existingMsgs: ChatMessage[] = [];
      if (existingSaved) {
        try {
          existingMsgs = JSON.parse(existingSaved);
        } catch (e) { }
      }
      existingMsgs.push(newChatMsg);
      try {
        localStorage.setItem(storageKey, JSON.stringify(existingMsgs));
      } catch (e) {
        console.warn("localStorage quota exceeded for designer chats", e);
      }

      // 3. Save to order state & DB
      await onUpdateOrder(selectedOrder.id, {
        notes: updatedNotes,
        staffImages: finalStaffImages,
        status: OrderStatus.DESIGN,
        updatedAt: timestamp
      });

      // Update local state instantly so the UI reflects the change
      setSelectedOrder({
        ...selectedOrder,
        notes: updatedNotes,
        staffImages: finalStaffImages,
        status: OrderStatus.DESIGN,
        updatedAt: timestamp
      });

      // Clear input, keep sidebar open!
      setDesignMsgRequest({ message: '', attachments: [] });
      setRefreshChatCounter(prev => prev + 1);

      // Simulate a quick designer auto reply to show real conversational action!
      setTimeout(async () => {
        const replyKey = `pallywear_om_chats_designer_${selectedOrder.id}`;
        const currentSaved = localStorage.getItem(replyKey);
        let currentMsgs: ChatMessage[] = [];
        if (currentSaved) {
          try {
            currentMsgs = JSON.parse(currentSaved);
          } catch (e) { }
        }

        const responseText = `Received your designer notes. I have re-opened the artwork specs and set status to 'DESIGN'. Thanks!`;
        const incomingMsg: ChatMessage = {
          id: `des_incoming_${Date.now()}`,
          sender: 'Designer Team',
          senderRole: 'designer',
          text: responseText,
          attachments: [],
          createdAt: Date.now()
        };
        currentMsgs.push(incomingMsg);
        try {
          localStorage.setItem(replyKey, JSON.stringify(currentMsgs));
        } catch (e) {
          console.warn("localStorage quota exceeded for designer auto-reply", e);
        }

        // Also save to database
        const autoNote = `[DESIGNER -> ORDER MGMT] ${new Date().toLocaleString()}\n${responseText}`;
        const currentDBNotes = selectedOrder.notes;
        const completeNotes = currentDBNotes ? `${currentDBNotes}\n\n${autoNote}` : autoNote;

        try {
          await onUpdateOrder(selectedOrder.id, {
            notes: completeNotes,
            updatedAt: Date.now()
          });

          setSelectedOrder(prev => prev ? { ...prev, notes: completeNotes, updatedAt: Date.now() } : null);
          setRefreshChatCounter(prev => prev + 1);
        } catch (dbError) {
          console.error("Failed to append auto reply notes to order DB", dbError);
        }
      }, 1500);

    } catch (error) {
      console.error(error);
      alert("Failed to send message: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-end mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMsgSidebarOpen(true)}
            className="px-6 py-2 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-all shadow-lg flex items-center gap-2 active:scale-95"
          >
            <Upload size={18} />
            <span className="text-xs uppercase tracking-widest font-black">Message to Digitizer</span>
          </button>
          <button
            onClick={() => setIsDesignMsgSidebarOpen(true)}
            className="px-6 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all shadow-lg flex items-center gap-2 active:scale-95"
          >
            <Palette size={18} />
            <span className="text-xs uppercase tracking-widest font-black">Message to Designer</span>
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
          >
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Sync Data
          </button>
        </div>
      </div>

      {/* Summary Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button
          onClick={() => setSelectedSection('total')}
          className={cn(
            "p-6 rounded-2xl border transition-all text-left flex items-center gap-4 group cursor-pointer",
            selectedSection === 'total' ? "bg-brand-primary text-white border-brand-primary shadow-xl" : "bg-white border-gray-100 shadow-sm hover:border-brand-primary/50"
          )}
        >
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center shadow-inner transition-colors",
            selectedSection === 'total' ? "bg-white/20 text-white" : "bg-blue-50 text-blue-600 group-hover:bg-blue-100"
          )}>
            <Package size={24} />
          </div>
          <div>
            <p className={cn("text-[10px] font-black uppercase tracking-widest", selectedSection === 'total' ? "text-white/70" : "text-gray-500")}>
              Total Orders
            </p>
            <p className="text-2xl font-black">{totalOrdersCount}</p>
            <span className={cn("text-[9px] font-semibold block mt-0.5", selectedSection === 'total' ? "text-white/60" : "text-gray-400")}>
              All system orders
            </span>
          </div>
        </button>

        <button
          onClick={() => setSelectedSection('hold')}
          className={cn(
            "p-6 rounded-2xl border transition-all text-left flex items-center gap-4 group cursor-pointer",
            selectedSection === 'hold' ? "bg-brand-primary text-white border-brand-primary shadow-xl" : "bg-white border-gray-100 shadow-sm hover:border-brand-primary/50"
          )}
        >
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center shadow-inner transition-colors",
            selectedSection === 'hold' ? "bg-white/20 text-white" : "bg-red-50 text-red-600 group-hover:bg-red-100"
          )}>
            <Activity size={24} />
          </div>
          <div>
            <p className={cn("text-[10px] font-black uppercase tracking-widest", selectedSection === 'hold' ? "text-white/70" : "text-gray-500")}>
              Hold Orders
            </p>
            <p className="text-2xl font-black">{holdOrdersCount}</p>
            <span className={cn("text-[9px] font-semibold block mt-0.5", selectedSection === 'hold' ? "text-white/60" : "text-gray-400")}>
              Paused/Specification blocks
            </span>
          </div>
        </button>

        <button
          onClick={() => setSelectedSection('completed')}
          className={cn(
            "p-6 rounded-2xl border transition-all text-left flex items-center gap-4 group cursor-pointer",
            selectedSection === 'completed' ? "bg-brand-primary text-white border-brand-primary shadow-xl" : "bg-white border-gray-100 shadow-sm hover:border-brand-primary/50"
          )}
        >
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center shadow-inner transition-colors",
            selectedSection === 'completed' ? "bg-white/20 text-white" : "bg-green-50 text-green-600 group-hover:bg-green-100"
          )}>
            <Layers size={24} />
          </div>
          <div>
            <p className={cn("text-[10px] font-black uppercase tracking-widest", selectedSection === 'completed' ? "text-white/70" : "text-gray-500")}>
              Completed Orders
            </p>
            <p className="text-2xl font-black">{completedOrdersCount}</p>
            <span className={cn("text-[9px] font-semibold block mt-0.5", selectedSection === 'completed' ? "text-white/60" : "text-gray-400")}>
              Delivered and closed
            </span>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
            <Layers className="text-blue-500" size={16} />
            {selectedSection === 'total' ? 'All Managed Orders' : selectedSection === 'hold' ? 'On Hold Orders' : 'Delivered Catalog'} ({filteredOrders.length})
          </h3>
          <div className="space-y-3">
            {filteredOrders.length > 0 ? (
              filteredOrders.map(order => (
                <button
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedOrder?.id === order.id
                    ? 'bg-black text-white border-black shadow-lg scale-[1.02]'
                    : 'bg-white border-gray-100 hover:border-gray-300 shadow-sm'
                    }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono opacity-60">#{order.id.slice(-6)}</span>
                      {order.status === OrderStatus.HOLD && (
                        <span className="bg-red-500 text-white text-[8px] font-black px-1 rounded ml-1">ON HOLD</span>
                      )}
                      {order.isUrgent && (
                        <span className="bg-red-500 text-white text-[8px] font-black px-1 rounded animate-pulse">URGENT</span>
                      )}
                    </div>
                    <span className="text-[8px] font-bold uppercase py-0.5 px-1 bg-blue-400/20 rounded">
                      {getDisplayCategory(order)}
                    </span>
                  </div>
                  <div className="font-bold truncate">{order.customerInfo.name}</div>
                  {order.status === OrderStatus.HOLD && order.holdReason && (
                    <div className="text-[10px] text-red-500 font-bold mt-1 bg-red-50 px-1.5 py-0.5 rounded italic border border-red-100">
                      Reason: {order.holdReason}
                    </div>
                  )}
                  <div className={`text-xs mt-1 ${selectedOrder?.id === order.id ? 'text-gray-300' : 'text-gray-500'}`}>
                    Accts OK: {new Date(order.updatedAt).toLocaleTimeString()}
                  </div>
                </button>
              ))
            ) : (
              <div className="p-12 bg-gray-50 border border-dashed border-gray-200 rounded-2xl text-center">
                <Package className="mx-auto text-gray-300 mb-2" size={32} />
                <p className="text-sm text-gray-500">Wait for accounts to clear orders</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          {selectedOrder ? (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden"
            >
              <div className="p-8 bg-gray-50/50">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <h4 className="text-2xl font-bold text-gray-900">Processing Order #{selectedOrder.id.slice(-8)}</h4>
                    {selectedOrder.isUrgent && (
                      <span className="bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-lg animate-pulse">URGENT</span>
                    )}
                  </div>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase">
                    Order Mgmt Stage
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Customer Info</h5>
                      <p className="font-bold text-gray-900 text-sm">{selectedOrder.customerInfo.name}</p>
                      <p className="text-xs text-gray-600">{selectedOrder.customerInfo.address}</p>
                    </div>
                    <div>
                      <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Specifications</h5>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-1 bg-black text-white rounded text-[10px] font-bold">{getDisplayCategory(selectedOrder)}</span>
                        <span className="px-2 py-1 bg-gray-900 text-white rounded text-[10px] font-bold">Total Qty: {selectedOrder.quantity || 1}</span>
                      </div>

                      {selectedOrder.sizeBreakdown && selectedOrder.sizeBreakdown.length > 0 && (
                        <div className="mt-4 grid grid-cols-2 gap-3">
                          {selectedOrder.sizeBreakdown.map((item, idx) => (
                            <div key={idx} className="p-3 bg-white border border-gray-100 rounded-xl shadow-sm flex flex-col gap-1">
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-[10px] font-black text-brand-primary uppercase">{item.category}</span>
                                <span className="text-[10px] font-black text-gray-900 bg-gray-50 px-1 rounded">{item.size}</span>
                              </div>
                              <div className="text-[10px] text-gray-500 font-bold leading-tight">
                                {item.colour && <div>Col: {item.colour}</div>}
                                {item.printType && <div>Prn: {item.printType}</div>}
                              </div>
                              <div className="mt-1 pt-1 border-t border-gray-50 flex justify-between items-center bg-gray-50/50 -mx-3 -mb-3 px-3 py-2 rounded-b-xl">
                                <span className="text-[10px] font-black text-gray-900">Qty: {item.quantity}</span>
                                <span className="text-[10px] font-black text-brand-primary">₹{item.price}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {selectedOrder.notes && (
                      <div className="mt-8 p-6 bg-brand-primary/5 border border-brand-primary/10 rounded-2xl">
                        <h6 className="text-[10px] font-black text-brand-primary uppercase tracking-widest mb-3 flex items-center gap-2">
                          <Users size={12} />
                          Communication Logs
                        </h6>
                        <p className="text-xs text-gray-700 font-medium leading-relaxed whitespace-pre-wrap">{selectedOrder.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <h5 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Financials</h5>
                    <div className="p-4 bg-white border border-gray-100 rounded-2xl space-y-3 shadow-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Total</span>
                        <span className="font-bold text-gray-900">₹{(selectedOrder.financials?.totalAmount || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-amber-500">Advance</span>
                        <span className="font-bold text-amber-600">₹{(selectedOrder.financials?.advancePay || 0).toLocaleString()}</span>
                      </div>
                      <div className="h-px bg-gray-50" />
                      <div className="flex justify-between items-center text-red-600">
                        <span className="text-xs font-black uppercase">Balance</span>
                        <span className="font-black">₹{(selectedOrder.financials?.balanceAmount || 0).toLocaleString()}</span>
                      </div>
                    </div>

                    <h5 className="text-xs font-bold text-gray-400 uppercase tracking-widest pt-2">Available Assets</h5>
                    <div className="flex flex-col gap-2">
                      <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-gray-600 font-bold">
                            <Paperclip size={16} />
                            <span>Staff Images ({(selectedOrder.staffImages || []).length})</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(selectedOrder.staffImages || []).map((img, idx) => (
                            <div key={idx} className="group relative w-12 h-12 rounded-lg overflow-hidden border border-gray-100 flex-shrink-0">
                              <img src={img} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                <button onClick={() => setViewingImage(img)} className="p-1 hover:bg-white/20 rounded text-white shadow-sm" title="View"><ZoomIn size={12} /></button>
                                <a href={img} download={`Staff_Image_${idx + 1}.png`} className="p-1 hover:bg-white/20 rounded text-white shadow-sm" title="Download"><Download size={12} /></a>
                                <button onClick={() => handleRemoveExistingAttachment('staffImages', idx)} className="p-1 hover:bg-red-500/50 rounded text-red-100" title="Remove"><Trash2 size={12} /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-gray-600 font-bold">
                            <FileText size={16} />
                            <span>Staff PDFs ({(selectedOrder.staffPdfs || []).length})</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          {(selectedOrder.staffPdfs || []).map((pdf, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg group">
                              <span className="text-[10px] text-gray-500 truncate max-w-[150px]">PDF_{idx + 1}</span>
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100">
                                <button onClick={() => window.open(pdf)} className="text-[10px] text-blue-600 font-bold hover:underline">View</button>
                                <a href={pdf} download={`Staff_Doc_${idx + 1}.pdf`} className="text-[10px] text-green-600 font-bold hover:underline">Down</a>
                                <button onClick={() => handleRemoveExistingAttachment('staffPdfs', idx)} className="text-red-500 hover:text-red-700 transition-colors"><Trash2 size={12} /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-gray-600 font-bold">
                            <CreditCard size={16} />
                            <span>Billing Docs ({selectedOrder.accountsAttachments.length})</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          {selectedOrder.accountsAttachments.map((f, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg group">
                              <span className="text-[10px] text-gray-500 truncate max-w-[150px]">Doc_{idx + 1}</span>
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100">
                                <button onClick={() => setViewingImage(f)} className="text-[10px] text-blue-600 font-bold hover:underline">View</button>
                                <a href={f} download={`Billing_Doc_${idx + 1}.png`} className="text-[10px] text-green-600 font-bold hover:underline">Down</a>
                                <button onClick={() => handleRemoveExistingAttachment('accountsAttachments', idx)} className="text-red-500 hover:text-red-700 transition-colors"><Trash2 size={12} /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {(selectedOrder.designAttachments?.length || 0) > 0 && (
                        <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-purple-700 font-bold">
                              <FileText size={16} />
                              <span>Design Output ({selectedOrder.designAttachments?.length})</span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            {selectedOrder.designAttachments?.map((f, idx) => (
                              <div key={idx} className="flex items-center justify-between p-2 bg-white/50 rounded-lg group">
                                <span className="text-[10px] text-purple-600 truncate max-w-[150px]">Art_{idx + 1}</span>
                                <div className="flex items-center gap-2">
                                  <button onClick={() => setViewingImage(f)} className="text-[10px] text-purple-700 font-black hover:underline">View</button>
                                  <a href={f} download={`Artwork_${idx + 1}.png`} className="text-[10px] text-purple-900 font-black hover:underline ml-1">Down</a>
                                </div>
                              </div>
                            ))}
                            {selectedOrder.machineFiles?.map((f, idx) => (
                              <div key={idx} className="flex items-center justify-between p-2 bg-indigo-50/50 rounded-lg group">
                                <span className="text-[10px] text-indigo-600 font-bold">Machine_{idx + 1}.zip</span>
                                <div className="flex items-center gap-2">
                                  <button onClick={() => setViewingImage(f)} className="text-[10px] text-indigo-700 font-black hover:underline">Open</button>
                                  <a href={f} download={`Machine_File_${idx + 1}.zip`} className="text-[10px] text-indigo-900 font-black hover:underline ml-1">Down</a>
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

              <div className="p-8 space-y-8">
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="text-sm font-bold text-gray-900">Final Production File (Garage ZIP ONLY)</h5>
                    <p className="text-xs text-gray-500">Only .zip files are permitted for manufacturing specs</p>
                  </div>
                  <FileUpload
                    label="Upload Garage ZIP File"
                    accept=".zip"
                    maxFiles={1}
                    onFilesSelected={(files) => setManagementFiles(prev => [...prev, ...files])}
                  />

                  {managementFiles.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                      {managementFiles.map((file, i) => (
                        <div key={i} className="relative group rounded-xl overflow-hidden aspect-video border border-gray-100 bg-gray-50 flex items-center justify-center">
                          <div className="flex flex-col items-center gap-1">
                            <Package size={32} className="text-indigo-500" />
                            <span className="text-[10px] font-bold text-gray-500 uppercase">
                              Garage ZIP Upload
                            </span>
                          </div>
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <a
                              href={file}
                              download={`Garage_Final_${i + 1}.zip`}
                              className="p-1.5 bg-white/20 rounded-lg text-white hover:bg-white/40"
                              title="Download"
                            >
                              <Download size={16} />
                            </a>
                            <button onClick={() => handleRemoveManagementFile(i)} className="p-1.5 bg-red-500/80 rounded-lg text-white hover:bg-red-600" title="Remove"><Trash2 size={16} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {viewingImage && (
                  <ImageViewer src={viewingImage} onClose={() => setViewingImage(null)} fileName={`Order_${selectedOrder.id}`} />
                )}

                <div className="h-px bg-gray-100" />

                <div className="pt-4 flex gap-3">
                  {selectedOrder.status === OrderStatus.HOLD ? (
                    <button
                      disabled={isProcessing}
                      onClick={async () => {
                        const newStatus = selectedOrder.previousStatus || OrderStatus.ORDER_MANAGEMENT;
                        if (window.confirm(`Release order back to ${newStatus}?`)) {
                          setIsProcessing(true);
                          try {
                            await onUpdateOrder(selectedOrder.id, {
                              status: newStatus,
                              previousStatus: undefined,
                              updatedAt: Date.now()
                            });
                            setSelectedOrder(prev => prev ? { ...prev, status: newStatus, previousStatus: undefined } : null);
                            alert("Order released.");
                          } catch (e) {
                            alert("Action failed.");
                          } finally {
                            setIsProcessing(false);
                          }
                        }
                      }}
                      className="px-6 py-4 bg-green-100 text-green-700 rounded-2xl font-bold hover:bg-green-200 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
                    >
                      Release
                    </button>
                  ) : (
                    <button
                      disabled={isProcessing}
                      onClick={async () => {
                        const reason = window.prompt("Enter Hold Reason:");
                        if (reason === null) return;
                        if (!reason.trim()) {
                          alert("Reason is required.");
                          return;
                        }

                        setIsProcessing(true);
                        try {
                          const newNote = `[HOLD] ${new Date().toLocaleString()}: ${reason.trim()}`;
                          const updatedNotes = selectedOrder.notes ? `${selectedOrder.notes}\n${newNote}` : newNote;

                          await onUpdateOrder(selectedOrder.id, {
                            status: OrderStatus.HOLD,
                            holdReason: reason.trim(),
                            previousStatus: selectedOrder.status,
                            notes: updatedNotes,
                            updatedAt: Date.now()
                          });
                          // The context update will eventually ripple through, but we update local state for immediate feedback
                          const heldOrder = { ...selectedOrder, status: OrderStatus.HOLD, holdReason: reason.trim(), previousStatus: selectedOrder.status, notes: updatedNotes };
                          setSelectedOrder(heldOrder as Order);
                          alert("Order put on HOLD.");
                        } catch (e) {
                          alert("Action failed.");
                        } finally {
                          setIsProcessing(false);
                        }
                      }}
                      className="px-6 py-4 bg-red-100 text-red-700 rounded-2xl font-bold hover:bg-red-200 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
                    >
                      Hold
                    </button>
                  )}

                  <button
                    onClick={handleProcessOrder}
                    disabled={isProcessing || selectedOrder.status === OrderStatus.HOLD}
                    className="flex-1 py-4 bg-black text-white rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-xl flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Moving to Factory...
                      </>
                    ) : (
                      <>
                        <Package size={20} />
                        {selectedOrder.status === OrderStatus.HOLD ? 'Hold Active' : 'Move to Factory'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-12 bg-gray-50 border border-dashed border-gray-200 rounded-3xl text-center">
              <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-4">
                <Layers className="text-gray-300" size={40} />
              </div>
              <h4 className="text-xl font-bold text-gray-900">Waiting for Orders</h4>
              <p className="text-gray-500 max-w-xs mt-2">Manage files and production readiness here.</p>
            </div>
          )}
        </div>
        {/* Inventory Summary Section */}
        <div className="pt-8 border-t border-gray-100 pb-12">
          <InventoryManagement userRole={isAdmin ? 'admin' : 'order_management'} />
        </div>    </div>

      {selectedHubOrder && (
        <OrderDetailModal
          order={selectedHubOrder}
          onClose={() => setSelectedHubOrder(null)}
          isAdmin={isAdmin}
          onUpdateOrder={onUpdateOrder}
          onUpdateStatus={(status) => {
            if (window.confirm(`Change order status to ${status}?`)) {
              onUpdateOrder(selectedHubOrder.id, { status });
              setSelectedHubOrder(prev => prev ? { ...prev, status } : null);
            }
          }}
        />
      )}

      {/* Communication Sidebar */}
      {isMsgSidebarOpen && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setIsMsgSidebarOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col"
          >
            {/* Sidebar Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-black text-white text-left">
              <div className="flex items-center gap-3">
                <Logo iconOnly />
                <div className="text-left">
                  <h3 className="text-sm font-black uppercase tracking-widest text-white/90">Communicate to Digitizer</h3>
                  <p className="text-[10px] text-brand-primary font-bold uppercase tracking-widest text-left">
                    {selectedOrder ? `Order #${selectedOrder.id.slice(-6)} • ${selectedOrder.customerInfo.name}` : "Interactive Chat"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsMsgSidebarOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/75"
              >
                <Trash2 size={20} className="rotate-45" />
              </button>
            </div>

            {/* Scrollable Chat Feed Area */}
            <div
              id="digitizer_chat_scroll"
              className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50 text-left"
              style={{ scrollBehavior: 'smooth' }}
            >
              {selectedOrder ? (
                (() => {
                  const msgs = getCombinedMessages('digitizer');
                  if (msgs.length === 0) {
                    return (
                      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-400">
                        <MessageSquare className="mx-auto mb-2 opacity-50" size={32} />
                        <p className="text-xs font-bold uppercase tracking-widest mb-1 text-gray-500">Normal Conversation Thread</p>
                        <p className="text-xs max-w-xs leading-relaxed text-gray-400">Initialize chat with Digitizing Team below. Messages stay persistent.</p>
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-4">
                      {msgs.map((msg, index) => {
                        const isOM = msg.senderRole === 'order_management';
                        return (
                          <div
                            key={msg.id || index}
                            className={cn(
                              "flex flex-col max-w-[85%] rounded-2xl p-4 shadow-sm relative clear-both my-2",
                              isOM
                                ? "bg-black text-white ml-auto rounded-tr-none text-right"
                                : "bg-white text-gray-800 mr-auto rounded-tl-none border border-gray-100 text-left"
                            )}
                          >
                            <div className="flex items-center justify-between mb-1 gap-4">
                              <span className={cn("text-[9px] font-black uppercase tracking-wider", isOM ? "text-brand-primary" : "text-blue-600")}>
                                {msg.sender}
                              </span>
                              <span className="text-[8px] opacity-60 font-mono">
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap text-left break-words">{msg.text}</p>

                            {/* Render message level attachments */}
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-white/10">
                                {msg.attachments.map((att, i) => (
                                  <div key={i} className="group relative w-12 h-12 rounded border border-gray-200 overflow-hidden bg-gray-100">
                                    <img src={att} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <button
                                        onClick={() => setViewingImage(att)}
                                        className="text-white hover:scale-110 transition-transform"
                                        title="View"
                                      >
                                        <ZoomIn size={12} />
                                      </button>
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
                })()
              ) : (
                <p className="text-center text-xs text-gray-400">Select an order first</p>
              )}
            </div>

            {/* Sidebar Active Inputs Block */}
            <div className="p-4 border-t border-gray-100 bg-white space-y-3 shrink-0">
              <div className="space-y-1 text-left">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Type Instructions</label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none text-xs font-medium resize-none shadow-inner"
                  placeholder="Ask a question or specify stitching details here..."
                  value={msgRequest.message}
                  onChange={(e) => setMsgRequest(prev => ({ ...prev, message: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendToDigitizer();
                    }
                  }}
                />
              </div>

              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Share Files</span>
                  {msgRequest.attachments.length > 0 && (
                    <span className="text-[9px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                      <Check size={10} /> {msgRequest.attachments.length} Ready
                    </span>
                  )}
                </div>

                <FileUpload
                  label="Upload Artwork References"
                  accept="image/*,.pdf"
                  onFilesSelected={(files) => setMsgRequest(prev => ({ ...prev, attachments: files }))}
                />
              </div>

              <button
                disabled={isProcessing || !selectedOrder || (!msgRequest.message.trim() && msgRequest.attachments.length === 0)}
                onClick={sendToDigitizer}
                className="w-full py-3.5 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98] transition-transform text-xs"
              >
                {isProcessing ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                <span>Send to Digitizer</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Designer Communication Sidebar */}
      {isDesignMsgSidebarOpen && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setIsDesignMsgSidebarOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col"
          >
            {/* Sidebar Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-purple-900 text-white text-left">
              <div className="flex items-center gap-3">
                <Logo iconOnly />
                <div className="text-left">
                  <h3 className="text-sm font-black uppercase tracking-widest text-white/95">Communicate to Designer</h3>
                  <p className="text-[10px] text-purple-200 font-bold uppercase tracking-widest text-left">
                    {selectedOrder ? `Order #${selectedOrder.id.slice(-6)} • ${selectedOrder.customerInfo.name}` : "Interactive Chat"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDesignMsgSidebarOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/75"
              >
                <Trash2 size={20} className="rotate-45" />
              </button>
            </div>

            {/* Scrollable Chat Feed Area */}
            <div
              id="designer_chat_scroll"
              className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50 text-left"
              style={{ scrollBehavior: 'smooth' }}
            >
              {selectedOrder ? (
                (() => {
                  const msgs = getCombinedMessages('designer');
                  if (msgs.length === 0) {
                    return (
                      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-400">
                        <MessageSquare className="mx-auto mb-2 text-purple-500 opacity-55" size={32} />
                        <p className="text-xs font-bold uppercase tracking-widest mb-1 text-purple-700">Normal Conversation Thread</p>
                        <p className="text-xs max-w-xs leading-relaxed text-gray-400">Initialize design feedback. Updates order in real-time under Design Stage.</p>
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-4">
                      {msgs.map((msg, index) => {
                        const isOM = msg.senderRole === 'order_management';
                        return (
                          <div
                            key={msg.id || index}
                            className={cn(
                              "flex flex-col max-w-[85%] rounded-2xl p-4 shadow-sm relative clear-both my-2",
                              isOM
                                ? "bg-purple-900 text-white ml-auto rounded-tr-none text-right"
                                : "bg-white text-gray-800 mr-auto rounded-tl-none border border-gray-100 text-left"
                            )}
                          >
                            <div className="flex items-center justify-between mb-1 gap-4 text-left">
                              <span className={cn("text-[9px] font-black uppercase tracking-wider", isOM ? "text-purple-300" : "text-purple-700")}>
                                {msg.sender}
                              </span>
                              <span className="text-[8px] opacity-60 font-mono">
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap text-left break-words">{msg.text}</p>

                            {/* Render attachments */}
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-purple-100">
                                {msg.attachments.map((att, i) => (
                                  <div key={i} className="group relative w-12 h-12 rounded border border-gray-100 overflow-hidden bg-gray-50">
                                    <img src={att} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <button
                                        onClick={() => setViewingImage(att)}
                                        className="text-white hover:scale-110 transition-transform"
                                        title="View"
                                      >
                                        <ZoomIn size={12} />
                                      </button>
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
                })()
              ) : (
                <p className="text-center text-xs text-gray-400">Select an order first</p>
              )}
            </div>

            {/* Sidebar Active Inputs Block */}
            <div className="p-4 border-t border-gray-100 bg-white space-y-3 shrink-0">
              <div className="space-y-1 text-left">
                <label className="text-[9px] font-black text-purple-900 uppercase tracking-widest block">Type Brand/Design instructions</label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none text-xs font-medium resize-none shadow-inner"
                  placeholder="Give placement advice, material comments, or feedback text..."
                  value={designMsgRequest.message}
                  onChange={(e) => setDesignMsgRequest(prev => ({ ...prev, message: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendToDesigner();
                    }
                  }}
                />
              </div>

              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Design Files</span>
                  {designMsgRequest.attachments.length > 0 && (
                    <span className="text-[9px] text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                      <Check size={10} /> {designMsgRequest.attachments.length} Ready
                    </span>
                  )}
                </div>

                <FileUpload
                  label="Upload Brand Guidelines / Refs"
                  accept="image/*,.pdf text/plain"
                  onFilesSelected={(files) => setDesignMsgRequest(prev => ({ ...prev, attachments: files }))}
                />
              </div>

              <button
                disabled={isProcessing || !selectedOrder || (!designMsgRequest.message.trim() && designMsgRequest.attachments.length === 0)}
                onClick={sendToDesigner}
                className="w-full py-3.5 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98] transition-transform text-xs"
              >
                {isProcessing ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                <span>Send to Design Team</span>
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
