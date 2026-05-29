/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { Truck, CheckCircle, Search, MapPin, PauseCircle, X, Eye, Download, Check } from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { getDisplayCategory, cn } from '../lib/utils';
import OrderDetailModal from './OrderDetailModal';

interface DeliveryDashboardProps {
  orders: Order[];
  onUpdateOrder: (id: string, updates: Partial<Order>) => Promise<void>;
  onDeleteOrder?: (id: string) => void;
  isAdmin?: boolean;
  onReorder?: (order: Order) => void;
}

export default function DeliveryDashboard({ orders, onUpdateOrder, onDeleteOrder, isAdmin, onReorder }: DeliveryDashboardProps) {
  const { user } = useAuth();
  const hourOfDay = new Date().getHours();
  const greeting = hourOfDay < 12 ? 'Good morning' : hourOfDay < 17 ? 'Good afternoon' : 'Good evening';

  const [selectedSection, setSelectedSection] = useState<'total' | 'hold' | 'completed'>('total');
  const [selectedHubOrder, setSelectedHubOrder] = useState<Order | null>(null);
  const [orderSearch, setOrderSearch] = useState('');
  
  // Delivery Confirmation State
  const [showDeliveryFormOrder, setShowDeliveryFormOrder] = useState<Order | null>(null);
  const [collectBalance, setCollectBalance] = useState(true);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [isConfirmingDelivery, setIsConfirmingDelivery] = useState(false);

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

  const displayOrders = filteredOrders.filter(o => {
    const q = orderSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      o.customerInfo.name?.toLowerCase().includes(q) ||
      o.customerInfo.companyName?.toLowerCase().includes(q) ||
      o.customerInfo.address?.toLowerCase().includes(q) ||
      o.id?.toLowerCase().includes(q)
    );
  });

  const handleConfirmDeliveryAction = async () => {
    if (!showDeliveryFormOrder || isConfirmingDelivery) return;
    
    const balanceAmount = showDeliveryFormOrder.financials?.balanceAmount || 0;
    const isCollected = collectBalance && balanceAmount > 0;

    // Validation: notes are mandatory if balance is not collected
    if (!isCollected && balanceAmount > 0 && !deliveryNotes.trim()) {
      alert("Error: Delivery notes are mandatory when balance amount is not collected.");
      return;
    }

    setIsConfirmingDelivery(true);
    try {
      const newNote = `[DELIVERY SUCCESSFUL] ${new Date().toLocaleString()}: Collected Balance Amount: ${
        isCollected ? `Yes (₹${balanceAmount})` : `No (₹0 of ₹${balanceAmount} collected)`
      }. Delivery Notes: ${deliveryNotes.trim() || 'None'}`;
      
      const updatedNotes = showDeliveryFormOrder.notes ? `${showDeliveryFormOrder.notes}\n\n${newNote}` : newNote;
      
      const financials = {
        ...showDeliveryFormOrder.financials,
        balanceAmount: isCollected ? 0 : balanceAmount
      } as any;

      await onUpdateOrder(showDeliveryFormOrder.id, {
        status: OrderStatus.DELIVERED,
        notes: updatedNotes,
        financials,
        updatedAt: Date.now()
      });

      setShowDeliveryFormOrder(null);
      setCollectBalance(true);
      setDeliveryNotes('');
      alert("Order successfully delivered!");
    } catch (e) {
      console.error(e);
      alert("Failed to confirm delivery.");
    } finally {
      setIsConfirmingDelivery(false);
    }
  };

  const downloadCompleteDesigns = (order: Order) => {
    const designs = [
      ...(order.designAttachments || []),
      ...(order.machineFiles || [])
    ].filter(Boolean);

    if (designs.length === 0) {
      alert('No completed designs found for this order.');
      return;
    }
    
    designs.forEach((url, i) => {
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = url;
        a.download = `design_${order.id.slice(-6)}_${i + 1}`;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }, i * 300);
    });
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto p-4">
      {/* Greeting Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-[#3C3489] to-[#534AB7] px-8 py-7 text-white shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-widest text-white/50 mb-1">Pallywear CRM</p>
        <h2 className="text-2xl font-bold text-white mb-1">{greeting}, {user?.name || 'there'}!</h2>
        <p className="text-sm text-white/60">Here's your delivery snapshot for today.</p>
      </div>

      {/* Visual Filter Quick Tabs */}
      <div className="flex items-center gap-4 py-2">
        {/* Total/Active Orders Tab Button */}
        <button
          onClick={() => setSelectedSection('total')}
          className={cn(
            "w-16 h-16 rounded-[22px] flex items-center justify-center transition-all relative shadow-sm border border-slate-100 cursor-pointer outline-none",
            selectedSection === 'total'
              ? "bg-gradient-to-tr from-[#3C3489] to-[#534AB7] text-white ring-4 ring-indigo-100 border-transparent"
              : "bg-white text-slate-500 hover:text-slate-800"
          )}
        >
          <Truck size={24} className={selectedSection === 'total' ? 'text-white' : 'text-slate-400'} />
          {totalOrdersCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
              {totalOrdersCount}
            </span>
          )}
        </button>

        {/* On Hold Orders Tab Button */}
        <button
          onClick={() => setSelectedSection('hold')}
          className={cn(
            "w-16 h-16 rounded-[22px] flex items-center justify-center transition-all relative shadow-sm border border-slate-100 cursor-pointer outline-none",
            selectedSection === 'hold'
              ? "bg-gradient-to-tr from-[#3C3489] to-[#534AB7] text-white ring-4 ring-indigo-100 border-transparent"
              : "bg-white text-slate-500 hover:text-slate-800"
          )}
        >
          <PauseCircle size={24} className={selectedSection === 'hold' ? 'text-white' : 'text-slate-400'} />
          {holdOrdersCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
              {holdOrdersCount}
            </span>
          )}
        </button>

        {/* Completed Orders Tab Button */}
        <button
          onClick={() => setSelectedSection('completed')}
          className={cn(
            "w-16 h-16 rounded-[22px] flex items-center justify-center transition-all relative shadow-sm border border-slate-100 cursor-pointer outline-none",
            selectedSection === 'completed'
              ? "bg-gradient-to-tr from-[#3C3489] to-[#534AB7] text-white ring-4 ring-indigo-100 border-transparent"
              : "bg-white text-slate-500 hover:text-slate-800"
          )}
        >
          <CheckCircle size={24} className={selectedSection === 'completed' ? 'text-white' : 'text-slate-400'} />
          {completedOrdersCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
              {completedOrdersCount}
            </span>
          )}
        </button>
      </div>

      {/* Main Table Card (User Dashboard Style) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Header Section */}
        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 gap-4 bg-slate-50/50">
          <div>
            <h3 className="text-sm font-black text-slate-900">
              {selectedSection === 'total' ? 'Active deliveries' : selectedSection === 'hold' ? 'On hold deliveries' : 'Completed orders'}
            </h3>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              {displayOrders.length} order{displayOrders.length === 1 ? '' : 's'} found
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search orders..."
              value={orderSearch}
              onChange={e => setOrderSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-purple-400 transition-all placeholder:text-slate-400"
            />
            {orderSearch && (
              <X 
                size={14} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer" 
                onClick={() => setOrderSearch('')} 
              />
            )}
          </div>
        </div>

        {/* Deliveries Table */}
        <div className="overflow-x-auto">
          {displayOrders.length > 0 ? (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50/30 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Order</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4 text-center">Qty</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Actions</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-xs">
                {displayOrders.map(order => (
                  <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-slate-400">
                      #{order.id.slice(-6).toUpperCase()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                        {order.customerInfo.name}
                        {order.isUrgent && (
                          <span className="bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded animate-pulse tracking-wide uppercase">URGENT</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium">{order.customerInfo.phone}</div>
                      {order.customerInfo.address && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.customerInfo.address)}`, '_blank');
                          }}
                          className="text-[10px] text-blue-500 hover:text-blue-700 font-bold flex items-center gap-0.5 mt-1 border-none bg-transparent cursor-pointer p-0"
                          title="Open address in live Google Maps"
                        >
                          <MapPin size={10} className="text-blue-500 shrink-0" />
                          <span className="underline truncate max-w-[150px]">{order.customerInfo.address}</span>
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-[10px] font-bold border border-purple-100">
                        {getDisplayCategory(order)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-black text-slate-800">
                      {order.quantity}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border",
                        order.status === OrderStatus.DELIVERED
                          ? "bg-green-50 text-green-700 border-green-200"
                          : order.status === OrderStatus.HOLD
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      )}>
                        {order.status === OrderStatus.DELIVERED ? 'Delivered' : order.status === OrderStatus.HOLD ? 'On Hold' : 'Out for Delivery'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedHubOrder(order)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1 cursor-pointer border-none"
                          title="View order report details"
                        >
                          <Eye size={12} />
                          View
                        </button>
                        
                        {order.status !== OrderStatus.DELIVERED && (
                          <button
                            onClick={() => {
                              setShowDeliveryFormOrder(order);
                              setCollectBalance(true);
                              setDeliveryNotes('');
                            }}
                            className="px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1 cursor-pointer border-none shadow-sm"
                            title="Confirm delivery success"
                          >
                            <Check size={12} />
                            Deliver
                          </button>
                        )}

                        <button
                          onClick={() => downloadCompleteDesigns(order)}
                          className="p-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition-all cursor-pointer border-none"
                          title="Download completed designs"
                        >
                          <Download size={13} />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium">
                      {new Date(order.updatedAt || order.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right font-black text-slate-800 text-sm">
                      ₹{(order.financials?.balanceAmount || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-16 text-center text-xs font-semibold text-slate-400 italic">
              No orders in this category.
            </div>
          )}
        </div>
      </div>

      {/* Complete Delivery Dialog Modal */}
      {showDeliveryFormOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col p-6 text-left border border-slate-100"
          >
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <Truck size={20} className="text-[#3C3489]" />
                Complete Delivery
              </h3>
              <button
                onClick={() => {
                  setShowDeliveryFormOrder(null);
                  setCollectBalance(true);
                  setDeliveryNotes('');
                }}
                className="p-2 hover:bg-slate-100 rounded-full border-none bg-transparent cursor-pointer"
              >
                <X size={18} className="text-slate-400" />
              </button>
            </div>

            <p className="text-xs text-slate-500 font-bold uppercase mb-4 tracking-wider">
              Order #{showDeliveryFormOrder.id.slice(-6).toUpperCase()} • {showDeliveryFormOrder.customerInfo.name}
            </p>

            <div className="space-y-4">
              {/* Payment Section */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Cash on Delivery / Balance</span>
                  <span className="text-lg font-black text-red-600">₹{(showDeliveryFormOrder.financials?.balanceAmount || 0).toLocaleString()}</span>
                </div>
                
                {(showDeliveryFormOrder.financials?.balanceAmount || 0) > 0 && (
                  <label className="flex items-center gap-2.5 cursor-pointer mt-3 select-none">
                    <input
                      type="checkbox"
                      checked={collectBalance}
                      onChange={(e) => setCollectBalance(e.target.checked)}
                      className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500 cursor-pointer"
                    />
                    <span className="text-xs font-black text-slate-700 uppercase">Collect Full Balance Amount</span>
                  </label>
                )}
              </div>

              {/* Delivery Notes Section */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">
                  Delivery Notes / Comments {(!collectBalance && (showDeliveryFormOrder.financials?.balanceAmount || 0) > 0) && <span className="text-red-500 font-extrabold">* (Required)</span>}
                </label>
                <textarea
                  className="w-full text-xs p-3 border border-slate-200 outline-none rounded-xl bg-slate-50 focus:bg-white resize-none h-24 text-slate-800 font-semibold leading-relaxed"
                  placeholder="Enter details (e.g. Left with neighbor, Cash received, Paid via GPay, or reason for not collecting balance)..."
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                />
              </div>

              {/* Confirm / Cancel Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowDeliveryFormOrder(null);
                    setCollectBalance(true);
                    setDeliveryNotes('');
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-lg text-[10px] uppercase border-none cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  disabled={isConfirmingDelivery || (!collectBalance && (showDeliveryFormOrder.financials?.balanceAmount || 0) > 0 && !deliveryNotes.trim())}
                  onClick={handleConfirmDeliveryAction}
                  className="px-5 py-2.5 bg-gradient-to-tr from-[#3C3489] to-[#534AB7] hover:scale-[1.02] active:scale-95 text-white font-black rounded-lg text-[10px] uppercase border-none cursor-pointer disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 shadow"
                >
                  {isConfirmingDelivery ? 'Updating...' : 'Confirm Delivery Successful'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {selectedHubOrder && (
        <OrderDetailModal 
          order={selectedHubOrder} 
          onClose={() => setSelectedHubOrder(null)} 
          isAdmin={isAdmin} 
          onUpdateOrder={onUpdateOrder} 
          onReorder={onReorder} 
        />
      )}
    </div>
  );
}