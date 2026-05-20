/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Scissors,
  FileText,
  Download,
  ZoomIn,
  Package,
  Search,
  ChevronRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Archive,
  Upload,
  Trash2
} from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { getDisplayCategory, cn } from '../lib/utils';
import FileUpload from './FileUpload';
import ImageViewer from './ImageViewer';

interface DigitizingDashboardProps {
  orders: Order[];
  onUpdateOrder: (id: string, updates: Partial<Order>) => Promise<void>;
  isAdmin?: boolean;
}

export default function DigitizingDashboard({ orders, onUpdateOrder, isAdmin }: DigitizingDashboardProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [viewMode, setViewMode] = useState<'pending' | 'completed'>('pending');
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadFiles, setUploadFiles] = useState<string[]>([]);

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.customerInfo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.id.toLowerCase().includes(searchTerm.toLowerCase());

    // Show orders in DESIGN, ORDER_MANAGEMENT, or PRODUCTION status for digitizing
    const relevantStatus = [OrderStatus.DESIGN, OrderStatus.ORDER_MANAGEMENT, OrderStatus.PRODUCTION].includes(o.status);

    if (viewMode === 'pending') {
      return matchesSearch && relevantStatus && !o.machineFiles?.length;
    } else {
      return matchesSearch && (relevantStatus || o.status === OrderStatus.DELIVERY) && (o.machineFiles?.length || 0) > 0;
    }
  });

  const handleUploadSpecs = async () => {
    if (!selectedOrder || uploadFiles.length === 0) return;
    setIsProcessing(true);

    try {
      await onUpdateOrder(selectedOrder.id, {
        machineFiles: [...(selectedOrder.machineFiles || []), ...uploadFiles],
        updatedAt: Date.now()
      });

      setUploadFiles([]);
      alert("Garage ZIP file uploaded successfully to manufacturing specs!");
    } catch (error) {
      console.error(error);
      alert("Failed to upload files.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveMachineFile = async (index: number) => {
    if (!selectedOrder || !window.confirm("Remove this production file?")) return;

    const newFiles = [...(selectedOrder.machineFiles || [])];
    newFiles.splice(index, 1);

    try {
      await onUpdateOrder(selectedOrder.id, { machineFiles: newFiles });
      alert("File removed.");
    } catch (e) {
      alert("Failed to remove file.");
    }
  };

  const [isMsgSidebarOpen, setIsMsgSidebarOpen] = useState(false);
  const [msgRequest, setMsgRequest] = useState({
    message: '',
    attachments: [] as string[]
  });

  const sendToOrderMgmt = async () => {
    if (!msgRequest.message && msgRequest.attachments.length === 0) {
      alert("Please provide a message or attachments.");
      return;
    }

    if (!selectedOrder) {
      alert("Please select an order first.");
      return;
    }

    setIsProcessing(true);
    try {
      const newNote = `[MESSAGE FROM DIGITIZER] ${new Date().toLocaleString()}\n${msgRequest.message}`;
      const updatedNotes = selectedOrder.notes ? `${selectedOrder.notes}\n\n${newNote}` : newNote;

      await onUpdateOrder(selectedOrder.id, {
        notes: updatedNotes,
        staffImages: [...(selectedOrder.staffImages || []), ...msgRequest.attachments],
        updatedAt: Date.now()
      });

      alert("Message sent to Order Management!");
      setIsMsgSidebarOpen(false);
      setMsgRequest({ message: '', attachments: [] });
    } catch (error) {
      console.error(error);
      alert("Failed to send message.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic">Digitizing & Embroidery</h2>
          <p className="text-gray-500 font-medium">Process artworks and upload manufacturing ZIP files</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMsgSidebarOpen(true)}
            className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg flex items-center gap-2"
          >
            <Upload size={18} />
            <span>Message Order Mgmt</span>
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Find order..."
              className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all w-64 font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-2xl w-fit">
        <button
          onClick={() => setViewMode('pending')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
            viewMode === 'pending' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          )}
        >
          Active Tasks
        </button>
        <button
          onClick={() => setViewMode('completed')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
            viewMode === 'completed' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          )}
        >
          History
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Order List */}
        <div className="lg:col-span-4 space-y-4">
          {filteredOrders.length > 0 ? (
            filteredOrders.map(order => (
              <button
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className={cn(
                  "w-full text-left p-6 rounded-[2rem] border transition-all flex items-start gap-4 hover:shadow-xl hover:scale-[1.01]",
                  selectedOrder?.id === order.id
                    ? "bg-black text-white border-black shadow-2xl"
                    : "bg-white border-gray-100 shadow-sm"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner",
                  selectedOrder?.id === order.id ? "bg-white/10 text-white" : "bg-indigo-50 text-indigo-600"
                )}>
                  <Scissors size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono opacity-60">#{order.id.slice(-6)}</span>
                    <span className={cn(
                      "text-[8px] font-black uppercase px-2 py-0.5 rounded",
                      selectedOrder?.id === order.id ? "bg-white/10" : "bg-gray-100 text-gray-500"
                    )}>
                      {getDisplayCategory(order)}
                    </span>
                  </div>
                  <h4 className="text-lg font-black tracking-tight truncate leading-tight uppercase italic">{order.customerInfo.name}</h4>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex items-center gap-1 opacity-60 text-[10px] font-bold">
                      <Clock size={10} />
                      {new Date(order.updatedAt).toLocaleDateString()}
                    </div>
                    {order.isUrgent && (
                      <span className="bg-red-500 text-white text-[8px] font-black px-1.5 rounded animate-pulse">URGENT</span>
                    )}
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="p-12 bg-white/50 border border-dashed border-gray-200 rounded-[2.5rem] text-center">
              <Archive className="mx-auto text-gray-300 mb-2" size={32} />
              <p className="text-gray-400 font-medium text-sm">No orders found.</p>
            </div>
          )}
        </div>

        {/* Details & Upload */}
        <div className="lg:col-span-8">
          {selectedOrder ? (
            <motion.div
              layoutId={selectedOrder.id}
              className="bg-white rounded-[3rem] border border-gray-100 shadow-2xl overflow-hidden"
            >
              <div className="p-10">
                <div className="flex items-center justify-between mb-10 pb-10 border-b border-gray-50">
                  <div>
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-2 block">Processing Artworks</span>
                    <h3 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic">{selectedOrder.customerInfo.name}</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Current State</span>
                    <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-black uppercase tracking-widest">
                      {selectedOrder.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {/* Reference Section */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h5 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                        <FileText size={16} className="text-indigo-600" />
                        Reference files
                      </h5>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">View & Download</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {[...(selectedOrder.staffImages || []), ...(selectedOrder.staffPdfs || []), ...(selectedOrder.designAttachments || [])].map((file, i) => (
                        <div key={i} className="group relative aspect-square bg-gray-50 rounded-3xl border border-gray-100 overflow-hidden flex flex-col items-center justify-center transition-all hover:border-indigo-200 hover:shadow-lg">
                          {file.startsWith('data:image/') ? (
                            <img src={file} className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-center p-4">
                              <FileText size={40} className="text-indigo-300 mx-auto mb-2" />
                              <span className="text-[10px] font-black text-indigo-600 uppercase">Document</span>
                            </div>
                          )}

                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                            {file.startsWith('data:image/') && (
                              <button
                                onClick={() => setViewingImage(file)}
                                className="p-3 bg-white/20 hover:bg-white/40 rounded-full text-white transition-all hover:scale-110"
                              >
                                <ZoomIn size={20} />
                              </button>
                            )}
                            <a
                              href={file}
                              download={`Ref_${selectedOrder.id.slice(-4)}_${i + 1}.png`}
                              className="p-3 bg-white/20 hover:bg-white/40 rounded-full text-white transition-all hover:scale-110"
                            >
                              <Download size={20} />
                            </a>
                          </div>
                        </div>
                      ))}
                      {(!selectedOrder.staffImages?.length && !selectedOrder.staffPdfs?.length && !selectedOrder.designAttachments?.length) && (
                        <div className="col-span-2 p-10 bg-gray-50 border border-dashed border-gray-200 rounded-3xl text-center">
                          <AlertCircle className="mx-auto text-gray-300 mb-2" size={24} />
                          <p className="text-xs text-gray-400 italic">No references found for this order.</p>
                        </div>
                      )}
                    </div>

                    {selectedOrder.notes && (
                      <div className="mt-8 p-6 bg-indigo-50 border border-indigo-100 rounded-3xl">
                        <h6 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-3">Important Instructions</h6>
                        <p className="text-xs text-indigo-900 font-medium leading-relaxed whitespace-pre-wrap">{selectedOrder.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Upload Section */}
                  <div className="space-y-6">
                    <h5 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                      <Upload size={16} className="text-indigo-600" />
                      Production Upload (Garage ZIP)
                    </h5>

                    <FileUpload
                      label="Upload Manufacturing ZIP"
                      accept=".zip"
                      maxFiles={1}
                      onFilesSelected={(files) => setUploadFiles(files)}
                    />

                    {uploadFiles.length > 0 && (
                      <div className="space-y-4">
                        <div className="p-4 bg-green-50 border border-green-100 rounded-2xl flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Package size={20} className="text-green-600" />
                            <span className="text-xs font-bold text-green-800">New production file ready</span>
                          </div>
                          <button onClick={() => setUploadFiles([])} className="text-red-500 p-1 hover:bg-red-50 rounded">
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <button
                          disabled={isProcessing}
                          onClick={handleUploadSpecs}
                          className="w-full py-5 bg-black text-white rounded-[2rem] font-bold hover:bg-gray-800 transition-all shadow-xl shadow-black/10 flex items-center justify-center gap-3 active:scale-[0.98]"
                        >
                          {isProcessing ? <Clock className="animate-spin" /> : <CheckCircle size={20} />}
                          Confirm & Upload Garage ZIP
                        </button>
                      </div>
                    )}

                    <div className="pt-6 border-t border-gray-50">
                      <h6 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Uploaded Final Specs</h6>
                      <div className="space-y-2">
                        {selectedOrder.machineFiles?.map((file, idx) => (
                          <div key={idx} className="p-4 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-between group">
                            <div className="flex items-center gap-3 truncate">
                              <Package size={16} className="text-indigo-500" />
                              <span className="text-xs font-bold text-gray-700 truncate">Garage_File_{idx + 1}.zip</span>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <a href={file} download className="p-1.5 hover:bg-white rounded text-indigo-600 shadow-sm"><Download size={14} /></a>
                              <button onClick={() => handleRemoveMachineFile(idx)} className="p-1.5 hover:bg-red-100 rounded text-red-500 shadow-sm"><Trash2 size={14} /></button>
                            </div>
                          </div>
                        ))}
                        {(!selectedOrder.machineFiles || selectedOrder.machineFiles.length === 0) && (
                          <p className="text-[10px] text-gray-400 italic font-medium p-4 border border-dashed border-gray-100 rounded-2xl text-center">No production files uploaded yet.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-20 bg-gray-50 border border-dashed border-gray-200 rounded-[4rem] text-center">
              <div className="w-24 h-24 bg-white rounded-[2rem] shadow-xl shadow-black/5 flex items-center justify-center mb-6">
                <Scissors className="text-indigo-100" size={48} />
              </div>
              <h4 className="text-2xl font-black text-gray-900 tracking-tighter uppercase italic">Ready for Processing</h4>
              <p className="text-gray-400 max-w-sm mt-3 font-medium">Select an order on the left to view references and upload manufacturing specifications.</p>
            </div>
          )}
        </div>
      </div>

      {viewingImage && (
        <ImageViewer src={viewingImage} onClose={() => setViewingImage(null)} fileName="Artwork_Ref" />
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
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-indigo-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                  <Upload size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter">Communicate</h3>
                  <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest text-left">To Order Management</p>
                </div>
              </div>
              <button
                onClick={() => setIsMsgSidebarOpen(false)}
                className="p-2 hover:bg-indigo-100 rounded-full transition-colors text-indigo-600"
              >
                <Trash2 size={24} className="rotate-45" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {!selectedOrder && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-amber-800">
                  <AlertCircle size={20} />
                  <p className="text-xs font-bold uppercase tracking-widest">Please select an order first</p>
                </div>
              )}

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Your Message</label>
                <textarea
                  rows={6}
                  className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium resize-none"
                  placeholder="Explain requirements or issues..."
                  value={msgRequest.message}
                  onChange={(e) => setMsgRequest(prev => ({ ...prev, message: e.target.value }))}
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Share Images/PDFs</label>
                <FileUpload
                  label="Upload Ref Files (Images/PDF - Max 100MB)"
                  accept="image/*,.pdf"
                  onFilesSelected={(files) => setMsgRequest(prev => ({ ...prev, attachments: files }))}
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-100">
              <button
                disabled={isProcessing || !selectedOrder}
                onClick={sendToOrderMgmt}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isProcessing ? "Processing..." : "Send to Order Management"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
