/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { Factory, Download, ChevronRight, FileText, CheckCircle, Package, ZoomIn, Share2, Globe, Trash2, TrendingUp } from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { getDisplayCategory, cn } from '../lib/utils';
import OrderDetailModal from './OrderDetailModal';
import ImageViewer from './ImageViewer';

interface ProductionDashboardProps {
  orders: Order[];
  onUpdateOrder: (id: string, updates: Partial<Order>) => Promise<void>;
  onDeleteOrder?: (id: string) => void;
  isAdmin?: boolean;
}

export default function ProductionDashboard({ orders, onUpdateOrder, onDeleteOrder, isAdmin }: ProductionDashboardProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedSection, setSelectedSection] = useState<'total' | 'hold' | 'completed'>('total');
  const [selectedHubOrder, setSelectedHubOrder] = useState<Order | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const pendingOrders = orders.filter(o => o.status === OrderStatus.PRODUCTION || (o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.PRODUCTION));

  const filteredOrders = orders.filter(o => {
    if (selectedSection === 'hold') {
      return o.status === OrderStatus.HOLD;
    }
    if (selectedSection === 'completed') {
      return o.status === OrderStatus.DELIVERED;
    }
    return true;
  });

  const totalOrdersCount = orders.length;
  const holdOrdersCount = orders.filter(o => o.status === OrderStatus.HOLD).length;
  const completedOrdersCount = orders.filter(o => o.status === OrderStatus.DELIVERED).length;

  const handleFinishProduction = async () => {
    if (!selectedOrder || isProcessing) return;
    setIsProcessing(true);

    try {
      await onUpdateOrder(selectedOrder.id, {
        status: OrderStatus.DELIVERY,
        updatedAt: Date.now()
      });

      setSelectedOrder(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadAllAttachments = (order: Order) => {
    const allAttachments = [
      ...(order.staffImages || []),
      ...(order.staffPdfs || []),
      ...(order.accountsAttachments || []),
      ...(order.designAttachments || []),
      ...(order.machineFiles || []),
      ...(order.orderManagementAttachments || [])
    ].filter(Boolean);

    if (allAttachments.length === 0) {
      alert('No attachments found for this order.');
      return;
    }

    const confirmMsg = `This will attempt to open ${allAttachments.length} files in separate tabs. Please allow popups if prompted. Continue?`;
    if (allAttachments.length > 1 && !confirm(confirmMsg)) {
      return;
    }

    allAttachments.forEach((url, i) => {
      setTimeout(() => {
        window.open(url, '_blank');
      }, i * 300); // Stagger to avoid browser popup blockers
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Production Team</h2>
          <p className="text-gray-500 mt-1">Download production files and move to delivery</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
        >
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Sync Data
        </button>
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
              All production entries
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
            <Factory size={24} />
          </div>
          <div>
            <p className={cn("text-[10px] font-black uppercase tracking-widest", selectedSection === 'hold' ? "text-white/70" : "text-gray-500")}>
              Hold Orders
            </p>
            <p className="text-2xl font-black">{holdOrdersCount}</p>
            <span className={cn("text-[9px] font-semibold block mt-0.5", selectedSection === 'hold' ? "text-white/60" : "text-gray-400")}>
              On-hold runs
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
            <TrendingUp size={24} />
          </div>
          <div>
            <p className={cn("text-[10px] font-black uppercase tracking-widest", selectedSection === 'completed' ? "text-white/70" : "text-gray-500")}>
              Completed Orders
            </p>
            <p className="text-2xl font-black">{completedOrdersCount}</p>
            <span className={cn("text-[9px] font-semibold block mt-0.5", selectedSection === 'completed' ? "text-white/60" : "text-gray-400")}>
              Dispatched and closed
            </span>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
            <Factory className="text-purple-600" size={16} />
            {selectedSection === 'total' ? 'All Production Lines' : selectedSection === 'hold' ? 'On Hold Lines' : 'Completed Runs'} ({filteredOrders.length})
          </h3>
          <div className="space-y-3">
            {filteredOrders.length > 0 ? (
              filteredOrders.map(order => (
                <button
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className={`w-full text-left p-5 rounded-3xl border transition-all ${selectedOrder?.id === order.id
                    ? 'bg-black text-white border-black shadow-lg scale-[1.02]'
                    : 'bg-white border-gray-100 hover:border-gray-300 shadow-sm'
                    }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <div className="flex flex-col">
                        <span className="text-xs font-mono opacity-60">#{order.id.slice(-6)}</span>
                        {order.status === OrderStatus.HOLD && (
                          <span className="bg-orange-500 text-white text-[9px] font-black px-1.5 rounded w-fit mt-1">ON HOLD</span>
                        )}
                        {order.isUrgent && (
                          <span className="bg-red-500 text-white text-[10px] font-black px-1.5 rounded animate-pulse w-fit mt-0.5">URGENT</span>
                        )}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 bg-purple-500/20 text-purple-200 text-[8px] uppercase font-bold rounded">
                      {getDisplayCategory(order)}
                    </span>
                  </div>
                  <div className="font-bold text-lg mb-1">{order.customerInfo.name}</div>
                  {order.status === OrderStatus.HOLD && order.holdReason && (
                    <div className="text-[10px] text-red-500 font-bold mt-1 bg-red-50 px-1.5 py-0.5 rounded italic border border-red-100 mb-2">
                      Reason: {order.holdReason}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[10px] font-bold ${selectedOrder?.id === order.id ? 'text-gray-400' : 'text-gray-500'}`}>
                      Assets Ready
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-12 bg-gray-50 border border-dashed border-gray-200 rounded-3xl text-center">
                <CheckCircle className="mx-auto text-gray-300 mb-2" size={32} />
                <p className="text-sm text-gray-500">All current orders are finished!</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          {selectedOrder ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden"
            >
              <div className="p-8 bg-black text-white">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Production Order</span>
                    <h4 className="text-3xl font-black italic tracking-tighter">#{selectedOrder.id.slice(-8)}</h4>
                  </div>
                  <button
                    onClick={() => downloadAllAttachments(selectedOrder)}
                    className="bg-white text-black px-6 py-3 rounded-full font-bold text-sm flex items-center gap-2 hover:bg-gray-200 transition-colors"
                  >
                    <Download size={18} />
                    Download All Assets
                  </button>
                </div>
              </div>

              <div className="p-8">
                <div className="mb-8 p-6 bg-gray-50 border border-gray-100 rounded-3xl">
                  <div className="flex items-center justify-between mb-4">
                    <h6 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Order Details & Breakdown</h6>
                    <div className="flex items-center gap-4">
                      <span className="px-3 py-1 bg-black text-white rounded-lg text-[10px] font-bold uppercase">{getDisplayCategory(selectedOrder)}</span>
                      <span className="text-xs font-bold text-gray-900 italic">Total: {selectedOrder.quantity} pcs</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {selectedOrder.sizeBreakdown?.map((item, idx) => (
                      <div key={idx} className="p-4 bg-white border border-gray-100 shadow-sm rounded-2xl flex flex-col gap-2 group hover:border-brand-primary/20 transition-all">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-black text-brand-primary uppercase tracking-tighter">{item.category}</span>
                          <span className="text-[10px] font-black text-gray-900 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{item.size}</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                          {item.colour && <div><span className="text-[8px] text-gray-400 block mb-0.5">Colour</span>{item.colour}</div>}
                          {item.printType && <div><span className="text-[8px] text-gray-400 block mb-0.5">Print</span>{item.printType}</div>}
                          {item.material && <div><span className="text-[8px] text-gray-400 block mb-0.5">Material</span>{item.material}</div>}
                          {item.model && <div><span className="text-[8px] text-gray-400 block mb-0.5">Model</span>{item.model}</div>}
                          {item.sleeve && <div><span className="text-[8px] text-gray-400 block mb-0.5">Sleeve</span>{item.sleeve}</div>}
                        </div>
                        <div className="mt-2 pt-2 border-t border-gray-50 flex justify-between items-center text-gray-900 font-black text-xs italic">
                          <span>Qty: {item.quantity} units</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                  <div className="space-y-3">
                    <h6 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Staff Pics</h6>
                    {(selectedOrder.staffImages || []).map((f, i) => (
                      <div
                        key={i}
                        onClick={() => setViewingImage(f)}
                        className="text-xs p-2 bg-gray-50 rounded border border-gray-200 truncate cursor-pointer hover:bg-gray-100 transition-colors flex items-center justify-between group"
                      >
                        <span>Img_{i + 1}</span>
                        <ZoomIn size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3">
                    <h6 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Staff PDFs</h6>
                    {(selectedOrder.staffPdfs || []).map((f, i) => (
                      <div
                        key={i}
                        onClick={() => setViewingImage(f)}
                        className="text-xs p-2 bg-gray-50 rounded border border-gray-100 truncate cursor-pointer hover:bg-gray-100 transition-colors flex items-center justify-between group"
                      >
                        <span>Doc_{i + 1}</span>
                        <FileText size={12} className="text-gray-400" />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3">
                    <h6 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Billing Docs</h6>
                    {(selectedOrder.accountsAttachments || []).map((f, i) => (
                      <div
                        key={i}
                        onClick={() => setViewingImage(f)}
                        className="text-xs p-2 bg-gray-50 rounded border border-gray-100 truncate cursor-pointer hover:bg-gray-100 transition-colors flex items-center justify-between group"
                      >
                        <span>Bill_{i + 1}</span>
                        <ZoomIn size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3">
                    <h6 className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em]">Art Studio Files</h6>
                    {(selectedOrder.designAttachments || []).map((f, i) => (
                      <div
                        key={i}
                        onClick={() => setViewingImage(f)}
                        className="text-xs p-2 bg-purple-50 rounded border border-purple-100 truncate cursor-pointer hover:bg-purple-100 transition-colors flex items-center justify-between group text-purple-700"
                      >
                        <div className="flex items-center gap-2 truncate">
                          {f.startsWith('data:image/') ? <img src={f} className="w-4 h-4 object-cover rounded" /> : <FileText size={14} />}
                          <span className="truncate">Art_{i + 1}</span>
                        </div>
                        <ZoomIn size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                    {(selectedOrder.machineFiles || []).map((f, i) => (
                      <div
                        key={i}
                        onClick={() => setViewingImage(f)}
                        className="text-xs p-2 bg-indigo-50 rounded border border-indigo-100 truncate cursor-pointer hover:bg-indigo-100 transition-colors flex items-center justify-between group text-indigo-700 font-bold"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Download size={14} />
                          <span className="truncate">Machine_{i + 1}.zip</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3">
                    <h6 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Final Specs</h6>
                    {(selectedOrder.orderManagementAttachments || []).map((f, i) => (
                      <div
                        key={i}
                        onClick={() => setViewingImage(f)}
                        className="text-xs p-2 bg-gray-50 rounded border border-gray-100 truncate cursor-pointer hover:bg-gray-100 transition-colors flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2 truncate">
                          {f.includes('zip') ? <Download size={14} className="text-blue-500" /> : <FileText size={14} className="text-gray-400" />}
                          <span className="truncate">Spec_{i + 1}{f.includes('zip') ? '.zip' : ''}</span>
                        </div>
                        <ZoomIn size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                  </div>
                </div>

                {viewingImage && (
                  <ImageViewer src={viewingImage} onClose={() => setViewingImage(null)} fileName={`Order_${selectedOrder.id}`} />
                )}

                <div className="flex gap-3">
                  {selectedOrder.status === OrderStatus.HOLD ? (
                    <button
                      disabled={isProcessing}
                      onClick={async () => {
                        const newStatus = selectedOrder.previousStatus || OrderStatus.PRODUCTION;
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
                          setSelectedOrder(prev => prev ? { ...prev, status: OrderStatus.HOLD, holdReason: reason.trim(), previousStatus: selectedOrder.status, notes: updatedNotes } : null);
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
                    onClick={handleFinishProduction}
                    disabled={isProcessing || selectedOrder.status === OrderStatus.HOLD}
                    className="flex-1 py-5 bg-black text-white rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-xl flex items-center justify-center gap-2 group disabled:opacity-70"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Finishing...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={22} className="group-hover:translate-y-[-2px] transition-transform" />
                        {selectedOrder.status === OrderStatus.HOLD ? 'Hold Active' : 'Finish Production & Move to Delivery'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-12 bg-gray-50 border border-dashed border-gray-200 rounded-[2rem] text-center">
              <div className="w-24 h-24 bg-white rounded-full shadow-lg flex items-center justify-center mb-6">
                <Factory className="text-gray-300" size={48} />
              </div>
              <h4 className="text-2xl font-bold text-gray-900">Work Station</h4>
              <p className="text-gray-500 max-w-sm mt-3 text-lg">Pick an order to access design files and start production workflow.</p>
            </div>
          )}
        </div>
      </div>



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
