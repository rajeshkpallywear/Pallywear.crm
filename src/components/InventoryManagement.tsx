import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Package, Plus, Trash2, ArrowDownLeft, ArrowUpRight, Search, Calendar, User, Truck, CheckCircle, Shirt, Scissors } from 'lucide-react';
import { useLeads } from '../context/LeadContext';
import { InventoryMovement } from '../types';
import { CATEGORIES, SLEEVE_OPTIONS, POCKET_OPTIONS } from '../constants';
import { cn } from '../lib/utils';

interface InventoryManagementProps {
  userRole?: string;
}

export default function InventoryManagement({ userRole }: InventoryManagementProps) {
  const isStaff = userRole === 'staff';
  const { inventory, addInventoryMovement, deleteInventoryMovement } = useLeads();
  const [activeTab, setActiveTab] = useState<'products' | 'list' | 'inward' | 'outward'>(isStaff ? 'products' : 'products');
  const [searchTerm, setSearchTerm] = useState('');

  // Derived product list from inventory movements
  const productStock = Object.values(inventory.reduce((acc: any, item) => {
    const key = `${item.product}-${item.productType}-${item.sleeve || 'none'}-${item.pocket || 'none'}`;
    if (!acc[key]) {
      acc[key] = {
        id: key,
        name: item.product,
        type: item.productType,
        sleeve: item.sleeve,
        pocket: item.pocket,
        stock: 0,
        price: '---',
        status: 'Enabled'
      };
    }
    if (item.type === 'inward') acc[key].stock += item.quantity;
    else acc[key].stock -= item.quantity;
    return acc;
  }, {})) as any[];

  const filteredProducts = productStock.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const [inwardForm, setInwardForm] = useState({
    vendor: '',
    date: new Date().toISOString().split('T')[0],
    product: CATEGORIES[0],
    productType: '',
    sleeve: SLEEVE_OPTIONS[0],
    pocket: POCKET_OPTIONS[0],
    transportName: '',
    transportNumber: '',
    quantity: 1
  });

  const [outwardForm, setOutwardForm] = useState({
    customer: '',
    date: new Date().toISOString().split('T')[0],
    orderId: '',
    quantity: 1,
    productType: '',
    sleeve: SLEEVE_OPTIONS[0],
    pocket: POCKET_OPTIONS[0]
  });

  const handleAddInward = async (e: React.FormEvent) => {
    e.preventDefault();
    await addInventoryMovement({
      type: 'inward',
      ...inwardForm
    });
    setInwardForm({
      vendor: '',
      date: new Date().toISOString().split('T')[0],
      product: CATEGORIES[0],
      productType: '',
      sleeve: SLEEVE_OPTIONS[0],
      pocket: POCKET_OPTIONS[0],
      transportName: '',
      transportNumber: '',
      quantity: 1
    });
    setActiveTab('list');
    alert('Inventory inward recorded.');
  };

  const handleAddOutward = async (e: React.FormEvent) => {
    e.preventDefault();
    await addInventoryMovement({
      type: 'outward',
      product: inwardForm.product, // Just using first category as default for outward too
      ...outwardForm
    });
    setOutwardForm({
      customer: '',
      date: new Date().toISOString().split('T')[0],
      orderId: '',
      quantity: 1,
      productType: '',
      sleeve: SLEEVE_OPTIONS[0],
      pocket: POCKET_OPTIONS[0]
    });
    setActiveTab('list');
    alert('Inventory outward recorded.');
  };

  const filteredInventory = inventory.filter(item =>
    (item.vendor || item.customer || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.productType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.product.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {!isStaff && (
        <div className="flex justify-end gap-2 mb-4">
          <button
            onClick={() => setActiveTab('inward')}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-green-700 transition-all shadow-sm text-xs"
          >
            <ArrowDownLeft size={16} />
            Record Inward
          </button>
          <button
            onClick={() => setActiveTab('outward')}
            className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-orange-700 transition-all shadow-sm text-xs"
          >
            <ArrowUpRight size={16} />
            Record Outward
          </button>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
        <div className="flex border-b border-gray-100 bg-[#f9f9f9]">
          <button
            onClick={() => setActiveTab('products')}
            className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'products' ? 'bg-white text-brand-primary border-t-2 border-brand-primary border-x border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Manage Products
          </button>
          {!isStaff && (
            <button
              onClick={() => setActiveTab('list')}
              className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'list' ? 'bg-white text-blue-600 border-t-2 border-blue-600 border-x border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Movement Logs
            </button>
          )}
          {!isStaff && (
            <>
              <button
                onClick={() => setActiveTab('inward')}
                className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'inward' ? 'bg-white text-green-700 border-t-2 border-green-600 border-x border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Inward Form
              </button>
              <button
                onClick={() => setActiveTab('outward')}
                className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'outward' ? 'bg-white text-orange-700 border-t-2 border-orange-600 border-x border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Outward Form
              </button>
            </>
          )}
        </div>

        <div className="p-0">
          {activeTab === 'products' ? (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between gap-4">
                {!isStaff ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab('inward')}
                      className="px-4 py-1.5 bg-brand-primary text-white rounded-lg text-xs font-bold shadow-sm hover:bg-brand-dark transition-colors uppercase flex items-center gap-2"
                    >
                      <Plus size={14} /> Add New Product
                    </button>
                    <select className="px-3 py-1.5 bg-white border border-gray-200 rounded text-xs outline-none">
                      <option>Bulk actions</option>
                    </select>
                  </div>
                ) : <div />}
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by Product Name..."
                      className="pl-9 pr-4 py-1.5 bg-white border border-gray-200 rounded text-xs focus:ring-1 focus:ring-black outline-none w-64"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <button className="px-4 py-1.5 bg-blue-600 text-white rounded text-xs font-bold shadow-sm hover:bg-blue-700 transition-colors uppercase">Search</button>
                  {!isStaff && (
                    <button
                      onClick={() => alert('Bulk upload feature coming soon! Please use the Record forms for now.')}
                      className="px-4 py-1.5 bg-gray-100 text-gray-600 rounded text-xs font-bold shadow-sm hover:bg-gray-200 transition-colors uppercase border border-gray-200"
                    >
                      Bulk Upload
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#f9f9f9] border-b border-gray-100">
                    <tr className="text-gray-500 font-bold text-[11px] uppercase tracking-wider">
                      {!isStaff && (
                        <th className="px-6 py-4 w-10">
                          <input type="checkbox" className="rounded border-gray-300" />
                        </th>
                      )}
                      <th className="px-6 py-4">Image</th>
                      <th className="px-6 py-4">Product Name</th>
                      <th className="px-6 py-4 text-center">Price</th>
                      <th className="px-6 py-4 text-center">Available Product Stock</th>
                      {!isStaff && <th className="px-6 py-4 text-center">POS Status</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredProducts.map((prod, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                        {!isStaff && (
                          <td className="px-6 py-4">
                            <input type="checkbox" className="rounded border-gray-300" />
                          </td>
                        )}
                        <td className="px-6 py-4">
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200 group-hover:border-blue-200 transition-colors">
                            <Package size={20} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-blue-600 hover:underline cursor-pointer">{prod.name}</div>
                          <div className="text-[10px] text-gray-400 font-medium uppercase tracking-tight flex items-center gap-2">
                            {prod.type}
                            {prod.sleeve && <span className="bg-gray-100 px-1 rounded">{prod.sleeve}</span>}
                            {prod.pocket && <span className="bg-gray-100 px-1 rounded">{prod.pocket}</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-gray-900">
                          ₹{prod.price}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={cn(
                            "text-xs font-bold",
                            prod.stock > 0 ? "text-green-600" : "text-red-500"
                          )}>
                            {prod.stock > 0 ? `instock (${prod.stock})` : `outofstock (${prod.stock})`}
                          </span>
                        </td>
                        {!isStaff && (
                          <td className="px-6 py-4 text-center">
                            <span className="px-3 py-1 bg-[#7ad03a] text-white rounded-[4px] text-[10px] font-bold uppercase tracking-wider shadow-sm">
                              Enabled
                            </span>
                          </td>
                        )}
                      </tr>
                    ))}
                    {filteredProducts.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic font-medium">
                          No inventory products found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === 'list' ? (
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                <Search size={16} className="text-gray-400" />
                <input
                  type="text"
                  placeholder="Search records..."
                  className="bg-transparent border-none focus:ring-0 text-sm flex-1"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 italic">
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Entity</th>
                      <th className="px-4 py-3">Product Info</th>
                      <th className="px-4 py-3 text-right">Qty</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredInventory.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-4 text-xs font-bold text-gray-500">{item.date}</td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${item.type === 'inward' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                            {item.type}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-bold text-gray-900">{item.vendor || item.customer}</div>
                          <div className="text-[10px] text-gray-400 space-y-0.5">
                            {item.type === 'outward' && item.orderId && <div>📦 Order: {item.orderId}</div>}
                            {item.transportName && <div>🚚 {item.transportName} {item.transportNumber && `(${item.transportNumber})`}</div>}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-bold text-brand-primary">{item.product}</div>
                          <div className="text-[10px] text-gray-500 uppercase flex items-center gap-1">
                            {item.productType}
                            {item.sleeve && <span>• {item.sleeve}</span>}
                            {item.pocket && <span>• {item.pocket}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right font-black text-gray-900">{item.quantity}</td>
                        <td className="px-4 py-4 text-center">
                          {!isStaff && (
                            <button
                              onClick={() => { if (window.confirm('Delete this movement?')) deleteInventoryMovement(item.id); }}
                              className="p-1.5 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredInventory.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-gray-400 italic font-medium">No inventory records found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === 'inward' ? (
            <motion.form
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleAddInward}
              className="max-w-2xl mx-auto space-y-6 bg-gray-50/50 p-8 rounded-3xl border border-gray-100"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Vendor Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                    <input
                      required
                      type="text"
                      className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-green-500 outline-none transition-all font-bold text-sm"
                      value={inwardForm.vendor}
                      onChange={e => setInwardForm({ ...inwardForm, vendor: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                    <input
                      required
                      type="date"
                      className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-green-500 outline-none transition-all font-bold text-sm"
                      value={inwardForm.date}
                      onChange={e => setInwardForm({ ...inwardForm, date: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Transport Name</label>
                  <div className="relative">
                    <Truck className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                    <input
                      type="text"
                      className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-green-500 outline-none transition-all font-bold text-sm"
                      placeholder="e.g. VRL Logistics"
                      value={inwardForm.transportName}
                      onChange={e => setInwardForm({ ...inwardForm, transportName: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Transport Reg. Number</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-green-500 outline-none transition-all font-bold text-sm"
                    placeholder="e.g. KA-01-AB-1234"
                    value={inwardForm.transportNumber}
                    onChange={e => setInwardForm({ ...inwardForm, transportNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Product</label>
                  <select
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-green-500 outline-none transition-all font-bold text-sm"
                    value={inwardForm.product}
                    onChange={e => setInwardForm({ ...inwardForm, product: e.target.value })}
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Type of Product</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Dot Knit"
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-green-500 outline-none transition-all font-bold text-sm"
                    value={inwardForm.productType}
                    onChange={e => setInwardForm({ ...inwardForm, productType: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Sleeve Type</label>
                  <div className="relative">
                    <Shirt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                    <select
                      className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-green-500 outline-none transition-all font-bold text-sm appearance-none"
                      value={inwardForm.sleeve}
                      onChange={e => setInwardForm({ ...inwardForm, sleeve: e.target.value })}
                    >
                      {SLEEVE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Pocket</label>
                  <div className="relative">
                    <Scissors className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                    <select
                      className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-green-500 outline-none transition-all font-bold text-sm appearance-none"
                      value={inwardForm.pocket}
                      onChange={e => setInwardForm({ ...inwardForm, pocket: e.target.value })}
                    >
                      {POCKET_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Quantity</label>
                  <input
                    required
                    type="number"
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-green-500 outline-none transition-all font-bold text-sm"
                    value={inwardForm.quantity}
                    onChange={e => setInwardForm({ ...inwardForm, quantity: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="pt-6">
                <button
                  type="submit"
                  className="w-full bg-[#1db160] text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-[#158f4d] shadow-xl shadow-green-600/10 active:scale-[0.98] transition-all"
                >
                  SAVE INWARD RECORD
                </button>
              </div>
            </motion.form>
          ) : (
            <motion.form
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleAddOutward}
              className="max-w-2xl mx-auto space-y-6 bg-gray-50/50 p-8 rounded-3xl border border-gray-100"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Customer Name</label>
                  <input
                    required
                    type="text"
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all font-bold text-sm"
                    value={outwardForm.customer}
                    onChange={e => setOutwardForm({ ...outwardForm, customer: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Date</label>
                  <input
                    required
                    type="date"
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all font-bold text-sm"
                    value={outwardForm.date}
                    onChange={e => setOutwardForm({ ...outwardForm, date: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-white">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Order ID / Ref</label>
                  <input
                    required
                    type="text"
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all font-bold text-sm"
                    value={outwardForm.orderId}
                    onChange={e => setOutwardForm({ ...outwardForm, orderId: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Sleeve</label>
                  <select
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all font-bold text-sm"
                    value={outwardForm.sleeve}
                    onChange={e => setOutwardForm({ ...outwardForm, sleeve: e.target.value })}
                  >
                    {SLEEVE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Pocket</label>
                  <select
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all font-bold text-sm"
                    value={outwardForm.pocket}
                    onChange={e => setOutwardForm({ ...outwardForm, pocket: e.target.value })}
                  >
                    {POCKET_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Balance Type of Product</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Shirts"
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all font-bold text-sm"
                    value={outwardForm.productType}
                    onChange={e => setOutwardForm({ ...outwardForm, productType: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Balance Total Qty (Manual)</label>
                  <input
                    required
                    type="number"
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all font-bold text-sm"
                    value={outwardForm.quantity}
                    onChange={e => setOutwardForm({ ...outwardForm, quantity: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="pt-6">
                <button
                  type="submit"
                  className="w-full bg-[#f44336] text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-[#d32f2f] shadow-xl shadow-orange-600/10 active:scale-[0.98] transition-all"
                >
                  SAVE OUTWARD RECORD
                </button>
              </div>
            </motion.form>
          )}
        </div>
      </div>
    </div>
  );
}
