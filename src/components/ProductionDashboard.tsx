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
      return o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.PRODUCTION;
    }
    if (selectedSection === 'completed') {
      return o.status === OrderStatus.DELIVERED;
    }
    return o.status === OrderStatus.PRODUCTION;
  });

  const totalOrdersCount = orders.filter(o => o.status === OrderStatus.PRODUCTION).length;
  const holdOrdersCount = orders.filter(o => o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.PRODUCTION).length;
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
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shadow-sm"
        >
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          Sync Data
        </button>
      </div>

      {/* Premium Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { key: 'total', label: 'Total Orders', sub: 'All production entries', count: totalOrdersCount, icon: Package, gradient: 'from-violet-500 to-purple-600', light: 'bg-violet-50 text-violet-600' },
          { key: 'hold', label: 'Hold Orders', sub: 'On-hold runs', count: holdOrdersCount, icon: Factory, gradient: 'from-amber-500 to-orange-500', light: 'bg-amber-50 text-amber-600' },
          { key: 'completed', label: 'Completed', sub: 'Dispatched and closed', count: completedOrdersCount, icon: TrendingUp, gradient: 'from-emerald-500 to-teal-500', light: 'bg-emerald-50 text-emerald-600' },
        ].map(card => {
          const Icon = card.icon;
          const isActive = selectedSection === card.key;
          return (
            <button key={card.key} onClick={() => setSelectedSection(card.key as any)}
              className={cn("relative p-5 rounded-2xl border text-left flex items-start gap-4 cursor-pointer overflow-hidden transition-all",
                isActive ? `bg-gradient-to-br ${card.gradient} border-transparent shadow-lg scale-[1.02]` : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-md"
              )}>
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", isActive ? "bg-white/20" : card.light.split(' ')[0])}>
                <Icon size={20} className={isActive ? "text-white" : card.light.split(' ').slice(1).join(' ')} />
              </div>
              <div>
                <p className={cn("text-[10px] font-black uppercase tracking-widest", isActive ? "text-white/70" : "text-slate-400")}>{card.label}</p>
                <p className={cn("text-3xl font-black tracking-tight mt-0.5", isActive ? "text-white" : "text-slate-900")}>{card.count}</p>
                <span className={cn("text-[10px] font-medium mt-0.5 block", isActive ? "text-white/60" : "text-slate-400")}>{card.sub}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 px-1">
            <Factory className="text-purple-500" size={14} />
            {selectedSection === 'total' ? 'All Production Lines' : selectedSection === 'hold' ? 'On Hold Lines' : 'Completed Runs'} ({filteredOrders.length})
          </h3>
          <div className="space-y-2.5 max-h-[65vh] overflow-y-auto pr-1">
            {filteredOrders.length > 0 ? (
              filteredOrders.map(order => (
                <button
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className={cn("w-full text-left p-4 rounded-2xl border transition-all",
                    selectedOrder?.id === order.id
                      ? 'bg-slate-900 text-white border-slate-900 shadow-lg scale-[1.01]'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-mono opacity-60">#{order.id.slice(-6)}</span>
                      {order.status === OrderStatus.HOLD && (
                        <span className="bg-amber-500 text-white text-[9px] font-black px-1.5 rounded w-fit">ON HOLD</span>
                      )}
                      {order.isUrgent && (
                        <span className="bg-red-500 text-white text-[9px] font-black px-1.5 rounded animate-pulse w-fit">URGENT</span>
                      )}
                    </div>
                    <span className={cn("text-[8px] font-black uppercase px-2 py-0.5 rounded-full border",
                      selectedOrder?.id === order.id ? "bg-white/10 border-white/20 text-white/80" : "bg-violet-50 text-violet-600 border-violet-200"
                    )}>
                      {getDisplayCategory(order)}
                    </span>
                  </div>
                  <div className="font-bold text-sm mb-1">{order.customerInfo.name}</div>
                  {order.status === OrderStatus.HOLD && order.holdReason && (
                    <div className="text-[10px] text-red-400 font-bold mt-1 italic">Reason: {order.holdReason}</div>
                  )}
                </button>
              ))
            ) : (
              <div className="p-10 bg-white border border-dashed border-slate-200 rounded-2xl text-center">
                <CheckCircle className="mx-auto text-slate-300 mb-2" size={28} />
                <p className="text-xs text-slate-400 font-medium">All current orders are finished!</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          {selectedOrder ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
            >
              <div className="p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Production Order</span>
                  <h4 className="text-2xl font-black italic tracking-tighter mt-0.5">#{selectedOrder.id.slice(-8)}</h4>
                </div>
                <button
                  onClick={() => downloadAllAttachments(selectedOrder)}
                  className="bg-white text-slate-900 px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-slate-100 transition-colors shadow-sm"
                >
                  <Download size={14} />
                  Download All Assets
                </button>
              </div>

              <div className="p-6">
                <div className="mb-5 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                  <div className="flex items-center justify-between mb-3">
                    <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Order Details & Breakdown</h6>
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-bold uppercase">{getDisplayCategory(selectedOrder)}</span>
                      <span className="text-xs font-bold text-slate-700">Total: {selectedOrder.quantity} pcs</span>
                    </div>
                  </div>
                  <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
                    {selectedOrder.sizeBreakdown?.map((item, idx) => (
                      <div key={idx} className="p-3 bg-white border border-slate-100 shadow-sm rounded-xl flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-black text-violet-600 uppercase tracking-tighter">{item.category}</span>
                          <span className="text-[10px] font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded">{item.size}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-500 font-bold">
                          {item.colour && <div><span className="text-[8px] text-slate-400 block">Colour</span>{item.colour}</div>}
                          {item.printType && <div><span className="text-[8px] text-slate-400 block">Print</span>{item.printType}</div>}
                          {item.material && <div><span className="text-[8px] text-slate-400 block">Material</span>{item.material}</div>}
                        </div>
                        <div className="pt-1.5 border-t border-slate-50 flex justify-between items-center">
                          <span className="text-[10px] font-black text-slate-800">Qty: {item.quantity} units</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                  {[
                    { label: 'Staff Pics', files: selectedOrder.staffImages || [], color: 'slate', icon: 'img' },
                    { label: 'Staff PDFs', files: selectedOrder.staffPdfs || [], color: 'slate', icon: 'doc' },
                    { label: 'Billing Docs', files: selectedOrder.accountsAttachments || [], color: 'slate', icon: 'bill' },
                    { label: 'Design Files', files: [...(selectedOrder.designAttachments || []), ...(selectedOrder.machineFiles || [])], color: 'violet', icon: 'art' },
                  ].map(section => (
                    <div key={section.label} className="space-y-2">
                      <h6 className={cn("text-[9px] font-black uppercase tracking-widest", section.color === 'violet' ? "text-violet-500" : "text-slate-400")}>{section.label}</h6>
                      <div className="space-y-1">
                        {section.files.map((f, i) => (
                          <div key={i} onClick={() => setViewingImage(f)}
                            className={cn("text-[10px] p-2 rounded-lg border truncate cursor-pointer flex items-center gap-1.5 transition-colors",
                              section.color === 'violet' ? "bg-violet-50 border-violet-100 text-violet-700 hover:bg-violet-100" : "bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100"
                            )}>
                            <ZoomIn size={10} />
                            <span className="truncate">File_{i + 1}</span>
                          </div>
                        ))}
                        {section.files.length === 0 && (
                          <div className="text-[9px] text-slate-300 italic p-2">None</div>
                        )}
                      </div>
                    </div>
                  ))}
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
                            await onUpdateOrder(selectedOrder.id, { status: newStatus, previousStatus: undefined, updatedAt: Date.now() });
                            setSelectedOrder(prev => prev ? { ...prev, status: newStatus, previousStatus: undefined } : null);
                            alert("Order released.");
                          } catch (e) { alert("Action failed."); } finally { setIsProcessing(false); }
                        }
                      }}
                      className="px-5 py-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-bold hover:bg-emerald-100 transition-all disabled:opacity-50 text-xs"
                    >
                      Release Hold
                    </button>
                  ) : (
                    <button
                      disabled={isProcessing}
                      onClick={async () => {
                        const reason = window.prompt("Enter Hold Reason:");
                        if (reason === null) return;
                        if (!reason.trim()) { alert("Reason is required."); return; }
                        setIsProcessing(true);
                        try {
                          const newNote = `[HOLD] ${new Date().toLocaleString()}: ${reason.trim()}`;
                          const updatedNotes = selectedOrder.notes ? `${selectedOrder.notes}\n${newNote}` : newNote;
                          await onUpdateOrder(selectedOrder.id, { status: OrderStatus.HOLD, holdReason: reason.trim(), previousStatus: selectedOrder.status, notes: updatedNotes, updatedAt: Date.now() });
                          setSelectedOrder(prev => prev ? { ...prev, status: OrderStatus.HOLD, holdReason: reason.trim(), previousStatus: selectedOrder.status, notes: updatedNotes } : null);
                          alert("Order put on HOLD.");
                        } catch (e) { alert("Action failed."); } finally { setIsProcessing(false); }
                      }}
                      className="px-5 py-3 bg-red-50 text-red-700 border border-red-200 rounded-xl font-bold hover:bg-red-100 transition-all disabled:opacity-50 text-xs"
                    >
                      Hold
                    </button>
                  )}

                  <button
                    onClick={handleFinishProduction}
                    disabled={isProcessing || selectedOrder.status === OrderStatus.HOLD}
                    className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-70 text-sm"
                  >
                    {isProcessing ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Finishing...</>
                    ) : (
                      <><CheckCircle size={16} />{selectedOrder.status === OrderStatus.HOLD ? 'Hold Active' : 'Finish Production & Move to Delivery'}</>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-12 bg-white border border-dashed border-slate-200 rounded-3xl text-center min-h-64">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center mb-4">
                <Factory className="text-slate-300" size={32} />
              </div>
              <h4 className="text-base font-black text-slate-700">Work Station</h4>
              <p className="text-slate-400 max-w-sm mt-2 text-xs font-medium">Pick an order to access design files and start production workflow.</p>
            </div>
          )}
        </div>
      </div>

      {selectedHubOrder && (
        <OrderDetailModal
          order={selectedHubOrder}
          onClose={() => setSelectedHubOrder(null)}
          isAdmin={isAdmin}
          onUpdateOrder={async (id, updates) => {
            await onUpdateOrder(id, updates);
            setSelectedHubOrder(prev => prev && prev.id === id ? { ...prev, ...updates } : null);
          }}
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
