import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Printer, Send, CreditCard, Laptop } from 'lucide-react';
import { Invoice } from '../types';
import Logo from './Logo';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface InvoiceModalProps {
    invoice: Invoice | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function InvoiceModal({ invoice, isOpen, onClose }: InvoiceModalProps) {
    const invoiceRef = useRef<HTMLDivElement>(null);
    const [isQrOpen, setIsQrOpen] = useState(false);

    if (!invoice) return null;

    const handleDownloadPDF = async () => {
        const element = invoiceRef.current;
        if (!element) return;

        try {
            // Use standard pixels for A4 width to ensure consistent capture
            const standardWidth = 1000;

            const canvas = await html2canvas(element, {
                scale: 2, // 2 is usually enough for prints
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                windowWidth: standardWidth, // Virtual window width to prevent responsive shifts
                onclone: (clonedDoc) => {
                    const el = clonedDoc.querySelector('[data-invoice-container]') as HTMLElement;
                    if (el) {
                        el.style.width = `${standardWidth}px`;
                        el.style.height = 'auto';
                        el.style.overflow = 'visible';
                    }
                }
            });

            const imgData = canvas.toDataURL('image/jpeg', 1.0);
            const pdf = new jsPDF('p', 'mm', 'a4');

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();

            const margin = 10; // 10mm margin
            const maxLineWidth = pageWidth - (margin * 2);
            const maxLineHeight = pageHeight - (margin * 2);

            const imgWidth = maxLineWidth;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            // If the content is longer than one page, add multiple pages
            let heightLeft = imgHeight;
            let position = margin;

            pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
            heightLeft -= maxLineHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight + margin;
                pdf.addPage();
                pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
                heightLeft -= maxLineHeight;
            }

            pdf.save(`Invoice-${invoice.invoiceNumber}.pdf`);
        } catch (error) {
            console.error('PDF Generation Error:', error);
            alert('PDF generation failed. Please try using the "Print" button instead.');
        }
    };

    const handleSendInvoice = () => {
        const subject = encodeURIComponent(`Invoice ${invoice.invoiceNumber} from ${invoice.fromName}`);
        const body = encodeURIComponent(
            `Hello ${invoice.billToName},\n\n` +
            `Please find our invoice ${invoice.invoiceNumber} for the total amount of ₹${invoice.total.toLocaleString()}.\n\n` +
            `Product: ${invoice.productType?.toUpperCase()} ${invoice.productSubCategory ? `(${invoice.productSubCategory.toUpperCase()})` : ''}\n` +
            `Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}\n\n` +
            `Best regards,\n` +
            `${invoice.fromName}`
        );

        const mailtoUrl = `mailto:${invoice.billToEmail}?subject=${subject}&body=${body}`;
        const link = document.createElement('a');
        link.href = mailtoUrl;
        link.target = '_blank';
        link.click();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Large QR Modal overlay when clicked */}
                    <AnimatePresence>
                        {isQrOpen && (
                            <motion.div
                                initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                                animate={{ opacity: 1, backdropFilter: 'blur(10px)' }}
                                exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                                className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4 cursor-zoom-out"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsQrOpen(false);
                                }}
                            >
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.8, opacity: 0 }}
                                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                    className="max-w-md w-full aspect-square bg-white rounded-[60px] p-10 shadow-2xl relative"
                                >
                                    <img src="/Qr.png" className="w-full h-full object-contain" alt="Large QR" />
                                    <div className="absolute -bottom-16 left-0 right-0 text-center">
                                        <p className="text-white font-black uppercase tracking-[0.4em] text-[10px]">Tap anywhere to close</p>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative bg-white w-full max-w-4xl max-h-[95vh] overflow-y-auto rounded-3xl shadow-2xl overflow-hidden shadow-black/20"
                    >
                        {/* Header / Actions */}
                        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 px-8 py-4 flex items-center justify-between">
                            <h3 className="font-bold text-gray-900">Invoice Reference: {invoice.invoiceNumber}</h3>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => window.print()}
                                    className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 transition-colors"
                                    title="Print"
                                >
                                    <Printer className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={handleDownloadPDF}
                                    className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 transition-colors"
                                    title="Download PDF"
                                >
                                    <Download className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={handleSendInvoice}
                                    className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-brand-primary/20 hover:bg-brand-primary/90 transition-all"
                                >
                                    <Send className="w-4 h-4" /> Send Invoice
                                </button>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-colors ml-2"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Invoice Content (Modeled after the image) */}
                        <div ref={invoiceRef} data-invoice-container className="p-12 text-gray-800 bg-white">
                            <div className="flex justify-between items-start mb-16">
                                <div className="scale-125 origin-top-left flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden shadow-lg">
                                        <img
                                            src="/logo.png"
                                            alt="Pw"
                                            className="w-full h-full object-cover"
                                            referrerPolicy="no-referrer"
                                        />
                                    </div>
                                    <span className="text-2xl font-black text-gray-900 tracking-tighter">Pallywear</span>
                                </div>
                                <div className="text-right">
                                    <h1 className="text-4xl font-black text-white p-0 m-0">.</h1>
                                    <div className="mt-4 space-y-1 text-sm text-gray-500 font-medium">
                                        <p>Invoice no: <span className="text-gray-900 font-bold ml-2">{invoice.invoiceNumber}</span></p>
                                        <p>Invoice date: <span className="text-gray-900 font-bold ml-2">{new Date(invoice.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span></p>
                                        <p>Due: <span className="text-gray-900 font-bold ml-2">{new Date(invoice.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span></p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-12 mb-16">
                                <div>
                                    <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">From</h2>
                                    <div className="space-y-1">
                                        <p className="text-xl font-black text-gray-900">{invoice.fromName}</p>
                                        <p className="text-sm font-medium text-gray-500 prose whitespace-pre-line">{invoice.fromAddress}</p>
                                        <p className="text-sm font-medium text-gray-500">{invoice.fromPhone}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Bill to</h2>
                                    <div className="space-y-1">
                                        <p className="text-xl font-black text-gray-900">{invoice.billToName}</p>
                                        <p className="text-sm font-medium text-gray-500">{invoice.billToEmail}</p>
                                        <p className="text-sm font-medium text-gray-500">{invoice.billToPhone}</p>
                                        <p className="text-sm font-medium text-gray-500 whitespace-pre-line">{invoice.billToAddress}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Items Table */}
                            <div className="mb-12 overflow-hidden rounded-xl border border-gray-100">
                                <table className="w-full text-sm text-left">
                                    <thead>
                                        <tr className="bg-brand-primary bg-gradient-to-r from-brand-primary to-brand-secondary text-white">
                                            <th className="px-6 py-4 font-black uppercase tracking-wider text-[10px]">Description</th>
                                            <th className="px-6 py-4 font-black uppercase tracking-wider text-[10px] text-right">Rate, Cada</th>
                                            <th className="px-6 py-4 font-black uppercase tracking-wider text-[10px] text-center">Qty</th>
                                            <th className="px-6 py-4 font-black uppercase tracking-wider text-[10px] text-right">Tax</th>
                                            <th className="px-6 py-4 font-black uppercase tracking-wider text-[10px] text-right">Disc</th>
                                            <th className="px-6 py-4 font-black uppercase tracking-wider text-[10px] text-right">Amount, Cada</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {invoice.items.map((item, i) => (
                                            <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-6 min-w-[300px]">
                                                    <p className="font-bold text-gray-900 mb-1">{item.description}</p>
                                                    <p className="text-[10px] text-gray-400 italic">
                                                        Category: {invoice.productType?.toUpperCase()}
                                                        {invoice.productSubCategory ? ` - ${invoice.productSubCategory.toUpperCase()}` : ''}
                                                    </p>
                                                </td>
                                                <td className="px-6 py-6 text-right font-medium">₹{item.rate.toLocaleString()}</td>
                                                <td className="px-6 py-6 text-center font-medium">{item.quantity}</td>
                                                <td className="px-6 py-6 text-right font-medium">{item.tax}%</td>
                                                <td className="px-6 py-6 text-right font-medium">{item.discount}%</td>
                                                <td className="px-6 py-6 text-right font-black text-gray-900">₹{item.amount.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Bottom Section */}
                            <div className="grid grid-cols-2 gap-12">
                                <div>
                                    <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Payment & Terms</h2>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                                                <CreditCard className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Payment Method</p>
                                                <p className="text-sm font-black text-gray-900">{invoice.paymentMethod || 'GPay'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-8">
                                            <div
                                                className="flex-shrink-0 w-48 h-48 bg-white border border-gray-100 rounded-3xl overflow-hidden p-1 shadow-md cursor-zoom-in hover:scale-105 transition-transform duration-300"
                                                onClick={() => setIsQrOpen(true)}
                                            >
                                                <img
                                                    src="/Qr.png"
                                                    alt="Payment QR Code"
                                                    className="w-full h-full object-contain"
                                                    referrerPolicy="no-referrer"
                                                />
                                            </div>
                                            <div className="space-y-1.5 pt-3">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Company Bank Details</p>
                                                <p className="text-[11px] font-black text-gray-900 leading-tight">Bank: <span className="text-brand-primary">{invoice.bankName || 'HDFC BANK'}</span></p>
                                                <p className="text-[11px] font-black text-gray-900 leading-tight">Acc Name: <span className="text-gray-600">{invoice.bankAccountName || 'PALLYWEAR PVT LTD'}</span></p>
                                                <p className="text-[11px] font-black text-gray-900 leading-tight">IFSC Code: <span className="text-gray-600">{invoice.bankIfscCode || 'HDFC0008964'}</span></p>
                                                <p className="text-[11px] font-black text-gray-900 leading-tight">Account: <span className="text-gray-600 uppercase">{invoice.bankAccountNumber || '50202110682524'}</span></p>
                                            </div>
                                        </div>
                                        {invoice.notes && (
                                            <div className="mt-8">
                                                <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Notes</h2>
                                                <p className="text-xs text-gray-400 font-medium leading-relaxed">{invoice.notes}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-bold text-gray-500">Subtotal:</span>
                                        <span className="font-black text-gray-900">₹{invoice.subtotal.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-bold text-gray-500">Discount ({invoice.items[0]?.discount || 0}%):</span>
                                        <span className="font-black text-gray-900">₹{invoice.discountTotal.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-bold text-gray-500">Shipping Cost:</span>
                                        <span className="font-black text-gray-900">₹{invoice.shippingCost.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-bold text-gray-500">Sales Tax (GST {invoice.items[0]?.tax || 18}%):</span>
                                        <span className="font-black text-gray-900">₹{invoice.salesTax.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm pt-3 border-t border-gray-100">
                                        <span className="font-bold text-gray-900">Total:</span>
                                        <span className="font-black text-gray-900">₹{invoice.total.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-bold text-gray-500">Amount paid:</span>
                                        <span className="font-black text-gray-900">₹{invoice.amountPaid.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-5 bg-gradient-to-r from-brand-primary/10 to-brand-secondary/10 rounded-2xl mt-6 border border-brand-primary/5">
                                        <span className="text-sm font-black text-brand-primary uppercase tracking-widest">Balance Due:</span>
                                        <span className="text-xl font-black text-brand-primary">₹{invoice.balanceDue.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Signature area (matching image) */}
                            <div className="mt-20 flex justify-between items-end px-4">
                                {/* Seal on the left */}
                                <div className="relative w-48 h-48 opacity-80 pointer-events-none rotate-[-8deg] mb-8">
                                    <img
                                        src="/SEAL.png"
                                        alt="Company Seal"
                                        className="w-full h-full object-contain"
                                        referrerPolicy="no-referrer"
                                    />
                                </div>

                                {/* Signature on the right */}
                                <div className="relative text-center">
                                    <div className="h-32 flex items-end justify-center mb-2 px-4">
                                        <img
                                            src="/signature.png"
                                            alt="Authorized Signature"
                                            className="h-24 object-contain translate-x-4 opacity-95"
                                            referrerPolicy="no-referrer"
                                        />
                                    </div>
                                    <div className="w-64 h-px bg-gray-300" />
                                    <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest mt-4">Authorized Signature</p>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">Pallywear Pvt. Ltd.</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
