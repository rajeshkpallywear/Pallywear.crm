import React, { useRef } from 'react';
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
                                    <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center text-white font-black text-xl">Pw</div>
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
                                        <tr className="bg-brand-primary text-white">
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
                                        <div>
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Company Bank Details</p>
                                            <p className="text-[10px] font-black text-gray-900">IFSC Code: {invoice.bankIFSCCode || 'HDFC0008964'}</p>
                                            <p className="text-[10px] font-black text-gray-900">Account: {invoice.bankAccountNumber || '50202110682524'}</p>
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
                                    <div className="flex justify-between items-center p-4 bg-brand-secondary rounded-xl mt-6">
                                        <span className="text-sm font-black text-brand-primary uppercase tracking-wider">Balance Due:</span>
                                        <span className="text-lg font-black text-brand-primary">₹{invoice.balanceDue.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Signature area (matching image) */}
                            <div className="mt-20 flex justify-end">
                                <div className="relative text-center">
                                    <div className="absolute -top-32 -left-20 w-48 h-48 opacity-30 pointer-events-none rotate-[-12deg]">
                                        <svg viewBox="0 0 200 200" className="w-full h-full text-blue-700">
                                            <circle cx="100" cy="100" r="95" fill="none" stroke="currentColor" strokeWidth="4" />
                                            <circle cx="100" cy="100" r="88" fill="none" stroke="currentColor" strokeWidth="2" />
                                            <circle cx="100" cy="100" r="72" fill="none" stroke="currentColor" strokeWidth="1.5" />

                                            <path id="stampPathTop" d="M 40,100 A 60,60 0 1,1 160,100" fill="none" />
                                            <text className="text-[11px] font-black uppercase tracking-[0.25em]" fill="currentColor">
                                                <textPath href="#stampPathTop" startOffset="50%" textAnchor="middle">PALLYWEAR PVT. LTD.</textPath>
                                            </text>

                                            {/* Center Box */}
                                            <g transform="translate(100, 100)">
                                                <rect x="-45" y="-18" width="90" height="36" rx="4" fill="none" stroke="currentColor" strokeWidth="2.5" />
                                                <text x="0" y="5" textAnchor="middle" className="text-[16px] font-black tracking-tight" fill="currentColor">APPROVED</text>
                                            </g>

                                            {/* Location at bottom */}
                                            <path id="stampPathBottom" d="M 40,100 A 60,60 0 0,0 160,100" fill="none" />
                                            <text className="text-[9px] font-black uppercase tracking-[0.1em]" fill="currentColor">
                                                <textPath href="#stampPathBottom" startOffset="50%" textAnchor="middle" side="right">CHENNAI - 600063</textPath>
                                            </text>

                                            <g className="text-blue-700 opacity-60">
                                                <text x="70" y="165" textAnchor="middle" className="text-[8px]" fill="currentColor">★</text>
                                                <text x="100" y="170" textAnchor="middle" className="text-[8px]" fill="currentColor">★</text>
                                                <text x="130" y="165" textAnchor="middle" className="text-[8px]" fill="currentColor">★</text>
                                            </g>
                                        </svg>
                                    </div>
                                    <div className="h-24 flex items-end justify-center mb-2 px-4">
                                        <span className="font-['Dancing_Script',_cursive] text-6xl text-gray-800 -rotate-3 select-none translate-x-4 opacity-90">
                                            {invoice.companySignature || 'V.Edelt.'}
                                        </span>
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
