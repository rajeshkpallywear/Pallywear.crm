/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
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
  MessageSquare
} from 'lucide-react';
import { Order, OrderStatus } from '../types';
import FileUpload from './FileUpload';
import ImageViewer from './ImageViewer';
import OrderDetailModal from './OrderDetailModal';
import { cn, getDisplayCategory, isOrderSizeValid } from '../lib/utils';
import ConversationDashboard from './ConversationDashboard';

interface DesignDashboardProps {
  orders: Order[];
  onUpdateOrder: (id: string, updates: Partial<Order>) => Promise<void>;
  user: any;
}

export default function DesignDashboard({ orders, onUpdateOrder, user }: DesignDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'pending' | 'all'>('pending');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConversationOpen, setIsConversationOpen] = useState(false);
  const [designFiles, setDesignFiles] = useState<string[]>([]);
  const [machineFiles, setMachineFiles] = useState<string[]>([]);

  useEffect(() => {
    const handleOpenFeed = () => {
      setIsConversationOpen(true);
    };
    window.addEventListener('open-conversations-feed', handleOpenFeed);
    return () => {
      window.removeEventListener('open-conversations-feed', handleOpenFeed);
    };
  }, []);

  const [customPrompt, setCustomPrompt] = useState<{
    type: 'return' | 'hold';
    title: string;
    description: string;
    placeholder: string;
    actionLabel: string;
    onConfirm: (val: string) => Promise<void>;
  } | null>(null);
  const [promptValue, setPromptValue] = useState('');
  const [promptError, setPromptError] = useState('');

  const designOrders = orders.filter(o => o.status === OrderStatus.DESIGN || (o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.DESIGN));

  const filteredOrders = designOrders.filter(o =>
    o.customerInfo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.id.includes(searchTerm)
  );

  const handleProcessOrder = async () => {
    if (!selectedOrder || isProcessing) return;

    // Check size estimation of the update result
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
      alert("Success: Design files uploaded and moved to Order Management.");
    } catch (e: any) {
      console.error(e);
      alert("An error occurred while moving the order.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMoveToCreator = () => {
    if (!selectedOrder || isProcessing) return;

    setPromptValue('');
    setPromptError('');
    setCustomPrompt({
      type: 'return',
      title: 'Move Back to Order Creator',
      description: 'Please specify the reason for moving this order back to the order creator:',
      placeholder: 'Enter reason here (e.g. Design specification unclear, require original assets)...',
      actionLabel: 'Move to Creator',
      onConfirm: async (reason) => {
        setIsProcessing(true);
        try {
          const newNote = `[RETURNED] ${new Date().toLocaleString()}: ${reason.trim()}`;
          const updatedNotes = selectedOrder.notes ? `${selectedOrder.notes}\n${newNote}` : newNote;

          await onUpdateOrder(selectedOrder.id, {
            status: OrderStatus.PENDING,
            notes: updatedNotes,
            updatedAt: Date.now()
          });
          setSelectedOrder(null);
          setCustomPrompt(null);
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
      // Resume design work directly without prompts
      setIsProcessing(true);
      try {
        await onUpdateOrder(selectedOrder.id, {
          status: OrderStatus.DESIGN,
          previousStatus: undefined,
          holdReason: undefined,
          updatedAt: Date.now()
        });
        setSelectedOrder(null);
      } catch (e) {
        console.error(e);
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    setPromptValue('');
    setPromptError('');
    setCustomPrompt({
      type: 'hold',
      title: 'Put Design Work On Hold',
      description: 'Please specify the reason for placing this artwork design on hold:',
      placeholder: 'Enter hold reason here (e.g. Design too difficult, patterns update required)...',
      actionLabel: 'Put on Hold',
      onConfirm: async (reason) => {
        setIsProcessing(true);
        try {
          const newNote = `[HOLD REPORT] ${new Date().toLocaleString()}: ${reason.trim()}`;
          const updatedNotes = selectedOrder.notes ? `${selectedOrder.notes}\n${newNote}` : newNote;

          await onUpdateOrder(selectedOrder.id, {
            status: OrderStatus.HOLD,
            previousStatus: OrderStatus.DESIGN,
            holdReason: reason.trim(),
            notes: updatedNotes,
            updatedAt: Date.now()
          });
          setSelectedOrder(null);
          setCustomPrompt(null);
        } catch (e) {
          console.error(e);
          setPromptError("Database update failed. Please try again.");
        } finally {
          setIsProcessing(false);
        }
      }
    });
  };

  const handleRemoveFile = (index: number, type: 'design' | 'machine') => {
    if (type === 'design') {
      setDesignFiles(prev => prev.filter((_, i) => i !== index));
    } else {
      setMachineFiles(prev => prev.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Design Dashboard</h2>
          <p className="text-gray-500 mt-1">Prepare machine language files and artwork</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-xl border border-purple-100 italic font-medium">
            <Palette size={20} />
            <span>Pattern & Art Studio</span>
          </div>
        </div>
      </div>

      {/* Design Team Sidebar (Talk Channel Only for Conversation) */}
      <ConversationDashboard
        isOpen={isConversationOpen}
        onClose={() => setIsConversationOpen(false)}
        currentUser={user || { name: 'Arun', role: 'designer' }}
        orders={orders}
        onUpdateOrder={onUpdateOrder}
      />

      {/* Summary Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button
          onClick={() => setViewMode(viewMode === 'all' ? 'pending' : 'all')}
          className={cn(
            "p-6 rounded-2xl border transition-all text-left flex items-center gap-4 group",
            viewMode === 'all' ? "bg-brand-primary text-white border-brand-primary shadow-xl" : "bg-white border-gray-100 shadow-sm hover:border-brand-primary/50"
          )}
        >
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center shadow-inner transition-colors",
            viewMode === 'all' ? "bg-white/20 text-white" : "bg-blue-50 text-blue-600 group-hover:bg-blue-100"
          )}>
            <Package size={24} />
          </div>
          <div>
            <p className={cn("text-[10px] font-black uppercase tracking-widest", viewMode === 'all' ? "text-white/70" : "text-gray-500")}>
              {viewMode === 'all' ? "Showing All Designs" : "Total Designs"}
            </p>
            <p className="text-2xl font-black">{designOrders.length}</p>
          </div>
        </button>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center shadow-inner">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Order Status</p>
            <p className="text-lg font-bold text-gray-900 leading-tight">
              {designOrders.length} Pending Art
              <span className="text-[10px] text-gray-400 block font-medium uppercase tracking-tighter">
                {orders.filter(o => o.status === OrderStatus.HOLD).length} On Hold • {orders.length - designOrders.length} Other Stages
              </span>
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center shadow-inner">
            <Palette size={24} />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Type of Total Order</p>
            <p className="text-lg font-bold text-gray-900 leading-tight">
              {Array.from(new Set(orders.map(o => o.category))).length} Categories
              <span className="text-[10px] text-gray-400 block font-medium uppercase tracking-tighter truncate max-w-[150px]">
                {orders.length > 0 ? orders[0].category : 'No data'}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3 flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 max-w-md shadow-sm">
            <Search className="text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search designs..."
              className="bg-transparent border-none outline-none text-sm w-full font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {viewMode === 'all' && (
            <span className="text-[10px] font-black text-brand-primary uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
              History Mode
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-50">
                <th className="px-6 py-4">Order Unit</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Design Type</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(viewMode === 'all' ? orders.filter(o => o.customerInfo.name.toLowerCase().includes(searchTerm.toLowerCase()) || o.id.includes(searchTerm)) : filteredOrders).length > 0 ? (
                (viewMode === 'all' ? orders.filter(o => o.customerInfo.name.toLowerCase().includes(searchTerm.toLowerCase()) || o.id.includes(searchTerm)) : filteredOrders).map(order => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-gray-400">
                      <div className="flex items-center gap-2">
                        #{order.id.slice(-8)}
                        {order.isUrgent && (
                          <span className="bg-red-500 text-white text-[8px] font-black px-1 rounded">URGENT</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{order.customerInfo.name}</div>
                      <div className="text-xs text-gray-500">{order.customerInfo.phone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-[10px] font-black uppercase tracking-tight w-fit">
                          {getDisplayCategory(order)}
                        </span>
                        {order.assignedDesigner && (
                          <div className="text-[10px] text-purple-600 font-bold flex items-center gap-1 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 inline-block animate-pulse"></span>
                            {order.assignedDesigner}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "flex flex-col items-center justify-center gap-1 font-bold text-xs uppercase text-center",
                        order.status === OrderStatus.DESIGN ? "text-amber-600" : order.status === OrderStatus.HOLD ? "text-red-600" : "text-gray-400"
                      )}>
                        <div className="flex items-center gap-1">
                          {order.status === OrderStatus.DESIGN && <Clock size={14} className="animate-spin" />}
                          {order.status === OrderStatus.HOLD && <AlertCircle size={14} className="text-red-500" />}
                          {order.status === OrderStatus.DESIGN ? "Awaiting Art" : order.status === OrderStatus.HOLD ? "On Hold" : order.status}
                        </div>
                        {order.status === OrderStatus.HOLD && order.holdReason && (
                          <span className="text-[10px] text-red-500 italic max-w-[150px] truncate block" title={order.holdReason}>
                            Reason: {order.holdReason}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {(order.status === OrderStatus.DESIGN || order.status === OrderStatus.HOLD) ? (
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className={cn(
                            "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ml-auto",
                            order.status === OrderStatus.HOLD ? "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200" : "bg-black text-white hover:bg-gray-800"
                          )}
                        >
                          {order.status === OrderStatus.HOLD ? "View Hold" : "Start Design"}
                          <ChevronRight size={14} />
                        </button>
                      ) : (
                        <div className="text-[10px] text-gray-400 font-bold uppercase italic pr-4">Order Passed</div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">
                    Great job! All designs are up to date.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Design Workspace</h3>
                <p className="text-xs text-gray-500 font-bold uppercase tabular-nums">Order #{selectedOrder.id}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <Trash2 size={24} className="text-gray-300" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {selectedOrder.status === OrderStatus.HOLD && (
                <div className="bg-red-50 border border-red-200 p-6 rounded-2xl flex items-start gap-4 mb-4 text-left">
                  <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={24} />
                  <div>
                    <h5 className="text-sm font-black text-red-900 uppercase italic">Artwork Design Work is On Hold</h5>
                    <p className="text-xs text-red-700 font-semibold mt-1">Reason: "{selectedOrder.holdReason || 'No reason specified'}"</p>
                    <p className="text-[10px] text-red-500 font-medium mt-1">Click the "Resume Design Work" button in the footer to unlock updates and move this work to Accounts.</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <section>
                    <h4 className="text-[10px] font-black text-brand-primary uppercase mb-3 flex items-center gap-2">
                      <User size={12} />
                      Customer Spec
                    </h4>
                    <div className="p-4 bg-gray-50 rounded-2xl space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-400 font-black shadow-sm">
                          {selectedOrder.customerInfo.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{selectedOrder.customerInfo.name}</p>
                          <p className="text-xs text-gray-500">{selectedOrder.customerInfo.phone}</p>
                        </div>
                      </div>
                      {selectedOrder.assignedDesigner && (
                        <div className="mt-2 text-xs font-black bg-purple-50 text-purple-700 px-3 py-1.5 rounded-xl border border-purple-100 flex items-center gap-2 w-fit">
                          <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></span>
                          Assigned Designer: {selectedOrder.assignedDesigner}
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Requirement</p>
                        <p className="text-xs font-medium text-gray-700">{selectedOrder.notes || 'No specific notes from client.'}</p>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h4 className="text-[10px] font-black text-brand-primary uppercase mb-3 flex items-center gap-2">
                      <Paperclip size={12} />
                      Reference Files
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[...(selectedOrder.staffImages || []), ...(selectedOrder.staffPdfs || [])].map((file, i) => {
                        const isAudio = file.startsWith('data:audio/');
                        return (
                          <div
                            key={i}
                            className="flex flex-col gap-2 p-2 bg-gray-50 rounded-2xl border border-gray-100 group"
                          >
                            <div
                              className="aspect-square rounded-xl overflow-hidden relative bg-white flex items-center justify-center border border-gray-100"
                            >
                              {file.startsWith('data:image/') ? (
                                <img src={file} className="w-full h-full object-cover" />
                              ) : isAudio ? (
                                <div className="flex flex-col items-center gap-2 text-purple-600">
                                  <Mic size={32} />
                                  <span className="text-[8px] font-black uppercase">Voice Note</span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-2 text-gray-400">
                                  <FileText size={32} />
                                  <span className="text-[8px] font-black uppercase">Document</span>
                                </div>
                              )}

                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                {(file.startsWith('data:image/') || file.includes('pdf')) && (
                                  <button
                                    onClick={() => setViewingImage(file)}
                                    className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white transition-all hover:scale-110"
                                    title="View"
                                  >
                                    <ZoomIn size={16} />
                                  </button>
                                )}
                                <a
                                  href={file}
                                  download={`Asset_${i + 1}${file.includes('pdf') ? '.pdf' : file.includes('webm') ? '.webm' : file.includes('wav') ? '.wav' : '.png'}`}
                                  className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white transition-all hover:scale-110"
                                  title="Download"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Download size={16} />
                                </a>
                              </div>
                            </div>
                            {(isAudio || file.includes('audio/')) && (
                              <div className="px-1">
                                <audio controls className="w-full h-6 scale-90 origin-left">
                                  <source src={file} />
                                </audio>
                              </div>
                            )}
                            <div className="flex items-center justify-between px-1">
                              <span className="text-[8px] font-bold text-gray-400 truncate">
                                {isAudio ? 'Voice Instructions' : file.startsWith('data:image/') ? 'Image Ref' : 'PDF Document'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </div>                  <div className="space-y-8 bg-gray-50/50 p-6 rounded-3xl border border-gray-100 flex flex-col justify-start">
                  <section>
                    <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Upload size={18} className="text-purple-600" />
                      Design Output (PDF/AI)
                    </h4>
                    <FileUpload
                      label=""
                      accept=".pdf,image/*"
                      onFilesSelected={(files) => setDesignFiles(prev => [...prev, ...files])}
                    />
                    <div className="mt-4 grid grid-cols-4 gap-2">
                      {designFiles.map((file, i) => (
                        <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 bg-white flex items-center justify-center group">
                          <FileText size={20} className="text-brand-primary" />
                          <button onClick={() => handleRemoveFile(i, 'design')} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={10} /></button>
                        </div>
                      ))}
                    </div>
                  </section>


                </div>
              </div>
            </div>

            <div className="p-8 border-t border-gray-100 flex flex-col sm:flex-row gap-4 shrink-0 bg-gray-50/30">
              <button
                onClick={handlePutOnHold}
                disabled={isProcessing}
                className={cn(
                  "px-6 py-4 border-2 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50",
                  selectedOrder.status === OrderStatus.HOLD
                    ? "border-green-100 text-green-600 hover:bg-green-50 hover:border-green-200 bg-green-50/30"
                    : "border-amber-100 text-amber-600 hover:bg-amber-50 hover:border-amber-200 bg-amber-50/30"
                )}
              >
                {isProcessing ? <Clock size={18} className="animate-spin" /> : <AlertCircle size={18} />}
                {selectedOrder.status === OrderStatus.HOLD ? "Resume Design" : "Hold Work"}
              </button>
              <button
                onClick={handleProcessOrder}
                disabled={isProcessing}
                className="flex-1 px-6 py-4 bg-brand-primary text-white hover:bg-brand-primary/95 rounded-2xl font-bold shadow-lg shadow-brand-primary/10 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
              >
                {isProcessing ? <Clock size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                Complete & Move to Order Management
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {customPrompt && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-md border border-gray-100 text-left"
          >
            <h4 className="text-lg font-black text-gray-900 uppercase tracking-tighter mb-2">
              {customPrompt.title}
            </h4>
            <p className="text-xs text-gray-500 font-medium mb-4 leading-relaxed">
              {customPrompt.description}
            </p>
            <textarea
              rows={4}
              className={cn(
                "w-full px-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm font-medium resize-none mb-1",
                promptError ? "border-red-300 bg-red-50/10 focus:ring-red-500" : "border-gray-200"
              )}
              placeholder={customPrompt.placeholder}
              value={promptValue}
              onChange={(e) => {
                setPromptValue(e.target.value);
                if (e.target.value.trim()) {
                  setPromptError('');
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (promptValue.trim()) {
                    customPrompt.onConfirm(promptValue);
                  } else {
                    setPromptError("A specification reason is mandatory to continue.");
                  }
                }
              }}
            />

            {promptError && (
              <p className="text-[10px] text-red-600 font-bold uppercase mb-4 flex items-center gap-1">
                <AlertCircle size={10} />
                {promptError}
              </p>
            )}
            {!promptError && <div className="h-4 mb-1" />}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setCustomPrompt(null)}
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={isProcessing}
                onClick={() => {
                  if (promptValue.trim()) {
                    customPrompt.onConfirm(promptValue);
                  } else {
                    setPromptError("A specification reason is mandatory to continue.");
                  }
                }}
                className="px-5 py-2.5 bg-black hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
              >
                {isProcessing && <Clock size={12} className="animate-spin" />}
                {customPrompt.actionLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {viewingImage && (
        <ImageViewer src={viewingImage} onClose={() => setViewingImage(null)} fileName="Design_Ref" />
      )}
    </div>
  );
}
