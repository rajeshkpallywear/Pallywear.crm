
import { motion } from 'motion/react';
import { X, User, Phone, MapPin, FileText, Globe, Clock, AlertCircle, CheckCircle, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Order, OrderStatus, UserRole } from '../types';
import ImageViewer from './ImageViewer';
import WorkflowVisualizer from './WorkflowVisualizer';
import React, { useState, useEffect } from 'react';
import { downloadOrderPDF } from '../lib/pdfHelper';

interface OrderDetailModalProps {
  order: Order;
  onClose: () => void;
  onUpdateStatus?: (status: OrderStatus) => void;
  onUpdateOrder?: (id: string, updates: Partial<Order>) => Promise<void>;
  isAdmin?: boolean;
  onReorder?: (order: Order) => void;
}

export default function OrderDetailModal({ order, onClose, onUpdateStatus, onUpdateOrder, isAdmin, onReorder }: OrderDetailModalProps) {
  const { user } = useAuth();
  const showAmountDetails = ['admin', 'accounts', 'order_management', 'delivery', UserRole.ADMIN, UserRole.ACCOUNTS, UserRole.ORDER_MANAGEMENT, UserRole.DELIVERY].includes(user?.role || '');

  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedOrder, setEditedOrder] = useState<Order>(order);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [confirmingTarget, setConfirmingTarget] = useState<'accounts' | 'design' | null>(null);
  const [designNotes, setDesignNotes] = useState('');

  useEffect(() => {
    setEditedOrder(order);
  }, [order]);

  const handleDeleteAttachment = async (field: 'staffImages' | 'staffPdfs' | 'orderManagementAttachments' | 'designAttachments' | 'machineFiles' | 'accountsAttachments', index: number) => {
    if (!window.confirm("Are you sure you want to delete this attachment? This will free up database space.")) return;
    if (!onUpdateOrder) return;
    try {
      const currentList = [...(order[field] || [])];
      currentList.splice(index, 1);
      await onUpdateOrder(order.id, {
        [field]: currentList,
        updatedAt: Date.now()
      });
      alert("Attachment deleted successfully.");
    } catch (error) {
      console.error("Failed to delete attachment:", error);
      alert("Failed to delete attachment.");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !onUpdateOrder) return;
    
    const files = Array.from(e.target.files);
    try {
      const base64Promises = files.map((file: File) => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
        });
      });
      
      const base64Images = await Promise.all(base64Promises);
      const updatedStaffImages = [...(order.staffImages || []), ...base64Images];
      
      await onUpdateOrder(order.id, {
        staffImages: updatedStaffImages,
        updatedAt: Date.now()
      });
      alert("Images uploaded successfully!");
    } catch (err) {
      console.error("Image upload failed", err);
      alert("Failed to upload images.");
    }
  };

  const handleSave = async () => {
    if (!onUpdateOrder) return;
    setIsSaving(true);
    try {
      await onUpdateOrder(order.id, { ...editedOrder, updatedAt: Date.now() });
      setIsEditing(false);
    } catch (error) {
      alert("Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusStyles = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.DRAFT: return 'bg-gray-100 text-gray-600';
      case OrderStatus.PENDING: return 'bg-red-100 text-red-700';
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

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[40px] shadow-2xl w-full max-w-5xl overflow-hidden"
      >
        <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <h3 className="text-3xl font-black text-gray-900 tracking-tighter">Order Details</h3>
              <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-widest ${getStatusStyles(order.status)}`}>
                {order.status.replace('_', ' ')}
              </span>
              {order.isUrgent && (
                <span className="bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-lg animate-pulse uppercase">URGENT</span>
              )}
            </div>
            <span className="text-xs font-mono text-gray-400 mt-1 uppercase tracking-widest flex flex-wrap items-center gap-x-4">
              <span>Access Protocol - ID: #{order.id}</span>
              {order.assignedDesigner && (
                <span className="text-purple-650 font-black">
                  🎨 Designer: {order.assignedDesigner}
                </span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {!isEditing && onReorder && user?.role === 'user' && (
              <button
                onClick={() => {
                  onReorder(order);
                  onClose();
                }}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-md flex items-center gap-2 cursor-pointer"
                title="Create a new order based on this order's client details"
              >
                Create New Order
              </button>
            )}
            {!isEditing && (
              <button
                onClick={() => downloadOrderPDF(order)}
                className="px-6 py-3 bg-white text-brand-primary border border-gray-200 hover:border-brand-primary rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-brand-primary/5 transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                title="Download Order PDF"
              >
                <Download size={13} />
                <span>PDF Download</span>
              </button>
            )}
            {isAdmin && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-6 py-3 bg-brand-primary text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-brand-primary/90 transition-all shadow-md"
              >
                Edit Report
              </button>
            )}
            {isEditing && (
              <button
                disabled={isSaving}
                onClick={handleSave}
                className="px-6 py-3 bg-green-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-green-700 transition-all shadow-md flex items-center gap-2"
              >
                {isSaving ? 'Saving...' : 'Confirm Update'}
              </button>
            )}
            {isEditing && (
              <button
                onClick={() => { setIsEditing(false); setEditedOrder(order); }}
                className="px-6 py-3 bg-gray-200 text-gray-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-300 transition-all"
              >
                Cancel
              </button>
            )}
            <button
              onClick={onClose}
              className="p-3 hover:bg-white rounded-2xl shadow-sm border border-transparent hover:border-gray-100 transition-all text-gray-400 hover:text-gray-900"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-8 flex flex-col gap-8 max-h-[70vh] overflow-y-auto">
          {/* Design Attachments Room with full HD & download */}
          {(() => {
            const designFilesList: {
              id: string;
              source: string;
              url: string;
              type: 'image' | 'pdf' | 'zip' | 'other';
              color: string;
              textColor: string;
            }[] = [];

            if (order.designAttachments) {
              order.designAttachments.forEach((url, i) => {
                designFilesList.push({
                  id: `design-${i}`,
                  source: 'Art Studio Design',
                  url,
                  type: url.startsWith('data:image/') || url.includes('.png') || url.includes('.jpg') || url.includes('.jpeg') 
                    ? 'image' 
                    : (url.startsWith('data:application/pdf') || url.includes('.pdf') ? 'pdf' : 'other'),
                  color: 'bg-purple-100/60 border-purple-200 text-purple-700',
                  textColor: 'text-purple-700'
                });
              });
            }

            if (order.staffImages) {
              order.staffImages.forEach((url, i) => {
                designFilesList.push({
                  id: `staff-img-${i}`,
                  source: 'Customer Intake Reference',
                  url,
                  type: 'image',
                  color: 'bg-emerald-100/60 border-emerald-200 text-emerald-700',
                  textColor: 'text-emerald-700'
                });
              });
            }

            if (order.staffPdfs) {
              order.staffPdfs.forEach((url, i) => {
                designFilesList.push({
                  id: `staff-pdf-${i}`,
                  source: 'Requirement Specs PDF',
                  url,
                  type: 'pdf',
                  color: 'bg-indigo-100/60 border-indigo-200 text-indigo-700',
                  textColor: 'text-indigo-700'
                });
              });
            }

            if (order.machineFiles) {
              order.machineFiles.forEach((url, i) => {
                designFilesList.push({
                  id: `machine-${i}`,
                  source: 'Embroidery Machine Outward (ZIP)',
                  url,
                  type: 'zip',
                  color: 'bg-blue-100/60 border-blue-200 text-blue-700',
                  textColor: 'text-blue-700'
                });
              });
            }

            if (order.orderManagementAttachments) {
              order.orderManagementAttachments.forEach((url, i) => {
                designFilesList.push({
                  id: `om-${i}`,
                  source: 'Work Orders File',
                  url,
                  type: url.includes('.pdf') ? 'pdf' : (url.includes('.zip') ? 'zip' : 'image'),
                  color: 'bg-cyan-100/60 border-cyan-200 text-cyan-700',
                  textColor: 'text-cyan-700'
                });
              });
            }

            if (order.accountsAttachments) {
              order.accountsAttachments.forEach((url, i) => {
                designFilesList.push({
                  id: `accounts-${i}`,
                  source: 'Billing Receipt Docs',
                  url,
                  type: url.startsWith('data:image/') || url.includes('.png') || url.includes('.jpg') || url.includes('.jpeg') ? 'image' : 'pdf',
                  color: 'bg-amber-100/60 border-amber-200 text-amber-700',
                  textColor: 'text-amber-700'
                });
              });
            }

            return (
              <div className="bg-slate-50 rounded-[32px] p-6 border border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div>
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse inline-block"></span>
                      ACTIVE DESIGN ATTACHMENTS & REFERENCES
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium">Browse design specifications, active drawings, and machine patterns.</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {onUpdateOrder && (
                      <label className="bg-brand-primary hover:bg-brand-primary/95 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all cursor-pointer shadow-sm active:scale-95 flex items-center gap-1">
                        Upload Image
                        <input 
                          type="file" 
                          accept="image/*" 
                          multiple 
                          className="hidden" 
                          onChange={handleImageUpload} 
                        />
                      </label>
                    )}
                    <span className="px-3 py-2 bg-white border border-slate-200 text-slate-650 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                      {designFilesList.length} Total Files
                    </span>
                  </div>
                </div>

                {designFilesList.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {designFilesList.map((file, idx) => (
                      <div
                        key={file.id}
                        className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col justify-between hover:shadow-lg transition-all hover:border-brand-primary/20 group relative overflow-hidden"
                      >
                        <div className="flex items-start gap-3">
                          {/* Left visual representation */}
                          <div
                            onClick={() => setViewingImage(file.url)}
                            className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-100 flex-shrink-0 overflow-hidden flex items-center justify-center text-slate-400 group-hover:border-brand-primary/20 transition-colors cursor-pointer"
                          >
                            {file.type === 'image' ? (
                              <img src={file.url} className="w-full h-full object-cover" />
                            ) : (
                              <FileText size={28} className={file.textColor} />
                            )}
                          </div>

                          {/* Right info text */}
                          <div className="flex-1 min-w-0">
                            <span className={`inline-block text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md mb-1 ${file.color} ${file.textColor}`}>
                              {file.source}
                            </span>
                            <h5 className="text-xs font-bold text-slate-700 truncate" title={`Attachment #${idx + 1}`}>
                              {`Attachment #${idx + 1}`}
                            </h5>
                            <p className="text-[9px] text-slate-400 font-mono mt-0.5 uppercase">
                              {file.type === 'image' ? 'Image File (HD)' : file.type === 'pdf' ? 'PDF Document' : file.type === 'zip' ? 'Machine ZIP' : 'Attached Spec'}
                            </p>
                          </div>
                        </div>

                        {/* Integrated view/download button actions */}
                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-50">
                          <button
                            onClick={() => setViewingImage(file.url)}
                            className="flex-1 py-1.5 px-2 bg-brand-primary text-white hover:bg-brand-primary/95 rounded-lg font-black text-[9px] uppercase tracking-wider active:scale-95 transition-all text-center flex items-center justify-center gap-1 cursor-pointer"
                          >
                            View Full HD
                          </button>
                          <button
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = file.url;
                              link.download = `pallywear_design_${order.id.slice(-6)}_attachment_${idx + 1}`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                            className="py-1.5 px-2 bg-slate-150 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg font-black text-[9px] uppercase tracking-wider active:scale-95 transition-all text-center flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Download size={10} />
                            <span>Download</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-white border border-slate-150 rounded-2xl flex flex-col items-center justify-center">
                    <FileText size={40} className="text-slate-300 mb-2" />
                    <p className="text-xs font-black text-slate-700 uppercase tracking-widest">No Design Files Available</p>
                    <p className="text-[10px] text-slate-400 max-w-xs mt-1">
                      No customer sketches or designer drafts have been uploaded for order #{order.id.slice(-6)} yet.
                    </p>
                  </div>
                )}
              </div>
            );
          })()}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {order.notes && (
                <div className="bg-purple-50/50 p-6 rounded-[32px] border border-purple-100 shadow-sm">
                  <p className="text-[10px] font-black text-purple-900 uppercase tracking-[0.2em] mb-3 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-600 inline-block"></span>
                    Order Specification Notes & History
                  </p>
                  <div className="bg-white rounded-2xl p-4 border border-purple-50/50 max-h-60 overflow-y-auto shadow-inner">
                    <p className="text-xs font-semibold text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {order.notes}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-8">
                <div className="bg-gray-50/50 p-6 rounded-[32px] border border-gray-100/50 shadow-sm">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Customer Contact</p>
                  <div className="space-y-3">
                    {isEditing ? (
                      <>
                        <input
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-sm"
                          value={editedOrder.customerInfo.name}
                          onChange={e => setEditedOrder({ ...editedOrder, customerInfo: { ...editedOrder.customerInfo, name: e.target.value } })}
                          placeholder="Customer Name"
                        />
                        <input
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-sm"
                          value={editedOrder.customerInfo.companyName || ''}
                          onChange={e => setEditedOrder({ ...editedOrder, customerInfo: { ...editedOrder.customerInfo, companyName: e.target.value } })}
                          placeholder="Company Name"
                        />
                        <input
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-sm"
                          value={editedOrder.customerInfo.phone}
                          onChange={e => setEditedOrder({ ...editedOrder, customerInfo: { ...editedOrder.customerInfo, phone: e.target.value } })}
                          placeholder="Phone"
                        />
                        <textarea
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-xs"
                          value={editedOrder.customerInfo.address}
                          onChange={e => setEditedOrder({ ...editedOrder, customerInfo: { ...editedOrder.customerInfo, address: e.target.value } })}
                          placeholder="Address"
                          rows={2}
                        />
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-3 text-gray-900 font-bold">
                          <User size={18} className="text-brand-primary" />
                          {order.customerInfo.name}
                        </div>
                        {order.customerInfo.companyName && (
                          <div className="flex items-center gap-3 text-brand-primary font-black uppercase tracking-wider text-xs">
                            <Globe size={18} className="text-brand-primary" />
                            {order.customerInfo.companyName}
                          </div>
                        )}
                        <div className="flex items-center gap-3 text-gray-500 text-sm font-medium">
                          <Phone size={18} className="text-brand-primary/60" />
                          {order.customerInfo.phone}
                        </div>
                        <div className="flex flex-start gap-3 text-gray-500 text-xs mt-2 italic leading-relaxed">
                          <MapPin size={18} className="text-brand-primary/40 shrink-0" />
                          {order.customerInfo.address}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {showAmountDetails && (
                  <div className="bg-brand-primary/5 p-6 rounded-[32px] border border-brand-primary/10 shadow-sm flex flex-col justify-between">
                    <p className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em] mb-2">Billing Data</p>
                    <div className="space-y-4">
                      {isEditing ? (
                        <div className="space-y-2">
                          <div>
                            <label className="text-[8px] font-black text-gray-400 uppercase">Grand Total</label>
                            <input
                              type="number"
                              className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl font-black text-lg"
                              value={editedOrder.financials.totalAmount}
                              onChange={e => {
                                const total = parseFloat(e.target.value) || 0;
                                setEditedOrder({ ...editedOrder, financials: { ...editedOrder.financials, totalAmount: total, balanceAmount: total - editedOrder.financials.advancePay } });
                              }}
                            />
                          </div>
                          <div>
                            <label className="text-[8px] font-black text-gray-400 uppercase">Advance Paid</label>
                            <input
                              type="number"
                              className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl font-bold text-sm text-green-600"
                              value={editedOrder.financials.advancePay}
                              onChange={e => {
                                const adv = parseFloat(e.target.value) || 0;
                                setEditedOrder({ ...editedOrder, financials: { ...editedOrder.financials, advancePay: adv, balanceAmount: editedOrder.financials.totalAmount - adv } });
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-end">
                            <span className="text-[10px] font-bold text-gray-500 uppercase">Grand Total</span>
                            <span className="text-2xl font-black text-gray-900">₹{(order.financials?.totalAmount || 0).toLocaleString()}</span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="font-bold text-green-600">Paid Amount</span>
                              <span className="font-black text-gray-900">₹{(order.financials?.advancePay || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="font-bold text-red-600">Pending Pay</span>
                              <span className="font-black text-gray-900">₹{(order.financials?.balanceAmount || 0).toLocaleString()}</span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white border border-gray-100 rounded-[32px] shadow-sm p-6 overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Itemised Breakdown</p>
                  <span className="px-3 py-1 bg-gray-50 text-gray-500 rounded-full text-[10px] font-black uppercase tracking-widest">
                    {order.sizeBreakdown?.reduce((sum, i) => sum + i.quantity, 0) || order.quantity || 0} Total Units
                  </span>
                </div>
                <div className="space-y-3">
                  {order.sizeBreakdown?.map((item, idx) => (
                    <div key={idx} className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100 hover:border-brand-primary/20 transition-all">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-black text-brand-primary uppercase tracking-tight">{item.category}</span>
                        <span className="text-xs font-black text-gray-900 bg-white px-2 py-1 rounded-lg border border-gray-100 shadow-sm">{item.size}</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        {item.material && <div><span className="text-[8px] text-gray-400 block mb-0.5">Material</span>{item.material}</div>}
                        {item.colour && <div><span className="text-[8px] text-gray-400 block mb-0.5">Colour</span>{item.colour}</div>}
                        {item.printType && <div><span className="text-[8px] text-gray-400 block mb-0.5">Print</span>{item.printType}</div>}
                        {item.model && <div><span className="text-[8px] text-gray-400 block mb-0.5">Model</span>{item.model}</div>}
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-end">
                        <div className="flex items-center gap-4">
                          <span className="text-[10px] font-black text-gray-900">Qty: {item.quantity}</span>
                          {showAmountDetails && <span className="text-[10px] font-black text-brand-primary">Rate: ₹{item.price}</span>}
                        </div>
                        {showAmountDetails && (
                          <span className="text-xs font-black text-gray-900">Total: ₹{(item.quantity * (item.price || 0)).toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {!order.sizeBreakdown?.length && (
                    <div className="p-8 text-center text-gray-400 italic text-xs bg-gray-50 rounded-[24px]">
                      No specific size breakdown available for this record.
                    </div>
                  )}
                </div>
              </div>

              {Object.keys(order.details || {}).length > 0 && (
                <div className="bg-gray-50/30 rounded-[32px] p-6 border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Technical Details</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(order.details).map(([k, v]) => (
                      <div key={k} className="px-3 py-2 bg-white rounded-xl border border-gray-100 shadow-sm">
                        <span className="text-[10px] font-black text-gray-400 uppercase block">{k}</span>
                        <span className="text-sm font-bold text-gray-900">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="bg-gray-50/50 p-6 rounded-[32px] border border-gray-100/50 shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Visual Evidence</p>
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Pictures</p>
                    <div className="flex flex-wrap gap-2">
                      {order.staffImages?.map((img, i) => (
                        <div key={i} className="relative group w-16 h-16">
                          <div
                            onClick={() => setViewingImage(img)}
                            className="w-full h-full rounded-xl border border-white shadow-sm overflow-hidden cursor-pointer hover:scale-105 transition-all"
                          >
                            <img src={img} className="w-full h-full object-cover" />
                          </div>
                          {onUpdateOrder && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteAttachment('staffImages', i); }}
                              className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10 cursor-pointer"
                            >
                              <X size={10} />
                            </button>
                          )}
                        </div>
                      ))}
                      {!order.staffImages?.length && <span className="text-[10px] text-gray-300 italic">None</span>}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Documents</p>
                    <div className="flex flex-wrap gap-2">
                      {order.staffPdfs?.map((pdf, i) => (
                        <div key={i} className="relative group w-16 h-16">
                          <div
                            onClick={() => setViewingImage(pdf)}
                            className="w-full h-full rounded-xl bg-white border border-gray-100 flex items-center justify-center cursor-pointer hover:shadow-md transition-all text-gray-400 hover:text-brand-primary"
                            title="Staff PDF"
                          >
                            <FileText size={24} />
                          </div>
                          {onUpdateOrder && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteAttachment('staffPdfs', i); }}
                              className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10 cursor-pointer"
                            >
                              <X size={10} />
                            </button>
                          )}
                        </div>
                      ))}
                      {!order.staffPdfs?.length && <span className="text-[10px] text-gray-300 italic">None</span>}
                    </div>
                  </div>
                  {order.orderManagementAttachments?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-blue-500 uppercase mb-2">Management Files</p>
                      <div className="flex flex-wrap gap-2">
                        {order.orderManagementAttachments.map((file, i) => (
                          <div key={i} className="relative group w-16 h-16">
                            <div
                              onClick={() => setViewingImage(file)}
                              className="w-full h-full rounded-xl bg-blue-50 border border-blue-100 flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-all text-blue-500"
                            >
                              {file.includes('zip') ? <Download size={24} /> : <FileText size={24} />}
                            </div>
                            {onUpdateOrder && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteAttachment('orderManagementAttachments', i); }}
                                className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10 cursor-pointer"
                              >
                                <X size={10} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {order.designAttachments?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-purple-500 uppercase mb-2">Art Studio Files</p>
                      <div className="flex flex-wrap gap-2">
                        {order.designAttachments.map((file, i) => (
                          <div key={i} className="relative group w-16 h-16">
                            <div
                              onClick={() => setViewingImage(file)}
                              className="w-full h-full rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center cursor-pointer hover:shadow-md transition-all text-purple-500"
                            >
                              {file.startsWith('data:image/') ? <img src={file} className="w-full h-full object-cover rounded-xl" /> : <FileText size={24} />}
                            </div>
                            {onUpdateOrder && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteAttachment('designAttachments', i); }}
                                className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10 cursor-pointer"
                              >
                                <X size={10} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {order.machineFiles?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-indigo-500 uppercase mb-2">Machine Language (ZIP)</p>
                      <div className="flex flex-wrap gap-2">
                        {order.machineFiles.map((file, i) => (
                          <div key={i} className="relative group w-16 h-16">
                            <div
                              onClick={() => setViewingImage(file)}
                              className="w-full h-full rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center cursor-pointer hover:shadow-md transition-all text-indigo-500"
                            >
                              <Download size={24} />
                            </div>
                            {onUpdateOrder && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteAttachment('machineFiles', i); }}
                                className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10 cursor-pointer"
                              >
                                <X size={10} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {order.accountsAttachments?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-amber-500 uppercase mb-2">Billing Docs</p>
                      <div className="flex flex-wrap gap-2">
                        {order.accountsAttachments.map((file, i) => (
                          <div key={i} className="relative group w-16 h-16">
                            <div
                              onClick={() => setViewingImage(file)}
                              className="w-full h-full rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center cursor-pointer hover:shadow-md transition-all text-amber-500"
                            >
                              {file.startsWith('data:image/') ? <img src={file} className="w-full h-full object-cover rounded-xl" /> : <FileText size={24} />}
                            </div>
                            {onUpdateOrder && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteAttachment('accountsAttachments', i); }}
                                className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10 cursor-pointer"
                              >
                                <X size={10} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {(onUpdateStatus || onUpdateOrder) && (
                <div className="bg-gray-900 p-6 rounded-[32px] shadow-xl text-white space-y-4">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Management Actions</p>
                  <div className="grid grid-cols-1 gap-2">
                    {order.status === OrderStatus.HOLD ? (
                      <div className="space-y-3">
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl">
                          <p className="text-[10px] font-black text-red-400 uppercase mb-1">Hold Reason</p>
                          <p className="text-sm font-bold text-red-700">{order.holdReason || 'No reason provided'}</p>
                        </div>
                        <button
                          disabled={isProcessingAction}
                          onClick={async () => {
                            const newStatus = order.previousStatus || OrderStatus.ACCOUNTS;
                            if (window.confirm(`Release order back to ${newStatus.replace('_', ' ')}?`)) {
                              setIsProcessingAction(true);
                              try {
                                if (onUpdateOrder) {
                                  await onUpdateOrder(order.id, {
                                    status: newStatus,
                                    previousStatus: undefined,
                                    updatedAt: Date.now()
                                  });
                                } else if (onUpdateStatus) {
                                  onUpdateStatus(newStatus);
                                }
                                alert("Order released successfully.");
                              } catch (e) {
                                alert("Failed to release order.");
                              } finally {
                                setIsProcessingAction(false);
                              }
                            }
                          }}
                          className="w-full py-3 bg-green-500/20 text-green-400 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-green-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <CheckCircle size={14} /> {isProcessingAction ? 'Processing...' : 'Release Order'}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {order.status === OrderStatus.PENDING && (
                          <div className="space-y-2">
                            {((order.financials?.advancePay || 0) <= 0) && (
                              <p className="text-[10px] text-amber-650 font-black text-center uppercase tracking-wider">
                                * Advance payment must be received to send to Accounts
                              </p>
                            )}
                            {confirmingTarget === 'accounts' ? (
                              <div className="bg-amber-50 border border-amber-300 p-4 rounded-xl space-y-2 text-center">
                                <p className="text-xs font-black text-amber-900 uppercase tracking-wider">Confirm manual send to Accounts?</p>
                                <div className="flex gap-2 justify-center">
                                  <button
                                    onClick={async () => {
                                      setConfirmingTarget(null);
                                      setIsProcessingAction(true);
                                      try {
                                        if (onUpdateOrder) {
                                          await onUpdateOrder(order.id, {
                                            status: OrderStatus.ACCOUNTS,
                                            updatedAt: Date.now()
                                          });
                                        } else if (onUpdateStatus) {
                                          onUpdateStatus(OrderStatus.ACCOUNTS);
                                        }
                                        alert("Order successfully sent to Accounts.");
                                      } catch (e) {
                                        alert("Failed to send order.");
                                      } finally {
                                        setIsProcessingAction(false);
                                      }
                                    }}
                                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-black text-[10px] uppercase tracking-wider cursor-pointer flex-1"
                                  >
                                    Confirm Send
                                  </button>
                                  <button
                                    onClick={() => setConfirmingTarget(null)}
                                    className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg font-black text-[10px] uppercase tracking-wider cursor-pointer flex-1"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                disabled={isProcessingAction}
                                onClick={() => {
                                  if ((order.financials?.advancePay || 0) <= 0) {
                                    alert("Cannot send to Accounts: Send to Accounts is only permitted when an advance amount has been received (Advance Pay > 0).");
                                    return;
                                  }
                                  setConfirmingTarget('accounts');
                                }}
                                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50 font-black cursor-pointer"
                              >
                                <CheckCircle size={14} /> Send to Accounts
                              </button>
                            )}

                            {confirmingTarget === 'design' ? (
                              <div className="bg-purple-50 border border-purple-300 p-4 rounded-xl space-y-3 text-left">
                                <p className="text-xs font-black text-purple-900 uppercase tracking-wider text-center">Send Order to Designers</p>
                                
                                {order.notes && (
                                  <div className="bg-white border border-purple-105 rounded-lg p-2 max-h-32 overflow-y-auto">
                                    <p className="text-[9px] font-black text-purple-400 uppercase tracking-widest mb-1">Previous Notes</p>
                                    <p className="text-[10.5px] text-gray-600 font-medium whitespace-pre-wrap">{order.notes}</p>
                                  </div>
                                )}

                                <div className="space-y-1">
                                  <label className="text-[9.5px] font-black text-purple-700 uppercase tracking-wider">Design Instructions / Notes</label>
                                  <textarea
                                    rows={3}
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none text-xs font-medium resize-none text-gray-800"
                                    placeholder="Enter instructions, notes or comments for designers..."
                                    value={designNotes}
                                    onChange={(e) => setDesignNotes(e.target.value)}
                                  />
                                </div>

                                <div className="flex gap-2 justify-center pt-1">
                                  <button
                                    onClick={async () => {
                                      const textMsg = designNotes.trim();
                                      const timestamp = new Date().toLocaleString();
                                      const newNote = `[STAFF -> DESIGNER] ${timestamp}: ${textMsg || 'No notes specified.'}`;
                                      const updatedNotes = order.notes ? `${order.notes}\n\n${newNote}` : newNote;
                                      
                                      setConfirmingTarget(null);
                                      setIsProcessingAction(true);
                                      try {
                                        if (onUpdateOrder) {
                                          await onUpdateOrder(order.id, {
                                            status: OrderStatus.DESIGN,
                                            notes: updatedNotes,
                                            updatedAt: Date.now()
                                          });
                                        } else if (onUpdateStatus) {
                                          onUpdateStatus(OrderStatus.DESIGN);
                                        }
                                        setDesignNotes('');
                                        alert("Order successfully sent to Designers.");
                                      } catch (e) {
                                        alert("Failed to send order.");
                                      } finally {
                                        setIsProcessingAction(false);
                                      }
                                    }}
                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-black text-[10px] uppercase tracking-wider cursor-pointer flex-1 text-center"
                                  >
                                    Confirm Send
                                  </button>
                                  <button
                                    onClick={() => {
                                      setConfirmingTarget(null);
                                      setDesignNotes('');
                                    }}
                                    className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg font-black text-[10px] uppercase tracking-wider cursor-pointer flex-1 text-center"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                disabled={isProcessingAction}
                                onClick={() => setConfirmingTarget('design')}
                                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50 font-black cursor-pointer"
                              >
                                <CheckCircle size={14} /> Send to Designers
                              </button>
                            )}
                          </div>
                        )}

                        {order.status === OrderStatus.ACCOUNTS && (
                          <button
                            disabled={isProcessingAction}
                            onClick={async () => {
                              setIsProcessingAction(true);
                              try {
                                if (onUpdateOrder) {
                                  await onUpdateOrder(order.id, { status: OrderStatus.ORDER_MANAGEMENT, updatedAt: Date.now() });
                                } else if (onUpdateStatus) {
                                  onUpdateStatus(OrderStatus.ORDER_MANAGEMENT);
                                }
                                alert("Order moved to Order Management.");
                              } catch (e) {
                                alert("Action failed.");
                              } finally {
                                setIsProcessingAction(false);
                              }
                            }}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50 font-black cursor-pointer"
                          >
                            <CheckCircle size={14} /> Move to Order Management
                          </button>
                        )}

                        {order.status === OrderStatus.ORDER_MANAGEMENT && (
                          <button
                            disabled={isProcessingAction}
                            onClick={async () => {
                              setIsProcessingAction(true);
                              try {
                                if (onUpdateOrder) {
                                  await onUpdateOrder(order.id, { status: OrderStatus.PRODUCTION, updatedAt: Date.now() });
                                } else if (onUpdateStatus) {
                                  onUpdateStatus(OrderStatus.PRODUCTION);
                                }
                                alert("Order moved to Production.");
                              } catch (e) {
                                alert("Action failed.");
                              } finally {
                                setIsProcessingAction(false);
                              }
                            }}
                            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50 font-black cursor-pointer"
                          >
                            <CheckCircle size={14} /> Move to Production
                          </button>
                        )}

                        {order.status === OrderStatus.PRODUCTION && (
                          <button
                            disabled={isProcessingAction}
                            onClick={async () => {
                              setIsProcessingAction(true);
                              try {
                                if (onUpdateOrder) {
                                  await onUpdateOrder(order.id, { status: OrderStatus.DELIVERY, updatedAt: Date.now() });
                                } else if (onUpdateStatus) {
                                  onUpdateStatus(OrderStatus.DELIVERY);
                                }
                                alert("Order moved to Delivery.");
                              } catch (e) {
                                alert("Action failed.");
                              } finally {
                                setIsProcessingAction(false);
                              }
                            }}
                            className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50 font-black cursor-pointer"
                          >
                            <CheckCircle size={14} /> Move to Delivery
                          </button>
                        )}

                        {order.status === OrderStatus.DELIVERY && (
                          <button
                            disabled={isProcessingAction}
                            onClick={async () => {
                              setIsProcessingAction(true);
                              try {
                                if (onUpdateOrder) {
                                  await onUpdateOrder(order.id, { status: OrderStatus.DELIVERED, updatedAt: Date.now() });
                                } else if (onUpdateStatus) {
                                  onUpdateStatus(OrderStatus.DELIVERED);
                                }
                                alert("Order marked as Delivered / Completed.");
                              } catch (e) {
                                alert("Action failed.");
                              } finally {
                                setIsProcessingAction(false);
                              }
                            }}
                            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50 font-black cursor-pointer"
                          >
                            <CheckCircle size={14} /> Mark as Delivered / Completed
                          </button>
                        )}

                        <button
                          disabled={isProcessingAction}
                          onClick={async () => {
                            const reason = window.prompt("Enter Mandatory Hold Reason:");
                            if (reason === null) return;
                            if (!reason.trim()) {
                              alert("Hold reason is required.");
                              return;
                            }

                            setIsProcessingAction(true);
                            try {
                              const newNote = `[HOLD] ${new Date().toLocaleString()}: ${reason}`;
                              const updatedNotes = order.notes ? `${order.notes}\n${newNote}` : newNote;

                              const updates = {
                                status: OrderStatus.HOLD,
                                holdReason: reason.trim(),
                                previousStatus: order.status,
                                notes: updatedNotes,
                                updatedAt: Date.now()
                              };

                              if (onUpdateOrder) {
                                await onUpdateOrder(order.id, updates);
                              } else if (onUpdateStatus) {
                                onUpdateStatus(OrderStatus.HOLD);
                              }
                              alert("Order put on HOLD.");
                            } catch (e) {
                              alert("Failed to put order on hold.");
                            } finally {
                              setIsProcessingAction(false);
                            }
                          }}
                          className="w-full py-3 bg-red-500/20 text-red-400 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <AlertCircle size={14} /> {isProcessingAction ? 'Processing...' : 'Hold Order'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

        <div className="p-8 bg-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-6 text-gray-400">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest">Timestamp</span>
              <span className="text-sm font-black text-gray-900">{new Date(order.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="w-px h-8 bg-gray-200 hidden sm:block" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest">Agent</span>
              <span className="text-sm font-black text-gray-900">{order.customerInfo.name.split(' ')[0]} Hub</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-10 py-4 bg-black text-white rounded-[24px] font-black uppercase tracking-[0.1em] text-xs hover:bg-gray-800 active:scale-95 transition-all shadow-xl"
          >
            Close Report
          </button>
        </div>

        {viewingImage && (
          <ImageViewer src={viewingImage} onClose={() => setViewingImage(null)} fileName={`Order_${order.id}`} />
        )}
      </motion.div>
    </div>
  );
}
