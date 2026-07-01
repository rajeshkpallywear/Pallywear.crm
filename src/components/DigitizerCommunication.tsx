/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Users,
  Send,
  Search,
  FileText,
  Upload,
  CheckCircle,
  AlertCircle,
  Package,
  Clock
} from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { getDisplayCategory, cn } from '../lib/utils';
import FileUpload from './FileUpload';

interface DigitizerCommunicationProps {
  orders: Order[];
  onUpdateOrder: (id: string, updates: Partial<Order>) => Promise<void>;
}

export default function DigitizerCommunication({ orders, onUpdateOrder }: DigitizerCommunicationProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);

  // Focus on orders that are typically in design or management stage
  const relevantOrders = orders.filter(o =>
    (o.customerInfo.name.toLowerCase().includes(searchTerm.toLowerCase()) || o.id.toLowerCase().includes(searchTerm.toLowerCase())) &&
    [OrderStatus.ORDER_MANAGEMENT, OrderStatus.DESIGN, OrderStatus.PRODUCTION].includes(o.status)
  ).sort((a, b) => b.updatedAt - a.updatedAt);

  const handleSend = async () => {
    if (!selectedOrder) {
      alert("Please select an order first.");
      return;
    }

    if (!message && attachments.length === 0) {
      alert("Please provide a message or attachments.");
      return;
    }

    setIsSending(true);
    try {
      const timestamp = new Date().toLocaleString();
      const newMessage = `[FROM ORDER MGMT] ${timestamp}\n${message}`;
      const updatedNotes = selectedOrder.notes ? `${selectedOrder.notes}\n\n${newMessage}` : newMessage;

      await onUpdateOrder(selectedOrder.id, {
        notes: updatedNotes,
        designAttachments: [...(selectedOrder.designAttachments || []), ...attachments],
        updatedAt: Date.now()
      });

      alert(`Instructions sent to Digitizing for order #${selectedOrder.id.slice(-6)}`);
      setMessage('');
      setAttachments([]);
      // Refresh local selection if needed (context will handle it usually)
    } catch (error) {
      console.error(error);
      alert("Failed to send instructions.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase italic text-left">Digitizer Communication</h2>
          <p className="text-gray-500 font-medium text-sm text-left">Upload PDF/Images (Max 100MB) for embroidery processing</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search orders..."
            className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-primary outline-none transition-all w-64"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Order Selection */}
        <div className="lg:col-span-4 space-y-3 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
          {relevantOrders.length > 0 ? (
            relevantOrders.map(order => (
              <button
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className={cn(
                  "w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-3",
                  selectedOrder?.id === order.id
                    ? "bg-brand-primary text-white border-brand-primary shadow-lg"
                    : "bg-white border-gray-100 hover:border-gray-300 shadow-sm"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                  selectedOrder?.id === order.id ? "bg-white/20" : "bg-gray-50 text-gray-400"
                )}>
                  <Package size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] font-mono opacity-60">#{order.id.slice(-6)}</span>
                    <span className={cn(
                      "text-[8px] font-black uppercase px-2 py-0.5 rounded",
                      selectedOrder?.id === order.id ? "bg-white/10" : "bg-gray-100 text-gray-500"
                    )}>
                      {getDisplayCategory(order)}
                    </span>
                  </div>
                  <h4 className="font-bold truncate leading-tight uppercase">{order.customerInfo.name}</h4>
                  <div className="text-[9px] opacity-60 mt-1 flex items-center gap-1">
                    <Clock size={8} />
                    {new Date(order.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="p-8 bg-white border border-dashed border-gray-200 rounded-2xl text-center">
              <p className="text-sm text-gray-400 italic">No matching orders found.</p>
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="lg:col-span-8">
          {selectedOrder ? (
            <motion.div
              layoutId={selectedOrder.id}
              className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full"
            >
              <div className="p-8 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-gray-900 uppercase italic">Dispatch to Digitizer</h3>
                  <p className="text-xs text-gray-500 font-medium">Order: #{selectedOrder.id.slice(-8)} | Client: {selectedOrder.customerInfo.name}</p>
                </div>
                <button
                  disabled={isSending || (!message && attachments.length === 0)}
                  onClick={handleSend}
                  className="px-6 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
                >
                  <Send size={18} />
                  <span>Send to Digitizer</span>
                </button>
              </div>

              <div className="p-8 space-y-8 flex-1 overflow-y-auto">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Instructions for Embroidery team</label>
                  <textarea
                    rows={6}
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-brand-primary outline-none text-sm font-medium resize-none shadow-inner"
                    placeholder="Provide specific details about stitching, thread counts, or placement..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Artwork & PDF Attachments</label>
                    <span className="text-[9px] text-brand-primary font-black uppercase">Images/PDF Only</span>
                  </div>
                  <FileUpload
                    label="Upload Reference Artworks (Images/PDF - Max 100MB)"
                    accept="image/*,.pdf"
                    onFilesSelected={(files) => setAttachments(prev => [...prev, ...files])}
                  />

                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-3">
                      {attachments.map((file, i) => (
                        <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 shadow-sm">
                          {file.startsWith('data:image/') ? (
                            <img src={file} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                              <FileText size={24} className="text-brand-primary" />
                              <span className="text-[8px] font-black">PDF</span>
                            </div>
                          )}
                          <button
                            onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-sm"
                          >
                            <Users size={8} className="rotate-45" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl">
                  <div className="flex items-center gap-3 mb-2">
                    <AlertCircle size={18} className="text-blue-600" />
                    <h6 className="text-xs font-black text-blue-900 uppercase">Communication Note</h6>
                  </div>
                  <p className="text-[11px] text-blue-700 font-medium leading-relaxed">
                    Your message and files will be visible in the Digitizing & Embroidery dashboard.
                    They will also be appended to the order's history log for permanent tracking.
                  </p>
                </div>
              </div>

              <div className="p-8 bg-gray-50/50 border-t border-gray-100">
                <button
                  disabled={isSending || (!message && attachments.length === 0)}
                  onClick={handleSend}
                  className="w-full py-5 bg-black text-white rounded-[2rem] font-bold hover:bg-gray-800 transition-all shadow-xl shadow-black/10 flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98]"
                >
                  {isSending ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Dispatching...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={22} />
                      Send to Digitizer
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-20 bg-gray-50 border border-dashed border-gray-200 rounded-[3rem] text-center">
              <div className="w-24 h-24 bg-white rounded-[2rem] shadow-xl shadow-black/5 flex items-center justify-center mb-6">
                <Users className="text-gray-100" size={48} />
              </div>
              <h4 className="text-2xl font-black text-gray-900 tracking-tighter uppercase italic">Select Order to Communicate</h4>
              <p className="text-gray-400 max-w-sm mt-3 font-medium">Select an active order from the left panel to send specific artwork instructions to the Digitizers.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
