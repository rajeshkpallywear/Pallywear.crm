import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  addDoc as firestoreAddDoc,
  updateDoc as firestoreUpdateDoc,
  deleteDoc as firestoreDeleteDoc,
  doc,
  query,
  where,
  setDoc,
  getDocFromServer,
  getDoc
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Lead, Invoice, Order, InventoryMovement, UserRole } from '../types';
import { useAuth } from './AuthContext';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };

  console.error('Firestore Error Details:', errInfo);
  throw new Error(`Cloud Sync Error (${operationType} at ${path}): ${errInfo.error}`);
}

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
  addOrder: (order: Partial<Order>) => Promise<any>;
  updateOrder: (id: string, order: Partial<Order>) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  addInventoryMovement: (movement: Omit<InventoryMovement, 'id' | 'createdAt'>) => Promise<void>;
  deleteInventoryMovement: (id: string) => Promise<void>;
}

const LeadContext = createContext<LeadContextType | undefined>(undefined);

// Helper to ensure data is plain and Firestore-compatible
function sanitizeForFirestore(data: any): any {
  if (data === undefined) return null;
  if (data === null || typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map(v => sanitizeForFirestore(v));
  }

  const sanitized: any = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const value = data[key];
      // Skip undefined to avoid Firestore errors, effectively deleting the field if needed or just not updating it
      if (value !== undefined) {
        sanitized[key] = sanitizeForFirestore(value);
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
  const { user, registeredUsers } = useAuth();

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  useEffect(() => {
    if (!user) {
      setLeads([]);
      setInvoices([]);
      return;
    }

    // Leads subscription - only for applicable roles
    let unsubscribeLeads = () => { };
    if (user.role === 'admin' || user.role === 'marketing' || user.role === 'user' || user.role === 'staff' || user.role === 'telecaller' || user.role === UserRole.TELECALLER) {
      const leadsRef = collection(db, 'leads');
      // If admin or staff, show all leads. Otherwise, show only leads created by the user.
      const qLeads = (user.role === 'admin' || user.role === 'staff')
        ? query(leadsRef)
        : query(leadsRef, where('createdBy', '==', user.id));

      unsubscribeLeads = onSnapshot(qLeads, (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        })) as Lead[];
        setLeads(data);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'leads');
      });
    }

    // Invoices subscription - only for applicable roles
    let unsubscribeInvoices = () => { };
    if (user.role === 'admin' || user.role === 'marketing' || user.role === 'user' || user.role === 'accounts' || user.role === 'staff') {
      const invoicesRef = collection(db, 'invoices');
      const qInvoices = (user.role === 'admin' || user.role === 'staff')
        ? query(invoicesRef)
        : query(invoicesRef, where('createdBy', '==', user.id));

      unsubscribeInvoices = onSnapshot(qInvoices, (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        })) as Invoice[];
        setInvoices(data);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'invoices');
      });
    }

    const ordersRef = collection(db, 'orders');
    // For orders, we usually show everything to everyone in the flow, or filter by role
    // Here we show all orders to keep the flow transparent across departments
    const unsubscribeOrders = onSnapshot(ordersRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Order[];
      setOrders(data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    let unsubscribeInventory = () => { };
    // Subscription for inventory - accessible by relevant roles
    if (user.role === 'admin' || user.role === 'order_management' || user.role === 'staff' || user.role === 'production') {
      const inventoryRef = collection(db, 'inventory');
      unsubscribeInventory = onSnapshot(inventoryRef, (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        })) as InventoryMovement[];
        setInventory(data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'inventory');
      });
    }

    return () => {
      unsubscribeLeads();
      unsubscribeInvoices();
      unsubscribeOrders();
      unsubscribeInventory();
    };
  }, [user]);

  const addLead = async (lead: Omit<Lead, 'id'>) => {
    if (!user) return;

    // A to Z Sorted Round-Robin target users
    const ASSIGNEES = ['Arumugam', 'Deepika', 'Mohan', 'Vimal', 'Vivek', 'Yuvaraj'];
    
    // Retrieve next round-robin index from Firestore settings
    let nextIndex = 0;
    const settingsRef = doc(db, 'settings', 'lead_assignment');
    try {
      const snap = await getDoc(settingsRef);
      if (snap.exists()) {
        const lastIndex = snap.data().lastIndex ?? -1;
        nextIndex = (lastIndex + 1) % ASSIGNEES.length;
      }
    } catch (e) {
      console.warn("Failed to retrieve round-robin settings, defaulting to index 0:", e);
    }

    // Persist next index in settings
    try {
      await setDoc(settingsRef, { lastIndex: nextIndex });
    } catch (e) {
      console.error("Failed to update round-robin index:", e);
    }

    const assignedName = ASSIGNEES[nextIndex];
    
    // Find matched registered user
    const matchedUser = registeredUsers.find(u => 
      u.name?.toLowerCase().trim() === assignedName.toLowerCase().trim() ||
      u.email?.toLowerCase().startsWith(assignedName.toLowerCase())
    );

    const assignedId = matchedUser ? matchedUser.id : `round_robin_${assignedName.toLowerCase()}`;
    const assignedFullName = matchedUser ? matchedUser.name : assignedName;

    const leadId = Math.random().toString(36).substring(2, 9);
    const newLead = sanitizeForFirestore({
      ...lead,
      id: leadId,
      createdBy: assignedId,
      createdByName: assignedFullName,
    });

    try {
      await setDoc(doc(db, 'leads', leadId), newLead);
      console.log(`Lead successfully saved and assigned to ${assignedFullName}:`, leadId);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `leads/${leadId}`);
    }
  };

  const updateLead = async (id: string, leadUpdate: Partial<Lead>) => {
    try {
      const sanitizedUpdate = sanitizeForFirestore(leadUpdate);
      await firestoreUpdateDoc(doc(db, 'leads', id), sanitizedUpdate);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `leads/${id}`);
    }
  };

  const deleteLead = async (id: string) => {
    try {
      await firestoreDeleteDoc(doc(db, 'leads', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `leads/${id}`);
    }
  };

  const addInvoice = async (invoice: Omit<Invoice, 'id'>) => {
    if (!user) return;

    try {
      const invoicesRef = collection(db, 'invoices');
      const docRef = doc(invoicesRef);
      const newInvoice = sanitizeForFirestore({
        ...invoice,
        id: docRef.id,
        createdBy: user.id,
        createdByName: user.name,
      });
      await setDoc(docRef, newInvoice);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'invoices');
    }
  };

  const updateInvoice = async (id: string, invoiceUpdate: Partial<Invoice>) => {
    try {
      const sanitizedUpdate = sanitizeForFirestore(invoiceUpdate);
      await firestoreUpdateDoc(doc(db, 'invoices', id), sanitizedUpdate);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `invoices/${id}`);
    }
  };

  const deleteInvoice = async (id: string) => {
    try {
      await firestoreDeleteDoc(doc(db, 'invoices', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `invoices/${id}`);
    }
  };

  const addOrder = async (orderData: Partial<Order>) => {
    if (!user) return;

    try {
      const orderId = Math.random().toString(36).substr(2, 9).toUpperCase();
      const newOrder = sanitizeForFirestore({
        id: orderId,
        ...orderData,
        createdBy: user.id,
        createdByName: user.name,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await setDoc(doc(db, 'orders', orderId), newOrder);
      return newOrder as Order;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'orders');
    }
  };

  const updateOrder = async (id: string, orderUpdate: Partial<Order>) => {
    try {
      const sanitizedUpdate = sanitizeForFirestore({
        ...orderUpdate,
        updatedAt: Date.now()
      });
      await firestoreUpdateDoc(doc(db, 'orders', id), sanitizedUpdate);
    } catch (error: any) {
      if (error?.message?.includes('too large') || error?.code === 'resource-exhausted') {
        throw new Error("ORDER_TOO_LARGE: The attachments you added are too large for cloud sync. Total size must be under 1MB. Please remove some files.");
      }
      handleFirestoreError(error, OperationType.UPDATE, `orders/${id}`);
    }
  };

  const deleteOrder = async (id: string) => {
    try {
      await firestoreDeleteDoc(doc(db, 'orders', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `orders/${id}`);
    }
  };

  const addInventoryMovement = async (movement: Omit<InventoryMovement, 'id' | 'createdAt'>) => {
    try {
      const inventoryRef = collection(db, 'inventory');
      const docRef = doc(inventoryRef);
      const newMovement = sanitizeForFirestore({
        ...movement,
        id: docRef.id,
        createdAt: Date.now()
      });
      await setDoc(docRef, newMovement);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'inventory');
    }
  };

  const deleteInventoryMovement = async (id: string) => {
    try {
      await firestoreDeleteDoc(doc(db, 'inventory', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `inventory/${id}`);
    }
  };

  return (
    <LeadContext.Provider value={{
      leads, invoices, orders, inventory,
      addLead, updateLead, deleteLead,
      addInvoice, updateInvoice, deleteInvoice,
      addOrder, updateOrder, deleteOrder,
      addInventoryMovement, deleteInventoryMovement
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
