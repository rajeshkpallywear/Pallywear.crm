/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Order, OrderStatus, UserRole, UserProfile } from '../types';

const ORDERS_KEY = 'pallywear_orders';
const USERS_KEY = 'pallywear_users';

export const mockDataService = {
  getOrders: (): Order[] => {
    const saved = localStorage.getItem(ORDERS_KEY);
    const orders = saved ? JSON.parse(saved) : [];

    // Migrate or ensure fields exist for backward compatibility with local storage
    return orders.map((o: any) => ({
      ...o,
      quantity: o.quantity || 0,
      sizeBreakdown: o.sizeBreakdown || [],
      staffImages: o.staffImages || (o.staffAttachments?.filter((a: string) => a.startsWith('data:image')) || []),
      staffPdfs: o.staffPdfs || (o.staffAttachments?.filter((a: string) => a.startsWith('data:application/pdf')) || []),
      financials: o.financials || { totalAmount: 0, advancePay: 0, balanceAmount: 0 }
    }));
  },

  saveOrder: (order: Order) => {
    try {
      const orders = mockDataService.getOrders();
      const index = orders.findIndex(o => o.id === order.id);
      if (index > -1) {
        orders[index] = order;
      } else {
        orders.push(order);
      }
      localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    } catch (e) {
      console.error("Storage error:", e);
      if (e instanceof Error && e.name === 'QuotaExceededError') {
        throw new Error("Storage full! Please delete old orders or use smaller images.");
      }
      throw e;
    }
  },

  createOrder: (orderData: Partial<Order>): Order => {
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

    mockDataService.saveOrder(newOrder);
    return newOrder;
  },

  deleteOrder: (id: string) => {
    const orders = mockDataService.getOrders();
    const filtered = orders.filter(o => o.id !== id);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(filtered));
  },

  getUsers: (): UserProfile[] => {
    const saved = localStorage.getItem(USERS_KEY);
    return saved ? JSON.parse(saved) : [
      { uid: 'admin-1', email: 'admin', role: UserRole.ADMIN, name: 'Main Admin' },
      { uid: 'admin-mano', email: 'stalingm.mano@gmail.com', role: UserRole.ADMIN, name: 'Mano' },
      { uid: 'staff-1', email: 'staff', role: UserRole.STAFF, name: 'Front Desk' },
      { uid: 'acc-1', email: 'accounts', role: UserRole.ACCOUNTS, name: 'Billing Dept' },
      { uid: 'om-1', email: 'order', role: UserRole.ORDER_MANAGEMENT, name: 'Admin Hub' },
      { uid: 'prod-1', email: 'prod', role: UserRole.PRODUCTION, name: 'Factory Lead' },
      { uid: 'del-1', email: 'del', role: UserRole.DELIVERY, name: 'Delivery Agent' },
    ];
  },

  register: (user: UserProfile) => {
    const users = mockDataService.getUsers();
    users.push(user);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  },

  login: (email: string, password: string): UserProfile | null => {
    // Default admin: admin / pally@123
    if (email === 'admin' && password === 'pally@123') {
      return { uid: 'admin-1', email: 'admin', role: UserRole.ADMIN, name: 'Main Admin' };
    }
    // Mano admin: stalingm.mano@gmail.com / pallywear12
    if (email === 'stalingm.mano@gmail.com' && password === 'pallywear12') {
      return { uid: 'admin-mano', email: 'stalingm.mano@gmail.com', role: UserRole.ADMIN, name: 'Mano' };
    }

    const users = mockDataService.getUsers();
    const user = users.find(u => u.email === email);
    // For demo/prototype, we accept valid passwords for valid usernames
    if (user && password === 'pally@123') {
      return user;
    }

    // Also allow role names as logins for easier testing
    const roleMatch = users.find(u => u.role === email);
    if (roleMatch && password === 'pally@123') {
      return roleMatch;
    }

    return null;
  }
};
