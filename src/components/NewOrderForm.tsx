import React, { useState, useEffect, FormEvent } from 'react';
import { motion } from 'motion/react';
import { Plus, Trash2, ShieldAlert, CheckCircle, FileText, X } from 'lucide-react';
import { Order, OrderStatus, SizeBreakdown } from '../types';
import { CATEGORIES, JERSEY_MATERIALS, JERSEY_MODELS, SLEEVE_OPTIONS, SHIRT_MATERIALS, SHIRT_MODELS, SHIRT_COLOURS, PRINT_TYPES, HOODIE_MODELS, HOODIE_COLOURS, SWEATSHIRT_COLOURS, PANT_MATERIALS, PANT_COLOURS, TSHIRT_MATERIALS, TSHIRT_COLOURS_MAP, OVERSIZED_MATERIALS, OVERSIZED_COLOURS, CORPORATE_GIFT_OPTIONS, SIZE_OPTIONS } from '../constants';
import FileUpload from './FileUpload';
import { cn, isOrderSizeValid } from '../lib/utils';
import { downloadOrderPDF } from '../lib/pdfHelper';

interface NewOrderFormProps {
  onCreateOrder: (order: Partial<Order>) => Promise<any>;
  onSuccessRedirect?: () => void;
  initialData?: any;
}

export default function NewOrderForm({ onCreateOrder, onSuccessRedirect, initialData }: NewOrderFormProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    customerName: initialData?.customerInfo?.name || '',
    companyName: initialData?.customerInfo?.companyName || '',
    phone: initialData?.customerInfo?.phone || '',
    address: initialData?.customerInfo?.address || '',
    category: initialData?.category || CATEGORIES[0],
    imageAttachments: [] as string[],
    pdfAttachments: [] as string[],
    sizeBreakdown: initialData?.sizeBreakdown || [] as any[],
    totalAmount: initialData?.financials?.totalAmount || 0,
    advancePay: initialData?.financials?.advancePay || 0,
    gstAmount: initialData?.financials?.gstAmount || 0,
    discountAmount: initialData?.financials?.discountAmount || 0,
    shippingCharges: initialData?.financials?.shippingCharges || 0,
    isUrgent: initialData?.isUrgent || false
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        customerName: initialData.customerInfo?.name || '',
        companyName: initialData.customerInfo?.companyName || '',
        phone: initialData.customerInfo?.phone || '',
        address: initialData.customerInfo?.address || '',
        category: initialData.category || CATEGORIES[0],
        imageAttachments: [] as string[],
        pdfAttachments: [] as string[],
        sizeBreakdown: initialData.sizeBreakdown || [] as any[],
        totalAmount: initialData.financials?.totalAmount || 0,
        advancePay: initialData.financials?.advancePay || 0,
        gstAmount: initialData.financials?.gstAmount || 0,
        discountAmount: initialData.financials?.discountAmount || 0,
        shippingCharges: initialData.financials?.shippingCharges || 0,
        isUrgent: initialData.isUrgent || false
      });
    }
  }, [initialData]);

  const getMaterialsForCategory = (category: string) => {
    switch (category) {
      case 'Jersey': return JERSEY_MATERIALS;
      case 'Shirt': return SHIRT_MATERIALS;
      case 'Pant': return PANT_MATERIALS;
      case 'T-Shirt': return TSHIRT_MATERIALS;
      case 'Oversized': return OVERSIZED_MATERIALS;
      default: return [];
    }
  };

  const getModelsForCategory = (category: string) => {
    switch (category) {
      case 'Jersey': return JERSEY_MODELS;
      case 'Shirt': return SHIRT_MODELS;
      case 'Hoodie': return HOODIE_MODELS;
      case 'T-Shirt': return ['Polo', 'Crewneck', 'V-Neck'];
      case 'Corporate Gift': return CORPORATE_GIFT_OPTIONS;
      default: return [];
    }
  };

  const getColoursForCategory = (category: string, material?: string) => {
    switch (category) {
      case 'Shirt': return SHIRT_COLOURS;
      case 'Hoodie': return HOODIE_COLOURS;
      case 'Sweatshirt': return SWEATSHIRT_COLOURS;
      case 'Pant': return PANT_COLOURS;
      case 'T-Shirt':
        if (material) {
          const key = Object.keys(TSHIRT_COLOURS_MAP).find(k => k.toLowerCase() === material.toLowerCase());
          return key ? TSHIRT_COLOURS_MAP[key] : (TSHIRT_COLOURS_MAP['Comfort'] || []);
        }
        return [];
      case 'Oversized': return OVERSIZED_COLOURS;
      default: return [];
    }
  };

  const getSleevesForCategory = (category: string) => {
    if (category === 'Jersey') return ['pull', 'half'];
    if (['Shirt', 'T-Shirt'].includes(category)) return ['full', 'half'];
    return [];
  };

  const getPocketsForCategory = (category: string) => {
    if (['Shirt', 'T-Shirt'].includes(category)) return ['yes', 'no'];
    return [];
  };

  const addSizeRow = () => {
    setFormData(prev => ({
      ...prev,
      sizeBreakdown: [...prev.sizeBreakdown, {
        category: prev.category,
        size: SIZE_OPTIONS[0],
        quantity: 1,
        price: 0,
        colour: '',
        printType: PRINT_TYPES[0] || 'DTF',
        sleeve: '',
        pocket: '',
        material: '',
        model: ''
      }]
    }));
  };

  const removeSizeRow = (index: number) => {
    setFormData(prev => {
      const updated = prev.sizeBreakdown.filter((_, i) => i !== index);
      const newTotal = updated.reduce((sum, item) => sum + (item.quantity * (item.price || 0)), 0);
      return { ...prev, sizeBreakdown: updated, totalAmount: newTotal };
    });
  };

  const updateSizeRow = (index: number, field: string, value: any) => {
    setFormData(prev => {
      const updated = [...prev.sizeBreakdown];
      updated[index] = { ...updated[index], [field]: value };
      const newTotal = updated.reduce((sum, item) => sum + (item.quantity * (item.price || 0)), 0);
      return { ...prev, sizeBreakdown: updated, totalAmount: newTotal };
    });
  };

  const resetForm = () => {
    setFormData({
      customerName: '',
      companyName: '',
      phone: '',
      address: '',
      category: CATEGORIES[0],
      imageAttachments: [],
      pdfAttachments: [],
      sizeBreakdown: [],
      totalAmount: 0,
      advancePay: 0,
      gstAmount: 0,
      discountAmount: 0,
      shippingCharges: 0,
      isUrgent: false
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;

    if (!formData.customerName.trim()) {
      alert("Please enter customer name");
      return;
    }

    const totalQuantity = formData.sizeBreakdown.reduce((sum, item) => sum + item.quantity, 0) || 1;
    const finalOrderData = {
      status: OrderStatus.PENDING,
      category: formData.category,
      customerInfo: {
        name: formData.customerName,
        phone: formData.phone,
        address: formData.address,
        companyName: formData.companyName
      },
      details: {},
      sizeBreakdown: formData.sizeBreakdown,
      quantity: totalQuantity,
      isUrgent: formData.isUrgent,
      financials: {
        totalAmount: formData.totalAmount,
        advancePay: formData.advancePay,
        gstAmount: formData.gstAmount,
        discountAmount: formData.discountAmount,
        shippingCharges: formData.shippingCharges,
        balanceAmount: (formData.totalAmount + (formData.gstAmount || 0) + (formData.shippingCharges || 0)) - (formData.discountAmount || 0) - formData.advancePay
      },
      staffImages: formData.imageAttachments,
      staffPdfs: formData.pdfAttachments,
      staffAttachments: [...formData.imageAttachments, ...formData.pdfAttachments],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    if (!isOrderSizeValid(finalOrderData)) {
      alert("Error: Total order data limit exceeded (Max 1MB). Please use fewer images or smaller files.");
      return;
    }

    setIsProcessing(true);
    try {
      const createdOrder = await onCreateOrder(finalOrderData);
      alert("Success: New order created! Downloaded order manual. Please move the order to Design and Accounts manually from the order details.");
      if (createdOrder) {
        await downloadOrderPDF(createdOrder);
      }
      resetForm();
      if (onSuccessRedirect) onSuccessRedirect();
    } catch (error: any) {
      console.error("Order submission failed:", error);
      alert("Failed to submit order: " + (error?.message || ""));
    } finally {
      setIsProcessing(false);
    }
  };

  const computedBalance = (formData.totalAmount + (formData.gstAmount || 0) + (formData.shippingCharges || 0)) - (formData.discountAmount || 0) - formData.advancePay;

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300 font-sans">
      <div className="border-b border-rose-100 bg-slate-900 px-8 py-6 text-white flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black tracking-tight">Create Raw Order Intake</h2>
          <p className="text-xs text-slate-300 font-medium mt-1">Submit client measurements and category customization profiles directement into tracking pipeline</p>
        </div>
        {formData.isUrgent && (
          <span className="px-3 py-1 bg-red-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider animate-pulse flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-white block" /> Urgent
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-8">
        {/* Customer Information Section */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">1. Customer Credentials</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Customer Name</label>
              <input
                type="text"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none font-medium text-slate-900 transition-all"
                placeholder="Full client name"
                value={formData.customerName}
                onChange={e => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Company Name</label>
              <input
                type="text"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none font-medium text-slate-900 transition-all"
                placeholder="Company/Brand name"
                value={formData.companyName}
                onChange={e => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Phone Number</label>
              <input
                type="text"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none font-mono text-slate-900 transition-all"
                placeholder="Client contact (numeric)"
                value={formData.phone}
                onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Delivery Address</label>
            <textarea
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none font-medium text-slate-900 h-20 transition-all resize-none"
              placeholder="Shipment mailing address"
              value={formData.address}
              onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
            />
          </div>
        </div>

        {/* Product Category and Configuration */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-t border-slate-100 pt-6">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">2. Product Classification</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Selected Hub:</span>
              <select
                className="bg-slate-100 border-none font-black text-slate-900 rounded-xl px-4 py-2 text-xs focus:ring-2 focus:ring-slate-900"
                value={formData.category}
                onChange={e => {
                  const newCategory = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    category: newCategory
                  }));
                }}
              >
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
          </div>

          {/* Size Breakdown and Category Specific Options */}
          <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-slate-900">Measure Profile breakdown</h4>
                <p className="text-[11px] text-slate-400 font-medium">Add rows describing sizes, colours, pricing, and custom fields</p>
              </div>
              <button
                type="button"
                onClick={addSizeRow}
                className="flex items-center gap-1.5 bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold px-3 py-1.5 rounded-xl transition-all"
              >
                <Plus size={14} /> Add Size Profile
              </button>
            </div>

            {formData.sizeBreakdown.length > 0 ? (
              <div className="space-y-3">
                {formData.sizeBreakdown.map((item, idx) => {
                  const rowCategory = item.category || formData.category;
                  const materials = getMaterialsForCategory(rowCategory);
                  const models = getModelsForCategory(rowCategory);
                  const colours = getColoursForCategory(rowCategory, item.material);
                  const sleeves = getSleevesForCategory(rowCategory);
                  const pockets = getPocketsForCategory(rowCategory);

                  return (
                    <div key={idx} className="bg-white p-4 border border-slate-200 rounded-xl space-y-3 relative group animate-in fade-in duration-200">
                      <button
                        type="button"
                        onClick={() => removeSizeRow(idx)}
                        className="absolute right-3 top-3 text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors border border-transparent"
                      >
                        <Trash2 size={14} />
                      </button>

                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-4">
                        {/* Hub (Category) Option */}
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase">Hub</label>
                          <select
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 text-xs focus:ring-1 focus:ring-slate-900 font-bold"
                            value={item.category || formData.category}
                            onChange={e => updateSizeRow(idx, 'category', e.target.value)}
                          >
                            {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                          </select>
                        </div>

                        {/* Size Option */}
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase">Size</label>
                          <select
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 text-xs focus:ring-1 focus:ring-slate-900"
                            value={item.size}
                            onChange={e => updateSizeRow(idx, 'size', e.target.value)}
                          >
                            {SIZE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        </div>

                        {/* Quantity */}
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase">Qty</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 text-xs text-center focus:ring-1 focus:ring-slate-900"
                            onChange={e => updateSizeRow(idx, 'quantity', parseInt(e.target.value) || 1)}
                          />
                        </div>

                        {/* Price */}
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase">Unit Price</label>
                          <input
                            type="number"
                            min="0"
                            value={item.price}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 text-xs focus:ring-1 focus:ring-slate-900"
                            onChange={e => updateSizeRow(idx, 'price', parseFloat(e.target.value) || 0)}
                          />
                        </div>

                        {/* Dynamic: Material */}
                        {materials.length > 0 && (
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase">Material</label>
                            <select
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 text-xs focus:ring-1 focus:ring-slate-900"
                              value={item.material || ''}
                              onChange={e => updateSizeRow(idx, 'material', e.target.value)}
                            >
                              <option value="">None</option>
                              {materials.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                          </div>
                        )}

                        {/* Dynamic: Model */}
                        {models.length > 0 && (
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase">Model</label>
                            <select
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 text-xs focus:ring-1 focus:ring-slate-900"
                              value={item.model || ''}
                              onChange={e => updateSizeRow(idx, 'model', e.target.value)}
                            >
                              <option value="">None</option>
                              {models.map(md => <option key={md} value={md}>{md}</option>)}
                            </select>
                          </div>
                        )}

                        {/* Dynamic: Color */}
                        {colours.length > 0 && (
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase">Colour</label>
                            <select
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 text-xs focus:ring-1 focus:ring-slate-900"
                              value={item.colour || ''}
                              onChange={e => updateSizeRow(idx, 'colour', e.target.value)}
                            >
                              <option value="">None</option>
                              {colours.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                        )}

                        {/* Dynamic: Sleeve */}
                        {sleeves.length > 0 && (
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase">Sleeve</label>
                            <select
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 text-xs focus:ring-1 focus:ring-slate-900"
                              value={item.sleeve || ''}
                              onChange={e => updateSizeRow(idx, 'sleeve', e.target.value)}
                            >
                              <option value="">None</option>
                              {sleeves.map(sl => <option key={sl} value={sl}>{sl}</option>)}
                            </select>
                          </div>
                        )}

                        {/* Dynamic: Pocket */}
                        {pockets.length > 0 && (
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase">Pocket</label>
                            <select
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 text-xs focus:ring-1 focus:ring-slate-900"
                              value={item.pocket || ''}
                              onChange={e => updateSizeRow(idx, 'pocket', e.target.value)}
                            >
                              <option value="">None</option>
                              {pockets.map(pk => <option key={pk} value={pk}>{pk}</option>)}
                            </select>
                          </div>
                        )}

                        {/* Print Type */}
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase">Print Type</label>
                          <select
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 text-xs focus:ring-1 focus:ring-slate-900"
                            value={item.printType}
                            onChange={e => updateSizeRow(idx, 'printType', e.target.value)}
                          >
                            {PRINT_TYPES.map(pt => <option key={pt} value={pt}>{pt}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div 
                type="button" 
                onClick={addSizeRow} 
                className="hover:border-slate-900 hover:bg-slate-50 text-slate-500 border border-dashed border-slate-300 rounded-[20px] p-8 text-center cursor-pointer font-sans transition-all flex flex-col items-center justify-center gap-2"
              >
                <Plus size={24} className="text-slate-400" />
                <span className="text-xs font-bold font-sans">No measurements recorded. Tap to add a size breakdown row.</span>
              </div>
            )}
          </div>
        </div>

        {/* File attachments */}
        <div className="space-y-4 border-t border-slate-100 pt-6">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">3. Proofing / Source reference</h3>
          <FileUpload
            label="Original Draft reference (Max 3 files)"
            onFilesSelected={(files) => setFormData(prev => ({ ...prev, imageAttachments: files }))}
            maxFiles={3}
            accept="image/*,.pdf,.zip,.bmp,.tiff,.gif"
          />
        </div>

        {/* Quotation details and Advance */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 border-t border-slate-100 pt-6 font-sans">
          <div className="md:col-span-4 p-4 bg-slate-50 rounded-2xl flex flex-col justify-center space-y-4">
            <label className="flex items-center gap-2 cursor-pointer pt-1 pl-1">
              <input
                type="checkbox"
                className="w-4.5 h-4.5 text-slate-900 border-slate-300 rounded focus:ring-slate-900 focus:ring-2"
                checked={formData.isUrgent}
                onChange={e => setFormData(prev => ({ ...prev, isUrgent: e.target.checked }))}
              />
              <span className="text-xs font-black uppercase text-slate-700 tracking-wider">Flag as High Urgency</span>
            </label>
            <div className="pt-2">
              <p className="text-[10px] text-slate-400 font-bold leading-normal">Urgent orders trigger higher notification intensity inside Design and Digitizer channels.</p>
            </div>
          </div>

          <div className="md:col-span-8 grid grid-cols-3 gap-4 font-sans">
            <div className="space-y-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Item Amount</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  min="0"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2.5 text-sm font-black focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none"
                  value={formData.totalAmount}
                  onChange={e => setFormData(prev => ({ ...prev, totalAmount: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">GST Amount</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  min="0"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2.5 text-sm font-black focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none"
                  value={formData.gstAmount}
                  onChange={e => setFormData(prev => ({ ...prev, gstAmount: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Discount Amount</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  min="0"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2.5 text-sm font-black focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none"
                  value={formData.discountAmount}
                  onChange={e => setFormData(prev => ({ ...prev, discountAmount: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Shipping Charges</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  min="0"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2.5 text-sm font-black focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none"
                  value={formData.shippingCharges}
                  onChange={e => setFormData(prev => ({ ...prev, shippingCharges: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Advance Paid</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  min="0"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2.5 text-sm font-black focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none"
                  value={formData.advancePay}
                  onChange={e => setFormData(prev => ({ ...prev, advancePay: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Remaining Balance</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={computedBalance.toLocaleString()}
                  className="w-full bg-slate-100/60 border border-slate-200 text-slate-500 rounded-xl pl-8 pr-3 py-2.5 text-sm font-black outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Create Submit Action footer */}
        <div className="flex items-center gap-4 justify-end border-t border-slate-100 pt-6">
          <button
            type="button"
            onClick={resetForm}
            className="px-6 py-3 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer"
          >
            Clear Sheet
          </button>
          <button
            type="submit"
            disabled={isProcessing}
            className={cn(
              "bg-slate-900 text-white hover:bg-slate-800 px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center gap-2",
              isProcessing && "opacity-60 cursor-not-allowed"
            )}
          >
            {isProcessing ? "Launching Intake..." : "Launch intake Order"}
          </button>
        </div>
      </form>
    </div>
  );
}
