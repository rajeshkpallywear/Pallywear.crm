/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useLeads } from '../context/LeadContext';
import { useAuth, User } from '../context/AuthContext';
import { cn } from '../lib/utils';
import {
  UserCheck,
  Users,
  Search,
  CheckCircle,
  Filter,
  RefreshCw,
  TrendingUp
} from 'lucide-react';

export default function LeadAssignment() {
  const { leads, updateLead } = useLeads();
  const { registeredUsers } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [heatFilter, setHeatFilter] = useState<'all' | 'Hot' | 'Warm' | 'Cold'>('all');
  const [assigningLeadId, setAssigningLeadId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter out system or empty accounts, focus on active staff/marketing/admin users
  const eligibleAssignees = useMemo(() => {
    return registeredUsers.filter(u => u.name && u.role);
  }, [registeredUsers]);

  // Handle assigning lead
  const handleAssignLead = async (leadId: string, assignee: User) => {
    setAssigningLeadId(leadId);
    try {
      await updateLead(leadId, {
        createdBy: assignee.id,
        createdByName: assignee.name
      });
      
      setSuccessMessage(`Lead assigned to ${assignee.name} successfully!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to assign lead:', err);
      alert('Failed to assign lead.');
    } finally {
      setAssigningLeadId(null);
    }
  };

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads
      .filter(lead => {
        // Query search
        const q = searchQuery.toLowerCase().trim();
        if (!q) return true;
        return (
          lead.name.toLowerCase().includes(q) ||
          lead.companyName.toLowerCase().includes(q) ||
          (lead.number && lead.number.includes(q))
        );
      })
      .filter(lead => {
        // Assignment status filter
        // If createdBy is empty/system or is the telecaller themselves, we can treat it as unassigned or filter accordingly.
        // Usually, unassigned leads might have createdBy matching a telecaller or system.
        // Let's check if the assignee's ID is in the list of eligible marketing/staff handlers.
        const isAssignedToStaff = eligibleAssignees.some(u => u.id === lead.createdBy && u.role !== 'telecaller');
        if (statusFilter === 'assigned') return isAssignedToStaff;
        if (statusFilter === 'unassigned') return !isAssignedToStaff;
        return true;
      })
      .filter(lead => {
        // Heat level filter
        if (heatFilter !== 'all') return lead.leadType === heatFilter;
        return true;
      });
  }, [leads, searchQuery, statusFilter, heatFilter, eligibleAssignees]);

  const getRoleBadgeColor = (role: string) => {
    const r = role.toLowerCase();
    if (r === 'admin') return 'bg-red-50 text-red-700 border-red-150';
    if (r === 'marketing') return 'bg-indigo-50 text-indigo-700 border-indigo-150';
    if (r === 'staff') return 'bg-emerald-50 text-emerald-700 border-emerald-150';
    if (r === 'accounts') return 'bg-yellow-50 text-yellow-700 border-yellow-150';
    return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Lead Assignment Desk</h2>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            Assign incoming client leads to active sales representatives and managers
          </p>
        </div>
        <span className="px-3.5 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-black uppercase tracking-wider border border-indigo-100 flex items-center gap-1.5">
          <Users size={12} /> {eligibleAssignees.length} Active Handlers
        </span>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <CheckCircle size={16} className="text-emerald-600" />
          {successMessage}
        </div>
      )}

      {/* Leads Table Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Filter Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 border-b border-slate-100 bg-slate-50/50">
          
          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Status Selectors */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50">
              {([
                ['all', 'All Leads'],
                ['unassigned', 'Unassigned'],
                ['assigned', 'Assigned']
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer",
                    statusFilter === key
                      ? "bg-white text-indigo-700 shadow-sm font-black"
                      : "text-slate-400 hover:text-slate-650"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Heat Selectors */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50">
              {([
                ['all', 'All Heat'],
                ['Hot', '🔥 Hot'],
                ['Warm', '☀️ Warm'],
                ['Cold', '❄️ Cold']
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setHeatFilter(key)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer",
                    heatFilter === key
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-400 hover:text-slate-650"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

          </div>

          {/* Search bar */}
          <div className="relative w-full lg:w-72">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search size={14} />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search leads name or company..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold placeholder-slate-450 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-sm"
            />
          </div>

        </div>

        {/* Table representation */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-55 border-b border-slate-100 text-[9px] text-slate-400 font-black uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Client Name / Phone</th>
                <th className="px-6 py-4">Company Name</th>
                <th className="px-6 py-4">Lead Type</th>
                <th className="px-6 py-4">Date Added</th>
                <th className="px-6 py-4">Current Handler</th>
                <th className="px-6 py-4 text-right">Reassign / Assign Handler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-400 italic">
                    No leads match your filter parameters.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const leadOwner = eligibleAssignees.find(u => u.id === lead.createdBy);
                  const isOwnerStaff = leadOwner && leadOwner.role !== 'telecaller';

                  return (
                    <tr key={lead.id} className="hover:bg-slate-50/40 transition-colors">
                      {/* Name & Phone */}
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold text-slate-800">{lead.name}</p>
                          <p className="text-[10px] font-mono text-slate-450 mt-0.5">{lead.number || 'No phone'}</p>
                        </div>
                      </td>

                      {/* Company */}
                      <td className="px-6 py-4 text-slate-500 font-semibold">
                        {lead.companyName || 'Individual'}
                      </td>

                      {/* Lead Heat Type */}
                      <td className="px-6 py-4">
                        <span className={cn(
                          'px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border',
                          lead.leadType === 'Hot' ? 'bg-red-50 text-red-700 border-red-100' :
                          lead.leadType === 'Warm' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                          'bg-slate-100 text-slate-550 border-slate-200'
                        )}>
                          {lead.leadType}
                        </span>
                      </td>

                      {/* Date Added */}
                      <td className="px-6 py-4 text-slate-450 font-medium">
                        {lead.entryDate ? new Date(lead.entryDate).toLocaleDateString() : '--'}
                      </td>

                      {/* Current Handler Name */}
                      <td className="px-6 py-4">
                        {isOwnerStaff ? (
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800">{lead.createdByName || leadOwner.name}</span>
                            <span className={cn(
                              "text-[8px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded mt-0.5 border self-start",
                              getRoleBadgeColor(leadOwner.role)
                            )}>
                              {leadOwner.role}
                            </span>
                          </div>
                        ) : (
                          <span className="px-2 py-1 bg-amber-50 border border-amber-100 text-amber-700 rounded-lg text-[9px] font-black uppercase tracking-wider">
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Handler Dropdown Assign Select */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <select
                            disabled={assigningLeadId === lead.id}
                            onChange={(e) => {
                              const targetUser = eligibleAssignees.find(u => u.id === e.target.value);
                              if (targetUser) {
                                handleAssignLead(lead.id, targetUser);
                                e.target.value = ''; // Reset select state
                              }
                            }}
                            defaultValue=""
                            className="border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white max-w-[150px] shadow-sm disabled:opacity-50 cursor-pointer"
                          >
                            <option value="" disabled>Select User...</option>
                            {eligibleAssignees.map(u => (
                              <option key={u.id} value={u.id}>
                                {u.name} ({u.role.toUpperCase()})
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
