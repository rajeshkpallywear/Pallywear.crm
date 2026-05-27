import React, { useState } from 'react';
import { useLeads } from '../context/LeadContext';
import { useAuth } from '../context/AuthContext';
import { Lead, LeadType } from '../types';
import { Button } from './Button';
import {
  Plus, Edit2, Trash2, Download, Search,
  X, Check, AlertCircle, Phone, Building2,
  FileText, Calendar, DollarSign, Briefcase, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { exportToExcel } from '../lib/excel';
import { cn } from '../lib/utils';
import { mockDataService } from '../service/mockDataService';
import { OrderStatus } from '../types';
import { downloadOrderPDF } from '../lib/pdfHelper';

interface LeadManagerProps {
  hideAdd?: boolean;
  autoOpenAdd?: boolean;
}

export default function LeadManager({ hideAdd = false, autoOpenAdd = false }: LeadManagerProps) {
  const { leads, addLead, updateLead, deleteLead, addOrder } = useLeads();
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    number: '',
    companyName: '',
    gst: '',
    leadType: 'Warm' as LeadType,
    entryDate: new Date().toISOString().split('T')[0],
    forecastedValue: 0,
    convertedValue: 0,
    totalOrderValue: 0,
    discountCode: '',
    discountAmount: 0,
    netTotal: 0,
  });

  const isFirstLead = leads.filter(l => l.createdBy === user?.id).length === 0;

  const handleOpenAdd = () => {
    setEditingLead(null);
    setFormData({
      name: '',
      number: '',
      companyName: '',
      gst: '',
      leadType: 'Warm',
      entryDate: new Date().toISOString().split('T')[0],
      forecastedValue: 0,
      convertedValue: 0,
      totalOrderValue: 0,
      discountCode: isFirstLead ? 'FIRST10' : '',
      discountAmount: 0,
      netTotal: 0,
    });
    setIsModalOpen(true);
  };

  React.useEffect(() => {
    if (autoOpenAdd) {
      handleOpenAdd();
    }
  }, [autoOpenAdd]);

  const calculateFinancials = (total: number, code: string) => {
    let discount = 0;
    if (code === 'FIRST10') {
      discount = total * 0.1;
    }
    return {
      discountAmount: discount,
      netTotal: total - discount
    };
  };

  const handleConvertOrder = async (lead: Lead) => {
    if (confirm(`Convert ${lead.name} to a formal order for billing?`)) {
      const newOrder = {
        id: `ORD-${Date.now()}`,
        customerInfo: {
          name: lead.name,
          phone: lead.number,
          address: lead.companyName, // Use company as initial address
        },
        category: 'Apparel', // Default
        quantity: 1,
        details: {
          company: lead.companyName,
          gst: lead.gst,
          leadType: lead.leadType
        },
        sizeBreakdown: [],
        financials: {
          totalAmount: lead.netTotal || lead.totalOrderValue,
          advancePay: 0,
          balanceAmount: lead.netTotal || lead.totalOrderValue,
        },
        status: OrderStatus.PENDING,
        staffImages: [],
        staffPdfs: [],
        accountsAttachments: [],
        orderManagementAttachments: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      try {
        const createdOrder = await addOrder(newOrder);
        alert("Success: Order created! Downloaded order manual. Please move the order to Design and Accounts manually from the order details.");
        if (createdOrder) {
          await downloadOrderPDF(createdOrder);
        }
      } catch (err: any) {
        alert("Failed to create order: " + err.message);
      }
    }
  };

  const handleOpenEdit = (lead: Lead) => {
    setEditingLead(lead);
    setFormData({
      name: lead.name,
      number: lead.number,
      companyName: lead.companyName,
      gst: lead.gst,
      leadType: lead.leadType,
      entryDate: lead.entryDate,
      forecastedValue: lead.forecastedValue,
      convertedValue: lead.convertedValue,
      totalOrderValue: lead.totalOrderValue,
      discountCode: lead.discountCode || '',
      discountAmount: lead.discountAmount || 0,
      netTotal: lead.netTotal || lead.totalOrderValue,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { discountAmount, netTotal } = calculateFinancials(formData.totalOrderValue, formData.discountCode);
    const finalData = { ...formData, discountAmount, netTotal };

    if (editingLead) {
      updateLead(editingLead.id, finalData);
    } else {
      addLead({
        ...finalData,
        createdBy: user?.id || 'unknown',
        createdByName: user?.name || 'Unknown',
      });
    }
    setIsModalOpen(false);
  };

  const handleExport = () => {
    const exportData = leads.map(l => ({
      'Lead ID': l.id,
      'Name': l.name,
      'Phone': l.number,
      'Company': l.companyName,
      'GST': l.gst,
      'Type': l.leadType,
      'Entry Date': l.entryDate,
      'Forecasted Value': l.forecastedValue,
      'Converted Value': l.convertedValue,
      'Total Order Value': l.totalOrderValue,
      'Created By': l.createdByName
    }));
    exportToExcel(exportData, 'Leads_Report');
  };

  const filteredLeads = leads.filter(l => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = l.name.toLowerCase().includes(query) ||
      l.companyName.toLowerCase().includes(query) ||
      l.id.toLowerCase().includes(query) ||
      (l.createdByName && l.createdByName.toLowerCase().includes(query));

    const matchesStartDate = !startDate || l.entryDate >= startDate;
    const matchesEndDate = !endDate || l.entryDate <= endDate;

    return matchesSearch && matchesStartDate && matchesEndDate;
  });

  const canManage = (lead: Lead) => {
    if (user?.role === 'admin') return true;
    return lead.createdBy === user?.id;
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search leads or staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
            />
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-1.5 shadow-sm">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs bg-transparent border-none focus:ring-0 p-0 text-gray-600"
              placeholder="Start Date"
            />
            <span className="text-gray-300">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs bg-transparent border-none focus:ring-0 p-0 text-gray-600"
              placeholder="End Date"
            />
            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="md"
            className="bg-white text-gray-500 border-gray-100 hover:bg-gray-50 gap-2 rounded-xl shadow-sm font-bold"
            onClick={handleExport}
          >
            <Download className="w-4 h-4" /> Export Excel
          </Button>
          {!hideAdd && (
            <Button
              size="md"
              className="bg-white text-brand-primary border-2 border-brand-primary/10 hover:bg-gray-50 gap-2 rounded-xl shadow-sm font-bold"
              onClick={handleOpenAdd}
            >
              <Plus className="w-4 h-4" /> Add Lead
            </Button>
          )}
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
            <tr>
              <th className="px-6 py-4">Staff</th>
              <th className="px-6 py-4">Lead Info</th>
              <th className="px-6 py-4">Company & GST</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Entry Date</th>
              <th className="px-6 py-4 text-right">Financials</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredLeads.map((lead) => (
              <tr key={lead.id} className="hover:bg-gray-50/30 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center text-xs font-bold text-white shadow-sm shadow-brand-primary/20">
                      {lead.createdByName?.charAt(0) || 'U'}
                    </div>
                    <span className="text-xs text-gray-600 font-medium">{lead.createdByName}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg text-white shadow-md shadow-black/5",
                      lead.leadType === 'Hot' ? "bg-red-500" :
                        lead.leadType === 'Warm' ? "bg-amber-500" :
                          "bg-blue-500"
                    )}>
                      {lead.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{lead.name}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {lead.number}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="w-3.5 h-3.5 text-gray-400" />
                    <span className="font-medium text-gray-700">{lead.companyName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs text-gray-400 font-mono uppercase">{lead.gst || 'No GST'}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider",
                    lead.leadType === 'Hot' ? "bg-red-100 text-red-700" :
                      lead.leadType === 'Warm' ? "bg-amber-100 text-amber-700" :
                        "bg-blue-100 text-blue-700"
                  )}>
                    {lead.leadType}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span>{lead.entryDate}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="space-y-1">
                    <p className="text-xs">
                      <span className="text-gray-400">Total Value:</span>
                      <span className="font-bold text-gray-700 ml-1">₹{lead.totalOrderValue?.toLocaleString()}</span>
                    </p>
                    {lead.discountAmount ? (
                      <>
                        <p className="text-[10px] text-green-600 font-bold flex items-center justify-end gap-1">
                          <Check className="w-3 h-3" /> Discount ({lead.discountCode}): -₹{lead.discountAmount.toLocaleString()}
                        </p>
                        <p className="text-sm font-black text-brand-primary">
                          ₹{lead.netTotal?.toLocaleString()}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm font-black text-gray-900">
                        ₹{lead.totalOrderValue?.toLocaleString()}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {canManage(lead) && (
                      <>
                        <button
                          onClick={() => handleConvertOrder(lead)}
                          className="p-2 hover:bg-green-50 text-green-600 rounded-lg transition-colors"
                          title="Convert to Order"
                        >
                          <Zap className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(lead)}
                          className="p-2 hover:bg-brand-secondary text-brand-primary rounded-lg transition-colors"
                          title="Edit Lead"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteLead(lead.id)}
                          className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                          title="Delete Lead"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredLeads.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">
                  No leads found. Use "Add Lead" to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 sm:p-12">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-full"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-brand-light/30">
                <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                  {editingLead ? <Edit2 className="w-5 h-5 text-brand-primary" /> : <Plus className="w-5 h-5 text-brand-primary" />}
                  {editingLead ? 'Update Lead Details' : 'Register New Lead'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 overflow-y-auto overflow-x-hidden space-y-6">
                {/* Special Offer Banner */}
                {!editingLead && isFirstLead && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-brand-primary/5 border border-brand-primary/20 p-4 rounded-xl flex items-start gap-3"
                  >
                    <div className="p-2 bg-brand-primary/10 rounded-lg">
                      <Zap className="w-5 h-5 text-brand-primary" strokeWidth={3} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-brand-primary">First Order Reward Unlocked!</p>
                      <p className="text-xs text-brand-primary/70">Use coupon <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-brand-primary/20">FIRST10</span> to get 10% off on your first order conversion.</p>
                    </div>
                  </motion.div>
                )}

                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Client Name</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        required
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-primary/10"
                        placeholder="John Doe"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Contact Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        required
                        type="tel"
                        value={formData.number}
                        onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-primary/10"
                        placeholder="+91 0000000000"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Company Name</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        required
                        type="text"
                        value={formData.companyName}
                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-primary/10"
                        placeholder="Enterprise Co."
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">GST Number</label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={formData.gst}
                        onChange={(e) => setFormData({ ...formData, gst: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-primary/10 font-mono uppercase"
                        placeholder="22AAAAA0000A1Z5"
                      />
                    </div>
                  </div>
                </div>

                {/* Lead Type and Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Lead Type</label>
                    <div className="flex gap-2">
                      {(['Hot', 'Warm', 'Cold'] as LeadType[]).map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setFormData({ ...formData, leadType: type })}
                          className={cn(
                            "flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all",
                            formData.leadType === type
                              ? "bg-white text-brand-primary border-brand-primary shadow-md"
                              : "bg-white border-gray-200 text-gray-500 hover:border-brand-primary/50"
                          )}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Entry Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        required
                        type="date"
                        value={formData.entryDate}
                        onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-primary/10"
                      />
                    </div>
                  </div>
                </div>

                {/* Financial Values */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Financial Overview (₹)</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400">Forecasted</label>
                      <div className="relative">
                        <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                        <input
                          type="number"
                          value={formData.forecastedValue}
                          onChange={(e) => setFormData({ ...formData, forecastedValue: Number(e.target.value) })}
                          className="w-full bg-white border border-gray-200 rounded-lg pl-6 pr-2 py-1.5 text-sm focus:ring-1 focus:ring-brand-primary"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400">Converted</label>
                      <div className="relative">
                        <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                        <input
                          type="number"
                          value={formData.convertedValue}
                          onChange={(e) => setFormData({ ...formData, convertedValue: Number(e.target.value) })}
                          className="w-full bg-white border border-gray-200 rounded-lg pl-6 pr-2 py-1.5 text-sm focus:ring-1 focus:ring-brand-primary"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400">Total Order</label>
                      <div className="relative">
                        <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                        <input
                          type="number"
                          value={formData.totalOrderValue}
                          onChange={(e) => setFormData({ ...formData, totalOrderValue: Number(e.target.value) })}
                          className="w-full bg-white border border-gray-200 rounded-lg pl-6 pr-2 py-1.5 text-sm focus:ring-1 focus:ring-brand-primary"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Coupon Code</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={formData.discountCode}
                      onChange={(e) => setFormData({ ...formData, discountCode: e.target.value.toUpperCase() })}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-primary/10 font-mono uppercase"
                      placeholder="e.g. FIRST10"
                    />
                    {formData.discountCode === 'FIRST10' && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100">
                        <Check className="w-3 h-3" /> 10% Applied
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                  <Button type="submit" className="flex-[2] shadow-lg shadow-brand-primary/20">
                    {editingLead ? 'Update Lead Information' : 'Confirm Registration'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
