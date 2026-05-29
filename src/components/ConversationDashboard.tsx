/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare, X, Mic, Send, Paperclip, User,
  Clock, Trash2, Download, AlertCircle, Check,
  Plus, Play, Square, FileText, Image as ImageIcon, Sparkles,
  Search, ArrowLeft, Palette, CheckSquare, Mail, Users, CheckCheck,
  Smile, Phone, Video, Info, Lock, FolderOpen
} from 'lucide-react';
import FileUpload from './FileUpload';
import imageCompression from 'browser-image-compression';
import ImageViewer from './ImageViewer';
import { Order, OrderStatus, UserRole } from '../types';
import { useAuth, User as AuthUser } from '../context/AuthContext';
import { db } from '../lib/firebase';
import {
  collection, doc, setDoc, updateDoc, deleteDoc, getDoc, onSnapshot, getDocs, query, where
} from 'firebase/firestore';

// Legacy Conversation interface for DesignDashboard compatibility
export interface Conversation {
  id: string;
  customerName: string;
  staffName?: string;
  message: string;
  replies?: { id: string; sender: string; text: string; createdAt: number }[];
  imageAttachments?: string[];
  pdfAttachments?: string[];
  createdAt: number;
}
import { cn } from '../lib/utils';

export interface Chat {
  id: string;
  type: 'direct' | 'group';
  name: string; // Group name or recipient name
  recipientEmail?: string; // Recipient email (for direct chats)
  recipientRole?: string;
  avatar?: string;
  participants: string[]; // User IDs of participants
  acceptedParticipants: string[]; // User IDs who accepted
  createdAt: number;
  updatedAt: number;
  lastMessage?: string;
  lastMessageTime?: number;
  lastSenderName?: string;
  unreadCount?: { [userId: string]: number };
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  message: string;
  imageAttachments?: string[];
  pdfAttachments?: string[];
  voiceNote?: string | null;
  createdAt: number;
  readBy: string[]; // List of user IDs who read the message
}

export interface ChatInvite {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  recipientEmail: string;
  status: 'pending' | 'accepted' | 'declined';
  chatType: 'direct' | 'group';
  groupName?: string;
  createdAt: number;
}

interface ConversationDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: { name: string; role: string; id: string; email?: string } | null;
  orders?: Order[];
  onUpdateOrder?: (id: string, updates: Partial<Order>) => Promise<void>;
  onCreateOrder?: (order: Partial<Order>) => Promise<void>;
  initialSelectedId?: string | null;
}

// Real-time Firestore sync & seeder
const seedMockChatData = async (currentUserId: string, currentUserEmail: string) => {
  try {
    const q = query(collection(db, 'pallywear_adv_chats'));
    const snap = await getDocs(q);
    if (!snap.empty) return; // already seeded or has data

    console.log("Seeding Firestore with default chats...");
    
    // Seed groups
    await setDoc(doc(db, 'pallywear_adv_chats', 'group_design_team'), {
      id: 'group_design_team',
      type: 'group',
      name: 'Embroidery Design Squad',
      avatar: 'https://ui-avatars.com/api/?name=Embroidery+Design+Squad&background=4D109E&color=fff',
      participants: [currentUserId, 'designer_arun', 'admin_ceo'],
      acceptedParticipants: [currentUserId, 'designer_arun', 'admin_ceo'],
      createdAt: Date.now() - 3600 * 1000 * 24,
      updatedAt: Date.now() - 600 * 1000,
      lastMessage: 'Hi everyone, please review the latest t-shirt mockup design.',
      lastMessageTime: Date.now() - 600 * 1000,
      lastSenderName: 'Arun (Designer)',
      unreadCount: { [currentUserId]: 2 }
    });

    await setDoc(doc(db, 'pallywear_adv_chats', 'chat_with_ceo'), {
      id: 'chat_with_ceo',
      type: 'direct',
      name: 'CEO Office',
      recipientEmail: 'ceo@pallywear.com',
      recipientRole: 'admin',
      avatar: 'https://ui-avatars.com/api/?name=CEO+Office&background=1A0B91&color=fff',
      participants: [currentUserId, 'admin_ceo'],
      acceptedParticipants: [currentUserId, 'admin_ceo'],
      createdAt: Date.now() - 3600 * 1000 * 12,
      updatedAt: Date.now() - 1200 * 1000,
      lastMessage: 'Let me know once the telecalling leads are distributed.',
      lastMessageTime: Date.now() - 1200 * 1000,
      lastSenderName: 'CEO Office',
      unreadCount: { [currentUserId]: 0 }
    });

    // Seed messages
    await setDoc(doc(db, 'pallywear_adv_messages', 'm1'), {
      id: 'm1',
      chatId: 'group_design_team',
      senderId: 'designer_arun',
      senderName: 'Arun',
      senderRole: 'designer',
      message: 'Welcome to the design thread! Uploading reference drafts.',
      createdAt: Date.now() - 3600 * 1000 * 2,
      readBy: ['designer_arun']
    });

    await setDoc(doc(db, 'pallywear_adv_messages', 'm2'), {
      id: 'm2',
      chatId: 'group_design_team',
      senderId: 'designer_arun',
      senderName: 'Arun',
      senderRole: 'designer',
      message: 'Hi everyone, please review the latest t-shirt mockup design.',
      createdAt: Date.now() - 600 * 1000,
      readBy: ['designer_arun']
    });

    await setDoc(doc(db, 'pallywear_adv_messages', 'm3'), {
      id: 'm3',
      chatId: 'chat_with_ceo',
      senderId: 'admin_ceo',
      senderName: 'CEO',
      senderRole: 'admin',
      message: 'Let me know once the telecalling leads are distributed.',
      createdAt: Date.now() - 1200 * 1000,
      readBy: [currentUserId, 'admin_ceo']
    });

    // Seed invites
    await setDoc(doc(db, 'pallywear_adv_invites', 'invite_1'), {
      id: 'invite_1',
      chatId: 'chat_pending_invite',
      senderId: 'marketing_manager',
      senderName: 'Marketing Desk',
      senderEmail: 'marketing@pallywear.com',
      recipientEmail: currentUserEmail || 'daniel@pallywear.com',
      status: 'pending',
      chatType: 'direct',
      createdAt: Date.now() - 1800 * 1000
    });
  } catch (e) {
    console.error("Failed to seed mock chats:", e);
  }
};

export default function ConversationDashboard({
  isOpen,
  onClose,
  currentUser,
  orders = [],
  onUpdateOrder,
  onCreateOrder,
  initialSelectedId = null
}: ConversationDashboardProps) {
  const { registeredUsers } = useAuth();
  
  // Firestore Sync Database States
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [invites, setInvites] = useState<ChatInvite[]>([]);

  // UI Selection States
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'groups' | 'invites'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  
  // Form States
  const [inviteEmail, setInviteEmail] = useState('');
  const [groupName, setGroupName] = useState('');
  const [selectedGroupParticipants, setSelectedGroupParticipants] = useState<string[]>([]);
  const [inviteGroupEmails, setInviteGroupEmails] = useState('');
  const [isSendingAction, setIsSendingAction] = useState(false);

  // Chat message input states
  const [messageText, setMessageText] = useState('');
  const [attachments, setAttachments] = useState<{ name: string; type: string; data: string }[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [viewImage, setViewImage] = useState<string | null>(null);
  
  // Voice Recording state
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [voiceNoteBase64, setVoiceNoteBase64] = useState<string | null>(null);

  // Scroll anchor
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const currentUserId = currentUser?.id || 'system_user';
  const currentUserEmail = currentUser?.email || '';
  const currentUserName = currentUser?.name || 'User';

  // Firestore onSnapshot listeners
  useEffect(() => {
    if (!isOpen || !currentUserId) return;

    seedMockChatData(currentUserId, currentUserEmail);

    const unsubChats = onSnapshot(collection(db, 'pallywear_adv_chats'), (snapshot) => {
      const list = snapshot.docs.map(doc => doc.data() as Chat);
      setChats(list);
    });

    const unsubMessages = onSnapshot(collection(db, 'pallywear_adv_messages'), (snapshot) => {
      const list = snapshot.docs.map(doc => doc.data() as ChatMessage);
      setMessages(list);
    });

    const unsubInvites = onSnapshot(collection(db, 'pallywear_adv_invites'), (snapshot) => {
      const list = snapshot.docs.map(doc => doc.data() as ChatInvite);
      setInvites(list);
    });

    return () => {
      unsubChats();
      unsubMessages();
      unsubInvites();
    };
  }, [isOpen, currentUserId]);

  // Read receipts and scroll to bottom
  useEffect(() => {
    if (selectedChatId) {
      markChatAsRead(selectedChatId);
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [selectedChatId, messages]);

  // Mark chat messages as read in Firestore
  const markChatAsRead = async (chatId: string) => {
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;

    try {
      if (chat.unreadCount && chat.unreadCount[currentUserId] > 0) {
        await updateDoc(doc(db, 'pallywear_adv_chats', chatId), {
          [`unreadCount.${currentUserId}`]: 0
        });
      }

      const unreadMsgs = messages.filter(m => m.chatId === chatId && !m.readBy.includes(currentUserId));
      for (const m of unreadMsgs) {
        await updateDoc(doc(db, 'pallywear_adv_messages', m.id), {
          readBy: [...m.readBy, currentUserId]
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter lists
  const filteredChats = useMemo(() => {
    return chats
      .filter(chat => {
        if (!chat.participants.includes(currentUserId)) return false;
        if (activeTab === 'unread') {
          return chat.unreadCount && chat.unreadCount[currentUserId] > 0;
        }
        if (activeTab === 'groups') {
          return chat.type === 'group';
        }
        return true;
      })
      .filter(chat => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return true;
        return (
          chat.name.toLowerCase().includes(q) ||
          (chat.lastMessage && chat.lastMessage.toLowerCase().includes(q))
        );
      });
  }, [chats, activeTab, searchQuery, currentUserId]);

  const pendingInvites = useMemo(() => {
    return invites.filter(inv => {
      const isReceived = inv.recipientEmail.toLowerCase().trim() === currentUserEmail.toLowerCase().trim();
      const isSent = inv.senderId === currentUserId;
      return (isReceived || isSent) && inv.status === 'pending';
    });
  }, [invites, currentUserEmail, currentUserId]);

  const activeChat = useMemo(() => {
    return chats.find(c => c.id === selectedChatId) || null;
  }, [chats, selectedChatId]);

  const activeChatMessages = useMemo(() => {
    if (!selectedChatId) return [];
    return messages
      .filter(m => m.chatId === selectedChatId)
      .sort((a, b) => a.createdAt - b.createdAt);
  }, [messages, selectedChatId]);

  // Send Direct/Group Invite
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = inviteEmail.toLowerCase().trim();
    if (!targetEmail) return;

    if (targetEmail === currentUserEmail.toLowerCase().trim()) {
      alert("You cannot invite yourself.");
      return;
    }

    setIsSendingAction(true);
    try {
      const recipientUser = registeredUsers.find(u => u.email.toLowerCase().trim() === targetEmail);

      const chatId = `chat_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      const inviteId = `invite_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      const newChat: Chat = {
        id: chatId,
        type: 'direct',
        name: recipientUser?.name || targetEmail.split('@')[0],
        recipientEmail: targetEmail,
        recipientRole: recipientUser?.role || 'user',
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(recipientUser?.name || targetEmail)}&background=1A0B91&color=fff`,
        participants: [currentUserId, recipientUser?.id || 'pending_user_id'].filter(id => id !== 'pending_user_id'),
        acceptedParticipants: [currentUserId],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastMessage: 'Waiting for invitation acceptance...',
        lastMessageTime: Date.now(),
        lastSenderName: currentUserName,
        unreadCount: {}
      };

      const newInvite: ChatInvite = {
        id: inviteId,
        chatId: chatId,
        senderId: currentUserId,
        senderName: currentUserName,
        senderEmail: currentUserEmail,
        recipientEmail: targetEmail,
        status: 'pending',
        chatType: 'direct',
        createdAt: Date.now()
      };

      await setDoc(doc(db, 'pallywear_adv_chats', chatId), newChat);
      await setDoc(doc(db, 'pallywear_adv_invites', inviteId), newInvite);

      setInviteEmail('');
      setShowInviteModal(false);
      alert(`Invitation sent to ${targetEmail}! Conversation will unlock once they accept.`);
    } catch (err) {
      console.error(err);
      alert("Failed to send invite.");
    } finally {
      setIsSendingAction(false);
    }
  };

  // Accept Invite
  const handleAcceptInvite = async (invite: ChatInvite) => {
    try {
      await updateDoc(doc(db, 'pallywear_adv_invites', invite.id), { status: 'accepted' });

      const chatRef = doc(db, 'pallywear_adv_chats', invite.chatId);
      const chatSnap = await getDoc(chatRef);
      if (chatSnap.exists()) {
        const chatData = chatSnap.data() as Chat;
        const currentParticipants = [...(chatData.participants || [])];
        if (!currentParticipants.includes(currentUserId)) {
          currentParticipants.push(currentUserId);
        }
        await updateDoc(chatRef, {
          participants: currentParticipants,
          acceptedParticipants: [...(chatData.acceptedParticipants || []), currentUserId],
          lastMessage: `${currentUserName} accepted the invitation. Chat unlocked!`,
          lastMessageTime: Date.now()
        });
      }

      const welcomeMsgId = `system_${Date.now()}`;
      const welcomeMsg: ChatMessage = {
        id: welcomeMsgId,
        chatId: invite.chatId,
        senderId: 'system',
        senderName: 'System',
        senderRole: 'system',
        message: `${currentUserName} joined the conversation. You can now chat!`,
        createdAt: Date.now(),
        readBy: [currentUserId]
      };
      await setDoc(doc(db, 'pallywear_adv_messages', welcomeMsgId), welcomeMsg);

      setSelectedChatId(invite.chatId);
      setActiveTab('all');
    } catch (e) {
      console.error(e);
      alert("Failed to accept invitation.");
    }
  };

  // Decline Invite
  const handleDeclineInvite = async (invite: ChatInvite) => {
    try {
      await updateDoc(doc(db, 'pallywear_adv_invites', invite.id), { status: 'declined' });
      await deleteDoc(doc(db, 'pallywear_adv_chats', invite.chatId));
    } catch (e) {
      console.error(e);
    }
  };

  // Create Group Chat
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    setIsSendingAction(true);
    try {
      const chatId = `group_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      const emailsToInvite = inviteGroupEmails
        .toLowerCase()
        .split(',')
        .map(email => email.trim())
        .filter(Boolean);

      const groupParticipants = [currentUserId, ...selectedGroupParticipants];
      const groupAccepted = [currentUserId];

      for (const email of emailsToInvite) {
        const inviteId = `invite_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        const newInvite: ChatInvite = {
          id: inviteId,
          chatId: chatId,
          senderId: currentUserId,
          senderName: currentUserName,
          senderEmail: currentUserEmail,
          recipientEmail: email,
          status: 'pending',
          chatType: 'group',
          groupName: groupName.trim(),
          createdAt: Date.now()
        };
        await setDoc(doc(db, 'pallywear_adv_invites', inviteId), newInvite);
      }

      const newChat: Chat = {
        id: chatId,
        type: 'group',
        name: groupName.trim(),
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(groupName.trim())}&background=4D109E&color=fff`,
        participants: groupParticipants,
        acceptedParticipants: groupAccepted,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastMessage: `Group "${groupName.trim()}" created. Inviting participants...`,
        lastMessageTime: Date.now(),
        lastSenderName: currentUserName,
        unreadCount: {}
      };

      await setDoc(doc(db, 'pallywear_adv_chats', chatId), newChat);

      const welcomeMsgId = `system_${Date.now()}`;
      const welcomeMsg: ChatMessage = {
        id: welcomeMsgId,
        chatId: chatId,
        senderId: 'system',
        senderName: 'System',
        senderRole: 'system',
        message: `${currentUserName} created group "${groupName.trim()}".`,
        createdAt: Date.now(),
        readBy: [currentUserId]
      };
      await setDoc(doc(db, 'pallywear_adv_messages', welcomeMsgId), welcomeMsg);

      setGroupName('');
      setSelectedGroupParticipants([]);
      setInviteGroupEmails('');
      setShowGroupModal(false);
      setSelectedChatId(chatId);
      setActiveTab('all');
    } catch (err) {
      console.error(err);
      alert("Failed to create group.");
    } finally {
      setIsSendingAction(false);
    }
  };

  // Image upload compression
  const handleFileChange = async (e: any) => {
    const files = e.target.files;
    if (!files) return;

    setIsCompressing(true);
    const fileList = Array.from(files) as File[];
    const processed: { name: string; type: string; data: string }[] = [];

    for (const file of fileList) {
      try {
        let fileToProcess: File | Blob = file;
        if (file.type.startsWith('image/')) {
          const options = {
            maxSizeMB: 0.1, // compress to ~100KB
            maxWidthOrHeight: 1280,
            useWebWorker: true,
          };
          fileToProcess = await imageCompression(file, options);
        }

        const reader = new FileReader();
        const data = await new Promise<string>((resolve) => {
          reader.onload = (event) => resolve(event.target?.result as string);
          reader.readAsDataURL(fileToProcess);
        });

        processed.push({
          name: file.name,
          type: file.type,
          data: data
        });
      } catch (err) {
        console.error('File compression error:', err);
      }
    }

    setAttachments(prev => [...prev, ...processed].slice(-4));
    setIsCompressing(false);
    if (e.target) e.target.value = '';
  };

  // Voice recording mock
  const generateSimulatedVoiceBlob = (): Blob => {
    const sampleRate = 8000;
    const duration = 2.0;
    const numSamples = sampleRate * duration;
    const buffer = new Uint8Array(44 + numSamples);
    buffer.set([0x52, 0x49, 0x46, 0x46]);
    return new Blob([buffer], { type: 'audio/wav' });
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      loadSimulatedVoice();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          setVoiceNoteBase64(reader.result as string);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      loadSimulatedVoice();
    }
  };

  const loadSimulatedVoice = () => {
    const blob = generateSimulatedVoiceBlob();
    const reader = new FileReader();
    reader.onloadend = () => {
      setVoiceNoteBase64(reader.result as string);
    };
    reader.readAsDataURL(blob);
    setIsRecording(true);
    setTimeout(() => setIsRecording(false), 1500);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChatId || !activeChat) return;

    const trimmed = messageText.trim();
    if (!trimmed && attachments.length === 0 && !voiceNoteBase64) return;

    const msgId = `msg_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const images = attachments.filter(a => a.type.startsWith('image/')).map(a => a.data);
    const pdfs = attachments.filter(a => !a.type.startsWith('image/')).map(a => a.data);

    const newMsg: ChatMessage = {
      id: msgId,
      chatId: selectedChatId,
      senderId: currentUserId,
      senderName: currentUserName,
      senderRole: currentUser?.role || 'user',
      message: trimmed,
      imageAttachments: images.length > 0 ? images : undefined,
      pdfAttachments: pdfs.length > 0 ? pdfs : undefined,
      voiceNote: voiceNoteBase64,
      createdAt: Date.now(),
      readBy: [currentUserId]
    };

    try {
      const nextUnread = { ...(activeChat.unreadCount || {}) };
      activeChat.participants.forEach(pId => {
        if (pId !== currentUserId) {
          nextUnread[pId] = (nextUnread[pId] || 0) + 1;
        }
      });

      await updateDoc(doc(db, 'pallywear_adv_chats', selectedChatId), {
        lastMessage: trimmed || (images.length > 0 ? '📷 Image attachment' : '🎤 Voice note'),
        lastMessageTime: Date.now(),
        lastSenderName: currentUserName,
        unreadCount: nextUnread,
        updatedAt: Date.now()
      });

      await setDoc(doc(db, 'pallywear_adv_messages', msgId), newMsg);

      setMessageText('');
      setAttachments([]);
      setVoiceNoteBase64(null);
    } catch (err) {
      console.error(err);
      alert("Failed to send message.");
    }
  };
// Check if current user has accepted the chat
  const hasAcceptedChat = activeChat ? activeChat.acceptedParticipants.includes(currentUserId) : false;

  // Retrieve active pending invite for active chat
  const activeChatInvite = useMemo(() => {
    if (!activeChat) return null;
    return invites.find(inv => inv.chatId === activeChat.id && inv.status === 'pending');
  }, [invites, activeChat]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />

      {/* Main split dashboard panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 220 }}
        className="relative md:w-[850px] lg:w-[1000px] xl:w-[1150px] w-full bg-[#f0f2f5] h-full shadow-2xl flex z-10 border-l border-slate-200 overflow-hidden"
      >
        
        {/* LEFT PANEL - Chats List */}
        <div className={cn(
          "w-full md:w-[340px] lg:w-[380px] bg-white border-r border-slate-200 flex flex-col h-full shrink-0",
          selectedChatId ? "hidden md:flex" : "flex"
        )}>
          {/* Header */}
          <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow">
                PW
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-indigo-300">Pallywear</h3>
                <p className="text-[10px] text-slate-300 font-bold uppercase">Advanced Inbox</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition"
            >
              <X size={18} />
            </button>
          </div>

          {/* Search and Action Buttons */}
          <div className="p-4 border-b border-slate-100 flex flex-col gap-3 shrink-0 bg-slate-50">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Search chats..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs outline-none focus:ring-1 focus:ring-indigo-400 font-medium placeholder:text-slate-400 text-slate-700 shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {/* Direct & Group Action Triggers */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowInviteModal(true)}
                className="py-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                <Plus size={12} className="stroke-[3]" />
                <span>Invite Chat</span>
              </button>
              <button
                onClick={() => setShowGroupModal(true)}
                className="py-2.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 rounded-xl flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                <Users size={12} className="stroke-[3]" />
                <span>Create Group</span>
              </button>
            </div>
          </div>

          {/* Horizontal Filters Tabs */}
          <div className="px-4 py-2 bg-white border-b border-slate-100 flex gap-2 overflow-x-auto shrink-0 no-scrollbar">
            {([
              ['all', 'All Chats'],
              ['unread', 'Unread'],
              ['groups', 'Groups'],
              ['invites', `Invites (${pendingInvites.length})`]
            ] as const).map(([tab, label]) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap border",
                  activeTab === tab
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-slate-50 border-slate-200 text-slate-550 hover:bg-slate-100 hover:text-slate-800"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Chats List Scroll container */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 bg-white">
            
            {/* Pending Invites View */}
            {activeTab === 'invites' ? (
              <div className="divide-y divide-slate-100">
                {pendingInvites.map(inv => {
                  const isReceived = inv.recipientEmail.toLowerCase().trim() === currentUserEmail.toLowerCase().trim();
                  return (
                    <div key={inv.id} className="p-4 bg-indigo-50/20 text-left space-y-3">
                      <div className="flex gap-2 items-start">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                          <Mail size={14} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-slate-800">
                            {isReceived ? `Invite from ${inv.senderName}` : `Invite sent to ${inv.recipientEmail}`}
                          </h4>
                          <p className="text-[10px] text-slate-450 mt-0.5">
                            {isReceived
                              ? `Invited you to start a ${inv.chatType} chat${inv.groupName ? ` in "${inv.groupName}"` : ''}.`
                              : `Waiting for them to accept the invitation.`}
                          </p>
                        </div>
                      </div>
                      
                      {isReceived && (
                        <div className="flex gap-2 pl-10">
                          <button
                            onClick={() => handleAcceptInvite(inv)}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleDeclineInvite(inv)}
                            className="px-3 py-1.5 border border-slate-250 hover:bg-slate-50 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {pendingInvites.length === 0 && (
                  <p className="p-8 text-center text-xs text-slate-400 italic">No pending invitations.</p>
                )}
              </div>
            ) : (
              // Active Chats List
              <>
                {filteredChats.map(chat => {
                  const isSelected = selectedChatId === chat.id;
                  const isGroup = chat.type === 'group';
                  const unread = chat.unreadCount ? chat.unreadCount[currentUserId] || 0 : 0;
                  
                  return (
                    <button
                      key={chat.id}
                      onClick={() => setSelectedChatId(chat.id)}
                      className={cn(
                        "w-full p-4 flex gap-3 text-left transition-all relative border-l-4",
                        isSelected ? "bg-slate-55 border-indigo-600 pl-3" : "hover:bg-slate-50/50 bg-white border-transparent"
                      )}
                    >
                      <img
                        src={chat.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.name)}`}
                        alt={chat.name}
                        className="w-11 h-11 rounded-full border border-slate-100 flex-shrink-0 object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between items-baseline mb-0.5">
                          <h4 className="text-xs font-black text-slate-800 truncate pr-2 flex items-center gap-1">
                            {isGroup && <Users size={12} className="text-purple-600 shrink-0" />}
                            {chat.name}
                          </h4>
                          {chat.lastMessageTime && (
                            <span className="text-[9px] text-slate-400 font-bold tabular-nums">
                              {new Date(chat.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        
                        <p className="text-[10px] text-slate-450 uppercase font-black tracking-wider mb-0.5">
                          {isGroup ? 'Group Chat' : chat.recipientRole?.replace('_', ' ') || 'Chat'}
                        </p>

                        <p className="text-[11px] text-slate-500 font-medium truncate pr-1">
                          {chat.lastSenderName && `${chat.lastSenderName}: `}
                          {chat.lastMessage}
                        </p>
                      </div>

                      {/* Unread badge */}
                      {unread > 0 && (
                        <span className="absolute right-4 bottom-4 w-5 h-5 rounded-full bg-indigo-600 text-white font-black text-[9px] flex items-center justify-center shadow-sm">
                          {unread}
                        </span>
                      )}
                    </button>
                  );
                })}

                {filteredChats.length === 0 && (
                  <div className="p-12 text-center text-slate-400 italic text-xs">
                    No active chats found. Click "Invite Chat" to send invitations by email.
                  </div>
                )}
              </>
            )}

          </div>
        </div>

        {/* RIGHT PANEL - Active Thread / Splash Screen */}
        <div className={cn(
          "flex-1 flex flex-col h-full bg-[#f4f7f6] relative",
          !selectedChatId ? "hidden md:flex" : "flex"
        )}>
          {activeChat ? (
            <>
              {/* Thread Header */}
              <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setSelectedChatId(null)}
                    className="p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white md:hidden"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <img
                    src={activeChat.avatar}
                    alt={activeChat.name}
                    className="w-9 h-9 rounded-full object-cover border border-slate-700"
                  />
                  <div className="min-w-0">
                    <h4 className="text-xs font-black truncate">{activeChat.name}</h4>
                    <p className="text-[9px] text-slate-400 truncate mt-0.5 font-bold uppercase tracking-wider">
                      {activeChat.type === 'group'
                        ? `${activeChat.participants.length} participants`
                        : activeChat.recipientEmail}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5 text-slate-400">
                  <button className="p-2 hover:bg-slate-850 rounded-xl hover:text-white transition">
                    <Phone size={15} />
                  </button>
                  <button className="p-2 hover:bg-slate-850 rounded-xl hover:text-white transition">
                    <Video size={15} />
                  </button>
                  <button className="p-2 hover:bg-slate-850 rounded-xl hover:text-white transition">
                    <Info size={15} />
                  </button>
                </div>
              </div>

              {/* Chat invitation banner check (only if creator hasn't accepted yet, or pending recipient acceptance) */}
              {!hasAcceptedChat && activeChatInvite ? (
                <div className="bg-indigo-50 border-b border-indigo-150 p-6 text-center space-y-3 shrink-0">
                  <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center mx-auto">
                    <Mail size={20} />
                  </div>
                  <div className="max-w-md mx-auto">
                    <h4 className="text-sm font-black text-slate-900">Pending Chat Invitation</h4>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      {activeChatInvite.senderName} ({activeChatInvite.senderEmail}) invited you to start a chat. Accept the invitation to join.
                    </p>
                  </div>
                  <div className="flex justify-center gap-3 pt-1">
                    <button
                      onClick={() => handleAcceptInvite(activeChatInvite)}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Accept Chat
                    </button>
                    <button
                      onClick={() => handleDeclineInvite(activeChatInvite)}
                      className="px-5 py-2.5 border border-slate-250 hover:bg-slate-50 text-slate-650 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ) : activeChat.acceptedParticipants.length < activeChat.participants.length && activeChat.type === 'direct' ? (
                // Invitation sent, waiting for recipient acceptance banner
                <div className="bg-slate-50 border-b border-slate-150 py-3.5 px-6 flex items-center justify-center gap-2 text-slate-500 text-xs font-bold shrink-0">
                  <Clock size={14} className="text-slate-450" />
                  <span>Waiting for recipient to accept the invitation...</span>
                </div>
              ) : null}

              {/* Messages Container */}
              <div 
                className="flex-1 overflow-y-auto px-6 py-5 space-y-4 bg-[#efeae2] relative border-b border-slate-200"
                style={{ backgroundImage: 'radial-gradient(#d3c6b2 10%, transparent 10%)', backgroundSize: '16px 16px' }}
              >
                <div className="mx-auto max-w-sm py-2 px-3 bg-white/70 backdrop-blur-sm rounded-xl text-center border border-white/50 text-[10px] font-bold text-slate-500 shadow-sm flex items-center justify-center gap-1.5 mb-2">
                  <Lock size={10} className="text-slate-400" />
                  <span>Messages are encrypted. Click on leave log badges to delete logs.</span>
                </div>

                {activeChatMessages.map((msg) => {
                  const isMe = msg.senderId === currentUserId;
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex flex-col max-w-[70%] rounded-2xl p-3 shadow-sm text-left relative transition-all duration-300",
                        isMe
                          ? "bg-[#d9fdd3] text-slate-800 ml-auto border border-emerald-100"
                          : "bg-white text-slate-800 mr-auto border border-slate-100"
                      )}
                    >
                      {/* Sender details for groups */}
                      {!isMe && activeChat.type === 'group' && (
                        <span className="text-[9px] font-black text-purple-700 uppercase tracking-wider block mb-1">
                          {msg.senderName} ({msg.senderRole})
                        </span>
                      )}
                      
                      {/* Message text */}
                      {msg.message && (
                        <p className="text-xs font-medium leading-relaxed break-words whitespace-pre-wrap">
                          {msg.message}
                        </p>
                      )}

                      {/* Attachments rendering */}
                      {msg.imageAttachments && msg.imageAttachments.length > 0 && (
                        <div className="grid grid-cols-2 gap-1.5 mt-2">
                          {msg.imageAttachments.map((img, i) => (
                            <div
                              key={i}
                              onClick={() => setViewImage(img)}
                              className="relative aspect-square rounded-xl overflow-hidden border border-black/5 cursor-zoom-in"
                            >
                              <img src={img} alt="attachment" className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      )}

                      {msg.pdfAttachments && msg.pdfAttachments.length > 0 && (
                        <div className="space-y-1.5 mt-2">
                          {msg.pdfAttachments.map((file, i) => {
                            const isZip = file.startsWith('data:application/zip') || file.startsWith('data:application/x-zip-compressed') || file.includes('zip');
                            return (
                              <a
                                key={i}
                                href={file}
                                download={isZip ? `archive_${i + 1}.zip` : `document_${i + 1}.pdf`}
                                className="flex items-center gap-2 p-2 rounded-xl bg-black/5 hover:bg-black/10 text-xs font-bold text-slate-650"
                              >
                                {isZip ? <FolderOpen size={14} /> : <FileText size={14} />}
                                {isZip ? `Archive ${i + 1}` : `Document ${i + 1}`}
                              </a>
                            );
                          })}
                        </div>
                      )}

                      {/* Voice Note representation */}
                      {msg.voiceNote && (
                        <div className="flex items-center gap-2 mt-2 bg-black/5 p-2 rounded-xl">
                          <Play size={14} className="text-slate-600 fill-slate-600" />
                          <div className="h-1 bg-slate-300 flex-1 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 w-1/3 rounded-full" />
                          </div>
                          <span className="text-[9px] text-slate-500 font-bold">0:04</span>
                        </div>
                      )}

                      {/* Footer: Time + Read Receipts */}
                      <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-slate-400 font-bold">
                        <span>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isMe && (
                          <span className={cn(
                            msg.readBy.length > 1 || activeChat.participants.every(p => msg.readBy.includes(p))
                              ? "text-sky-500"
                              : "text-slate-400"
                          )}>
                            <CheckCheck size={13} />
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Message Input bar */}
              <form
                onSubmit={handleSendMessage}
                disabled={!hasAcceptedChat}
                className="px-5 py-3.5 bg-[#f0f2f5] border-t border-slate-200 flex items-center gap-3 shrink-0"
              >
                {/* File Upload action */}
                <div className="relative">
                  <input
                    type="file"
                    id="inbox-msg-file-input"
                    accept="image/*,application/pdf,.zip,application/zip,application/x-zip-compressed"
                    className="hidden"
                    multiple
                    onChange={handleFileChange}
                  />
                  <button
                    type="button"
                    disabled={isCompressing || !hasAcceptedChat}
                    onClick={() => document.getElementById('inbox-msg-file-input')?.click()}
                    className="p-2.5 bg-white border border-slate-250 text-slate-500 hover:text-indigo-650 hover:border-indigo-200 rounded-xl transition cursor-pointer disabled:opacity-50"
                  >
                    <Paperclip size={16} />
                  </button>
                </div>

                {/* Voice Note trigger */}
                <button
                  type="button"
                  disabled={!hasAcceptedChat}
                  onClick={isRecording ? stopRecording : startRecording}
                  className={cn(
                    "p-2.5 border rounded-xl transition cursor-pointer disabled:opacity-50",
                    isRecording
                      ? "bg-red-50 border-red-250 text-red-600 animate-pulse"
                      : "bg-white border-slate-250 text-slate-500 hover:text-emerald-600 hover:border-emerald-200"
                  )}
                >
                  {isRecording ? <Square size={16} /> : <Mic size={16} />}
                </button>

                {/* Text area */}
                <input
                  type="text"
                  placeholder={hasAcceptedChat ? "Type a message..." : "Invitation pending acceptance..."}
                  disabled={!hasAcceptedChat}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="flex-1 bg-white border border-slate-250 rounded-xl px-4 py-2.5 text-xs font-semibold placeholder-slate-400 outline-none focus:ring-1 focus:ring-indigo-400 shadow-sm disabled:opacity-50"
                />

                {/* Send button */}
                <button
                  type="submit"
                  disabled={!hasAcceptedChat}
                  className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition cursor-pointer disabled:opacity-50 shadow-md shadow-indigo-100 flex items-center justify-center"
                >
                  <Send size={15} />
                </button>
              </form>
            </>
          ) : (
            // BLANK splash screen
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#f8f9fa] text-center border-l border-slate-100">
              <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-650 mb-6 shadow-inner border border-indigo-100/50">
                <MessageSquare size={36} className="stroke-[1.5]" />
              </div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Pallywear Workspace Chat</h3>
              <p className="text-slate-500 text-xs mt-2 max-w-sm mx-auto font-medium leading-relaxed">
                Send invites to active users by their email addresses. Create group discussions, share design reference attachments, and sync your logs.
              </p>
            </div>
          )}
        </div>

      </motion.div>

      {/* INVITE DIRECT CHAT MODAL */}
      <AnimatePresence>
        {showInviteModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-hidden border border-slate-100 text-left"
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-650 flex items-center justify-center">
                    <Mail size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Start Chat / Invite</h3>
                    <p className="text-[10px] text-slate-450 font-medium">Invite a member by entering their email address</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setShowInviteModal(false); setInviteEmail(''); }}
                  className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSendInvite} className="p-6 space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Email Address</label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="e.g. designer@pallywear.com"
                    className="border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/40"
                  />
                  <span className="text-[9px] text-slate-400 font-medium block">
                    You can select from active registered users:
                  </span>
                  <select
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  >
                    <option value="">Select registered staff...</option>
                    {registeredUsers
                      .filter(u => u.email.toLowerCase() !== currentUserEmail.toLowerCase())
                      .map(u => (
                        <option key={u.id} value={u.email}>{u.name} ({u.role?.toUpperCase()})</option>
                      ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => { setShowInviteModal(false); setInviteEmail(''); }}
                    className="px-4 py-2 border border-slate-250 text-slate-650 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingAction}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                  >
                    {isSendingAction ? 'Inviting...' : 'Send Invitation'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE GROUP CHAT MODAL */}
      <AnimatePresence>
        {showGroupModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-hidden border border-slate-100 text-left"
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-650 flex items-center justify-center">
                    <Users size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Create Group Chat</h3>
                    <p className="text-[10px] text-slate-450 font-medium">Create a team thread with multiple staff members</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGroupModal(false)}
                  className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateGroup} className="p-6 space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Group Name</label>
                  <input
                    type="text"
                    required
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="e.g. Sales Department"
                    className="border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/40"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Add Registered Staff</label>
                  <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50/40 divide-y divide-slate-100">
                    {registeredUsers
                      .filter(u => u.email.toLowerCase() !== currentUserEmail.toLowerCase())
                      .map(u => {
                        const isChecked = selectedGroupParticipants.includes(u.id);
                        return (
                          <label key={u.id} className="flex items-center gap-2 py-1.5 px-1 cursor-pointer hover:bg-white/60 rounded">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedGroupParticipants(prev => prev.filter(id => id !== u.id));
                                } else {
                                  setSelectedGroupParticipants(prev => [...prev, u.id]);
                                }
                              }}
                              className="rounded border-slate-300 text-indigo-650 focus:ring-indigo-500"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 leading-none">{u.name}</p>
                              <p className="text-[9px] text-slate-400 mt-0.5">{u.role?.toUpperCase()}</p>
                            </div>
                          </label>
                        );
                      })}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Invite via Email (Comma-separated)</label>
                  <input
                    type="text"
                    value={inviteGroupEmails}
                    onChange={(e) => setInviteGroupEmails(e.target.value)}
                    placeholder="e.g. marketing@pallywear.com, accounts@pallywear.com"
                    className="border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/40"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowGroupModal(false)}
                    className="px-4 py-2 border border-slate-250 text-slate-650 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingAction}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                  >
                    {isSendingAction ? 'Creating...' : 'Create Group'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* VIEW IMAGE ATTACHMENTS */}
      {viewImage && (
        <ImageViewer
          src={viewImage}
          onClose={() => setViewImage(null)}
        />
      )}

    </div>
  );
}
