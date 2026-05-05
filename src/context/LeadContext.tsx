import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Lead } from '../types';

interface LeadContextType {
  leads: Lead[];
  addLead: (lead: Omit<Lead, 'id'>) => void;
  updateLead: (id: string, lead: Partial<Lead>) => void;
  deleteLead: (id: string) => void;
}

const LeadContext = createContext<LeadContextType | undefined>(undefined);

// Initial mock data
const INITIAL_LEADS: Lead[] = [
  {
    id: '1',
    name: 'John Doe',
    number: '9876543210',
    companyName: 'Tech Solutions Inc',
    gst: '22AAAAA0000A1Z5',
    leadType: 'Hot',
    entryDate: '2024-05-01',
    forecastedValue: 5000,
    convertedValue: 4500,
    totalOrderValue: 10000,
    createdBy: '1',
    createdByName: 'rajesh'
  },
  {
    id: '2',
    name: 'Jane Smith',
    number: '9123456789',
    companyName: 'Creative Labs',
    gst: '33BBBBB1111B2Z6',
    leadType: 'Warm',
    entryDate: '2024-05-03',
    forecastedValue: 3000,
    convertedValue: 0,
    totalOrderValue: 0,
    createdBy: '1',
    createdByName: 'rajesh'
  }
];

export function LeadProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>(() => {
    const saved = localStorage.getItem('leads');
    return saved ? JSON.parse(saved) : INITIAL_LEADS;
  });

  useEffect(() => {
    localStorage.setItem('leads', JSON.stringify(leads));
  }, [leads]);

  const addLead = (lead: Omit<Lead, 'id'>) => {
    const newLead = {
      ...lead,
      id: Math.random().toString(36).substring(2, 9),
    };
    setLeads([...leads, newLead]);
  };

  const updateLead = (id: string, leadUpdate: Partial<Lead>) => {
    setLeads(leads.map(l => l.id === id ? { ...l, ...leadUpdate } : l));
  };

  const deleteLead = (id: string) => {
    setLeads(leads.filter(l => l.id !== id));
  };

  return (
    <LeadContext.Provider value={{ leads, addLead, updateLead, deleteLead }}>
      {children}
    </LeadContext.Provider>
  );
}

export function useLeads() {
  const context = useContext(LeadContext);
  if (context === undefined) {
    throw new Error('useLeads must be used within a LeadProvider');
  }
  return context;
}
