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
  or,
  setDoc,
  getDocFromServer,
  getDoc
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Lead, Invoice, Order, InventoryMovement, UserRole, Chat, ChatMessage, ChatInvite } from '../types';
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
  chats: Chat[];
  messages: ChatMessage[];
  invites: ChatInvite[];
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
  sendChatInvite: (invite: ChatInvite, chat: Chat, recipientRole: string) => Promise<void>;
  acceptChatInvite: (invite: ChatInvite, chat: Chat, currentUserId: string, currentUserName: string, creatorRole: string) => Promise<void>;
  declineChatInvite: (invite: ChatInvite) => Promise<void>;
  sendChatMessage: (msg: ChatMessage, chat: Chat, recipientRole: string) => Promise<void>;
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
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [invites, setInvites] = useState<ChatInvite[]>([]);
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
      // Only Admin sees all leads. Others see leads they created to align with firestore rules.
      const qLeads = (user.role === 'admin' || user.role === UserRole.ADMIN)
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

    const getRoleProcessStatuses = (role: string): string[] => {
      switch (role) {
        case 'designer':
        case UserRole.DESIGNER:
          return ['design', 'hold', 'DESIGN', 'HOLD'];
        case 'production':
        case UserRole.PRODUCTION:
          return ['production', 'hold', 'delivered', 'PRODUCTION', 'HOLD', 'DELIVERED'];
        case 'delivery':
        case UserRole.DELIVERY:
          return ['delivery', 'delivered', 'DELIVERY', 'DELIVERED'];
        case 'accounts':
        case UserRole.ACCOUNTS:
          return ['accounts', 'ACCOUNTS'];
        case 'order_management':
        case UserRole.ORDER_MANAGEMENT:
          return ['order_management', 'production', 'delivery', 'design', 'hold', 'ORDER_MANAGEMENT', 'PRODUCTION', 'DELIVERY', 'DESIGN', 'HOLD'];
        case 'digitizer':
        case UserRole.DIGITIZER:
          return ['design', 'order_management', 'production', 'DESIGN', 'ORDER_MANAGEMENT', 'PRODUCTION'];
        case 'staff':
        case UserRole.STAFF:
          return ['pending', 'draft', 'hold', 'design', 'order_management', 'production', 'delivery', 'delivered', 'PENDING', 'DRAFT', 'HOLD', 'DESIGN', 'ORDER_MANAGEMENT', 'PRODUCTION', 'DELIVERY', 'DELIVERED'];
        default:
          return [];
      }
    };

    const ordersRef = collection(db, 'orders');
    const processStatuses = getRoleProcessStatuses(user.role);
    
    // Restrict orders to only own orders or those in the user role's process statuses
    const qOrders = (user.role === 'admin' || user.role === UserRole.ADMIN)
      ? query(ordersRef)
      : (processStatuses.length > 0)
        ? query(ordersRef, or(where('createdBy', '==', user.id), where('status', 'in', processStatuses)))
        : query(ordersRef, where('createdBy', '==', user.id));

    const unsubscribeOrders = onSnapshot(qOrders, (snapshot) => {
      const rawDocs = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));

      const actualOrders: Order[] = [];
      const dbChats: Chat[] = [];
      const dbMessages: ChatMessage[] = [];
      const dbInvites: ChatInvite[] = [];

      rawDocs.forEach((docData: any) => {
        if (docData.id.startsWith('chat_c_')) {
          dbChats.push(docData as Chat);
        } else if (docData.id.startsWith('chat_m_')) {
          dbMessages.push(docData as ChatMessage);
        } else if (docData.id.startsWith('chat_i_')) {
          dbInvites.push(docData as ChatInvite);
        } else {
          actualOrders.push(docData as Order);
        }
      });

      setOrders(actualOrders.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
      setChats(dbChats.sort((a, b) => b.updatedAt - a.updatedAt));
      setMessages(dbMessages.sort((a, b) => a.createdAt - b.createdAt));
      setInvites(dbInvites.sort((a, b) => b.createdAt - a.createdAt));
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

    let assignedId = user.id;
    let assignedFullName = user.name;

    // Only telecallers use round-robin assignment to users
    const isTelecaller = user.role === 'telecaller' || user.role === UserRole.TELECALLER;

    if (isTelecaller) {
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

      assignedId = matchedUser ? matchedUser.id : `round_robin_${assignedName.toLowerCase()}`;
      assignedFullName = matchedUser ? matchedUser.name : assignedName;
    }

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

  const getTargetRoleStatus = (role: string): string => {
    const r = role.toLowerCase().trim();
    if (r === 'designer') return 'design';
    if (r === 'production') return 'production';
    if (r === 'delivery') return 'delivery';
    if (r === 'accounts') return 'accounts';
    if (r === 'order_management') return 'order_management';
    if (r === 'digitizer') return 'design';
    if (r === 'staff') return 'pending';
    return 'pending';
  };

  const sendChatInvite = async (invite: ChatInvite, chat: Chat, recipientRole: string) => {
    if (!user) return;
    try {
      const status = getTargetRoleStatus(recipientRole);
      
      const chatDoc = sanitizeForFirestore({
        ...chat,
        id: `chat_c_${chat.id}`,
        createdBy: user.id,
        status: status,
      });

      const inviteDoc = sanitizeForFirestore({
        ...invite,
        id: `chat_i_${invite.id}`,
        createdBy: user.id,
        status: status,
      });

      await setDoc(doc(db, 'orders', `chat_c_${chat.id}`), chatDoc);
      await setDoc(doc(db, 'orders', `chat_i_${invite.id}`), inviteDoc);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `orders/chat_c_${chat.id}`);
    }
  };

  const acceptChatInvite = async (
    invite: ChatInvite,
    chat: Chat,
    currentUserId: string,
    currentUserName: string,
    creatorRole: string
  ) => {
    if (!user) return;
    try {
      await firestoreUpdateDoc(doc(db, 'orders', `chat_i_${invite.id}`), {
        status: 'accepted',
        updatedAt: Date.now()
      });

      const nextParticipants = [...(chat.participants || [])];
      if (!nextParticipants.includes(currentUserId)) nextParticipants.push(currentUserId);
      const nextAccepted = [...(chat.acceptedParticipants || [])];
      if (!nextAccepted.includes(currentUserId)) nextAccepted.push(currentUserId);

      const nextRoles = { ...(chat.participantRoles || {}) };
      nextRoles[currentUserId] = user.role;

      await firestoreUpdateDoc(doc(db, 'orders', `chat_c_${chat.id}`), {
        participants: nextParticipants,
        acceptedParticipants: nextAccepted,
        participantRoles: nextRoles,
        lastMessage: `${currentUserName} accepted the invitation. Chat unlocked!`,
        lastMessageTime: Date.now(),
        updatedAt: Date.now()
      });

      const welcomeMsgId = `system_${Date.now()}`;
      const targetStatus = getTargetRoleStatus(creatorRole);
      
      const welcomeMsg = sanitizeForFirestore({
        id: `chat_m_${welcomeMsgId}`,
        chatId: chat.id,
        senderId: 'system',
        senderName: 'System',
        senderRole: 'system',
        message: `${currentUserName} joined the conversation. You can now chat!`,
        createdAt: Date.now(),
        readBy: [currentUserId],
        createdBy: currentUserId,
        status: targetStatus
      });

      await setDoc(doc(db, 'orders', `chat_m_${welcomeMsgId}`), welcomeMsg);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `orders/chat_c_${chat.id}/accept`);
    }
  };

  const declineChatInvite = async (invite: ChatInvite) => {
    if (!user) return;
    try {
      await firestoreUpdateDoc(doc(db, 'orders', `chat_i_${invite.id}`), {
        status: 'declined',
        updatedAt: Date.now()
      });

      try {
        await firestoreDeleteDoc(doc(db, 'orders', `chat_c_${invite.chatId}`));
      } catch (e) {
        console.warn("Failed to delete chat doc on decline, updating status to declined instead:", e);
        await firestoreUpdateDoc(doc(db, 'orders', `chat_c_${invite.chatId}`), {
          status: 'declined',
          updatedAt: Date.now()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `orders/chat_i_${invite.id}/decline`);
    }
  };

  const sendChatMessage = async (msg: ChatMessage, chat: Chat, recipientRole: string) => {
    if (!user) return;
    try {
      const targetStatus = chat.type === 'group' ? 'hold' : getTargetRoleStatus(recipientRole);

      const msgDoc = sanitizeForFirestore({
        ...msg,
        id: `chat_m_${msg.id}`,
        createdBy: user.id,
        status: targetStatus,
      });

      await setDoc(doc(db, 'orders', `chat_m_${msg.id}`), msgDoc);

      const nextUnread = { ...(chat.unreadCount || {}) };
      chat.participants.forEach(pId => {
        if (pId !== user.id) {
          nextUnread[pId] = (nextUnread[pId] || 0) + 1;
        }
      });

      await firestoreUpdateDoc(doc(db, 'orders', `chat_c_${chat.id}`), {
        lastMessage: msg.message || (msg.imageAttachments && msg.imageAttachments.length > 0 ? '📷 Image attachment' : '🎤 Voice note'),
        lastMessageTime: Date.now(),
        lastSenderName: msg.senderName,
        unreadCount: nextUnread,
        updatedAt: Date.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `orders/chat_m_${msg.id}`);
    }
  };

  return (
    <LeadContext.Provider value={{
      leads, invoices, orders, inventory, chats, messages, invites,
      addLead, updateLead, deleteLead,
      addInvoice, updateInvoice, deleteInvoice,
      addOrder, updateOrder, deleteOrder,
      addInventoryMovement, deleteInventoryMovement,
      sendChatInvite, acceptChatInvite, declineChatInvite, sendChatMessage
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
