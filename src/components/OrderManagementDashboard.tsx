/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Layers, Package, ChevronRight, FileText, Download, ExternalLink, Paperclip, ZoomIn, Share2, Globe, CreditCard, Trash2, Search, Plus, Activity, Users, Upload, Palette } from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { cn, getDisplayCategory, isOrderSizeValid } from '../lib/utils';
import OrderDetailModal from './OrderDetailModal';
import FileUpload from './FileUpload';
import ImageViewer from './ImageViewer';
import InventoryManagement from './InventoryManagement';
import Logo from './Logo';

interface OrderManagementDashboardProps {
  orders: Order[];
  inventory?: any[];
  onUpdateOrder: (id: string, updates: Partial<Order>) => Promise<void>;
  onDeleteOrder?: (id: string) => void;
  isAdmin?: boolean;
}

export default function OrderManagementDashboard({ orders, inventory = [], onUpdateOrder, onDeleteOrder, isAdmin }: OrderManagementDashboardProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [viewMode, setViewMode] = useState<'pending' | 'all'>('pending');
  const [selectedHubOrder, setSelectedHubOrder] = useState<Order | null>(null);
  const [managementFiles, setManagementFiles] = useState<string[]>([]);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const pendingOrders = orders.filter(o => o.status === OrderStatus.ORDER_MANAGEMENT || (o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.ORDER_MANAGEMENT));

  // Auto-select first order if none is selected
  useEffect(() => {
    const list = viewMode === 'all' ? orders : pendingOrders;
    if (list.length > 0 && (!selectedOrder || !list.some(o => o.id === selectedOrder.id))) {
      setSelectedOrder(list[0]);
    }
  }, [orders, pendingOrders, viewMode]);

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

  const sendToDigitizer = async () => {
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
      const newNote = `[ORDER MGMT -> DIGITIZER] ${new Date().toLocaleString()}\n${msgRequest.message}`;
      const updatedNotes = selectedOrder.notes ? `${selectedOrder.notes}\n\n${newNote}` : newNote;

      await onUpdateOrder(selectedOrder.id, {
        notes: updatedNotes,
        designAttachments: [...(selectedOrder.designAttachments || []), ...msgRequest.attachments],
        updatedAt: Date.now()
      });

      alert("Instructions sent to Digitizing team!");
      setIsMsgSidebarOpen(false);
      setMsgRequest({ message: '', attachments: [] });
    } catch (error) {
      console.error(error);
      alert("Failed to send message.");
    } finally {
      setIsProcessing(false);
    }
  };

  const sendToDesigner = async () => {
    if (!designMsgRequest.message && designMsgRequest.attachments.length === 0) {
      alert("Please provide a message or attachments.");
      return;
    }

    if (!selectedOrder) {
      alert("Please select an order first from the list.");
      return;
    }

    setIsProcessing(true);
    try {
      const newNote = `[ORDER MGMT -> DESIGNER] ${new Date().toLocaleString()}\n${designMsgRequest.message}`;
      const updatedNotes = selectedOrder.notes ? `${selectedOrder.notes}\n\n${newNote}` : newNote;

      await onUpdateOrder(selectedOrder.id, {
        notes: updatedNotes,
        staffImages: [...(selectedOrder.staffImages || []), ...designMsgRequest.attachments],
        status: OrderStatus.DESIGN,
        updatedAt: Date.now()
      });

      alert("Instructions and references sent to Design team!");
      setIsDesignMsgSidebarOpen(false);
      setDesignMsgRequest({ message: '', attachments: [] });
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
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Order Management</h2>
          <p className="text-gray-500 mt-1">Finalize files and share with production team</p>
        </div>
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
              {viewMode === 'all' ? "Showing All Orders" : "Total Orders"}
            </p>
            <p className="text-2xl font-black">{orders.length}</p>
          </div>
        </button>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center shadow-inner">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Order Status</p>
            <p className="text-lg font-bold text-gray-900 leading-tight">
              {pendingOrders.length} In Queue
              <span className="text-[10px] text-gray-400 block font-medium uppercase tracking-tighter">
                {orders.filter(o => o.status === OrderStatus.HOLD).length} On Hold • {orders.filter(o => o.status === OrderStatus.PRODUCTION).length} In Prod
              </span>
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center shadow-inner">
            <Layers size={24} />
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Layers className="text-blue-500" size={20} />
            {viewMode === 'all' ? 'Order Catalog' : 'Ready for Processing'} ({viewMode === 'all' ? orders.length : pendingOrders.length})
          </h3>
          <div className="space-y-3">
            {(viewMode === 'all' ? orders : pendingOrders).length > 0 ? (
              (viewMode === 'all' ? orders : pendingOrders).map(order => (
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
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50 text-left">
              <div className="flex items-center gap-3">
                <Logo iconOnly />
                <div className="text-left">
                  <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter">Communicate</h3>
                  <p className="text-[10px] text-brand-primary font-bold uppercase tracking-widest text-left">To Digitizing Team</p>
                </div>
              </div>
              <button
                onClick={() => setIsMsgSidebarOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
              >
                <Trash2 size={24} className="rotate-45" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 text-left">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block text-left">Instructions to Digitizer</label>
                <textarea
                  rows={6}
                  className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none text-sm font-medium resize-none shadow-inner"
                  placeholder="Provide specific details or stitching requirements..."
                  value={msgRequest.message}
                  onChange={(e) => setMsgRequest(prev => ({ ...prev, message: e.target.value }))}
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block text-left">Share Images/PDFs (Max 100MB)</label>
                <FileUpload
                  label="Upload Artworks"
                  accept="image/*,.pdf"
                  onFilesSelected={(files) => setMsgRequest(prev => ({ ...prev, attachments: files }))}
                />
                {msgRequest.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {msgRequest.attachments.map((_, i) => (
                      <div key={i} className="px-3 py-1 bg-brand-primary/10 text-brand-primary rounded-lg text-[10px] font-bold uppercase">
                        File {i + 1} Ready
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-100">
              <button
                disabled={isProcessing || !selectedOrder}
                onClick={sendToDigitizer}
                className="w-full py-5 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98]"
              >
                {isProcessing ? "Processing..." : "Send to Digitizer"}
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
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-purple-50 text-left">
              <div className="flex items-center gap-3">
                <Logo iconOnly />
                <div className="text-left">
                  <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter">Communicate</h3>
                  <p className="text-[10px] text-purple-600 font-bold uppercase tracking-widest text-left">To Design Team</p>
                </div>
              </div>
              <button
                onClick={() => setIsDesignMsgSidebarOpen(false)}
                className="p-2 hover:bg-purple-100 rounded-full transition-colors text-purple-400"
              >
                <Trash2 size={24} className="rotate-45" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 text-left">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block text-left">Instructions to Designer</label>
                <textarea
                  rows={6}
                  className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm font-medium resize-none shadow-inner"
                  placeholder="Provide design, logo placements, sizing, or layout notes..."
                  value={designMsgRequest.message}
                  onChange={(e) => setDesignMsgRequest(prev => ({ ...prev, message: e.target.value }))}
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block text-left">Share Design References (Max 100MB)</label>
                <FileUpload
                  label="Upload Ref Files (JPG/PNG/PDF)"
                  accept="image/*,.pdf"
                  onFilesSelected={(files) => setDesignMsgRequest(prev => ({ ...prev, attachments: files }))}
                />
                {designMsgRequest.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {designMsgRequest.attachments.map((_, i) => (
                      <div key={i} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-[10px] font-bold uppercase">
                        File {i + 1} Ready
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-100">
              <button
                disabled={isProcessing || !selectedOrder}
                onClick={sendToDesigner}
                className="w-full py-5 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-750 transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98]"
              >
                {isProcessing ? "Processing..." : "Send to Designer"}
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
