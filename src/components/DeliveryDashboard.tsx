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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Delivery Team</h2>
          <p className="text-gray-500 mt-1">Finalize orders and confirm delivery to customer</p>
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
            <p className="text-2xl font-black text-gray-900 leading-tight">
              <span className={cn(selectedSection === 'total' ? "text-white" : "text-gray-900")}>{totalOrdersCount}</span>
            </p>
            <span className={cn("text-[9px] font-semibold block mt-1", selectedSection === 'total' ? "text-white/60" : "text-gray-400")}>
              All shipments
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
            <Truck size={24} />
          </div>
          <div>
            <p className={cn("text-[10px] font-black uppercase tracking-widest", selectedSection === 'hold' ? "text-white/70" : "text-gray-500")}>
              Hold Orders
            </p>
            <p className="text-2xl font-black text-gray-900 leading-tight">
              <span className={cn(selectedSection === 'hold' ? "text-white" : "text-gray-900")}>{holdOrdersCount}</span>
            </p>
            <span className={cn("text-[9px] font-semibold block mt-1", selectedSection === 'hold' ? "text-white/60" : "text-gray-400")}>
              Blocked shipments
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
            <p className="text-2xl font-black text-gray-900 leading-tight">
              <span className={cn(selectedSection === 'completed' ? "text-white" : "text-gray-900")}>{completedOrdersCount}</span>
            </p>
            <span className={cn("text-[9px] font-semibold block mt-1", selectedSection === 'completed' ? "text-white/60" : "text-gray-400")}>
              Successfully Delivered
            </span>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
            <Truck className="text-orange-600" size={16} />
            {selectedSection === 'total' ? 'All Delivery Records' : selectedSection === 'hold' ? 'On Hold Deliveries' : 'Successful Deliveries'} ({filteredOrders.length})
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
                    <span className="px-2 py-0.5 bg-orange-500/20 text-orange-200 text-[8px] uppercase font-bold rounded">
                      {getDisplayCategory(order)}
                    </span>
                  </div>
                  <div className="font-bold text-lg mb-1">{order.customerInfo.name}</div>
                  {order.status === OrderStatus.HOLD && order.holdReason && (
                    <div className="text-[10px] text-red-500 font-bold mt-1 bg-red-50 px-1.5 py-0.5 rounded italic border border-red-100 mb-2">
                      Reason: {order.holdReason}
                    </div>
                  )}
                  <div className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                    <MapPin size={10} />
                    <span className="truncate">{order.customerInfo.address}</span>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-12 bg-gray-50 border border-dashed border-gray-200 rounded-3xl text-center">
                <CheckCircle className="mx-auto text-gray-300 mb-2" size={32} />
                <p className="text-sm text-gray-500">No pending deliveries!</p>
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
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Delivery Trip</span>
                    <h4 className="text-3xl font-black italic tracking-tighter">#{selectedOrder.id.slice(-8)}</h4>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Customer Contact</span>
                    <div className="flex items-center gap-2 text-xl font-bold">
                      <Phone size={20} className="text-orange-400" />
                      {selectedOrder.customerInfo.phone}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div className="space-y-4">
                    <h6 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Shipping Address</h6>
                    <div className="p-6 bg-gray-50 border border-gray-100 rounded-3xl flex items-start gap-4">
                      <MapPin size={24} className="text-red-500 shrink-0 mt-1" />
                      <p className="text-lg font-medium text-gray-900 leading-relaxed">{selectedOrder.customerInfo.address}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h6 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Payment Summary</h6>
                    <div className="p-6 bg-red-50 border border-red-100 rounded-3xl flex flex-col justify-center">
                      <span className="text-xs font-bold text-red-400 uppercase mb-1">CASH ON DELIVERY / BALANCE</span>
                      <span className="text-3xl font-black text-red-700 italic tracking-tighter">₹{(selectedOrder.financials?.balanceAmount || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="mb-8 p-6 bg-gray-50 border border-gray-100 rounded-3xl">
                  <div className="flex items-center justify-between mb-4">
                    <h6 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Order Breakdown</h6>
                    <div className="flex items-center gap-4">
                      <span className="px-3 py-1 bg-black text-white rounded-lg text-[10px] font-bold uppercase">{getDisplayCategory(selectedOrder)}</span>
                      <span className="text-xs font-bold text-gray-900 italic">Total: {selectedOrder.quantity} pcs</span>
                    </div>
                  </div>

                  <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {selectedOrder.sizeBreakdown?.map((item, idx) => (
                      <div key={idx} className="p-3 bg-white border border-gray-100 shadow-sm rounded-xl flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-gray-900 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{item.size}</span>
                          <span className="text-xs font-bold text-gray-500">{item.colour} {item.printType && `| ${item.printType}`}</span>
                        </div>
                        <span className="text-xs font-black italic">x {item.quantity}</span>
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
                      disabled={isProcessing || selectedOrder.status === OrderStatus.DELIVERED}
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

                  {selectedOrder.status === OrderStatus.DELIVERED ? (
                    <div className="flex-1 py-5 bg-green-50 text-green-700 rounded-2xl font-black uppercase text-center flex items-center justify-center gap-2 border border-green-100">
                      <CheckCircle size={20} />
                      Delivered Successfully
                    </div>
                  ) : (
                    <button
                      onClick={handleFinishDelivery}
                      disabled={isProcessing || selectedOrder.status === OrderStatus.HOLD}
                      className="flex-1 py-5 bg-black text-white rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-xl flex items-center justify-center gap-2 group disabled:opacity-70"
                    >
                      {isProcessing ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Confirming...
                        </>
                      ) : (
                        <>
                          <CheckCircle size={22} className="group-hover:translate-y-[-2px] transition-transform" />
                          {selectedOrder.status === OrderStatus.HOLD ? 'Hold Active' : 'Confirm Order Delivery'}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-12 bg-gray-50 border border-dashed border-gray-200 rounded-[2rem] text-center">
              <div className="w-24 h-24 bg-white rounded-full shadow-lg flex items-center justify-center mb-6">
                <Truck className="text-gray-300" size={48} />
              </div>
              <h4 className="text-2xl font-bold text-gray-900">Delivery Hub</h4>
              <p className="text-gray-500 max-w-sm mt-3 text-lg">Select a trip to view address details and confirm successful delivery.</p>
            </div>
          )}
        </div>
      </div>

      {/* Global Hub Section */}
      <div className="pt-8 border-t border-gray-100">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-6">
          <Globe className="text-brand-primary" size={24} />
          Order History Hub
        </h3>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Update</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.slice(0, 5).map(order => (
                <tr key={order.id} onClick={() => setSelectedHubOrder(order)} className="hover:bg-gray-50/50 cursor-pointer">
                  <td className="px-6 py-4 font-mono text-xs text-gray-400">#{order.id.slice(-8)}</td>
                  <td className="px-6 py-4 font-bold text-gray-900">{order.customerInfo.name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${getStatusStyles(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-[10px] text-gray-400">
                    {new Date(order.updatedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedHubOrder && (
        <OrderDetailModal
          order={selectedHubOrder}
          onClose={() => setSelectedHubOrder(null)}
          isAdmin={isAdmin}
          onUpdateOrder={onUpdateOrder}
        />
      )}
    </div>
  );
}

const getStatusStyles = (status: OrderStatus) => {
  switch (status) {
    case OrderStatus.DELIVERY: return 'bg-orange-100 text-orange-700';
    case OrderStatus.DELIVERED: return 'bg-green-100 text-green-700';
    case OrderStatus.HOLD: return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-600';
  }
};
