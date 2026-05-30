/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
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
  Trash2,
  X
} from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { getDisplayCategory, cn, isOrderSizeValid } from '../lib/utils';
import FileUpload from './FileUpload';
import ImageViewer from './ImageViewer';

interface DigitizingDashboardProps {
  orders: Order[];
  onUpdateOrder: (id: string, updates: Partial<Order>) => Promise<void>;
  isAdmin?: boolean;
}

export default function DigitizingDashboard({ orders, onUpdateOrder, isAdmin }: DigitizingDashboardProps) {
  const { user } = useAuth();
  const hourOfDay = new Date().getHours();
  const greeting = hourOfDay < 12 ? 'Good morning' : hourOfDay < 17 ? 'Good afternoon' : 'Good evening';

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [viewMode, setViewMode] = useState<'pending' | 'completed'>('pending');
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadFiles, setUploadFiles] = useState<string[]>([]);
  const [isMsgSidebarOpen, setIsMsgSidebarOpen] = useState(false);
  const [msgRequest, setMsgRequest] = useState({
    message: '',
    attachments: [] as string[]
  });

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.customerInfo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.id.toLowerCase().includes(searchTerm.toLowerCase());

    // All statuses visible to digitizer (active pipeline + delivered)
    const relevantStatus = [
      OrderStatus.DESIGN,
      OrderStatus.ORDER_MANAGEMENT,
      OrderStatus.PRODUCTION,
      OrderStatus.DELIVERY,
      OrderStatus.DELIVERED
    ].includes(o.status);

    if (viewMode === 'pending') {
      // Pending = has relevant status AND no machine files yet
      return matchesSearch && relevantStatus && !o.machineFiles?.length;
    } else {
      // Completed = has machine files (delivered or in late pipeline stages)
      return matchesSearch && relevantStatus && (o.machineFiles?.length || 0) > 0;
    }
  });


  const handleUploadSpecs = async () => {
    if (!selectedOrder || uploadFiles.length === 0) return;

    const nextOrderState = {
      ...selectedOrder,
      machineFiles: [...(selectedOrder.machineFiles || []), ...uploadFiles],
      status: OrderStatus.ORDER_MANAGEMENT,
    };

    if (!isOrderSizeValid(nextOrderState)) {
      alert("Error: Total order data limit exceeded (Max 1MB total across all cloud-saved attachments on this order). The uploaded ZIP file is too large for Firestore. Please use a smaller ZIP file (under 300KB recommended) or remove some existing attachments first.");
      return;
    }

    setIsProcessing(true);
    try {
      await onUpdateOrder(selectedOrder.id, {
        machineFiles: [...(selectedOrder.machineFiles || []), ...uploadFiles],
        status: OrderStatus.ORDER_MANAGEMENT,
        updatedAt: Date.now()
      });

      setUploadFiles([]);
      alert("Garage ZIP file uploaded successfully to manufacturing specs!");
      setSelectedOrder(null);
    } catch (error: any) {
      console.error(error);
      if (error?.message?.includes("exceeds the maximum allowed size")) {
        alert("Failed to upload: The total attachment size is too large for Firestore (Limit: 1MB total). Please use a smaller ZIP file.");
      } else {
        alert("Failed to upload files. Error: " + (error?.message?.slice(0, 50) || "Unknown error"));
      }
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

  const sendToOrderMgmt = async () => {
    if (!msgRequest.message && msgRequest.attachments.length === 0) {
      alert("Please provide a message or attachments.");
      return;
    }

    if (!selectedOrder) {
      alert("Please select an order first.");
      return;
    }

    const nextOrderState = {
      ...selectedOrder,
      staffImages: [...(selectedOrder.staffImages || []), ...msgRequest.attachments],
    };

    if (!isOrderSizeValid(nextOrderState)) {
      alert("Error: Total order data limit exceeded (Max 1MB total across all cloud-saved attachments on this order). The attachments you are trying to upload are too large for Firestore. Please use smaller files.");
      return;
    }

    setIsProcessing(true);
    try {
      const newNote = `[MESSAGE FROM DIGITIZER] ${new Date().toLocaleString()}\n${msgRequest.message}`;
      const updatedNotes = selectedOrder.notes ? `${selectedOrder.notes}\n\n${newNote}` : newNote;

      await onUpdateOrder(selectedOrder.id, {
        notes: updatedNotes,
        status: OrderStatus.ORDER_MANAGEMENT,
        staffImages: [...(selectedOrder.staffImages || []), ...msgRequest.attachments],
        updatedAt: Date.now()
      });

      alert("Message sent to Order Management!");
      setIsMsgSidebarOpen(false);
      setMsgRequest({ message: '', attachments: [] });
      setSelectedOrder(null);
    } catch (error: any) {
      console.error(error);
      if (error?.message?.includes("exceeds the maximum allowed size")) {
        alert("Failed to send message: The total attachment size is too large for Firestore (Limit: 1MB total). Please use smaller files.");
      } else {
        alert("Failed to send message. Error: " + (error?.message?.slice(0, 50) || "Unknown error"));
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 min-h-screen bg-[#f3f5f9] font-sans antialiased">
      {/* Dynamic Purple Header Brand Banner */}
      <div className="w-full bg-gradient-to-br from-[#3C3489] to-[#534AB7] rounded-[24px] p-8 md:p-12 text-white shadow-sm relative overflow-hidden">
        <span className="text-xs font-bold uppercase tracking-widest opacity-60 block mb-1">PALLYWEAR CRM</span>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
          {greeting}, {user?.name || 'there'}!
        </h1>
        <p className="text-sm md:text-base opacity-80 font-medium">Here's your digitizing snapshot for today.</p>
      </div>

      {/* Action Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Status / Filter Pills */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setViewMode('pending')}
            className={cn(
              "w-16 h-16 rounded-[22px] flex items-center justify-center transition-all relative shadow-sm",
              viewMode === 'pending'
                ? "bg-gradient-to-tr from-[#513eff] to-[#7161ff] text-white ring-4 ring-indigo-100"
                : "bg-white text-gray-500 hover:text-gray-800"
            )}
          >
            <Scissors size={24} />
          </button>

          <button
            onClick={() => setViewMode('completed')}
            className={cn(
              "w-16 h-16 rounded-[22px] flex items-center justify-center transition-all shadow-sm relative cursor-pointer outline-none border-none",
              viewMode === 'completed'
                ? "bg-gradient-to-tr from-[#3C3489] to-[#534AB7] text-white ring-4 ring-indigo-100"
                : "bg-white text-emerald-500 hover:bg-gray-50"
            )}
          >
            <CheckCircle size={24} />
            {orders.filter(o => {
              const relevantStatus = [OrderStatus.DESIGN, OrderStatus.ORDER_MANAGEMENT, OrderStatus.PRODUCTION, OrderStatus.DELIVERY, OrderStatus.DELIVERED].includes(o.status);
              return relevantStatus && (o.machineFiles?.length || 0) > 0;
            }).length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                {orders.filter(o => {
                  const relevantStatus = [OrderStatus.DESIGN, OrderStatus.ORDER_MANAGEMENT, OrderStatus.PRODUCTION, OrderStatus.DELIVERY, OrderStatus.DELIVERED].includes(o.status);
                  return relevantStatus && (o.machineFiles?.length || 0) > 0;
                }).length}
              </span>
            )}
          </button>
        </div>

        {/* Global Toolbar Controls */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Find order..."
              className="pl-11 pr-4 py-3 bg-white border-0 rounded-[18px] text-sm focus:ring-2 focus:ring-indigo-500 shadow-sm outline-none transition-all w-64 font-medium text-gray-700"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => setIsMsgSidebarOpen(true)}
            className="px-5 py-3 bg-[#513eff] text-white rounded-[18px] text-sm font-bold hover:bg-indigo-700 transition-all shadow-md flex items-center gap-2"
          >
            <Upload size={16} />
            <span>Message Order Mgmt</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Layout Block */}
      <div className="w-full bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
        {/* Table Title Block Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Recent Orders</h2>
            <p className="text-xs text-gray-400 font-medium mt-0.5">{filteredOrders.length} orders found</p>
          </div>
          <button className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {filteredOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#fcfdfe] border-b border-gray-100">
                  <th className="p-4 pl-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Order</th>
                  <th className="p-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Customer</th>
                  <th className="p-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Category</th>
                  <th className="p-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center">Status</th>
                  <th className="p-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center">Date</th>
                  <th className="p-4 pr-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredOrders.map(order => (
                  <tr
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className={cn(
                      "group cursor-pointer transition-colors hover:bg-gray-50/80",
                      selectedOrder?.id === order.id ? "bg-indigo-50/40" : ""
                    )}
                  >
                    <td className="p-4 pl-6 font-mono text-xs font-bold text-gray-900">
                      #{order.id.slice(-6).toUpperCase()}
                    </td>
                    <td className="p-4 font-semibold text-sm text-gray-800">
                      <div className="flex items-center gap-2">
                        {order.customerInfo.name}
                        {order.isUrgent && (
                          <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded animate-pulse">URGENT</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">
                        {getDisplayCategory(order)}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-block px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-bold uppercase tracking-wide">
                        {order.status}
                      </span>
                    </td>
                    <td className="p-4 text-center text-xs font-medium text-gray-400">
                      {new Date(order.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }}
                        className="p-2 bg-gray-100 hover:bg-[#513eff] hover:text-white rounded-xl text-gray-500 transition-all inline-flex items-center justify-center"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-16 text-center">
            <p className="text-gray-400 font-medium text-sm italic">No orders in this category.</p>
          </div>
        )}
      </div>

      {/* Selected Row Detail Modal View Panel Overlay */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[24px] max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <span className="text-[10px] font-bold text-[#513eff] uppercase tracking-wider block mb-0.5">Processing Specs</span>
                <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">{selectedOrder.customerInfo.name}</h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* References View */}
              <div className="space-y-6">
                <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <FileText size={16} className="text-[#513eff]" />
                  Reference Files
                </h5>

                <div className="grid grid-cols-2 gap-3">
                  {[...(selectedOrder.staffImages || []), ...(selectedOrder.staffPdfs || []), ...(selectedOrder.designAttachments || [])].map((file, i) => (
                    <div key={i} className="group relative aspect-square bg-gray-50 rounded-[18px] border border-gray-100 overflow-hidden flex flex-col items-center justify-center transition-all hover:border-indigo-200">
                      {file.startsWith('data:image/') ? (
                        <img src={file} className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center p-4">
                          <FileText size={36} className="text-indigo-300 mx-auto mb-1" />
                          <span className="text-[10px] font-bold text-indigo-600 uppercase">Document</span>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        {file.startsWith('data:image/') && (
                          <button
                            onClick={() => setViewingImage(file)}
                            className="p-2 bg-white/20 hover:bg-white/40 rounded-xl text-white transition-all"
                          >
                            <ZoomIn size={16} />
                          </button>
                        )}
                        <a
                          href={file}
                          download={`Ref_${selectedOrder.id.slice(-4)}_${i + 1}.png`}
                          className="p-2 bg-white/20 hover:bg-white/40 rounded-xl text-white transition-all"
                        >
                          <Download size={16} />
                        </a>
                      </div>
                    </div>
                  ))}
                  {(!selectedOrder.staffImages?.length && !selectedOrder.staffPdfs?.length && !selectedOrder.designAttachments?.length) && (
                    <div className="col-span-2 p-8 bg-gray-50 border border-dashed border-gray-200 rounded-[18px] text-center">
                      <p className="text-xs text-gray-400 italic">No references found.</p>
                    </div>
                  )}
                </div>

                {selectedOrder.notes && (
                  <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-[18px]">
                    <h6 className="text-[10px] font-bold text-indigo-600 uppercase mb-1.5">Important Instructions</h6>
                    <p className="text-xs text-indigo-900 font-medium leading-relaxed whitespace-pre-wrap">{selectedOrder.notes}</p>
                  </div>
                )}
              </div>

              {/* Upload Section for Digitizer */}
              <div className="space-y-6">
                <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <Package size={16} className="text-[#3C3489]" />
                  Upload Garage ZIP File
                </h5>

                <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-[18px] space-y-3">
                  <p className="text-[11px] text-indigo-700 font-semibold">
                    Upload the completed Garage ZIP file below. Once uploaded click "Complete & Send" to move this order to Order Management.
                  </p>
                  <FileUpload
                    label="Garage ZIP File"
                    accept=".zip,application/zip"
                    onFilesSelected={(files) => setUploadFiles(files)}
                  />
                  {uploadFiles.length > 0 && (
                    <div className="space-y-1.5 mt-2">
                      {uploadFiles.map((_, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[10px] bg-white p-2 rounded-lg border border-indigo-200">
                          <div className="flex items-center gap-1.5">
                            <Package size={12} className="text-[#3C3489]" />
                            <span className="font-bold text-gray-700">Garage_File_{idx + 1}.zip</span>
                          </div>
                          <button
                            onClick={() => setUploadFiles(prev => prev.filter((_, i) => i !== idx))}
                            className="text-red-500 hover:text-red-700 bg-transparent border-none cursor-pointer p-0"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Existing machine files */}
                <div className="pt-2 border-t border-gray-100">
                  <h6 className="text-[10px] font-bold text-gray-400 uppercase mb-3">Previously Uploaded Specs</h6>
                  <div className="space-y-2">
                    {selectedOrder.machineFiles?.map((file, idx) => (
                      <div key={idx} className="p-3 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-between group">
                        <div className="flex items-center gap-2 truncate">
                          <Package size={14} className="text-[#3C3489]" />
                          <span className="text-xs font-bold text-gray-700 truncate">Garage_File_{idx + 1}.zip</span>
                        </div>
                        <a href={file} download={`Garage_${selectedOrder.id.slice(-6)}_${idx + 1}.zip`} className="p-1.5 hover:bg-white rounded-lg text-[#3C3489]">
                          <Download size={14} />
                        </a>
                      </div>
                    ))}
                    {(!selectedOrder.machineFiles || selectedOrder.machineFiles.length === 0) && (
                      <p className="text-[11px] text-gray-400 italic p-3 border border-dashed border-gray-100 rounded-xl text-center">No production files uploaded yet.</p>
                    )}
                  </div>
                </div>

                {/* Complete & Send Button */}
                <button
                  disabled={isProcessing || uploadFiles.length === 0}
                  onClick={handleUploadSpecs}
                  className="w-full py-3.5 bg-gradient-to-tr from-[#3C3489] to-[#534AB7] text-white rounded-xl font-bold hover:opacity-90 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border-none text-sm"
                >
                  <CheckCircle size={16} />
                  {isProcessing ? 'Uploading & Completing...' : 'Complete & Send to Order Management'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {viewingImage && (
        <ImageViewer src={viewingImage} onClose={() => setViewingImage(null)} fileName="Artwork_Ref" />
      )}

      {/* Sidebar Communication Panel */}
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
            className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-indigo-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#513eff] rounded-xl flex items-center justify-center text-white shadow-sm">
                  <Upload size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Communicate</h3>
                  <p className="text-[10px] text-indigo-600 font-semibold uppercase tracking-wider">To Order Management</p>
                </div>
              </div>
              <button
                onClick={() => setIsMsgSidebarOpen(false)}
                className="p-2 hover:bg-indigo-100/60 rounded-full transition-colors text-[#513eff]"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {!selectedOrder && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2.5 text-amber-800">
                  <AlertCircle size={18} />
                  <p className="text-xs font-bold uppercase tracking-wider">Select an order on the table first</p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Your Message</label>
                <textarea
                  rows={5}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium text-gray-800 resize-none"
                  placeholder="Explain requirements or issues..."
                  value={msgRequest.message}
                  disabled={!selectedOrder}
                  onChange={(e) => setMsgRequest(prev => ({ ...prev, message: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Share Images/PDFs</label>
                <FileUpload
                  label="Upload Ref Files (Images/PDF)"
                  accept="image/*,.pdf"
                  onFilesSelected={(files) => setMsgRequest(prev => ({ ...prev, attachments: files }))}
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-100">
              <button
                disabled={isProcessing || !selectedOrder}
                onClick={sendToOrderMgmt}
                className="w-full py-3.5 bg-[#513eff] text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
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