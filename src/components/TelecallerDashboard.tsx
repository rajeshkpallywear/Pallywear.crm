/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneCall,
  Plus,
  Search,
  X,
  Clock,
  ClipboardList,
  UserPlus,
  CheckCircle,
  AlertTriangle,
  FileText,
  Filter,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLeads } from '../context/LeadContext';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, setDoc, doc } from 'firebase/firestore';
import { cn } from '../lib/utils';

export interface CallLog {
  id: string;
  customerName: string;
  phoneNumber: string;
  callType: 'incoming' | 'outgoing';
  status: 'answered' | 'missed' | 'busy';
  duration: number; // in seconds
  timestamp: number; // milliseconds
  notes: string;
  agentId: string;
  agentName: string;
}

const MOCK_CALL_LOGS = (now: number): CallLog[] => [
  {
    id: 'mock_1',
    customerName: 'Rajesh Kumar',
    phoneNumber: '+91 98765 43210',
    callType: 'incoming',
    status: 'answered',
    duration: 134,
    timestamp: now - 1000 * 60 * 15, // 15 mins ago
    notes: 'Inquired about order dispatch status. Confirmed artwork is approved and moving to production.',
    agentId: 'system',
    agentName: 'System Seeder'
  },
  {
    id: 'mock_2',
    customerName: 'Sanjay Sharma',
    phoneNumber: '+91 91234 56789',
    callType: 'outgoing',
    status: 'answered',
    duration: 85,
    timestamp: now - 1000 * 60 * 60 * 2, // 2 hours ago
    notes: 'Called to check lead qualification. Customer requested a callback tomorrow afternoon with pricing.',
    agentId: 'system',
    agentName: 'System Seeder'
  },
  {
    id: 'mock_3',
    customerName: 'Priya Patel',
    phoneNumber: '+91 99887 76655',
    callType: 'incoming',
    status: 'missed',
    duration: 0,
    timestamp: now - 1000 * 60 * 60 * 4, // 4 hours ago
    notes: 'Missed call from prospect. Left no message. Follow-up outbound call required.',
    agentId: 'system',
    agentName: 'System Seeder'
  },
  {
    id: 'mock_4',
    customerName: 'Vikram Singh',
    phoneNumber: '+91 88776 65544',
    callType: 'outgoing',
    status: 'busy',
    duration: 0,
    timestamp: now - 1000 * 60 * 60 * 6, // 6 hours ago
    notes: 'Attempted to call. Customer line was busy. Scheduled follow-up attempt.',
    agentId: 'system',
    agentName: 'System Seeder'
  },
  {
    id: 'mock_5',
    customerName: 'Anil Gupta',
    phoneNumber: '+91 77665 54433',
    callType: 'incoming',
    status: 'answered',
    duration: 210,
    timestamp: now - 1000 * 60 * 60 * 24, // 1 day ago
    notes: 'Detailed discussion about bulk t-shirt design options and logo embroidery. Emailed catalog.',
    agentId: 'system',
    agentName: 'System Seeder'
  }
];

export default function TelecallerDashboard() {
  const { user } = useAuth();
  const { addLead } = useLeads();
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [activeFilter, setActiveFilter] = useState<'all' | 'incoming' | 'outgoing'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [showLogModal, setShowLogModal] = useState(false);
  const [showLeadModal, setShowLeadModal] = useState(false);
  
  // Form States (Log Call)
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [callType, setCallType] = useState<'incoming' | 'outgoing'>('incoming');
  const [callStatus, setCallStatus] = useState<'answered' | 'missed' | 'busy'>('answered');
  const [durationMin, setDurationMin] = useState('0');
  const [durationSec, setDurationSec] = useState('0');
  const [callNotes, setCallNotes] = useState('');
  const [isSavingLog, setIsSavingLog] = useState(false);

  // Form States (Quick Lead)
  const [leadCompanyName, setLeadCompanyName] = useState('');
  const [leadType, setLeadType] = useState<'Hot' | 'Warm' | 'Cold'>('Warm');
  const [leadForecastedVal, setLeadForecastedVal] = useState('5000');
  const [selectedCallForLead, setSelectedCallForLead] = useState<CallLog | null>(null);
  const [isSavingLead, setIsSavingLead] = useState(false);

  // Subscribe to call logs from Firestore
  useEffect(() => {
    const logsRef = collection(db, 'call_logs');
    const q = query(logsRef, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dbLogs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as CallLog));

      if (dbLogs.length > 0) {
        setLogs(dbLogs);
      } else {
        // Seeding mock data locally
        setLogs(MOCK_CALL_LOGS(Date.now()));
      }
      setLoading(false);
    }, (error) => {
      console.error("Firestore call logs subscription error, using fallback mock data:", error);
      setLogs(MOCK_CALL_LOGS(Date.now()));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Compute stats
  const stats = useMemo(() => {
    const total = logs.length;
    const incoming = logs.filter(log => log.callType === 'incoming').length;
    const outgoing = logs.filter(log => log.callType === 'outgoing').length;
    return { total, incoming, outgoing };
  }, [logs]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs
      .filter(log => {
        if (activeFilter === 'incoming') return log.callType === 'incoming';
        if (activeFilter === 'outgoing') return log.callType === 'outgoing';
        return true;
      })
      .filter(log => {
        const queryStr = searchQuery.toLowerCase().trim();
        if (!queryStr) return true;
        return (
          log.customerName.toLowerCase().includes(queryStr) ||
          log.phoneNumber.includes(queryStr) ||
          (log.notes && log.notes.toLowerCase().includes(queryStr))
        );
      });
  }, [logs, activeFilter, searchQuery]);

  // Save Call Log
  const handleSaveCallLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !phoneNumber.trim()) {
      alert('Please fill out customer name and phone number.');
      return;
    }

    setIsSavingLog(true);
    try {
      const docRef = doc(collection(db, 'call_logs'));
      const durationInSeconds = (parseInt(durationMin, 10) || 0) * 60 + (parseInt(durationSec, 10) || 0);
      
      const newLog: CallLog = {
        id: docRef.id,
        customerName: customerName.trim(),
        phoneNumber: phoneNumber.trim(),
        callType,
        status: callStatus,
        duration: callStatus === 'answered' ? durationInSeconds : 0,
        timestamp: Date.now(),
        notes: callNotes.trim(),
        agentId: user?.id || 'unknown',
        agentName: user?.name || 'Telecaller'
      };

      await setDoc(docRef, newLog);
      
      // Reset Form
      setCustomerName('');
      setPhoneNumber('');
      setCallType('incoming');
      setCallStatus('answered');
      setDurationMin('0');
      setDurationSec('0');
      setCallNotes('');
      setShowLogModal(false);
    } catch (err) {
      console.error('Error saving call log:', err);
      alert('Failed to save call log. Please try again.');
    } finally {
      setIsSavingLog(false);
    }
  };

  // Convert call log directly to a Lead
  const handleOpenLeadModal = (call: CallLog) => {
    setSelectedCallForLead(call);
    setLeadCompanyName('');
    setLeadType('Warm');
    setLeadForecastedVal('5000');
    setShowLeadModal(true);
  };

  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCallForLead) return;

    setIsSavingLead(true);
    try {
      await addLead({
        name: selectedCallForLead.customerName,
        number: selectedCallForLead.phoneNumber,
        companyName: leadCompanyName.trim() || 'Individual Client',
        gst: '',
        leadType,
        entryDate: new Date().toISOString().split('T')[0],
        forecastedValue: parseFloat(leadForecastedVal) || 0,
        convertedValue: 0,
        totalOrderValue: 0,
      });

      setShowLeadModal(false);
      setSelectedCallForLead(null);
      alert(`Lead for ${selectedCallForLead.customerName} successfully created!`);
    } catch (err) {
      console.error('Error adding lead:', err);
      alert('Failed to create lead.');
    } finally {
      setIsSavingLead(false);
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds <= 0) return '--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Telecaller Dashboard</h2>
          <p className="text-sm text-slate-500 font-medium mt-0.5">Manage customer communications, logs, and incoming leads</p>
        </div>
        <button
          onClick={() => setShowLogModal(true)}
          className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md transition-all cursor-pointer"
        >
          <Plus size={16} /> Log Call
        </button>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { key: 'all' as const, label: 'Total Calls', count: stats.total, icon: PhoneCall, gradient: 'from-violet-500 to-indigo-600', light: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
          { key: 'incoming' as const, label: 'Incoming Calls', count: stats.incoming, icon: PhoneIncoming, gradient: 'from-emerald-500 to-teal-600', light: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
          { key: 'outgoing' as const, label: 'Outgoing Calls', count: stats.outgoing, icon: PhoneOutgoing, gradient: 'from-blue-500 to-cyan-600', light: 'bg-blue-50 border-blue-200 text-blue-700' }
        ].map((card) => {
          const Icon = card.icon;
          const isSelected = activeFilter === card.key;
          return (
            <button
              key={card.key}
              onClick={() => setActiveFilter(card.key)}
              className={cn(
                "relative text-left p-6 rounded-3xl border transition-all duration-300 hover:scale-102 active:scale-98 shadow-sm flex items-center justify-between group cursor-pointer outline-none w-full",
                isSelected
                  ? `bg-gradient-to-br ${card.gradient} border-transparent text-white shadow-lg`
                  : 'bg-white border-slate-200 hover:border-slate-350'
              )}
            >
              <div>
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-widest",
                  isSelected ? "text-white/70" : "text-slate-400"
                )}>
                  {card.label}
                </span>
                <h3 className="text-4xl font-black mt-2 tracking-tight">
                  {card.count}
                </h3>
                <span className={cn(
                  "text-[9px] font-bold block mt-2",
                  isSelected ? "text-white/60" : "text-slate-400"
                )}>
                  Click to filter call list
                </span>
              </div>
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300",
                isSelected ? "bg-white/20 text-white group-hover:scale-110" : cn("bg-slate-50 text-slate-500 group-hover:scale-110 border border-slate-100", card.light)
              )}>
                <Icon size={24} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Call Logs List Section */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <ClipboardList size={16} className="text-slate-500" />
              Call Logs (Showing {filteredLogs.length})
            </h3>
            <p className="text-[10px] text-slate-450 font-medium mt-0.5">Filter, search, and register call responses</p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 md:w-64">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search size={14} />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by customer name, number..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold placeholder-slate-450 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm bg-white"
              />
            </div>

            {/* Quick reset active filters badge */}
            {activeFilter !== 'all' && (
              <button
                onClick={() => setActiveFilter('all')}
                className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-[10px] font-black uppercase tracking-wider border border-indigo-200 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                Clear Filter <X size={10} />
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-55 border-b border-slate-100 text-[9px] text-slate-400 font-black uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Customer Name / Info</th>
                <th className="px-6 py-4">Call Type</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4">Date & Time</th>
                <th className="px-6 py-4">Notes</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-slate-400 italic">
                    Loading call database...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-slate-405 italic">
                    No matching call records found. Click "Log Call" to add a new communication.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isIncoming = log.callType === 'incoming';
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/40 transition-colors">
                      {/* Customer Name & Number */}
                      <td className="px-6 py-4.5">
                        <div>
                          <p className="font-bold text-slate-800">{log.customerName}</p>
                          <p className="text-[10px] font-mono text-slate-450 mt-0.5">{log.phoneNumber}</p>
                        </div>
                      </td>

                      {/* Call Type Pill */}
                      <td className="px-6 py-4.5">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border",
                          isIncoming
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : "bg-indigo-50 text-indigo-700 border-indigo-100"
                        )}>
                          {isIncoming ? (
                            <PhoneIncoming size={10} className="text-emerald-600" />
                          ) : (
                            <PhoneOutgoing size={10} className="text-indigo-600" />
                          )}
                          {log.callType}
                        </span>
                      </td>

                      {/* Call Status */}
                      <td className="px-6 py-4.5">
                        <span className={cn(
                          "inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border",
                          log.status === 'answered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          log.status === 'missed' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        )}>
                          {log.status}
                        </span>
                      </td>

                      {/* Duration */}
                      <td className="px-6 py-4.5 font-medium text-slate-500">
                        {formatDuration(log.duration)}
                      </td>

                      {/* Date & Time */}
                      <td className="px-6 py-4.5 text-slate-450 font-medium">
                        {new Date(log.timestamp).toLocaleDateString()} at{' '}
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>

                      {/* Notes Summary */}
                      <td className="px-6 py-4.5 max-w-xs truncate text-slate-500 font-medium" title={log.notes}>
                        {log.notes || <span className="text-slate-350 italic">No notes captured</span>}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4.5 text-right">
                        <button
                          onClick={() => handleOpenLeadModal(log)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-700 hover:text-indigo-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          <UserPlus size={11} /> Convert Lead
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Call Modal */}
      <AnimatePresence>
        {showLogModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-xl overflow-hidden border border-slate-100"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-650 flex items-center justify-center">
                    <Phone size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Log Call Record</h3>
                    <p className="text-[10px] text-slate-450 font-medium">Record customer response parameters</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveCallLog} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Customer Name */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Customer Name</label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Anand Patel"
                      className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/40"
                    />
                  </div>

                  {/* Phone Number */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Phone Number</label>
                    <input
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="e.g. +91 98989 89898"
                      className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/40"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Call Type */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Call Type</label>
                    <div className="grid grid-cols-2 gap-2 bg-slate-50/80 p-1 border border-slate-250/50 rounded-xl">
                      {(['incoming', 'outgoing'] as const).map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setCallType(type)}
                          className={cn(
                            "py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all",
                            callType === type
                              ? "bg-white text-indigo-700 shadow-sm border border-slate-100"
                              : "text-slate-400 hover:text-slate-700"
                          )}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Call Status */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Call Status</label>
                    <select
                      value={callStatus}
                      onChange={(e) => setCallStatus(e.target.value as any)}
                      className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                    >
                      <option value="answered">Answered / Handled</option>
                      <option value="missed">Missed / Unanswered</option>
                      <option value="busy">Busy / Rejected</option>
                    </select>
                  </div>
                </div>

                {/* Call Duration (rendered only if status is answered) */}
                {callStatus === 'answered' && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Call Duration</label>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          value={durationMin}
                          onChange={(e) => setDurationMin(e.target.value)}
                          className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-center w-full focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50/40"
                        />
                        <span className="text-[10px] font-bold text-slate-450 uppercase">Min</span>
                      </div>
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={durationSec}
                          onChange={(e) => setDurationSec(e.target.value)}
                          className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-center w-full focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50/40"
                        />
                        <span className="text-[10px] font-bold text-slate-450 uppercase">Sec</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Call Notes */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Conversation Summary & Notes</label>
                  <textarea
                    rows={3}
                    value={callNotes}
                    onChange={(e) => setCallNotes(e.target.value)}
                    placeholder="Provide details about customer queries, required mockups, discounts, or callback dates..."
                    className="border border-slate-200 rounded-xl p-3 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/40 resize-none leading-relaxed"
                  />
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowLogModal(false)}
                    className="px-4 py-2 border border-slate-250 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingLog}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    {isSavingLog ? 'Saving...' : 'Save Log'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Convert Lead Modal */}
      <AnimatePresence>
        {showLeadModal && selectedCallForLead && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-hidden border border-slate-100"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-650 flex items-center justify-center">
                    <UserPlus size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Qualify Lead</h3>
                    <p className="text-[10px] text-slate-450 font-medium">Create a pipeline profile for {selectedCallForLead.customerName}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLeadModal(false)}
                  className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveLead} className="p-6 space-y-4">
                {/* Pre-filled Info fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] font-black text-slate-450 uppercase tracking-widest">Client Name</span>
                    <span className="text-xs font-bold text-slate-700 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">{selectedCallForLead.customerName}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] font-black text-slate-450 uppercase tracking-widest">Phone Number</span>
                    <span className="text-xs font-bold text-slate-700 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">{selectedCallForLead.phoneNumber}</span>
                  </div>
                </div>

                {/* Company Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Company Name</label>
                  <input
                    type="text"
                    value={leadCompanyName}
                    onChange={(e) => setLeadCompanyName(e.target.value)}
                    placeholder="e.g. Pallywear Garments"
                    className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/40"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Lead Type */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Lead Heat Level</label>
                    <select
                      value={leadType}
                      onChange={(e) => setLeadType(e.target.value as any)}
                      className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                    >
                      <option value="Hot">🔥 Hot (High Interest)</option>
                      <option value="Warm">☀️ Warm (Standard Interest)</option>
                      <option value="Cold">❄️ Cold (Low Interest)</option>
                    </select>
                  </div>

                  {/* Forecasted Value */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Forecasted Order Value (₹)</label>
                    <input
                      type="number"
                      required
                      value={leadForecastedVal}
                      onChange={(e) => setLeadForecastedVal(e.target.value)}
                      placeholder="e.g. 15000"
                      className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/40"
                    />
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowLeadModal(false)}
                    className="px-4 py-2 border border-slate-250 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingLead}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    {isSavingLead ? 'Adding...' : 'Add Lead Profile'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
