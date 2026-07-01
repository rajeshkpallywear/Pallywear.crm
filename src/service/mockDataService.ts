/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Order, OrderStatus, UserRole, UserProfile, Lead, Invoice, InventoryMovement } from '../types';

function notifyUpdate() {
  window.dispatchEvent(new Event('pallywear-data-updated'));
}

export const mockDataService = {
  getOrders: async (): Promise<Order[]> => {
    const res = await fetch('/api/orders');
    if (!res.ok) throw new Error('Failed to fetch orders');
    return res.json();
  },

  saveOrder: async (order: Order): Promise<void> => {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order)
    });
    if (!res.ok) throw new Error('Failed to save order');
    notifyUpdate();
  },

  createOrder: async (orderData: Partial<Order>): Promise<Order> => {
    const id = Math.random().toString(36).substr(2, 9).toUpperCase();
    const newOrder: Order = {
      id,
      customerInfo: {
        name: '',
        phone: '',
        address: '',
        ...orderData.customerInfo
      },
      category: orderData.category || 'General',
      quantity: orderData.quantity || 1,
      details: orderData.details || {},
      sizeBreakdown: orderData.sizeBreakdown || [],
      financials: orderData.financials || { totalAmount: 0, advancePay: 0, balanceAmount: 0 },
      status: orderData.status || OrderStatus.ACCOUNTS,
      staffImages: orderData.staffImages || [],
      staffPdfs: orderData.staffPdfs || [],
      accountsAttachments: [],
      orderManagementAttachments: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...orderData
    };

    await mockDataService.saveOrder(newOrder);
    return newOrder;
  },

  deleteOrder: async (id: string): Promise<void> => {
    const res = await fetch(`/api/orders/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete order');
    notifyUpdate();
  },

  getLeads: async (): Promise<Lead[]> => {
    const res = await fetch('/api/leads');
    if (!res.ok) throw new Error('Failed to fetch leads');
    return res.json();
  },

  saveLead: async (lead: Lead): Promise<void> => {
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lead)
    });
    if (!res.ok) throw new Error('Failed to save lead');
    notifyUpdate();
  },

  deleteLead: async (id: string): Promise<void> => {
    const res = await fetch(`/api/leads/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete lead');
    notifyUpdate();
  },

  clearLeads: async (): Promise<void> => {
    const res = await fetch('/api/leads/clear', {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to clear leads');
    notifyUpdate();
  },

  getInvoices: async (): Promise<Invoice[]> => {
    const res = await fetch('/api/invoices');
    if (!res.ok) throw new Error('Failed to fetch invoices');
    return res.json();
  },

  saveInvoice: async (invoice: Invoice): Promise<void> => {
    const res = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoice)
    });
    if (!res.ok) throw new Error('Failed to save invoice');
    notifyUpdate();
  },

  deleteInvoice: async (id: string): Promise<void> => {
    const res = await fetch(`/api/invoices/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete invoice');
    notifyUpdate();
  },

  getInventory: async (): Promise<InventoryMovement[]> => {
    const res = await fetch('/api/inventory');
    if (!res.ok) throw new Error('Failed to fetch inventory');
    return res.json();
  },

  saveInventoryMovement: async (movement: InventoryMovement): Promise<void> => {
    const res = await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(movement)
    });
    if (!res.ok) throw new Error('Failed to save inventory movement');
    notifyUpdate();
  },

  deleteInventoryMovement: async (id: string): Promise<void> => {
    const res = await fetch(`/api/inventory/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete inventory movement');
    notifyUpdate();
  },

  getUsers: async (): Promise<UserProfile[]> => {
    const res = await fetch('/api/users');
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },

  register: async (user: UserProfile): Promise<void> => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to register');
    }
  },

  login: async (email: string, password: string): Promise<UserProfile | null> => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    return data.user || null;
  },

  updateUser: async (user: UserProfile): Promise<void> => {
    const res = await fetch(`/api/users/${user.uid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        name: user.name,
        role: user.role
      })
    });
    if (!res.ok) throw new Error('Failed to update user');
    notifyUpdate();
  },

  deleteUser: async (id: string): Promise<void> => {
    const res = await fetch(`/api/users/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete user');
    notifyUpdate();
  }
};
