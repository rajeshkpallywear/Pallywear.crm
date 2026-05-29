/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import {
  Factory, Download, FileText, CheckCircle, Package,
  ZoomIn, Trash2, Search, PauseCircle, RefreshCw,
  Eye, ArrowRight, Play
} from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { getDisplayCategory, cn } from '../lib/utils';
import OrderDetailModal from './OrderDetailModal';
import ImageViewer from './ImageViewer';

interface ProductionDashboardProps {
  orders: Order[];
  onUpdateOrder: (id: string, updates: Partial<Order>) => Promise<void>;
  onDeleteOrder?: (id: string) => void;
  isAdmin?: boolean;
  onReorder?: (order: Order) => void;
}

type TabSection = 'total' | 'hold' | 'completed';

const STATUS_BADGE: Record<string, string> = {
  Production: 'bg-amber-50 text-amber-800',
  'On Hold': 'bg-red-50 text-red-800',
  Delivered: 'bg-green-50 text-green-800',
  Delivery: 'bg-orange-50 text-orange-800',
};

function getStatusLabel(order: Order): string {
  switch (order.status) {
    case OrderStatus.PRODUCTION: return 'Production';
    case OrderStatus.HOLD: return 'On Hold';
    case OrderStatus.DELIVERED: return 'Delivered';
    case OrderStatus.DELIVERY: return 'Delivery';
    default: return order.status;
  }
}

export default function ProductionDashboard({
  orders,
  onUpdateOrder,
  onDeleteOrder,
  isAdmin,
  onReorder,
}: ProductionDashboardProps) {
  const { user } = useAuth();
  const showAmountDetails = ['admin', 'accounts', 'order_management', 'delivery'].includes(user?.role || '');
  const hourOfDay = new Date().getHours();
  const greeting =
    hourOfDay < 12 ? 'Good morning' : hourOfDay < 17 ? 'Good afternoon' : 'Good evening';

  const [selectedSection, setSelectedSection] = useState<TabSection>('total');
  const [orderSearch, setOrderSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedHubOrder, setSelectedHubOrder] = useState<Order | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // ── counts ────────────────────────────────────────────────────────────────
  const totalCount = orders.filter(o => o.status === OrderStatus.PRODUCTION).length;
  const holdCount = orders.filter(o => o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.PRODUCTION).length;
  const completedCount = orders.filter(o => o.status === OrderStatus.DELIVERED).length;

  // ── filtered list ─────────────────────────────────────────────────────────
  const sectionOrders = orders.filter(o => {
    if (selectedSection === 'hold') return o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.PRODUCTION;
    if (selectedSection === 'completed') return o.status === OrderStatus.DELIVERED;
    return o.status === OrderStatus.PRODUCTION;
  });

  const q = orderSearch.toLowerCase().trim();
  const filteredOrders = q
    ? sectionOrders.filter(o =>
      o.id?.toLowerCase().includes(q) ||
      o.customerInfo?.name?.toLowerCase().includes(q) ||
      o.customerInfo?.companyName?.toLowerCase().includes(q)
    )
    : sectionOrders;

  // ── helpers ───────────────────────────────────────────────────────────────
  const handleFinishProduction = async () => {
    if (!selectedOrder || isProcessing) return;
    setIsProcessing(true);
    try {
      const updates = {
        status: OrderStatus.DELIVERY,
        updatedAt: Date.now(),
      };
      await onUpdateOrder(selectedOrder.id, updates);
      setSelectedOrder(null); // Close panel since it moved out of production tracking
    } catch (e) {
      console.error(e);
      alert('Action failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadAllAttachments = (order: Order) => {
    const all = [
      ...(order.staffImages || []),
      ...(order.staffPdfs || []),
      ...(order.accountsAttachments || []),
      ...(order.designAttachments || []),
      ...(order.machineFiles || []),
      ...(order.orderManagementAttachments || []),
    ].filter(Boolean);

    if (all.length === 0) { alert('No attachments found for this order.'); return; }
    if (all.length > 1 && !confirm(`This will open ${all.length} files in separate tabs. Continue?`)) return;
    all.forEach((url, i) => setTimeout(() => window.open(url, '_blank'), i * 300));
  };

  // ── tab config ─────────────────────────────────────────────────────────────
  const tabs: { key: TabSection; label: string; count: number; Icon: any; notify?: boolean }[] = [
    { key: 'total', label: 'In production', count: totalCount, Icon: Factory },
    { key: 'hold', label: 'On hold', count: holdCount, Icon: PauseCircle, notify: holdCount > 0 },
    { key: 'completed', label: 'Completed', count: completedCount, Icon: CheckCircle },
  ];

  const sectionTitles: Record<TabSection, string> = {
    total: 'In production',
    hold: 'On hold orders',
    completed: 'Completed orders',
  };

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── greeting banner ── */}
      <div className="rounded-3xl bg-gradient-to-br from-[#3C3489] to-[#534AB7] px-8 py-7">
        <p className="text-[11px] font-bold uppercase tracking-widest text-white/50 mb-1">Pallywear CRM</p>
        <h2 className="text-2xl font-bold text-white mb-1">{greeting}, {user?.name || 'there'}!</h2>
        <p className="text-sm text-white/60">Here's your production snapshot for today.</p>
      </div>

      {/* ── tab cards ── */}
      <div className="flex items-center gap-4 py-2">
        {tabs.map(({ key, count, Icon }) => (
          <button
            key={key}
            onClick={() => { setSelectedSection(key); setOrderSearch(''); setSelectedOrder(null); }}
            className={cn(
              "w-16 h-16 rounded-[22px] flex items-center justify-center transition-all relative shadow-sm",
              selectedSection === key
                ? "bg-gradient-to-tr from-[#3C3489] to-[#534AB7] text-white ring-4 ring-indigo-100"
                : "bg-white text-gray-500 hover:text-gray-800"
            )}
          >
            <Icon size={24} className={selectedSection === key ? 'text-white' : 'text-gray-400'} />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── orders table card ── */}
      <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-900">{sectionTitles[selectedSection]}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''} found</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders…"
              value={orderSearch}
              onChange={e => setOrderSearch(e.target.value)}
              className="pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 outline-none focus:border-[#3C3489] focus:bg-white transition-all placeholder:text-gray-400 w-44"
            />
          </div>
        </div>

        {/* table */}
        {filteredOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  {['Order', 'Customer', 'Category', 'Qty', 'Status', 'Date', 'Amount', 'Actions'].filter(h => h !== 'Amount' || showAmountDetails).map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 border-b border-gray-100">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(order => {
                  const statusLabel = getStatusLabel(order);
                  const badgeClass = STATUS_BADGE[statusLabel] || 'bg-gray-50 text-gray-700';
                  return (
                    <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs text-gray-400">#{order.id ? order.id.slice(-6) : '------'}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          {order.isUrgent && (
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                          )}
                          <div>
                            <p className="text-sm font-bold text-gray-900 truncate max-w-[130px]">{order.customerInfo?.name}</p>
                            {order.customerInfo?.companyName && (
                              <p className="text-[11px] text-gray-400 truncate max-w-[130px]">{order.customerInfo.companyName}</p>
                            )}
                            {order.status === OrderStatus.HOLD && order.holdReason && (
                              <p className="text-[10px] text-red-500 italic mt-0.5 truncate max-w-[130px]">{order.holdReason}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs text-gray-600">{getDisplayCategory(order)}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-bold text-gray-900">{order.quantity || 1}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold', badgeClass)}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs text-gray-400">{order.updatedAt ? new Date(order.updatedAt).toLocaleDateString() : '--/--/----'}</span>
                      </td>
                      {showAmountDetails && (
                        <td className="px-5 py-4">
                          <span className="text-sm font-bold text-gray-900">
                            ₹{(order.financials?.totalAmount || 0).toLocaleString()}
                          </span>
                        </td>
                      )}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          {/* View detail */}
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-[11px] font-bold text-gray-600 transition-colors"
                          >
                            <Eye size={12} /> View
                          </button>
                          {/* Finish production (total tab only) */}
                          {selectedSection === 'total' && order.status !== OrderStatus.HOLD && (
                            <button
                              disabled={isProcessing}
                              onClick={async () => {
                                if (window.confirm('Mark this order as finished and move to Delivery?')) {
                                  setIsProcessing(true);
                                  try {
                                    const updates = { status: OrderStatus.DELIVERY, updatedAt: Date.now() };
                                    await onUpdateOrder(order.id, updates);
                                    if (selectedOrder?.id === order.id) {
                                      setSelectedOrder(null);
                                    }
                                  } catch (e) { alert('Action failed.'); }
                                  finally { setIsProcessing(false); }
                                }
                              }}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-[#3C3489] hover:bg-[#2F286E] text-white rounded-lg text-[11px] font-bold transition-colors disabled:opacity-50"
                            >
                              <ArrowRight size={12} />
                            </button>
                          )}
                          {/* Release hold */}
                          {selectedSection === 'hold' && (
                            <button
                              disabled={isProcessing}
                              onClick={async () => {
                                const newStatus = order.previousStatus || OrderStatus.PRODUCTION;
                                if (window.confirm(`Release order back to ${newStatus}?`)) {
                                  setIsProcessing(true);
                                  try {
                                    const updates = { status: newStatus, previousStatus: undefined, updatedAt: Date.now() };
                                    await onUpdateOrder(order.id, updates);
                                    if (selectedOrder?.id === order.id) {
                                      setSelectedOrder(prev => prev ? { ...prev, ...updates } : null);
                                    }
                                  } catch (e) { alert('Action failed.'); }
                                  finally { setIsProcessing(false); }
                                }
                              }}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 rounded-lg text-[11px] font-bold transition-colors disabled:opacity-50"
                            >
                              <Play size={12} />
                            </button>
                          )}
                          {/* Download all assets */}
                          <button
                            onClick={() => downloadAllAttachments(order)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-700 rounded-lg text-[11px] font-bold transition-colors"
                            title="Download all assets"
                          >
                            <Download size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Factory className="text-gray-200 mb-3" size={40} />
            <p className="text-sm font-bold text-gray-500">
              {orderSearch ? 'No orders match your search' : 'No orders in this category'}
            </p>
            <p className="text-xs text-gray-400 mt-1">Orders will appear here once they move to this stage.</p>
          </div>
        )}
      </div>

      {/* ── Order detail slide-over ── */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setSelectedOrder(null)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="relative w-full max-w-2xl bg-white h-full overflow-y-auto shadow-2xl flex flex-col z-10"
            >
              {/* header */}
              <div className="sticky top-0 z-10 bg-[#3C3489] text-white px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Production order</p>
                  <h4 className="text-lg font-bold text-white mt-0.5">
                    #{selectedOrder.id ? selectedOrder.id.slice(-8) : '--------'}
                    {selectedOrder.isUrgent && (
                      <span className="ml-2 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-lg animate-pulse">URGENT</span>
                    )}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">{selectedOrder.customerInfo?.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => downloadAllAttachments(selectedOrder)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white text-slate-900 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors"
                  >
                    <Download size={13} /> Download all
                  </button>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/60"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="flex-1 p-6 space-y-5">
                {/* order breakdown */}
                <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Order breakdown</p>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-[#3C3489] text-white rounded-lg text-[10px] font-bold uppercase">{getDisplayCategory(selectedOrder)}</span>
                      <span className="text-xs font-bold text-gray-600">Total: {selectedOrder.quantity} pcs</span>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {selectedOrder.sizeBreakdown?.map((item, idx) => (
                      <div key={idx} className="p-3 bg-white border border-gray-100 rounded-xl text-[11px]">
                        <div className="flex justify-between mb-1.5">
                          <span className="font-black text-violet-600 uppercase">{item.category}</span>
                          <span className="font-black text-gray-800 bg-gray-100 px-2 py-0.5 rounded">{item.size}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-gray-500 font-bold">
                          {item.colour && <div><span className="text-[9px] text-gray-400 block">Colour</span>{item.colour}</div>}
                          {item.printType && <div><span className="text-[9px] text-gray-400 block">Print</span>{item.printType}</div>}
                          {item.material && <div><span className="text-[9px] text-gray-400 block">Material</span>{item.material}</div>}
                        </div>
                        <div className="flex justify-between mt-2 pt-2 border-t border-gray-100 font-black">
                          <span>Qty: {item.quantity} units</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* assets grid */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Staff images', files: selectedOrder.staffImages || [], color: 'gray' },
                    { label: 'Staff PDFs', files: selectedOrder.staffPdfs || [], color: 'gray' },
                    { label: 'Billing docs', files: selectedOrder.accountsAttachments || [], color: 'gray' },
                    { label: 'Design files', files: [...(selectedOrder.designAttachments || []), ...(selectedOrder.machineFiles || [])], color: 'violet' },
                  ].map(section => (
                    <div key={section.label} className="p-3 bg-white border border-gray-100 rounded-xl space-y-1.5">
                      <p className={cn('text-[10px] font-black uppercase tracking-widest', section.color === 'violet' ? 'text-violet-500' : 'text-gray-400')}>
                        {section.label} ({section.files.length})
                      </p>
                      {section.files.length > 0 ? section.files.map((f, i) => (
                        <div
                          key={i}
                          onClick={() => setViewingImage(f)}
                          className={cn(
                            'flex items-center gap-1.5 p-2 rounded-lg border text-[11px] font-bold cursor-pointer transition-colors truncate',
                            section.color === 'violet'
                              ? 'bg-violet-50 border-violet-100 text-violet-700 hover:bg-violet-100'
                              : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100'
                          )}
                        >
                          <ZoomIn size={11} />
                          <span className="truncate">File_{i + 1}</span>
                        </div>
                      )) : (
                        <p className="text-[10px] text-gray-300 italic px-2">None attached</p>
                      )}
                    </div>
                  ))}
                </div>

                {/* order management attachments */}
                {(selectedOrder.orderManagementAttachments || []).length > 0 && (
                  <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1.5">Garage ZIP files ({selectedOrder.orderManagementAttachments!.length})</p>
                    {selectedOrder.orderManagementAttachments!.map((f, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-white/70 rounded-lg text-[11px]">
                        <span className="text-indigo-700 font-bold">Garage_{i + 1}.zip</span>
                        <a href={f} download={`Garage_{i + 1}.zip`} className="text-indigo-700 font-black hover:underline flex items-center gap-1">
                          <Download size={11} /> Download
                        </a>
                      </div>
                    ))}
                  </div>
                )}

                {/* notes */}
                {selectedOrder.notes && (
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Communication logs</p>
                    <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedOrder.notes}</p>
                  </div>
                )}

                {/* action buttons */}
                <div className="flex gap-2 pt-2">
                  {onReorder && user?.role === 'user' && (
                    <button
                      onClick={() => onReorder(selectedOrder)}
                      className="px-4 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition-colors"
                    >
                      Re-order
                    </button>
                  )}

                  {selectedOrder.status === OrderStatus.HOLD ? (
                    <button
                      disabled={isProcessing}
                      onClick={async () => {
                        const newStatus = selectedOrder.previousStatus || OrderStatus.PRODUCTION;
                        if (window.confirm(`Release order back to ${newStatus}?`)) {
                          setIsProcessing(true);
                          try {
                            const updates = { status: newStatus, previousStatus: undefined, updatedAt: Date.now() };
                            await onUpdateOrder(selectedOrder.id, updates);
                            setSelectedOrder(prev => prev ? { ...prev, ...updates } : null);
                            alert('Order released.');
                          } catch (e) { alert('Action failed.'); }
                          finally { setIsProcessing(false); }
                        }
                      }}
                      className="px-5 py-3.5 bg-green-50 text-green-700 border border-green-200 rounded-2xl text-xs font-bold hover:bg-green-100 transition-colors disabled:opacity-50"
                    >
                      Release hold
                    </button>
                  ) : (
                    <button
                      disabled={isProcessing}
                      onClick={async () => {
                        const reason = window.prompt('Enter hold reason:');
                        if (reason === null) return;
                        if (!reason.trim()) { alert('Reason is required.'); return; }
                        setIsProcessing(true);
                        try {
                          const newNote = `[HOLD] ${new Date().toLocaleString()}: ${reason.trim()}`;
                          const updatedNotes = selectedOrder.notes ? `${selectedOrder.notes}\n${newNote}` : newNote;
                          const updates = {
                            status: OrderStatus.HOLD,
                            holdReason: reason.trim(),
                            previousStatus: selectedOrder.status,
                            notes: updatedNotes,
                            updatedAt: Date.now(),
                          };
                          await onUpdateOrder(selectedOrder.id, updates);
                          setSelectedOrder(prev => prev ? { ...prev, ...updates } : null);
                          alert('Order put on HOLD.');
                        } catch (e) { alert('Action failed.'); }
                        finally { setIsProcessing(false); }
                      }}
                      className="px-5 py-3.5 bg-red-50 text-red-700 border border-red-200 rounded-2xl text-xs font-bold hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      Hold
                    </button>
                  )}

                  <button
                    onClick={handleFinishProduction}
                    disabled={isProcessing || selectedOrder.status === OrderStatus.HOLD}
                    className="flex-1 py-3.5 bg-[#3C3489] text-white rounded-2xl text-xs font-bold hover:bg-[#2F286E] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Finishing…</>
                    ) : (
                      <><CheckCircle size={16} /> {selectedOrder.status === OrderStatus.HOLD ? 'Hold active' : 'Finish & move to delivery'}</>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── image viewer ── */}
      {viewingImage && (
        <ImageViewer
          src={viewingImage}
          onClose={() => setViewingImage(null)}
          fileName={`Order_${selectedOrder?.id || ''}`}
        />
      )}

      {/* ── hub order modal ── */}
      {selectedHubOrder && (
        <OrderDetailModal
          order={selectedHubOrder}
          onClose={() => setSelectedHubOrder(null)}
          isAdmin={isAdmin}
          onReorder={onReorder}
          onUpdateOrder={async (id, updates) => {
            await onUpdateOrder(id, updates);
            setSelectedHubOrder(prev => prev && prev.id === id ? { ...prev, ...updates } : null);
          }}
          onUpdateStatus={(status) => {
            if (window.confirm(`Change order status to ${status}?`)) {
              const updates = { status, updatedAt: Date.now() };
              onUpdateOrder(selectedHubOrder.id, updates);
              setSelectedHubOrder(prev => prev ? { ...prev, ...updates } : null);
            }
          }}
        />
      )}
    </div>
  );
}