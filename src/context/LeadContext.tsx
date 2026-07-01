import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { mockDataService } from '../service/mockDataService';
import { Lead, Invoice, Order, InventoryMovement } from '../types';
import { useAuth } from './AuthContext';

interface LeadContextType {
  leads: Lead[];
  invoices: Invoice[];
  orders: Order[];
  inventory: InventoryMovement[];
  addLead: (lead: Omit<Lead, 'id'>) => Promise<void>;
  updateLead: (id: string, lead: Partial<Lead>) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  addInvoice: (invoice: Omit<Invoice, 'id'>) => Promise<void>;
  updateInvoice: (id: string, invoice: Partial<Invoice>) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  addOrder: (order: Partial<Order>) => Promise<void>;
  updateOrder: (id: string, order: Partial<Order>) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  addInventoryMovement: (movement: Omit<InventoryMovement, 'id' | 'createdAt'>) => Promise<void>;
  deleteInventoryMovement: (id: string) => Promise<void>;
}

const LeadContext = createContext<LeadContextType | undefined>(undefined);

function sanitizeForStorage(data: any): any {
  if (data === undefined) return null;
  if (data === null || typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    return data.map((value) => sanitizeForStorage(value));
  }
  const sanitized: any = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const value = data[key];
      if (value !== undefined) {
        sanitized[key] = sanitizeForStorage(value);
      }
    }
  }
  return sanitized;
}

export function LeadProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryMovement[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [leadsData, invoicesData, ordersData, inventoryData] = await Promise.all([
          mockDataService.getLeads(),
          mockDataService.getInvoices(),
          mockDataService.getOrders(),
          mockDataService.getInventory()
        ]);
        setLeads(leadsData);
        setInvoices(invoicesData);
        setOrders(ordersData);
        setInventory(inventoryData);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    if (!user) {
      setLeads([]);
      setInvoices([]);
      setOrders([]);
      setInventory([]);
      return;
    }

    loadData();
    window.addEventListener('pallywear-data-updated', loadData);
    return () => window.removeEventListener('pallywear-data-updated', loadData);
  }, [user]);

  const createId = (prefix: string) => `${prefix}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

  const addLead = async (lead: Omit<Lead, 'id'>) => {
    if (!user) return;
    const nextLead: Lead = sanitizeForStorage({
      ...lead,
      id: createId('lead'),
      createdBy: user.id,
      createdByName: user.name,
    });
    await mockDataService.saveLead(nextLead);
    setLeads((prev) => [...prev, nextLead]);
  };

  const updateLead = async (id: string, leadUpdate: Partial<Lead>) => {
    const existing = leads.find((lead) => lead.id === id);
    if (!existing) return;
    const nextLead: Lead = {
      ...existing,
      ...sanitizeForStorage(leadUpdate),
    } as Lead;
    await mockDataService.saveLead(nextLead);
    setLeads((prev) => prev.map((lead) => (lead.id === id ? nextLead : lead)));
  };

  const deleteLead = async (id: string) => {
    await mockDataService.deleteLead(id);
    setLeads((prev) => prev.filter((lead) => lead.id !== id));
  };

  const addInvoice = async (invoice: Omit<Invoice, 'id'>) => {
    if (!user) return;
    const nextInvoice: Invoice = sanitizeForStorage({
      ...invoice,
      id: createId('invoice'),
      createdBy: user.id,
      createdByName: user.name,
    }) as Invoice;
    await mockDataService.saveInvoice(nextInvoice);
    setInvoices((prev) => [...prev, nextInvoice]);
  };

  const updateInvoice = async (id: string, invoiceUpdate: Partial<Invoice>) => {
    const existing = invoices.find((invoice) => invoice.id === id);
    if (!existing) return;
    const nextInvoice: Invoice = {
      ...existing,
      ...sanitizeForStorage(invoiceUpdate),
    } as Invoice;
    await mockDataService.saveInvoice(nextInvoice);
    setInvoices((prev) => prev.map((invoice) => (invoice.id === id ? nextInvoice : invoice)));
  };

  const deleteInvoice = async (id: string) => {
    await mockDataService.deleteInvoice(id);
    setInvoices((prev) => prev.filter((invoice) => invoice.id !== id));
  };

  const addOrder = async (orderData: Partial<Order>) => {
    if (!user) return;
    const nextOrder = await mockDataService.createOrder({
      ...orderData,
      createdBy: user.id,
      createdByName: user.name,
    });
    setOrders((prev) => [...prev, nextOrder]);
  };

  const updateOrder = async (id: string, orderUpdate: Partial<Order>) => {
    const existing = orders.find((order) => order.id === id);
    if (!existing) return;
    const nextOrder: Order = {
      ...existing,
      ...sanitizeForStorage(orderUpdate),
      updatedAt: Date.now(),
    };
    await mockDataService.saveOrder(nextOrder);
    setOrders((prev) => prev.map((order) => (order.id === id ? nextOrder : order)));
  };

  const deleteOrder = async (id: string) => {
    await mockDataService.deleteOrder(id);
    setOrders((prev) => prev.filter((order) => order.id !== id));
  };

  const addInventoryMovement = async (movement: Omit<InventoryMovement, 'id' | 'createdAt'>) => {
    const nextMovement: InventoryMovement = sanitizeForStorage({
      ...movement,
      id: createId('inventory'),
      createdAt: Date.now(),
    }) as InventoryMovement;
    await mockDataService.saveInventoryMovement(nextMovement);
    setInventory((prev) => [...prev, nextMovement]);
  };

  const deleteInventoryMovement = async (id: string) => {
    await mockDataService.deleteInventoryMovement(id);
    setInventory((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <LeadContext.Provider value={{
      leads,
      invoices,
      orders,
      inventory,
      addLead,
      updateLead,
      deleteLead,
      addInvoice,
      updateInvoice,
      deleteInvoice,
      addOrder,
      updateOrder,
      deleteOrder,
      addInventoryMovement,
      deleteInventoryMovement
    }}>
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
