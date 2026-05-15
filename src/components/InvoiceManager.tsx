import React, { useState } from 'react';
import { useLeads } from '../context/LeadContext';
import { useAuth } from '../context/AuthContext';
import {
    Plus, Search, Download, FileText,
    Trash2, Eye, Calendar, DollarSign
} from 'lucide-react';
import { Button } from './Button';
import { motion, AnimatePresence } from 'motion/react';
import InvoiceModal from './InvoiceModal';
import { Invoice } from '../types';

export default function InvoiceManager() {
    const { leads, invoices, addInvoice, deleteInvoice } = useLeads();
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [isNewInvoiceModalOpen, setIsNewInvoiceModalOpen] = useState(false);

    const [newInvoiceData, setNewInvoiceData] = useState({
        leadId: `L-${Math.random().toString(36).substring(2, 7)}`,
        invoiceNumber: `QT.${Math.floor(Math.random() * 9000) + 1000}`,
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: 'Quality garments and merchandise solutions.',
        customerName: '',
        customerCompanyName: '',
        customerNumber: '',
        productType: 'tshirt' as string,
        productSubCategory: '' as string,
        paymentMethod: 'GPay' as 'GPay' | 'PhonePay' | 'Cash' | 'Account' | 'UPI',
        unitPrice: 499,
        quantity: 1,
        taxRate: 5,
        shippingCost: 0,
        discountRate: 20,
        companySignature: 'Rajesh K.',
        bankName: 'HDFC BANK',
        bankAccountName: 'PALLYWEAR PVT LTD',
        bankIfscCode: 'HDFC0008964',
        bankAccountNumber: '50202110682524',
    });

    const products = ['tshirt', 'jersey', 'hoodie', 'bottle', 'pen', 'mug', 'diary', 'keychain', 'cap', 'corporate gift', 'paint', 'shirt'];
    const paymentMethods = ['GPay', 'PhonePay', 'Cash', 'Account', 'UPI'];

    const productSubCategories: Record<string, string[]> = {
        'tshirt': ['blended polo', 'economy polo', 'every day polo', 'feathery polo', 'comfort polo', 'affordable polo', 'round neck 180 gsm'],
        'jersey': ['round neck', 'polo', 'kinds round neck', 'kinds polo'],
        'corporate gift': ['7 in 1', '5 in 1', '4 in 1', '3 in 1', '2 in 1'],
    };

    const productPrices: Record<string, number> = {
        'tshirt': 400,
        'jersey': 650,
        'hoodie': 2000,
        'bottle': 999,
        'pen': 300,
        'mug': 600,
        'diary': 600,
        'keychain': 400,
        'cap': 600,
        'corporate gift': 1000,
        'paint': 1000,
        'shirt': 1000,
    };

    const subCategoryPrices: Record<string, number> = {
        'blended polo': 600,
        'economy polo': 600,
        'every day polo': 700,
        'feathery polo': 800,
        'comfort polo': 900,
        'affordable polo': 500,
        'round neck 180 gsm': 400,
        'round neck': 650,
        'polo': 700,
        'kinds round neck': 600,
        'kinds polo': 650,
    };

    const calculatePrice = (type: string, sub: string) => {
        if (sub && subCategoryPrices[sub]) return subCategoryPrices[sub];
        return productPrices[type] || 0;
    };

    const handleProductChange = (type: string) => {
        const price = calculatePrice(type, '');
        setNewInvoiceData({
            ...newInvoiceData,
            productType: type,
            productSubCategory: '',
            unitPrice: price
        });
    };

    const handleSubCategoryChange = (sub: string) => {
        const price = calculatePrice(newInvoiceData.productType, sub);
        setNewInvoiceData({
            ...newInvoiceData,
            productSubCategory: sub,
            unitPrice: price
        });
    };

    const filteredInvoices = invoices.filter(inv =>
        inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.billToName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleOpenInvoice = (invoice: Invoice) => {
        setSelectedInvoice(invoice);
        setIsModalOpen(true);
    };

    const handleLeadSelect = (leadId: string) => {
        const lead = leads.find(l => l.id === leadId);
        if (lead) {
            setNewInvoiceData({
                ...newInvoiceData,
                leadId,
                customerName: lead.name,
                customerCompanyName: lead.companyName,
                customerNumber: lead.number
            });
        } else {
            setNewInvoiceData({ ...newInvoiceData, leadId: '' });
        }
    };

    const handleCreateInvoice = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        const subtotal = newInvoiceData.unitPrice * newInvoiceData.quantity;
        const discountTotal = (subtotal * newInvoiceData.discountRate) / 100;
        const itemTotalAfterDiscount = subtotal - discountTotal;
        const salesTax = (itemTotalAfterDiscount * newInvoiceData.taxRate) / 100;
        const shippingCost = newInvoiceData.shippingCost;
        const total = itemTotalAfterDiscount + salesTax + shippingCost;

        const invoice: Omit<Invoice, 'id'> = {
            invoiceNumber: newInvoiceData.invoiceNumber,
            date: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            dueDate: new Date(newInvoiceData.dueDate).toISOString(),
            fromName: 'Pallywear Gifting Solutions',
            fromEmail: user.email,
            fromPhone: '+91 91583 01804',
            fromAddress: 'Pallywear Gifting Solutions, Bus Stop, 49/1, Mudichur\nRoad,Near By Parvathi Nagar Shanthi Nagar, Old\nPerungalathur, Chennai, Tamil Nadu - 600063',
            billToName: newInvoiceData.customerName,
            billToEmail: `${newInvoiceData.customerName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
            billToPhone: newInvoiceData.customerNumber,
            billToAddress: newInvoiceData.customerCompanyName,
            items: [
                {
                    id: 'item-1',
                    description: `${newInvoiceData.productType.toUpperCase()} ${newInvoiceData.productSubCategory ? `(${newInvoiceData.productSubCategory.toUpperCase()})` : ''}`,
                    rate: newInvoiceData.unitPrice,
                    quantity: newInvoiceData.quantity,
                    tax: newInvoiceData.taxRate,
                    discount: newInvoiceData.discountRate,
                    amount: subtotal
                }
            ],
            subtotal,
            discountTotal,
            shippingCost,
            salesTax,
            total,
            amountPaid: 0,
            balanceDue: total,
            notes: newInvoiceData.notes,
            paymentMethod: newInvoiceData.paymentMethod,
            productType: newInvoiceData.productType,
            productSubCategory: newInvoiceData.productSubCategory,
            customerPhoneNumber: newInvoiceData.customerNumber,
            leadId: newInvoiceData.leadId,
            createdBy: user.id,
            createdByName: user.name,
            companySignature: newInvoiceData.companySignature || 'Rajesh K.',
            bankName: newInvoiceData.bankName || 'HDFC BANK',
            bankAccountName: newInvoiceData.bankAccountName || 'PALLYWEAR PVT LTD',
            bankIfscCode: newInvoiceData.bankIfscCode || 'HDFC0008964',
            bankAccountNumber: newInvoiceData.bankAccountNumber || '50202110682524',
        };

        try {
            await addInvoice(invoice);
            setIsNewInvoiceModalOpen(false);
            // Reset form
            setNewInvoiceData({
                leadId: `L-${Math.random().toString(36).substring(2, 7)}`,
                invoiceNumber: `QT.${Math.floor(Math.random() * 9000) + 1000}`,
                dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                notes: 'Quality garments and merchandise solutions.',
                customerName: '',
                customerCompanyName: '',
                customerNumber: '',
                productType: 'tshirt',
                productSubCategory: '',
                paymentMethod: 'CASH',
                unitPrice: 499,
                quantity: 1,
                taxRate: 5,
                shippingCost: 0,
                discountRate: 20,
                companySignature: 'Rajesh K.',
                bankName: 'HDFC BANK',
                bankAccountName: 'PALLYWEAR PVT LTD',
                bankIfscCode: 'HDFC0008964',
                bankAccountNumber: '50202110682524',
            });
        } catch (err: any) {
            console.error("Failed to save invoice:", err);
            let errorMsg = "Error saving invoice.";
            try {
                const errorData = JSON.parse(err.message);
                errorMsg = `Error: ${errorData.error}\nType: ${errorData.operationType}\nPath: ${errorData.path}`;
            } catch (e) {
                errorMsg = err.message || "Please check your internet connection and Firestore permissions.";
            }
            alert(errorMsg);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search invoices by number or client..."
                        className="w-full pl-10 pr-4 py-2 bg-white border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-brand-primary/10 transition-all font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button onClick={() => setIsNewInvoiceModalOpen(true)} className="w-full md:w-auto gap-2 shadow-lg shadow-brand-primary/20 bg-brand-primary hover:bg-brand-primary/90 text-white border-0 py-2.5 px-6 rounded-2xl">
                    <Plus className="w-4 h-4" /> Create Invoice
                </Button>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead>
                            <tr className="bg-gray-50/50 text-gray-400 font-black uppercase tracking-widest text-[10px]">
                                <th className="px-6 py-5">Invoice Reference</th>
                                <th className="px-6 py-5">Customer Details</th>
                                <th className="px-6 py-5">Transaction Amount</th>
                                <th className="px-6 py-5">Status / Due</th>
                                <th className="px-6 py-5 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredInvoices.slice().sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()).map((inv) => (
                                <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-brand-secondary rounded-xl text-brand-primary group-hover:scale-110 transition-transform">
                                                <FileText className="w-4.5 h-4.5" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900">{inv.invoiceNumber}</p>
                                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-tight">ID: {inv.id.slice(0, 6)}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <p className="font-bold text-gray-800">{inv.billToName}</p>
                                        <p className="text-[10px] text-gray-400 font-medium truncate max-w-[150px]">{inv.billToCompanyName || inv.billToAddress}</p>
                                    </td>
                                    <td className="px-6 py-5">
                                        <p className="font-black text-brand-primary text-base">₹{inv.total.toLocaleString()}</p>
                                        <p className="text-[10px] text-green-600 font-bold uppercase tracking-wider">{inv.paymentMethod || 'GPAY'}</p>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-500">{new Date(inv.dueDate).toLocaleDateString()}</span>
                                            <span className="text-[9px] font-black uppercase text-gray-300">Generated {new Date(inv.createdAt || inv.date).toLocaleDateString()}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleOpenInvoice(inv)}
                                                className="p-2.5 hover:bg-white hover:shadow-sm rounded-xl text-brand-primary transition-all bg-brand-secondary/30"
                                                title="View & Download"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => deleteInvoice(inv.id)}
                                                className="p-2.5 hover:bg-white hover:shadow-sm text-gray-400 hover:text-red-500 rounded-xl transition-all"
                                                title="Delete Permanently"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredInvoices.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-32 text-center">
                                        <div className="flex flex-col items-center gap-4 max-w-sm mx-auto">
                                            <div className="p-6 bg-brand-secondary rounded-full">
                                                <FileText className="w-10 h-10 text-brand-primary opacity-50" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-gray-900 font-black text-lg">No Invoices Found</p>
                                                <p className="text-gray-400 text-sm italic">You haven't generated any invoices yet. Start by clicking the 'Create Invoice' button above.</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <InvoiceModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                invoice={selectedInvoice}
            />

            {/* New Invoice Modal */}
            <AnimatePresence>
                {isNewInvoiceModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsNewInvoiceModalOpen(false)}
                            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 30, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 30, scale: 0.95 }}
                            className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden shadow-black/30 border border-white/20 max-h-[90vh] flex flex-col"
                        >
                            <div className="p-1 flex flex-col h-full overflow-hidden">
                                <div className="px-8 pt-8 pb-4 flex items-center justify-between flex-shrink-0">
                                    <div className="space-y-1">
                                        <h3 className="text-2xl font-black text-gray-900 tracking-tighter">Generate Invoice</h3>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-0.5">Professional Billing Solution</p>
                                    </div>
                                    <button onClick={() => setIsNewInvoiceModalOpen(false)} className="p-3 hover:bg-gray-100 rounded-2xl text-gray-400 transition-colors">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                <form onSubmit={handleCreateInvoice} className="px-8 pb-10 space-y-6 overflow-y-auto custom-scrollbar flex-grow">
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Client Name</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={newInvoiceData.customerName}
                                                    onChange={(e) => setNewInvoiceData({ ...newInvoiceData, customerName: e.target.value })}
                                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-brand-primary/5 transition-all outline-none"
                                                    placeholder="e.g. John Doe"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Mobile Number</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={newInvoiceData.customerNumber}
                                                    onChange={(e) => setNewInvoiceData({ ...newInvoiceData, customerNumber: e.target.value })}
                                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-brand-primary/5 transition-all outline-none"
                                                    placeholder="+91 XXXX..."
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Company / Organization</label>
                                            <input
                                                type="text"
                                                required
                                                value={newInvoiceData.customerCompanyName}
                                                onChange={(e) => setNewInvoiceData({ ...newInvoiceData, customerCompanyName: e.target.value })}
                                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-brand-primary/5 transition-all outline-none"
                                                placeholder="Organization Name"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Category</label>
                                                <select
                                                    value={newInvoiceData.productType}
                                                    onChange={(e) => handleProductChange(e.target.value)}
                                                    className="w-full bg-gray-100 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-black text-brand-primary focus:bg-white focus:ring-4 focus:ring-brand-primary/5 transition-all outline-none capitalize"
                                                >
                                                    {products.map(p => (
                                                        <option key={p} value={p}>{p}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {(newInvoiceData.productType === 'tshirt' || newInvoiceData.productType === 'jersey' || newInvoiceData.productType === 'corporate gift') && (
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Style Selection</label>
                                                    <select
                                                        value={newInvoiceData.productSubCategory}
                                                        onChange={(e) => handleSubCategoryChange(e.target.value)}
                                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-brand-primary/5 transition-all outline-none capitalize"
                                                    >
                                                        <option value="">Select Option</option>
                                                        {(productSubCategories[newInvoiceData.productType] || []).map(s => (
                                                            <option key={s} value={s}>{s}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Price (₹)</label>
                                                <div className="relative">
                                                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">₹</span>
                                                    <input
                                                        type="number"
                                                        value={newInvoiceData.unitPrice}
                                                        onChange={(e) => setNewInvoiceData({ ...newInvoiceData, unitPrice: Number(e.target.value) })}
                                                        className="w-full bg-brand-secondary/20 border-0 rounded-2xl pl-9 pr-5 py-3.5 text-sm font-black text-brand-primary focus:ring-4 focus:ring-brand-primary/10 transition-all outline-none"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Quantity</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    required
                                                    value={newInvoiceData.quantity}
                                                    onChange={(e) => setNewInvoiceData({ ...newInvoiceData, quantity: Number(e.target.value) })}
                                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-brand-primary/5 transition-all outline-none"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Payment via</label>
                                                <select
                                                    value={newInvoiceData.paymentMethod}
                                                    onChange={(e) => setNewInvoiceData({ ...newInvoiceData, paymentMethod: e.target.value as any })}
                                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-brand-primary/5 transition-all outline-none"
                                                >
                                                    {paymentMethods.map(pm => (
                                                        <option key={pm} value={pm}>{pm}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Discount (%)</label>
                                                <input
                                                    type="number"
                                                    value={newInvoiceData.discountRate}
                                                    onChange={(e) => setNewInvoiceData({ ...newInvoiceData, discountRate: Number(e.target.value) })}
                                                    className="w-full bg-brand-secondary/10 border border-brand-secondary/20 rounded-2xl px-5 py-3.5 text-sm font-black text-brand-primary focus:bg-white focus:ring-4 focus:ring-brand-primary/5 transition-all outline-none"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Shipping (₹)</label>
                                                <input
                                                    type="number"
                                                    value={newInvoiceData.shippingCost}
                                                    onChange={(e) => setNewInvoiceData({ ...newInvoiceData, shippingCost: Number(e.target.value) })}
                                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-brand-primary/5 transition-all outline-none"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">GST / Tax (%)</label>
                                                <input
                                                    type="number"
                                                    value={newInvoiceData.taxRate}
                                                    onChange={(e) => setNewInvoiceData({ ...newInvoiceData, taxRate: Number(e.target.value) })}
                                                    className="w-full bg-gray-100 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-black text-brand-primary focus:bg-white focus:ring-4 focus:ring-brand-primary/5 transition-all outline-none"
                                                />
                                            </div>
                                        </div>

                                        {/* Hidden bank and signature details */}
                                        <input type="hidden" value={newInvoiceData.bankName} />
                                        <input type="hidden" value={newInvoiceData.bankAccountName} />
                                        <input type="hidden" value={newInvoiceData.bankIfscCode} />
                                        <input type="hidden" value={newInvoiceData.bankAccountNumber} />
                                        <input type="hidden" value={newInvoiceData.companySignature} />

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Reference ID</label>
                                                <input
                                                    type="text"
                                                    value={newInvoiceData.invoiceNumber}
                                                    onChange={(e) => setNewInvoiceData({ ...newInvoiceData, invoiceNumber: e.target.value })}
                                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-brand-primary/5 transition-all outline-none"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Valid Until</label>
                                                <input
                                                    type="date"
                                                    value={newInvoiceData.dueDate}
                                                    onChange={(e) => setNewInvoiceData({ ...newInvoiceData, dueDate: e.target.value })}
                                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-brand-primary/5 transition-all outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-2 flex flex-col gap-3 flex-shrink-0">
                                        <Button type="submit" className="w-full py-4 text-white bg-brand-primary rounded-2xl font-black text-base shadow-xl shadow-brand-primary/30 hover:scale-[1.02] active:scale-95 transition-all outline-none">
                                            Generate & Save Invoice
                                        </Button>
                                        <button
                                            type="button"
                                            onClick={() => setIsNewInvoiceModalOpen(false)}
                                            className="w-full py-3 text-[11px] font-black uppercase text-gray-400 tracking-widest hover:text-gray-600 transition-colors"
                                        >
                                            Dismiss Form
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

function X({ className, ...props }: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            {...props}
        >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
        </svg>
    );
}
