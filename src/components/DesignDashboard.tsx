/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Palette,
  Search,
  Clock,
  ChevronRight,
  FileText,
  Download,
  CheckCircle,
  AlertCircle,
  User,
  Phone,
  ZoomIn,
  Trash2,
  Paperclip,
  Upload,
  Package,
  Mic,
  MessageSquare,
  Send,
  Eye,
  X,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { Order, OrderStatus } from '../types';
import FileUpload from './FileUpload';
import ImageViewer from './ImageViewer';
import OrderDetailModal from './OrderDetailModal';
import { cn, getDisplayCategory, isOrderSizeValid } from '../lib/utils';
import ConversationDashboard, { Conversation } from './ConversationDashboard';

interface DesignDashboardProps {
  orders: Order[];
  onUpdateOrder: (id: string, updates: Partial<Order>) => Promise<void>;
  user: any;
}

interface ChatMessage {
  id: string;
  sender: string;
  senderRole: string;
  text: string;
  attachments: string[];
  createdAt: number;
}

export default function DesignDashboard({ orders, onUpdateOrder, user }: DesignDashboardProps) {
  // Primary Tabs: 'staff' for Staff/Sales desk pipeline, 'order_management' for Backoffice pipeline
  const [activeChannel, setActiveChannel] = useState<'staff' | 'order_management'>('staff');

  // Subsection filters: 'total', 'hold', 'completed'
  const [selectedSection, setSelectedSection] = useState<'total' | 'hold' | 'completed'>('total');

  // Searching/Filtering
  const [searchTerm, setSearchTerm] = useState('');

  // Selection
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  // Processing States
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStaffChatOpen, setIsStaffChatOpen] = useState(false);
  const [selectedItemIdForStaffChat, setSelectedItemIdForStaffChat] = useState<string | null>(null);

  // Local File Assemble State
  const [designFiles, setDesignFiles] = useState<string[]>([]);
  const [machineFiles, setMachineFiles] = useState<string[]>([]);

  // Local Conversations List (Staff Conversations)
  const [conversations, setConversations] = useState<Conversation[]>([]);

  // Backoffice/OM Chat Integration state for selected order
  const [omMessages, setOmMessages] = useState<ChatMessage[]>([]);
  const [omNewMessage, setOmNewMessage] = useState('');
  const [omNewAttachments, setOmNewAttachments] = useState<string[]>([]);
  const [refreshChatCounter, setRefreshChatCounter] = useState(0);

  // Custom Hold/Return Prompts State
  const [customPrompt, setCustomPrompt] = useState<{
    type: 'return' | 'hold';
    title: string;
    description: string;
    placeholder: string;
    actionLabel: string;
    onHiddenSubmit: (val: string) => Promise<void>;
  } | null>(null);
  const [promptInputValue, setPromptInputValue] = useState('');
  const [promptError, setPromptError] = useState('');

  const designerName = user?.name || 'Arun';

  // Load staff interactions from local storage
  const loadStaffConversations = () => {
    const saved = localStorage.getItem('pallywear_conversations');
    if (saved) {
      try {
        setConversations(JSON.parse(saved));
      } catch (e) {
        setConversations([]);
      }
    } else {
      setConversations([]);
    }
  };

  useEffect(() => {
    loadStaffConversations();
  }, [isStaffChatOpen]);

  // Load Order Management Chats dynamically when an order is opened or counter changes
  useEffect(() => {
    if (selectedOrder && activeChannel === 'order_management') {
      const storageKey = `pallywear_om_chats_designer_${selectedOrder.id}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          setOmMessages(JSON.parse(saved));
        } catch (e) {
          setOmMessages([]);
        }
      } else {
        setOmMessages([]);
      }
    }
  }, [selectedOrder, activeChannel, refreshChatCounter]);

  // Assist sorting / parsing designer name rules
  const isAssignedToOther = (assigned: string) => {
    if (!assigned) return false;
    const clean = assigned.trim().toLowerCase();
    if (
      clean === 'unassigned' ||
      clean === 'designer assigned' ||
      clean === '' ||
      clean.includes('staff') ||
      clean.includes('admin') ||
      clean.includes('accounts') ||
      clean.includes('order') ||
      clean.includes('production') ||
      clean.includes('delivery')
    ) {
      return false;
    }
    return !clean.includes(designerName.toLowerCase()) && !designerName.toLowerCase().includes(clean);
  };

  // 1. Process Order and Conversation Items for STAFF CHANNEL
  const staffOrderItems = orders
    .filter(o => {
      // Show orders currently in design or hold stage, where they originated from Staff desk
      // and aren't locked to other designers.
      return (o.status === OrderStatus.DESIGN || o.status === OrderStatus.HOLD) && !isAssignedToOther(o.assignedDesigner || '');
    })
    .map(o => {
      let isCompleted = false;
      // If order is beyond Design phase and has design files or was finished, mark as completed
      if (![OrderStatus.DRAFT, OrderStatus.PENDING, OrderStatus.ACCOUNTS, OrderStatus.DESIGN, OrderStatus.HOLD].includes(o.status)) {
        isCompleted = true;
      }

      return {
        id: o.id,
        isOrder: true,
        customerName: o.customerInfo.name,
        phone: o.customerInfo.phone,
        category: o.category,
        quantity: o.quantity,
        notes: o.notes || 'No notes',
        isUrgent: o.isUrgent || false,
        assignedDesigner: o.assignedDesigner || 'Unassigned',
        status: o.status,
        isHold: o.status === OrderStatus.HOLD,
        isCompleted: isCompleted,
        createdAt: o.createdAt,
        staffImages: o.staffImages || [],
        staffPdfs: o.staffPdfs || []
      };
    });

  // Pure consultation chats from staff interactions
  const staffConsultationItems = conversations
    .filter(c => !orders.some(o => o.id === c.id))
    .map(c => {
      const isCompleted = !!c.replies && c.replies.length > 0;
      return {
        id: c.id,
        isOrder: false,
        customerName: c.customerName,
        phone: 'Staff Consultation',
        category: 'Art Consult',
        quantity: 0,
        notes: c.message,
        isUrgent: false,
        assignedDesigner: c.staffName || 'Unassigned',
        status: isCompleted ? OrderStatus.ORDER_MANAGEMENT : OrderStatus.DESIGN, // simulate pipeline
        isHold: false,
        isCompleted: isCompleted,
        createdAt: c.createdAt,
        staffImages: c.imageAttachments || [],
        staffPdfs: c.pdfAttachments || []
      };
    });

  const staffCombinedList = [...staffOrderItems, ...staffConsultationItems];

  // 2. Process Items for ORDER MANAGEMENT CHANNEL
  // Orders in Backoffice QC / OM Pipeline
  const omOrderItems = orders
    .filter(o => {
      // Either currently in DESIGN / HOLD phase, or previously processed by designer
      return !isAssignedToOther(o.assignedDesigner || '');
    })
    .map(o => {
      const chatKey = `pallywear_om_chats_designer_${o.id}`;
      const hasOmChat = !!localStorage.getItem(chatKey);

      const isCompleted = ![OrderStatus.DRAFT, OrderStatus.PENDING, OrderStatus.ACCOUNTS, OrderStatus.DESIGN, OrderStatus.HOLD].includes(o.status);
      const isHold = o.status === OrderStatus.HOLD;

      return {
        id: o.id,
        isOrder: true,
        customerName: o.customerInfo.name,
        phone: o.customerInfo.phone,
        category: o.category,
        quantity: o.quantity,
        notes: o.notes || 'No notes',
        isUrgent: o.isUrgent || false,
        assignedDesigner: o.assignedDesigner || 'Unassigned',
        status: o.status,
        isHold: isHold,
        isCompleted: isCompleted,
        createdAt: o.createdAt,
        hasOmChat: hasOmChat,
        staffImages: o.staffImages || [],
        staffPdfs: o.staffPdfs || []
      };
    });

  // Filter lists based on primary tab and subsection
  const getFilteredItems = () => {
    let baseList = activeChannel === 'staff' ? staffCombinedList : omOrderItems;

    // Filter by subsection
    if (selectedSection === 'hold') {
      baseList = baseList.filter(item => item.isHold);
    } else if (selectedSection === 'completed') {
      baseList = baseList.filter(item => item.isCompleted);
    } else {
      // Total (Active & Pending)
      baseList = baseList.filter(item => !item.isCompleted);
    }

    // Search term matching
    return baseList.filter(item =>
      item.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Get counters for high-level buttons
  const getChannelStats = (channel: 'staff' | 'order_management') => {
    const baseList = channel === 'staff' ? staffCombinedList : omOrderItems;
    const totalCount = baseList.filter(item => !item.isCompleted).length;
    const holdCount = baseList.filter(item => item.isHold).length;
    const completedCount = baseList.filter(item => item.isCompleted).length;

    return { totalCount, holdCount, completedCount };
  };

  const handleClaimItem = async (item: any) => {
    setIsProcessing(true);
    try {
      if (item.isOrder) {
        await onUpdateOrder(item.id, {
          assignedDesigner: designerName,
          updatedAt: Date.now()
        });
        alert(`Success: Order #${item.id.slice(-8)} successfully assigned to you!`);
        const fullOrder = orders.find(o => o.id === item.id);
        if (fullOrder) {
          setSelectedOrder(fullOrder);
          // Initialize file arrays
          setDesignFiles(fullOrder.designAttachments || []);
          setMachineFiles(fullOrder.machineFiles || []);
        }
      } else {
        // Pure Consultation
        const saved = localStorage.getItem('pallywear_conversations') || '[]';
        let currentConvs: Conversation[] = [];
        try {
          currentConvs = JSON.parse(saved);
        } catch (e) { }

        const updated = currentConvs.map(c => {
          if (c.id === item.id) {
            return { ...c, staffName: designerName };
          }
          return c;
        });

        localStorage.setItem('pallywear_conversations', JSON.stringify(updated));
        loadStaffConversations();
        setSelectedItemIdForStaffChat(item.id);
        alert(`Success: Consultation claimed by you! Opening Staff dialogue panel...`);
        setIsStaffChatOpen(true);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to claim design item.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenWorkspace = (item: any) => {
    if (item.isOrder) {
      const fullOrder = orders.find(o => o.id === item.id);
      if (fullOrder) {
        setSelectedOrder(fullOrder);
        setDesignFiles(fullOrder.designAttachments || []);
        setMachineFiles(fullOrder.machineFiles || []);
      }
    } else {
      setSelectedItemIdForStaffChat(item.id);
      setIsStaffChatOpen(true);
    }
  };

  const handleSendToOrderManagement = async () => {
    if (!selectedOrder || isProcessing) return;

    const nextOrderState = {
      ...selectedOrder,
      designAttachments: designFiles,
      machineFiles: machineFiles
    };

    if (!isOrderSizeValid(nextOrderState)) {
      alert("Error: Total order data limit exceeded (Max 1MB). Please use fewer design files or smaller images.");
      return;
    }

    setIsProcessing(true);
    try {
      await onUpdateOrder(selectedOrder.id, {
        status: OrderStatus.ORDER_MANAGEMENT,
        designAttachments: designFiles,
        machineFiles: machineFiles,
        updatedAt: Date.now()
      });
      setSelectedOrder(null);
      setDesignFiles([]);
      setMachineFiles([]);
      alert("Success: Artwork output submitted and order sent to Order Management.");
    } catch (e) {
      console.error(e);
      alert("An error occurred while moving the order.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReturnToCreator = () => {
    if (!selectedOrder || isProcessing) return;

    setPromptInputValue('');
    setPromptError('');
    setCustomPrompt({
      type: 'return',
      title: 'Move Back to Staff/Sales',
      description: 'Explain why you are moving this design back to the Sales/Staff creator (e.g. invalid logo files, size specification contradiction):',
      placeholder: 'Enter return reason details here...',
      actionLabel: 'Return to Staff',
      onHiddenSubmit: async (reason) => {
        setIsProcessing(true);
        try {
          const newNote = `[REWORK RETURNED BY DESIGNER] ${new Date().toLocaleString()}: ${reason.trim()}`;
          const updatedNotes = selectedOrder.notes ? `${selectedOrder.notes}\n\n${newNote}` : newNote;

          await onUpdateOrder(selectedOrder.id, {
            status: OrderStatus.PENDING,
            notes: updatedNotes,
            updatedAt: Date.now()
          });
          setSelectedOrder(null);
          setCustomPrompt(null);
          alert("Order returned to Staff successfully.");
        } catch (e) {
          console.error(e);
          setPromptError("Database update failed. Please try again.");
        } finally {
          setIsProcessing(false);
        }
      }
    });
  };

  const handlePutOnHold = async () => {
    if (!selectedOrder || isProcessing) return;

    if (selectedOrder.status === OrderStatus.HOLD) {
      // Resume design work directly
      setIsProcessing(true);
      try {
        await onUpdateOrder(selectedOrder.id, {
          status: OrderStatus.DESIGN,
          previousStatus: undefined,
          holdReason: undefined,
          updatedAt: Date.now()
        });

        // Update local state instant view
        setSelectedOrder(prev => prev ? { ...prev, status: OrderStatus.DESIGN, holdReason: undefined } : null);
        alert("Design work is now active again.");
      } catch (e) {
        console.error(e);
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    setPromptInputValue('');
    setPromptError('');
    setCustomPrompt({
      type: 'hold',
      title: 'Place Design on Hold',
      description: 'Provide an active reason for placing this design on Hold:',
      placeholder: 'Enter hold reason (e.g. pending customer logo vector format, pending color swatch decision)...',
      actionLabel: 'Place on Hold',
      onHiddenSubmit: async (reason) => {
        setIsProcessing(true);
        try {
          const newNote = `[DESIGN PIPELINE ON HOLD] ${new Date().toLocaleString()}: ${reason.trim()}`;
          const updatedNotes = selectedOrder.notes ? `${selectedOrder.notes}\n\n${newNote}` : newNote;

          await onUpdateOrder(selectedOrder.id, {
            status: OrderStatus.HOLD,
            previousStatus: OrderStatus.DESIGN,
            holdReason: reason.trim(),
            notes: updatedNotes,
            updatedAt: Date.now()
          });
          setSelectedOrder(null);
          setCustomPrompt(null);
          alert("Design artwork successfully put on hold.");
        } catch (e) {
          console.error(e);
          setPromptError("Database update failed. Please try again.");
        } finally {
          setIsProcessing(false);
        }
      }
    });
  };

  const handleSendOmChatMessage = async () => {
    if (!selectedOrder || (!omNewMessage.trim() && omNewAttachments.length === 0)) return;

    const timestamp = Date.now();
    const cleanMsg = omNewMessage.trim();

    const newChatMsg: ChatMessage = {
      id: `des_msg_${timestamp}`,
      sender: `Designer (${designerName})`,
      senderRole: 'designer',
      text: cleanMsg || `Uploaded ${omNewAttachments.length} reference file(s)`,
      attachments: omNewAttachments,
      createdAt: timestamp
    };

    // Construct local additions
    const storageKey = `pallywear_om_chats_designer_${selectedOrder.id}`;
    const nextMsgs = [...omMessages, newChatMsg];
    localStorage.setItem(storageKey, JSON.stringify(nextMsgs));

    // Also update order logs
    const appendNote = `[DESIGNER CHAT] ${new Date(timestamp).toLocaleString()}: ${cleanMsg}`;
    const nextNotes = selectedOrder.notes ? `${selectedOrder.notes}\n\n${appendNote}` : appendNote;

    try {
      await onUpdateOrder(selectedOrder.id, {
        notes: nextNotes,
        staffImages: [...(selectedOrder.staffImages || []), ...omNewAttachments],
        updatedAt: timestamp
      });

      setOmMessages(nextMsgs);
      setOmNewMessage('');
      setOmNewAttachments([]);
      setRefreshChatCounter(prev => prev + 1);
    } catch (e) {
      console.error(e);
      alert("Failed to deliver chat message.");
    }
  };

  const handleRemoveFile = (index: number, type: 'design' | 'machine') => {
    if (type === 'design') {
      setDesignFiles(prev => prev.filter((_, i) => i !== index));
    } else {
      setMachineFiles(prev => prev.filter((_, i) => i !== index));
    }
  };

  const activeStats = getChannelStats(activeChannel);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header section with synchronized database updates */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Palette className="text-brand-primary" size={28} />
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Artwork & Design Studio</h2>
          </div>
          <p className="text-gray-500 mt-1">Manage physical vector traces, machine language digitizing files, and team conversations</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border-none"
            title="Reload State"
          >
            <RefreshCw size={14} className="animate-spin" />
            Reload Database
          </button>
          <div className="px-4 py-2 bg-purple-50 text-purple-700 rounded-xl border border-purple-100 italic text-xs font-bold">
            🔒 Designer Account: {designerName}
          </div>
        </div>
      </div>

      {/* Primary Communication Channel Navigations */}
      <div className="flex border-b border-gray-150 gap-4">
        <button
          onClick={() => {
            setActiveChannel('staff');
            setSelectedSection('total');
          }}
          className={cn(
            "pb-4 text-sm font-black transition-all relative flex items-center gap-2 cursor-pointer border-none bg-transparent",
            activeChannel === 'staff' ? "text-brand-primary" : "text-gray-400 hover:text-gray-700"
          )}
        >
          <MessageSquare size={18} />
          <span>1. Staff Conversation & Sales Desk</span>
          {activeChannel === 'staff' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand-primary rounded-t-full" />
          )}
        </button>

        <button
          onClick={() => {
            setActiveChannel('order_management');
            setSelectedSection('total');
          }}
          className={cn(
            "pb-4 text-sm font-black transition-all relative flex items-center gap-2 cursor-pointer border-none bg-transparent",
            activeChannel === 'order_management' ? "text-brand-primary" : "text-gray-400 hover:text-gray-700"
          )}
        >
          <FolderOpen size={18} />
          <span>2. Order Management Pipeline</span>
          {activeChannel === 'order_management' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand-primary rounded-t-full" />
          )}
        </button>
      </div>

      {/* Summary Columns Counters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card: Total */}
        <button
          onClick={() => setSelectedSection('total')}
          className={cn(
            "p-6 rounded-2xl border transition-all text-left flex items-center gap-4 group cursor-pointer border-dashed",
            selectedSection === 'total'
              ? "bg-black text-white border-black shadow-lg"
              : "bg-white border-gray-200 hover:border-gray-400 shadow-sm"
          )}
        >
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center shadow-inner transition-colors",
            selectedSection === 'total' ? "bg-white/10 text-white" : "bg-gray-100 text-gray-700"
          )}>
            <Package size={24} />
          </div>
          <div>
            <p className={cn("text-[10px] font-black uppercase tracking-widest", selectedSection === 'total' ? "text-white/70" : "text-gray-500")}>
              Total / Active Designs
            </p>
            <p className="text-2xl font-black mt-0.5">{activeStats.totalCount}</p>
            <span className={cn("text-[9px] font-semibold block mt-0.5", selectedSection === 'total' ? "text-white/60" : "text-gray-400")}>
              Active requests needing output
            </span>
          </div>
        </button>

        {/* Card: Hold */}
        <button
          onClick={() => setSelectedSection('hold')}
          className={cn(
            "p-6 rounded-2xl border transition-all text-left flex items-center gap-4 group cursor-pointer border-dashed",
            selectedSection === 'hold'
              ? "bg-red-600 text-white border-red-600 shadow-lg"
              : "bg-white border-gray-200 hover:border-red-400 shadow-sm"
          )}
        >
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center shadow-inner transition-colors",
            selectedSection === 'hold' ? "bg-white/10 text-white" : "bg-red-50 text-red-600"
          )}>
            <Clock size={24} />
          </div>
          <div>
            <p className={cn("text-[10px] font-black uppercase tracking-widest", selectedSection === 'hold' ? "text-white/70" : "text-gray-500")}>
              On Hold Designs
            </p>
            <p className="text-2xl font-black mt-0.5">{activeStats.holdCount}</p>
            <span className={cn("text-[9px] font-semibold block mt-0.5", selectedSection === 'hold' ? "text-white/60" : "text-gray-400")}>
              Blocked pending verification
            </span>
          </div>
        </button>

        {/* Card: Completed */}
        <button
          onClick={() => setSelectedSection('completed')}
          className={cn(
            "p-6 rounded-2xl border transition-all text-left flex items-center gap-4 group cursor-pointer border-dashed",
            selectedSection === 'completed'
              ? "bg-green-600 text-white border-green-600 shadow-lg"
              : "bg-white border-gray-200 hover:border-green-400 shadow-sm"
          )}
        >
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center shadow-inner transition-colors",
            selectedSection === 'completed' ? "bg-white/10 text-white" : "bg-green-50 text-green-600"
          )}>
            <CheckCircle size={24} />
          </div>
          <div>
            <p className={cn("text-[10px] font-black uppercase tracking-widest", selectedSection === 'completed' ? "text-white/70" : "text-gray-500")}>
              Completed Designs
            </p>
            <p className="text-2xl font-black mt-0.5">{activeStats.completedCount}</p>
            <span className={cn("text-[9px] font-semibold block mt-0.5", selectedSection === 'completed' ? "text-white/60" : "text-gray-400")}>
              Traces and machine files delivered
            </span>
          </div>
        </button>
      </div>

      {/* Main List Workspace Container */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Search header panel */}
        <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50">
          <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-3 py-2 w-full max-w-md shadow-sm">
            <Search className="text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by customer name, id, or specs..."
              className="bg-transparent border-none outline-none text-sm w-full font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && <X size={14} className="text-gray-400 cursor-pointer" onClick={() => setSearchTerm('')} />}
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest bg-brand-secondary text-brand-primary px-3 py-1.5 rounded-full border border-brand-primary/10 w-fit">
            Channel: {activeChannel === 'staff' ? 'Staff Desk Inquiry' : 'Order Backoffice'} ➜ Sub: {selectedSection.toUpperCase()}
          </span>
        </div>

        {/* Data list grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50/70 border-b border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400">
              <tr>
                <th className="px-6 py-4">Descriptor Code</th>
                <th className="px-6 py-4">Client Detail</th>
                <th className="px-6 py-4">Design Requirement & Category</th>
                <th className="px-6 py-4 text-center">Assigned Handler</th>
                <th className="px-6 py-4 text-right">Action override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {getFilteredItems().length > 0 ? (
                getFilteredItems().map(item => {
                  const isClaimedByMe = item.assignedDesigner.toLowerCase().includes(designerName.toLowerCase());
                  const isUnclaimed = !item.assignedDesigner ||
                    item.assignedDesigner === 'Unassigned' ||
                    item.assignedDesigner === 'Designer assigned' ||
                    item.assignedDesigner === '';

                  return (
                    <tr key={item.id} className="hover:bg-gray-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-mono text-xs font-black text-brand-primary">
                            #{item.id.slice(-8)}
                          </span>
                          <span className="text-[9px] text-gray-400 font-bold">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-black text-gray-800 text-sm flex items-center gap-1.5">
                            {item.customerName}
                            {item.isUrgent && (
                              <span className="bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded animate-pulse tracking-wide uppercase">URGENT</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 font-semibold">{item.phone}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 max-w-sm">
                          <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-[10px] font-black uppercase tracking-tight w-fit border border-purple-150">
                            {getDisplayCategory(item as any)}
                          </span>
                          <span className="text-xs text-gray-600 font-medium truncate block max-w-xs">
                            {item.notes}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div>
                          {isUnclaimed ? (
                            <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded text-[9.5px] font-black uppercase tracking-widest border border-amber-200">
                              ⚠️ Unclaimed / Open
                            </span>
                          ) : (
                            <span className={cn(
                              "px-2 py-1 rounded text-[9.5px] font-black uppercase tracking-widest border",
                              isClaimedByMe ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-50 text-slate-600 border-slate-200"
                            )}>
                              {isClaimedByMe ? "🔒 Assigned to You" : `🔒 ${item.assignedDesigner}`}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {item.isCompleted ? (
                          <div className="flex items-center justify-end gap-2 text-xs">
                            <span className="text-[10px] text-green-700 bg-green-50 font-black uppercase px-2 py-1 rounded-lg border border-green-200">
                              Completed ✔
                            </span>
                            <button
                              onClick={() => handleOpenWorkspace(item)}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-black uppercase transition-all"
                            >
                              Review Assets
                            </button>
                          </div>
                        ) : isUnclaimed ? (
                          <button
                            disabled={isProcessing}
                            onClick={() => handleClaimItem(item)}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-black uppercase tracking-wider transition-all scale-100 hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5 shadow cursor-pointer border-none"
                          >
                            Claim / Take Design
                          </button>
                        ) : isClaimedByMe ? (
                          <button
                            onClick={() => handleOpenWorkspace(item)}
                            className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ml-auto cursor-pointer border-none shadow-sm"
                          >
                            Open Workspace
                            <ChevronRight size={14} />
                          </button>
                        ) : (
                          <span className="text-[10px] text-gray-400 font-bold uppercase italic pr-4">Claimed by partner</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-gray-400 italic font-medium">
                    All clear! No pending design assets found in this pipeline state.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Staff Chats Embedded Modal / Conversation Side-Drawer */}
      <ConversationDashboard
        isOpen={isStaffChatOpen}
        onClose={() => {
          setIsStaffChatOpen(false);
          setSelectedItemIdForStaffChat(null);
        }}
        currentUser={user || { name: designerName, role: 'designer' }}
        orders={orders}
        onUpdateOrder={onUpdateOrder}
        initialSelectedId={selectedItemIdForStaffChat}
      />

      {/* High-Fidelity Interactive Workspace Modal for Selected Order */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col"
          >
            {/* Modal header */}
            <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
              <div>
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                  <Palette size={20} className="text-purple-600 animate-pulse" />
                  Art Workspace
                </h3>
                <p className="text-xs text-gray-500 font-bold uppercase tabular-nums">Pipeline Order #{selectedOrder.id}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedOrder(null);
                  setDesignFiles([]);
                  setMachineFiles([]);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors border-none bg-transparent cursor-pointer"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {/* Hold Alert Notification Banner */}
              {selectedOrder.status === OrderStatus.HOLD && (
                <div className="bg-red-50 border border-red-200 p-5 rounded-2xl flex items-start gap-4 text-left">
                  <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={24} />
                  <div>
                    <h5 className="text-sm font-black text-red-900 uppercase italic">Artwork Production is Currently Blocked (On Hold)</h5>
                    <p className="text-xs text-red-700 font-semibold mt-1">Stated Impediment: "{selectedOrder.holdReason || 'No details provided'}"</p>
                    <p className="text-[10px] text-red-500 font-bold mt-1">Use the "Resume Active Work" button in the action footer to lift holds and upload vector outputs.</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Customer Details, Sizing Breakdown, Reference Attachments */}
                <div className="lg:col-span-6 space-y-6">
                  {/* Customer Spec Card */}
                  <section className="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-4">
                    <h4 className="text-[10.5px] font-black text-brand-primary uppercase tracking-widest flex items-center gap-1.5 border-b border-gray-200 pb-2">
                      <User size={13} />
                      Customer Requirements Spec
                    </h4>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-brand-primary text-white rounded-full flex items-center justify-center font-black text-sm shadow-sm">
                        {selectedOrder.customerInfo.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{selectedOrder.customerInfo.name}</p>
                        <p className="text-xs text-gray-500">{selectedOrder.customerInfo.phone}</p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Specifications Checklist</p>
                      <p className="text-xs font-semibold text-gray-700 leading-relaxed bg-white p-3 rounded-lg border border-gray-100 italic">
                        "{selectedOrder.notes || 'No notes specified.'}"
                      </p>
                    </div>

                    {/* Sizing & model specs */}
                    {selectedOrder.sizeBreakdown && selectedOrder.sizeBreakdown.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Model Dimensions & Colors</p>
                        <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1 text-xs">
                          {selectedOrder.sizeBreakdown.map((item, i) => (
                            <div key={i} className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-gray-150">
                              <div>
                                <span className="font-bold text-gray-950 pr-2">{item.size}</span>
                                <span className="text-gray-500 font-medium">{item.colour || 'Default'}</span>
                              </div>
                              <span className="font-black italic text-brand-primary">Qty x {item.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </section>

                  {/* Reference Attachments from Sales Desk */}
                  <section className="space-y-3">
                    <h4 className="text-[10.5px] font-black text-brand-primary uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-gray-105">
                      <Paperclip size={13} />
                      Sales Reference Attachments ({[...(selectedOrder.staffImages || []), ...(selectedOrder.staffPdfs || [])].length})
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[...(selectedOrder.staffImages || []), ...(selectedOrder.staffPdfs || [])].map((file, i) => {
                        const isAudio = file.startsWith('data:audio/');
                        return (
                          <div key={i} className="flex flex-col gap-2 p-2 bg-gray-50 rounded-2xl border border-gray-100 group relative">
                            <div className="aspect-square rounded-xl overflow-hidden relative bg-white flex items-center justify-center border border-gray-150">
                              {file.startsWith('data:image/') ? (
                                <img src={file} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : isAudio ? (
                                <div className="flex flex-col items-center gap-2 text-purple-600">
                                  <Mic size={28} />
                                  <span className="text-[8px] font-black uppercase">Voice spec</span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-2 text-red-500">
                                  <FileText size={28} />
                                  <span className="text-[8px] font-black uppercase">PDF Specification</span>
                                </div>
                              )}

                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                                {file.startsWith('data:image/') && (
                                  <button
                                    onClick={() => setViewingImage(file)}
                                    className="p-1.5 bg-white/20 hover:bg-white/40 rounded-full text-white transition-all border-none cursor-pointer"
                                  >
                                    <ZoomIn size={14} />
                                  </button>
                                )}
                                <a
                                  href={file}
                                  download={`Ref_Spec_${i + 1}_Order_${selectedOrder.id.slice(-6)}`}
                                  className="p-1.5 bg-white/20 hover:bg-white/40 rounded-full text-white transition-all cursor-pointer"
                                >
                                  <Download size={14} />
                                </a>
                              </div>
                            </div>
                            {(isAudio || file.includes('audio/')) && (
                              <audio controls className="w-full h-5 scale-90 mt-1">
                                <source src={file} />
                              </audio>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </div>

                {/* Right Column: Interaction Hub (Staff vs Order Management Conversational Chat) */}
                <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
                  {/* Vector/Machine Language File Assembly Desk */}
                  <div className="bg-purple-50/40 p-5 rounded-2xl border border-purple-100 space-y-5">
                    <h4 className="text-[11px] font-black text-purple-900 uppercase tracking-wider flex items-center gap-2">
                      <Upload size={14} />
                      Outputs Upload Bench (PDF / machine code)
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Upload 1: Artwork Graphics */}
                      <div className="space-y-2 bg-white p-3.5 rounded-lg border border-purple-100">
                        <p className="text-[9.5px] font-black text-gray-500 uppercase tracking-tight">1. Vector Tracing Output (PDF)</p>
                        <FileUpload
                          label=""
                          accept=".pdf,image/*"
                          onFilesSelected={(files) => setDesignFiles(prev => [...prev, ...files])}
                        />
                        <div className="max-h-[80px] overflow-y-auto space-y-1 mt-2">
                          {designFiles.map((file, i) => (
                            <div key={i} className="flex justify-between items-center text-[10px] bg-slate-50 p-1.5 rounded border border-slate-200">
                              <span className="truncate max-w-[120px] font-mono">Art_{i + 1}.pdf</span>
                              <button
                                onClick={() => handleRemoveFile(i, 'design')}
                                className="text-red-500 hover:text-red-700 bg-transparent border-none cursor-pointer"
                              >
                                Delete
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Upload 2: DST/Embroidery files */}
                      <div className="space-y-2 bg-white p-3.5 rounded-lg border border-purple-100">
                        <p className="text-[9.5px] font-black text-gray-500 uppercase tracking-tight">2. Machine Embroidery Files (DST)</p>
                        <FileUpload
                          label=""
                          accept=".dst,.pes,.jef,.exp,.hus,.emb"
                          onFilesSelected={(files) => setMachineFiles(prev => [...prev, ...files])}
                        />
                        <div className="max-h-[80px] overflow-y-auto space-y-1 mt-2">
                          {machineFiles.map((file, i) => (
                            <div key={i} className="flex justify-between items-center text-[10px] bg-slate-50 p-1.5 rounded border border-slate-200">
                              <span className="truncate max-w-[120px] font-mono">Digi_{i + 1}.dst</span>
                              <button
                                onClick={() => handleRemoveFile(i, 'machine')}
                                className="text-red-500 hover:text-red-700 bg-transparent border-none cursor-pointer"
                              >
                                Delete
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Chat Panel Interface based on selected channel */}
                  <div className="bg-gray-50 rounded-2xl border border-gray-150 p-4 shrink-0 flex flex-col gap-3 min-h-[290px] justify-between">
                    <div>
                      <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                          <MessageSquare size={12} />
                          {activeChannel === 'staff' ? 'Staff Desk Communication Log' : 'Backoffice Coordinator Chat'}
                        </span>
                        <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      </div>

                      {/* Actual Chat Logs Render */}
                      {activeChannel === 'staff' ? (
                        <div className="text-center py-6 text-xs text-gray-400 space-y-2">
                          <p className="font-semibold text-gray-500">Sales/Staff Dialogues have a dedicated workspace panel</p>
                          <button
                            onClick={() => {
                              setSelectedItemIdForStaffChat(selectedOrder.id);
                              setIsStaffChatOpen(true);
                            }}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[10px] font-extrabold uppercase transition-all shadow-sm cursor-pointer border-none"
                          >
                            Launch Sales Dialogues
                          </button>
                        </div>
                      ) : (
                        // Order Management Live Channel
                        <div className="space-y-3">
                          <div className="max-h-[180px] overflow-y-auto space-y-2.5 pr-1 custom-scrollbar text-xs">
                            {omMessages.length === 0 ? (
                              <p className="italic text-gray-400 text-center py-4">No back-and-forth messages with Backoffice coordinates yet.</p>
                            ) : (
                              omMessages.map((msg, idx) => {
                                const isDesigner = msg.senderRole === 'designer';
                                return (
                                  <div key={idx} className={cn(
                                    "p-3 rounded-2xl max-w-[85%] space-y-1 block text-left",
                                    isDesigner ? "bg-black text-white ml-auto" : "bg-gray-200 text-gray-900 mr-auto"
                                  )}>
                                    <p className="text-[9px] font-black opacity-60 uppercase">{msg.sender}</p>
                                    <p className="font-medium text-xs leading-relaxed">{msg.text}</p>
                                    {msg.attachments && msg.attachments.map((att, i) => (
                                      <div key={i} className="flex items-center gap-1.5 mt-1 bg-white/10 p-1.5 rounded-lg">
                                        <Paperclip size={10} />
                                        <span className="text-[9px] truncate max-w-[130px]">Reference File</span>
                                      </div>
                                    ))}
                                  </div>
                                );
                              })
                            )}
                          </div>

                          {/* Message Trigger Form */}
                          <div className="flex gap-2 border-t border-gray-200 pt-3">
                            <input
                              type="text"
                              placeholder="Send re-work details to Manager..."
                              className="flex-1 text-xs bg-white border border-gray-200 rounded-xl px-3 outline-none text-gray-800 font-medium"
                              value={omNewMessage}
                              onChange={(e) => setOmNewMessage(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSendOmChatMessage();
                              }}
                            />
                            <button
                              onClick={handleSendOmChatMessage}
                              className="h-9 w-9 bg-black text-white flex items-center justify-center rounded-xl hover:bg-gray-800 transition-all cursor-pointer border-none"
                            >
                              <Send size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal actions footer */}
            <div className="p-8 border-t border-gray-100 flex flex-col sm:flex-row gap-4 shrink-0 bg-gray-50/50">
              {/* Hold / Resume buttons */}
              {selectedOrder.status === OrderStatus.HOLD ? (
                <button
                  disabled={isProcessing}
                  onClick={handlePutOnHold}
                  className="px-6 py-4 bg-green-100 hover:bg-green-200 text-green-800 rounded-2xl font-black uppercase text-xs tracking-wider transition-all scale-100 hover:scale-[1.02] border-none flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle size={15} />
                  Resume Active Work
                </button>
              ) : (
                <button
                  disabled={isProcessing}
                  onClick={handlePutOnHold}
                  className="px-6 py-4 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl font-black uppercase text-xs tracking-wider transition-all scale-100 hover:scale-[1.02] border-none flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Clock size={15} />
                  Request Design Hold
                </button>
              )}

              <button
                disabled={isProcessing || selectedOrder.status === OrderStatus.HOLD}
                onClick={handleReturnToCreator}
                className="px-6 py-4 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-2xl font-black uppercase text-xs tracking-wider transition-all scale-100 hover:scale-[1.02] border-none flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <ArrowLeftIcon size={15} />
                Return to Sales/Staff
              </button>

              {/* Primary Move forward command */}
              <button
                disabled={isProcessing || selectedOrder.status === OrderStatus.HOLD || (designFiles.length === 0 && machineFiles.length === 0)}
                onClick={handleSendToOrderManagement}
                className="flex-1 py-4 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-2xl font-black uppercase text-xs tracking-wider transition-all scale-100 hover:scale-[1.01] active:scale-95 shadow-lg border-none flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? 'Processing files...' : 'Finish & Send to Order Management'}
                <CheckCircle size={15} />
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Global Image Viewer Modal */}
      {viewingImage && (
        <ImageViewer
          src={viewingImage}
          onClose={() => setViewingImage(null)}
          fileName="Reference_Trace"
        />
      )}

      {/* Custom dialog prompts for Return or Hold reasons */}
      <AnimatePresence>
        {customPrompt && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-55 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden p-6 text-left border border-gray-100"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                  <AlertCircle className="text-amber-500" size={18} />
                  {customPrompt.title}
                </h4>
                <button
                  onClick={() => setCustomPrompt(null)}
                  className="p-1.5 hover:bg-gray-100 rounded-full border-none bg-transparent cursor-pointer"
                >
                  <X size={16} className="text-gray-400" />
                </button>
              </div>

              <p className="text-xs text-gray-600 font-semibold mb-4 leading-relaxed">
                {customPrompt.description}
              </p>

              <div className="space-y-4">
                <textarea
                  className="w-full text-xs p-3 border border-gray-200 outline-none rounded-xl bg-gray-50 focus:bg-white resize-none h-24 text-gray-800 font-semibold leading-relaxed"
                  placeholder={customPrompt.placeholder}
                  value={promptInputValue}
                  onChange={(e) => setPromptInputValue(e.target.value)}
                />

                {promptError && (
                  <p className="text-[10px] text-red-500 font-extrabold">{promptError}</p>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => setCustomPrompt(null)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-black rounded-lg text-[10px] uppercase border-none cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={isProcessing || !promptInputValue.trim()}
                    onClick={() => {
                      if (!promptInputValue.trim()) {
                        setPromptError("Please write something to confirm.");
                        return;
                      }
                      customPrompt.onHiddenSubmit(promptInputValue);
                    }}
                    className="px-4 py-2 bg-black hover:bg-gray-800 text-white font-black rounded-lg text-[10px] uppercase border-none cursor-pointer disabled:opacity-50"
                  >
                    {customPrompt.actionLabel}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Custom simple arrow icons needed if ArrowLeft is missing or has a duplicate name
function ArrowLeftIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}
