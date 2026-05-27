/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { Truck, Download, ChevronRight, FileText, CheckCircle, Package, ZoomIn, Share2, Globe, Trash2, TrendingUp, MapPin, Phone } from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { getDisplayCategory, cn } from '../lib/utils';
import OrderDetailModal from './OrderDetailModal';
import ImageViewer from './ImageViewer';

interface DeliveryDashboardProps {
  orders: Order[];
  onUpdateOrder: (id: string, updates: Partial<Order>) => Promise<void>;
  onDeleteOrder?: (id: string) => void;
  isAdmin?: boolean;
}

export default function DeliveryDashboard({ orders, onUpdateOrder, onDeleteOrder, isAdmin }: DeliveryDashboardProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedSection, setSelectedSection] = useState<'total' | 'hold' | 'completed'>('total');
  const [selectedHubOrder, setSelectedHubOrder] = useState<Order | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const pendingOrders = orders.filter(o => o.status === OrderStatus.DELIVERY || (o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.DELIVERY));

  const filteredOrders = orders.filter(o => {
    if (selectedSection === 'hold') {
      return o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.DELIVERY;
    }
    if (selectedSection === 'completed') {
      return o.status === OrderStatus.DELIVERED;
    }
    return o.status === OrderStatus.DELIVERY;
  });

  const totalOrdersCount = orders.filter(o => o.status === OrderStatus.DELIVERY).length;
  const holdOrdersCount = orders.filter(o => o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.DELIVERY).length;
  const completedOrdersCount = orders.filter(o => o.status === OrderStatus.DELIVERED).length;

  const handleFinishDelivery = async () => {
    if (!selectedOrder || isProcessing) return;
    setIsProcessing(true);

    try {
      await onUpdateOrder(selectedOrder.id, {
        status: OrderStatus.DELIVERED,
        updatedAt: Date.now()
      });

      setSelectedOrder(null);
      alert("Order successfully delivered!");
    } catch (e) {
      console.error(e);
      alert("Failed to confirm delivery.");
    } finally {
      setIsProcessing(false);
    }
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
          { key: 'total', label: 'Total Orders', sub: 'All shipments', count: totalOrdersCount, icon: Package, gradient: 'from-indigo-500 to-violet-600', light: 'bg-indigo-50 text-indigo-600' },
          { key: 'hold', label: 'Hold Orders', sub: 'Blocked shipments', count: holdOrdersCount, icon: Truck, gradient: 'from-amber-500 to-orange-500', light: 'bg-amber-50 text-amber-600' },
          { key: 'completed', label: 'Completed', sub: 'Successfully Delivered', count: completedOrdersCount, icon: TrendingUp, gradient: 'from-emerald-500 to-teal-500', light: 'bg-emerald-50 text-emerald-600' },
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
            <Truck className="text-orange-500" size={14} />
            {selectedSection === 'total' ? 'All Delivery Records' : selectedSection === 'hold' ? 'On Hold Deliveries' : 'Successful Deliveries'} ({filteredOrders.length})
          </h3>
          <div className="space-y-2.5 max-h-[65vh] overflow-y-auto pr-1">
            {filteredOrders.length > 0 ? (
              filteredOrders.map(order => (
                <button
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className={cn(
                    "w-full text-left p-4 rounded-2xl border transition-all",
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
                      selectedOrder?.id === order.id ? "bg-white/10 border-white/20 text-white/80" : "bg-slate-100 text-slate-500 border-slate-200"
                    )}>
                      {getDisplayCategory(order)}
                    </span>
                  </div>
                  <div className="font-bold text-sm mb-1">{order.customerInfo.name}</div>
                  {order.status === OrderStatus.HOLD && order.holdReason && (
                    <div className="text-[10px] text-red-400 font-bold mt-1 italic">Reason: {order.holdReason}</div>
                  )}
                  <div className={cn("text-[10px] mt-2 flex items-center gap-1", selectedOrder?.id === order.id ? "text-white/50" : "text-slate-400")}>
                    <MapPin size={9} />
                    <span className="truncate">{order.customerInfo.address}</span>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-10 bg-white border border-dashed border-slate-200 rounded-2xl text-center">
                <CheckCircle className="mx-auto text-slate-300 mb-2" size={28} />
                <p className="text-xs text-slate-400 font-medium">No pending deliveries!</p>
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
              <div className="p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Delivery Trip</span>
                    <h4 className="text-2xl font-black italic tracking-tighter mt-0.5">#{selectedOrder.id.slice(-8)}</h4>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Customer Contact</span>
                    <div className="flex items-center gap-2 text-lg font-bold mt-0.5">
                      <Phone size={16} className="text-orange-400" />
                      {selectedOrder.customerInfo.phone}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                  <div>
                    <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Shipping Address</h6>
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-start gap-3">
                      <MapPin size={18} className="text-red-500 shrink-0 mt-0.5" />
                      <p className="text-sm font-medium text-slate-800 leading-relaxed">{selectedOrder.customerInfo.address}</p>
                    </div>
                  </div>
                  <div>
                    <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Payment Due</h6>
                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl">
                      <span className="text-xs font-bold text-red-400 uppercase mb-1 block">CASH ON DELIVERY / BALANCE</span>
                      <span className="text-3xl font-black text-red-700 tracking-tight">₹{(selectedOrder.financials?.balanceAmount || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="mb-5 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                  <div className="flex items-center justify-between mb-3">
                    <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Order Breakdown</h6>
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-bold uppercase">{getDisplayCategory(selectedOrder)}</span>
                      <span className="text-xs font-bold text-slate-700">Total: {selectedOrder.quantity} pcs</span>
                    </div>
                  </div>
                  <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1">
                    {selectedOrder.sizeBreakdown?.map((item, idx) => (
                      <div key={idx} className="p-3 bg-white border border-slate-100 shadow-sm rounded-xl flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded">{item.size}</span>
                          <span className="text-xs font-medium text-slate-500">{item.colour} {item.printType && `| ${item.printType}`}</span>
                        </div>
                        <span className="text-xs font-black text-slate-800">×{item.quantity}</span>
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
                        const newStatus = selectedOrder.previousStatus || OrderStatus.DELIVERY;
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
                      disabled={isProcessing || selectedOrder.status === OrderStatus.DELIVERED}
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

                  {selectedOrder.status === OrderStatus.DELIVERED ? (
                    <div className="flex-1 py-3 bg-emerald-50 text-emerald-700 rounded-xl font-black uppercase text-center flex items-center justify-center gap-2 border border-emerald-200 text-sm">
                      <CheckCircle size={16} /> Delivered Successfully
                    </div>
                  ) : (
                    <button
                      onClick={handleFinishDelivery}
                      disabled={isProcessing || selectedOrder.status === OrderStatus.HOLD}
                      className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-70 text-sm"
                    >
                      {isProcessing ? (
                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Confirming...</>
                      ) : (
                        <><CheckCircle size={16} />{selectedOrder.status === OrderStatus.HOLD ? 'Hold Active' : 'Confirm Delivery'}</>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-12 bg-white border border-dashed border-slate-200 rounded-3xl text-center min-h-64">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center mb-4">
                <Truck className="text-slate-300" size={32} />
              </div>
              <h4 className="text-base font-black text-slate-700">Delivery Hub</h4>
              <p className="text-slate-400 max-w-xs mt-2 text-xs font-medium">Select a trip to view address details and confirm delivery.</p>
            </div>
          )}
        </div>
      </div>

      {/* Order History */}
      <div className="pt-5 border-t border-slate-100">
        <h3 className="text-sm font-black text-slate-800 mb-4">Order History Hub</h3>
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-slate-400 font-black uppercase text-[9px] tracking-widest">
                <th className="px-6 py-3">Order ID</th>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {orders.slice(0, 5).map(order => (
                <tr key={order.id} onClick={() => setSelectedHubOrder(order)} className="hover:bg-slate-50/50 cursor-pointer transition-colors">
                  <td className="px-6 py-3.5 font-mono font-bold text-slate-500">#{order.id.slice(-8)}</td>
                  <td className="px-6 py-3.5 font-bold text-slate-800">{order.customerInfo.name}</td>
                  <td className="px-6 py-3.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusStyles(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-right text-slate-400">{new Date(order.updatedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedHubOrder && (
        <OrderDetailModal order={selectedHubOrder} onClose={() => setSelectedHubOrder(null)} isAdmin={isAdmin} onUpdateOrder={onUpdateOrder} />
      )}
    </div>
  );
}

const getStatusStyles = (status: OrderStatus) => {
  switch (status) {
    case OrderStatus.DELIVERY: return 'bg-orange-50 text-orange-700 border-orange-200';
    case OrderStatus.DELIVERED: return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case OrderStatus.HOLD: return 'bg-amber-50 text-amber-700 border-amber-200';
    default: return 'bg-slate-100 text-slate-500 border-slate-200';
  }
};
