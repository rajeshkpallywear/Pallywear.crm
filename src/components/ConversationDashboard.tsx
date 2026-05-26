/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare, X, Mic, Send, Paperclip, User,
  Clock, Trash2, Download, AlertCircle, Check,
  Plus, Play, Square, FileText, Image as ImageIcon, Sparkles,
  Search, ArrowLeft, Palette, CheckSquare
} from 'lucide-react';
import FileUpload from './FileUpload';
import imageCompression from 'browser-image-compression';
import ImageViewer from './ImageViewer';
import { Order, OrderStatus, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

export interface Reply {
  id: string;
  senderName: string;
  senderRole: string;
  message: string;
  createdAt: number;
  imageAttachments?: string[];
  pdfAttachments?: string[];
}

export interface Conversation {
  id: string;
  customerName: string;
  staffName: string;
  message: string;
  imageAttachments: string[];
  pdfAttachments: string[];
  voiceNote: string | null;
  createdAt: number;
  replies: Reply[];
  convertedToOrderId?: string;
  isUrgent?: boolean;
}

interface ConversationDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: { name: string; role: string; id?: string } | null;
  orders?: Order[];
  onUpdateOrder?: (id: string, updates: Partial<Order>) => Promise<void>;
  onCreateOrder?: (order: Partial<Order>) => Promise<void>;
  initialSelectedId?: string | null;
}

const seedConversationsIfNeeded = (): Conversation[] => {
  const saved = localStorage.getItem('pallywear_conversations');
  if (!saved) {
    localStorage.setItem('pallywear_conversations', JSON.stringify([]));
    return [];
  }
  try {
    const parsed = JSON.parse(saved);
    if (parsed.some((c: any) => c.id === 'conv_1' || c.id === 'conv_2' || c.customerName?.includes('Priya') || c.customerName?.includes('Gaurav'))) {
      localStorage.setItem('pallywear_conversations', JSON.stringify([]));
      return [];
    }
    return parsed;
  } catch (e) {
    return [];
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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedDMUserId, setSelectedDMUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [dmsRefreshTrigger, setDmsRefreshTrigger] = useState(0);

  // Sync selection with initialSelectedId
  useEffect(() => {
    if (isOpen && initialSelectedId) {
      // Check if it is a registered user ID or an order ID
      const isUser = registeredUsers.some(u => u.id === initialSelectedId);
      if (isUser) {
        setSelectedDMUserId(initialSelectedId);
        setSelectedOrderId(null);
      } else {
        setSelectedOrderId(initialSelectedId);
        setSelectedDMUserId(null);
      }
    }
  }, [isOpen, initialSelectedId, registeredUsers]);

  // Load consultations
  useEffect(() => {
    if (isOpen) {
      setConversations(seedConversationsIfNeeded());
    }
  }, [isOpen]);

  // Sync DMs across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('pallywear_dms_')) {
        setDmsRefreshTrigger(prev => prev + 1);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const saveToStorage = (updatedConv: Conversation[]) => {
    localStorage.setItem('pallywear_conversations', JSON.stringify(updatedConv));
    setConversations(updatedConv);
  };

  // Direct Messaging localStorage helpers
  const currentUserId = currentUser?.id || 'system_user';
  
  const getDMKey = (uid1: string, uid2: string) => {
    return [uid1, uid2].sort().join('_');
  };

  const loadDMMessages = (uid1: string, uid2: string): Reply[] => {
    const key = `pallywear_dms_${getDMKey(uid1, uid2)}`;
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : [];
  };

  const saveDMMessages = (uid1: string, uid2: string, msgs: Reply[]) => {
    const key = `pallywear_dms_${getDMKey(uid1, uid2)}`;
    localStorage.setItem(key, JSON.stringify(msgs));
  };

  // Order Conversion state
  const [isConvertingToOrder, setIsConvertingToOrder] = useState(false);
  const [convPhone, setConvPhone] = useState('');
  const [convAddress, setConvAddress] = useState('');
  const [convCategory, setConvCategory] = useState('Art Consult');
  const [convPrintType, setConvPrintType] = useState('Custom Graphic Request');
  const [convModel, setConvModel] = useState('Standard T-Shirt');
  const [convMaterial, setConvMaterial] = useState('Cotton Fleece 320 GSM');
  const [convQty, setConvQty] = useState(50);
  const [convTotalAmount, setConvTotalAmount] = useState(1000);
  const [convAdvancePay, setConvAdvancePay] = useState(500);
  const [convIsUrgent, setConvIsUrgent] = useState(false);
  const [selectedDesignerImages, setSelectedDesignerImages] = useState<string[]>([]);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [voiceNoteBase64, setVoiceNoteBase64] = useState<string | null>(null);

  // New Consult Form State
  const [isCreatingConsult, setIsCreatingConsult] = useState(false);
  const [consultCustomerName, setConsultCustomerName] = useState('');
  const [consultDescription, setConsultDescription] = useState('');
  const [consultImageAttachments, setConsultImageAttachments] = useState<string[]>([]);
  const [isConsultCompressing, setIsConsultCompressing] = useState(false);

  const [consultVoiceNote, setConsultVoiceNote] = useState<string | null>(null);
  const [isConsultRecording, setIsConsultRecording] = useState(false);
  const consultMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const consultAudioChunksRef = useRef<Blob[]>([]);

  const handleDownloadImage = (imgSrc: string, fileName: string) => {
    try {
      const link = document.createElement('a');
      link.href = imgSrc;
      link.download = fileName || 'pallywear_artwork_file.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Download failed', e);
      alert('Failed to trigger download automatically.');
    }
  };

  // Reply text state mapped by Conversation ID or DM user ID
  const [replyInput, setReplyInput] = useState<{ [convId: string]: string }>({});

  // Attachments state mapped by Conversation ID or DM user ID
  const [replyAttachments, setReplyAttachments] = useState<{ [convId: string]: { name: string, type: string, data: string }[] }>({});
  const [isReplyCompressing, setIsReplyCompressing] = useState<{ [convId: string]: boolean }>({});
  const [viewImage, setViewImage] = useState<string | null>(null);

  const handleReplyFileChange = async (convId: string, e: any) => {
    const files = e.target.files;
    if (!files) return;

    setIsReplyCompressing(prev => ({ ...prev, [convId]: true }));
    const fileList = Array.from(files) as File[];
    const processed: { name: string, type: string, data: string }[] = [];

    for (const file of fileList) {
      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Max size is 10MB.`);
        continue;
      }
      try {
        let fileToProcess: File | Blob = file;
        if (file.type.startsWith('image/')) {
          const options = {
            maxSizeMB: 0.1, // around 100KB target size
            maxWidthOrHeight: 1280,
            useWebWorker: true,
          };
          try {
            fileToProcess = await imageCompression(file, options);
          } catch (err) {
            console.error('Image compression failed for reply', err);
          }
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
        console.error('Error loading file for reply:', err);
      }
    }

    setReplyAttachments(prev => {
      const current = prev[convId] || [];
      return {
        ...prev,
        [convId]: [...current, ...processed].slice(-4) // limit to max 4 files
      };
    });
    setIsReplyCompressing(prev => ({ ...prev, [convId]: false }));
    if (e.target) e.target.value = '';
  };

  const generateSimulatedVoiceBlob = (): Blob => {
    const sampleRate = 8000;
    const duration = 2.5;
    const numSamples = sampleRate * duration;
    const buffer = new Uint8Array(44 + numSamples);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        buffer[offset + i] = str.charCodeAt(i);
      }
    };

    const writeUint32 = (offset: number, num: number) => {
      buffer[offset] = num & 0xff;
      buffer[offset + 1] = (num >> 8) & 0xff;
      buffer[offset + 2] = (num >> 16) & 0xff;
      buffer[offset + 3] = (num >> 24) & 0xff;
    };

    const writeUint16 = (offset: number, num: number) => {
      buffer[offset] = num & 0xff;
      buffer[offset + 1] = (num >> 8) & 0xff;
    };

    writeString(0, 'RIFF');
    writeUint32(4, 36 + numSamples);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    writeUint32(16, 16);
    writeUint16(20, 1);
    writeUint16(22, 1);
    writeUint32(24, sampleRate);
    writeUint32(28, sampleRate);
    writeUint16(32, 1);
    writeUint16(34, 8);
    writeString(36, 'data');
    writeUint32(40, numSamples);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const frequency = 220 + Math.sin(2 * Math.PI * 4 * t) * 60;
      const wave = Math.sin(2 * Math.PI * frequency * t) * 0.3 + Math.sin(2 * Math.PI * 2 * frequency * t) * 0.15;
      const byteVal = Math.floor((wave + 0.5) * 127.5);
      buffer[44 + i] = Math.max(0, Math.min(255, byteVal));
    }

    return new Blob([buffer], { type: 'audio/wav' });
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      loadSimulatedVoiceNote();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          setVoiceNoteBase64(reader.result as string);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err: any) {
      loadSimulatedVoiceNote();
    }
  };

  const loadSimulatedVoiceNote = () => {
    try {
      const testBlob = generateSimulatedVoiceBlob();
      const reader = new FileReader();
      reader.onloadend = () => {
        setVoiceNoteBase64(reader.result as string);
      };
      reader.readAsDataURL(testBlob);
    } catch (e) {
      console.error(e);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleTakeArt = async (orderId: string) => {
    if (!onUpdateOrder) return;
    setIsProcessing(true);
    const designerName = currentUser?.name || 'Arun (Designer)';
    try {
      await onUpdateOrder(orderId, {
        assignedDesigner: designerName,
        updatedAt: Date.now()
      });
      alert(`Success: Artwork claimed! Only you can view or finish this art design now.`);
    } catch (err) {
      console.error(err);
      alert('Failed to claim artwork.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Reply handlers
  const handleSendReply = (convId: string) => {
    const text = replyInput[convId] || '';
    const attachments = replyAttachments[convId] || [];

    if (!text.trim() && attachments.length === 0 && !voiceNoteBase64) return;

    const sender = currentUser?.name ? `${currentUser.name} (${currentUser.role})` : 'System User';
    const images: string[] = [];
    const pdfs: string[] = [];

    attachments.forEach((att) => {
      if (att.type.startsWith('image/') || att.data.startsWith('data:image')) {
        images.push(att.data);
      } else {
        pdfs.push(att.data);
      }
    });

    const activeConv = conversations.find(c => c.id === convId);
    let updated: Conversation[];

    if (!activeConv) {
      const orderMatch = orders.find(o => o.id === convId);
      const newConv: Conversation = {
        id: convId,
        customerName: orderMatch?.customerInfo.name || 'Client',
        staffName: orderMatch?.assignedDesigner || 'Unassigned',
        message: orderMatch?.notes || 'Artwork Specs Chat',
        imageAttachments: [],
        pdfAttachments: [],
        voiceNote: voiceNoteBase64,
        createdAt: Date.now(),
        replies: [{
          id: `rep_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          senderName: sender,
          senderRole: currentUser?.role || 'user',
          message: text.trim(),
          createdAt: Date.now(),
          imageAttachments: images.length > 0 ? images : undefined,
          pdfAttachments: pdfs.length > 0 ? pdfs : undefined
        }]
      };
      updated = [newConv, ...conversations];
    } else {
      updated = conversations.map((c) => {
        if (c.id === convId) {
          const newReply: Reply = {
            id: `rep_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
            senderName: sender,
            senderRole: currentUser?.role || 'user',
            message: text.trim(),
            createdAt: Date.now(),
            imageAttachments: images.length > 0 ? images : undefined,
            pdfAttachments: pdfs.length > 0 ? pdfs : undefined
          };
          return {
            ...c,
            replies: [...c.replies, newReply]
          };
        }
        return c;
      });
    }

    saveToStorage(updated);
    setReplyInput(prev => ({ ...prev, [convId]: '' }));
    setReplyAttachments(prev => ({ ...prev, [convId]: [] }));
    setVoiceNoteBase64(null);
  };

  // Direct Message Sending
  const handleSendDM = () => {
    if (!selectedDMUserId) return;
    const text = replyInput[selectedDMUserId] || '';
    const attachments = replyAttachments[selectedDMUserId] || [];

    if (!text.trim() && attachments.length === 0 && !voiceNoteBase64) return;

    const messages = loadDMMessages(currentUserId, selectedDMUserId);
    const images: string[] = [];
    const pdfs: string[] = [];

    attachments.forEach((att) => {
      if (att.type.startsWith('image/') || att.data.startsWith('data:image')) {
        images.push(att.data);
      } else {
        pdfs.push(att.data);
      }
    });

    const newReply: Reply = {
      id: `dm_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      senderName: currentUser?.name || 'User',
      senderRole: currentUser?.role || 'user',
      message: text.trim(),
      createdAt: Date.now(),
      imageAttachments: images.length > 0 ? images : undefined,
      pdfAttachments: pdfs.length > 0 ? pdfs : undefined
    };

    const updated = [...messages, newReply];
    saveDMMessages(currentUserId, selectedDMUserId, updated);

    setDmsRefreshTrigger(prev => prev + 1);
    setReplyInput(prev => ({ ...prev, [selectedDMUserId]: '' }));
    setReplyAttachments(prev => ({ ...prev, [selectedDMUserId]: [] }));
    setVoiceNoteBase64(null);
  };

  const handleFinishAndSendToStaff = async (orderId: string) => {
    if (!onUpdateOrder) return;
    const orderMatch = orders.find(o => o.id === orderId);
    if (!orderMatch) return;

    setIsProcessing(true);
    try {
      const activeConv = conversations.find(c => c.id === orderId);
      const outputImages: string[] = [];
      const outputPdfs: string[] = [];

      if (activeConv) {
        activeConv.replies.forEach(r => {
          if (r.imageAttachments) outputImages.push(...r.imageAttachments);
          if (r.pdfAttachments) outputPdfs.push(...r.pdfAttachments);
        });
      }

      await onUpdateOrder(orderId, {
        status: OrderStatus.ACCOUNTS,
        designAttachments: outputImages.length > 0 ? outputImages : (orderMatch.designAttachments || []),
        machineFiles: outputPdfs.length > 0 ? outputPdfs : (orderMatch.machineFiles || []),
        updatedAt: Date.now()
      });

      setSelectedOrderId(null);
      alert('Success: Artwork finished and sent to Staff/Accounts.');
    } catch (err) {
      console.error(err);
      alert('An error occurred.');
    } finally {
      setIsProcessing(false);
    }
  };

  const startConsultRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      loadSimulatedConsultVoiceNote();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      consultMediaRecorderRef.current = mediaRecorder;
      consultAudioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          consultAudioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(consultAudioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          setConsultVoiceNote(reader.result as string);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsConsultRecording(true);
    } catch (err) {
      loadSimulatedConsultVoiceNote();
    }
  };

  const loadSimulatedConsultVoiceNote = () => {
    try {
      const testBlob = generateSimulatedVoiceBlob();
      const reader = new FileReader();
      reader.onloadend = () => {
        setConsultVoiceNote(reader.result as string);
      };
      reader.readAsDataURL(testBlob);
    } catch (e) {
      console.error(e);
    }
  };

  const stopConsultRecording = () => {
    if (consultMediaRecorderRef.current && isConsultRecording) {
      consultMediaRecorderRef.current.stop();
      setIsConsultRecording(false);
    }
  };

  const handleConsultImageChange = async (e: any) => {
    const files = e.target.files;
    if (!files) return;

    setIsConsultCompressing(true);
    const fileList = Array.from(files) as File[];
    const processed: string[] = [];

    for (const file of fileList) {
      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Max size is 10MB.`);
        continue;
      }
      try {
        let fileToProcess: File | Blob = file;
        if (file.type.startsWith('image/')) {
          const options = {
            maxSizeMB: 0.1,
            maxWidthOrHeight: 1280,
            useWebWorker: true,
          };
          try {
            fileToProcess = await imageCompression(file, options);
          } catch (err) {
            console.error('Image compression failed', err);
          }
        }

        const reader = new FileReader();
        const data = await new Promise<string>((resolve) => {
          reader.onload = (event) => resolve(event.target?.result as string);
          reader.readAsDataURL(fileToProcess);
        });

        processed.push(data);
      } catch (err) {
        console.error('Error loading file:', err);
      }
    }

    setConsultImageAttachments(prev => [...prev, ...processed].slice(-4));
    setIsConsultCompressing(false);
  };

  const handleCreateConsultation = async () => {
    if (!consultCustomerName.trim()) {
      alert("Please provide a Customer Name.");
      return;
    }

    setIsProcessing(true);
    const conversationId = `CONV_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    try {
      const saved = localStorage.getItem('pallywear_conversations') || '[]';
      let currentConvs: Conversation[] = [];
      try {
        currentConvs = JSON.parse(saved);
      } catch (e) {
        currentConvs = [];
      }

      const initialMessage = consultDescription.trim() || 'Started a custom design consultation.';
      const newConv: Conversation = {
        id: conversationId,
        customerName: consultCustomerName.trim(),
        staffName: 'Unassigned',
        message: initialMessage,
        imageAttachments: consultImageAttachments,
        pdfAttachments: [],
        voiceNote: consultVoiceNote,
        createdAt: Date.now(),
        replies: []
      };

      const updatedConvs = [newConv, ...currentConvs];
      saveToStorage(updatedConvs);

      // Reset
      setIsCreatingConsult(false);
      setConsultCustomerName('');
      setConsultDescription('');
      setConsultImageAttachments([]);
      setConsultVoiceNote(null);

      setSelectedOrderId(conversationId);
      alert(`Success: Consultation conversation started for ${consultCustomerName.trim()}!`);
    } catch (err: any) {
      console.error(err);
      alert('Failed to start design consultation.');
    } finally {
      setIsProcessing(false);
    }
  };

  const startOrderConversionFlow = () => {
    if (!selectedFeedItem) return;
    setConvPhone('');
    setConvAddress('Consultation Request Address');
    setConvCategory('Art Consult');
    setConvPrintType('Custom Graphic Request');
    setConvModel('Standard T-Shirt');
    setConvMaterial('Cotton Fleece 320 GSM');
    setConvQty(50);
    setConvTotalAmount(1000);
    setConvAdvancePay(500);
    setConvIsUrgent(selectedFeedItem.isUrgent || false);

    const designerReplyImages: string[] = [];
    if (activeChatConv?.replies) {
      activeChatConv.replies.forEach(r => {
        if (r.senderRole === 'designer' && r.imageAttachments) {
          designerReplyImages.push(...r.imageAttachments);
        }
      });
    }
    if (selectedDesignerImages.length === 0 && designerReplyImages.length > 0) {
      setSelectedDesignerImages([designerReplyImages[designerReplyImages.length - 1]]);
    }

    setIsConvertingToOrder(true);
  };

  const handleConfirmOrderConversion = async () => {
    if (!selectedFeedItem) return;
    if (!onCreateOrder) {
      alert("Error: Create order callback is unavailable on this view.");
      return;
    }

    setIsProcessing(true);
    const newOrderId = `ORD_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const originalImages = selectedFeedItem.imageAttachments || [];
    const chosenImages = selectedDesignerImages.length > 0 ? selectedDesignerImages : originalImages;

    const orderData: Partial<Order> = {
      id: newOrderId,
      customerInfo: {
        name: selectedFeedItem.customerName,
        phone: convPhone.trim() || 'Not specified',
        address: convAddress.trim() || 'No address provided'
      },
      category: convCategory,
      quantity: Number(convQty) || 1,
      details: {
        printType: convPrintType,
        model: convModel,
        material: convMaterial,
        isConsultation: false,
        sourceConversationId: selectedFeedItem.id
      },
      sizeBreakdown: [
        { category: convCategory, size: 'M', quantity: Math.floor(Number(convQty) * 0.4), price: Math.floor(Number(convTotalAmount) / (Number(convQty) || 1)) },
        { category: convCategory, size: 'L', quantity: Math.ceil(Number(convQty) * 0.6), price: Math.floor(Number(convTotalAmount) / (Number(convQty) || 1)) }
      ],
      financials: {
        totalAmount: Number(convTotalAmount) || 0,
        advancePay: Number(convAdvancePay) || 0,
        balanceAmount: (Number(convTotalAmount) || 0) - (Number(convAdvancePay) || 0)
      },
      status: OrderStatus.DESIGN,
      assignedDesigner: selectedFeedItem.assignedDesigner && selectedFeedItem.assignedDesigner !== 'Unassigned'
        ? selectedFeedItem.assignedDesigner
        : 'Designer assigned',
      isUrgent: convIsUrgent,
      notes: `Order created from Consultation. Original description: ${selectedFeedItem.message}`,
      staffImages: originalImages,
      staffPdfs: [],
      staffAttachments: originalImages,
      designAttachments: chosenImages,
      accountsAttachments: [],
      orderManagementAttachments: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    try {
      await onCreateOrder(orderData);

      const saved = localStorage.getItem('pallywear_conversations') || '[]';
      let currentConvs: Conversation[] = [];
      try {
        currentConvs = JSON.parse(saved);
      } catch (e) {
        currentConvs = [];
      }

      const updatedConvs = currentConvs.map(c => {
        if (c.id === selectedFeedItem.id) {
          return {
            ...c,
            id: newOrderId,
            convertedToOrderId: newOrderId
          };
        }
        return c;
      });

      localStorage.setItem('pallywear_conversations', JSON.stringify(updatedConvs));
      setConversations(updatedConvs);

      setIsConvertingToOrder(false);
      setSelectedOrderId(newOrderId);
      alert(`Success: Formal order #${newOrderId} created successfully!`);
    } catch (err: any) {
      console.error(err);
      alert('Failed to convert conversation.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  const isDesigner = currentUser?.role && ['designer', 'DESIGNER', UserRole.DESIGNER].includes(currentUser.role as any);

  // Filter design orders
  const pendingOrders = (orders || []).filter(o => {
    const s = (o.status as string).toLowerCase();
    return s === 'design' || s === 'hold';
  });

  const visibleOrders = pendingOrders.filter(order => {
    if (!isDesigner) return true;
    if (!order.assignedDesigner) return true;
    const cleanAssigned = order.assignedDesigner.trim().toLowerCase();
    const cleanUser = (currentUser?.name || '').trim().toLowerCase();
    return cleanAssigned.includes(cleanUser) || cleanUser.includes(cleanAssigned);
  });

  const pureConversations = conversations.filter(c =>
    !orders.some(o => o.id === c.id)
  );

  // Build design channels feed items
  const designFeedItems = [
    ...pureConversations.map(c => ({
      id: c.id,
      isOrder: false,
      customerName: c.customerName,
      category: 'Pure Conversation',
      qty: 0,
      message: c.message,
      isUrgent: c.isUrgent || false,
      statusText: c.convertedToOrderId ? 'Converted' : 'Discussion Only',
      assignedDesigner: c.staffName || 'Unassigned',
      createdAt: c.createdAt,
      voiceNote: c.voiceNote,
      imageAttachments: c.imageAttachments || [],
      pdfAttachments: c.pdfAttachments || [],
      convertedToOrderId: c.convertedToOrderId
    })),
    ...visibleOrders.map(o => {
      const matchingConv = conversations.find(c => c.id === o.id);
      return {
        id: o.id,
        isOrder: true,
        customerName: o.customerInfo.name,
        category: o.category,
        qty: o.quantity,
        message: o.notes || 'No notes',
        isUrgent: o.isUrgent,
        statusText: (o.status as string) === 'hold' ? 'On Hold' : 'Assigned Studio',
        assignedDesigner: o.assignedDesigner || 'Unassigned',
        createdAt: o.createdAt,
        voiceNote: matchingConv?.voiceNote || null,
        imageAttachments: o.staffImages || [],
        pdfAttachments: o.staffPdfs || [],
        convertedToOrderId: o.id
      };
    })
  ].sort((a, b) => b.createdAt - a.createdAt);

  const visibleFeedItems = designFeedItems.filter(item => {
    if (!isDesigner) return true;
    if (item.assignedDesigner === 'Unassigned' || !item.assignedDesigner || item.assignedDesigner === 'Designer assigned') return true;
    const cleanAssigned = item.assignedDesigner.trim().toLowerCase();
    const cleanUser = (currentUser?.name || '').trim().toLowerCase();
    return cleanAssigned.includes(cleanUser) || cleanUser.includes(cleanAssigned);
  });

  const selectedFeedItem = visibleFeedItems.find(o => o.id === selectedOrderId);
  const selectedOrderReal = visibleOrders.find(o => o.id === selectedOrderId);

  const activeChatConv = selectedOrderId ? (conversations.find(c => c.id === selectedOrderId) || {
    id: selectedOrderId,
    customerName: selectedFeedItem?.customerName || 'Client',
    staffName: selectedFeedItem?.assignedDesigner || 'Unassigned',
    message: selectedFeedItem?.message || '',
    imageAttachments: selectedFeedItem?.imageAttachments || [],
    pdfAttachments: selectedFeedItem?.pdfAttachments || [],
    voiceNote: selectedFeedItem?.voiceNote || null,
    createdAt: selectedFeedItem?.createdAt || Date.now(),
    replies: []
  }) : null;

  // DIRECT MESSAGES LOGIC
  const activeDMUserIds = Object.keys(localStorage)
    .filter(key => key.startsWith('pallywear_dms_'))
    .map(key => {
      const parts = key.replace('pallywear_dms_', '').split('_');
      return parts.find(id => id !== currentUserId);
    })
    .filter(Boolean) as string[];

  const activeDMUsers = registeredUsers.filter(u => {
    if (u.id === currentUserId) return false;
    return activeDMUserIds.includes(u.id) || loadDMMessages(currentUserId, u.id).length > 0;
  });

  // Construct unified chats feed for left panel
  const unifiedChatsList = [
    ...visibleFeedItems.map(item => ({
      type: 'design' as const,
      id: item.id,
      title: `${item.customerName} (${item.isOrder ? 'Order' : 'Consult'})`,
      subtitle: item.message,
      category: item.category,
      isUrgent: item.isUrgent,
      statusText: item.statusText,
      assignedDesigner: item.assignedDesigner,
      createdAt: item.createdAt,
      avatar: `https://ui-avatars.com/api/?name=${item.customerName}&background=4D109E&color=fff`
    })),
    ...activeDMUsers.map(u => {
      const msgs = loadDMMessages(currentUserId, u.id);
      const lastMsg = msgs[msgs.length - 1];
      return {
        type: 'dm' as const,
        id: u.id,
        title: u.name,
        subtitle: lastMsg ? lastMsg.message : 'Start chatting...',
        category: u.role,
        isUrgent: false,
        statusText: u.role?.replace('_', ' ') || 'User',
        assignedDesigner: '',
        createdAt: lastMsg ? lastMsg.createdAt : Number(u.createdAt) || Date.now(),
        avatar: u.avatar || `https://ui-avatars.com/api/?name=${u.name}&background=1A0B91&color=fff`
      };
    })
  ].sort((a, b) => b.createdAt - a.createdAt);

  const filteredUnifiedList = unifiedChatsList.filter(chat => {
    const q = searchQuery.toLowerCase();
    return chat.title.toLowerCase().includes(q) || chat.subtitle.toLowerCase().includes(q) || chat.statusText.toLowerCase().includes(q);
  });

  // Users not yet in active DM chats matching search query
  const matchingOtherUsers = registeredUsers.filter(u => {
    if (u.id === currentUserId) return false;
    if (activeDMUsers.some(au => au.id === u.id)) return false;
    const q = searchQuery.toLowerCase();
    return q && (u.name.toLowerCase().includes(q) || u.role.toLowerCase().includes(q));
  });

  const activeDMUser = selectedDMUserId ? registeredUsers.find(u => u.id === selectedDMUserId) : null;
  const activeDMMessages = selectedDMUserId ? loadDMMessages(currentUserId, selectedDMUserId) : [];

  const handleSendActiveChat = () => {
    if (selectedOrderId) {
      handleSendReply(selectedOrderId);
    } else if (selectedDMUserId) {
      handleSendDM();
    }
  };

  const activeChatId = selectedOrderId || selectedDMUserId;

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

      {/* Slideout Panel - WhatsApp Split Vibe */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 220 }}
        className="relative md:w-[800px] lg:w-[960px] xl:w-[1100px] w-full bg-[#f0f2f5] h-full shadow-2xl flex z-10 border-l border-slate-200 overflow-hidden"
      >
        {/* Left Side Pane - Chat List / Search */}
        <div className={cn(
          "w-full md:w-[320px] lg:w-[360px] bg-white border-r border-slate-250 flex flex-col h-full shrink-0",
          activeChatId ? "hidden md:flex" : "flex"
        )}>
          {/* Left Header */}
          <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow">
                PW
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-purple-300">Pallywear</h3>
                <p className="text-[10px] text-slate-300 font-bold uppercase">Workspace Inbox</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition"
            >
              <X size={18} />
            </button>
          </div>

          {/* Search bar & Start Consult */}
          <div className="p-3 border-b border-slate-100 flex flex-col gap-2 shrink-0 bg-slate-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Search or start new chat..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs outline-none focus:ring-1 focus:ring-purple-400 font-medium placeholder:text-slate-400 text-slate-700"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {/* Create consultation button (Only for non-designers) */}
            {!isDesigner && (
              <button
                onClick={() => {
                  setIsCreatingConsult(true);
                  setSelectedOrderId(null);
                  setSelectedDMUserId(null);
                }}
                className="w-full py-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 rounded-xl flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition-all"
              >
                <Plus size={12} className="stroke-[3]" />
                <span>Start New Consult</span>
              </button>
            )}
          </div>

          {/* Chat List Scroll Container */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {/* Active List */}
            {filteredUnifiedList.map((chat) => {
              const isSelected = chat.type === 'design' ? selectedOrderId === chat.id : selectedDMUserId === chat.id;
              return (
                <button
                  key={chat.id}
                  onClick={() => {
                    setIsCreatingConsult(false);
                    setIsConvertingToOrder(false);
                    if (chat.type === 'design') {
                      setSelectedOrderId(chat.id);
                      setSelectedDMUserId(null);
                    } else {
                      setSelectedDMUserId(chat.id);
                      setSelectedOrderId(null);
                    }
                  }}
                  className={cn(
                    "w-full p-4 flex gap-3 text-left transition-all relative",
                    isSelected ? "bg-slate-100/80 border-l-4 border-purple-600 pl-3" : "hover:bg-slate-50 bg-white"
                  )}
                >
                  <img
                    src={chat.avatar}
                    alt={chat.title}
                    className="w-10 h-10 rounded-full border border-slate-100 flex-shrink-0 object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h4 className="text-xs font-black text-slate-800 truncate pr-2">{chat.title}</h4>
                      <span className="text-[9px] text-slate-400 font-semibold tabular-nums">
                        {new Date(chat.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 truncate">
                      {chat.statusText}
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium truncate pr-1">
                      {chat.subtitle}
                    </p>
                  </div>
                  {chat.isUrgent && (
                    <span className="absolute top-4 right-4 w-2 h-2 bg-red-500 rounded-full animate-ping" />
                  )}
                </button>
              );
            })}

            {/* Other Users to start chat */}
            {matchingOtherUsers.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-slate-50 text-[9px] font-black uppercase text-slate-400 tracking-widest border-y border-slate-100">
                  Start New Chat
                </div>
                {matchingOtherUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setIsCreatingConsult(false);
                      setIsConvertingToOrder(false);
                      setSelectedDMUserId(u.id);
                      setSelectedOrderId(null);
                      setSearchQuery('');
                    }}
                    className="w-full p-4 flex gap-3 items-center text-left hover:bg-slate-50 bg-white transition-all"
                  >
                    <img
                      src={u.avatar || `https://ui-avatars.com/api/?name=${u.name}&background=1A0B91&color=fff`}
                      alt={u.name}
                      className="w-9 h-9 rounded-full border border-slate-100 flex-shrink-0 object-cover"
                    />
                    <div>
                      <h4 className="text-xs font-black text-slate-800">{u.name}</h4>
                      <p className="text-[9px] text-purple-600 font-extrabold uppercase mt-0.5 tracking-wider">
                        {u.role?.replace('_', ' ')}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {filteredUnifiedList.length === 0 && matchingOtherUsers.length === 0 && (
              <div className="p-8 text-center text-slate-400 italic text-xs">
                No active conversations or users found.
              </div>
            )}
          </div>
        </div>

        {/* Right Side Main Area - Active Thread or Blank Splash */}
        <div className={cn(
          "flex-1 flex flex-col h-full bg-[#efeae2] relative",
          !activeChatId && !isCreatingConsult ? "hidden md:flex" : "flex"
        )}>
          {/* Consultation Intake Form Overlay in Right Pane */}
          {isCreatingConsult ? (
            <div className="flex-1 flex flex-col bg-white h-full text-left">
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Palette size={18} className="text-purple-400" />
                  <div>
                    <h4 className="text-xs font-black uppercase text-purple-300 tracking-widest">Artist Intake Form</h4>
                    <p className="text-[10px] text-slate-300">Initiate a custom pattern design request</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCreatingConsult(false)}
                  className="p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                    Customer Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-purple-400 font-bold text-slate-800"
                    placeholder="e.g. Gaurav Nair"
                    value={consultCustomerName}
                    onChange={(e) => setConsultCustomerName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                    Design Concept / Idea description
                  </label>
                  <textarea
                    rows={4}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-purple-400 font-medium text-slate-700 resize-none"
                    placeholder="Specify sleeve designs, colours, reference details..."
                    value={consultDescription}
                    onChange={(e) => setConsultDescription(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                    Upload Reference Images
                  </label>
                  {consultImageAttachments.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      {consultImageAttachments.map((img, idx) => (
                        <div key={idx} className="relative aspect-[4/3] rounded-xl border border-slate-200 overflow-hidden">
                          <img src={img} alt="ref" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setConsultImageAttachments(prev => prev.filter((_, i) => i !== idx))}
                            className="absolute top-1 right-1 bg-red-650 text-white p-1 rounded-full hover:bg-red-750"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <input
                    type="file"
                    id="right-pane-consult-image-input"
                    accept="image/*"
                    className="hidden"
                    multiple
                    onChange={handleConsultImageChange}
                  />
                  <button
                    type="button"
                    disabled={isConsultCompressing}
                    onClick={() => document.getElementById('right-pane-consult-image-input')?.click()}
                    className="w-full py-2.5 border border-dashed border-purple-200 hover:border-purple-400 bg-purple-50/20 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase text-purple-700 tracking-wider"
                  >
                    {isConsultCompressing ? "Optimizing files..." : "Upload Artwork Reference"}
                  </button>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                    Speech brief / Voice note
                  </label>
                  {consultVoiceNote ? (
                    <div className="bg-purple-50 p-3 rounded-xl flex justify-between items-center">
                      <audio src={consultVoiceNote} controls className="h-8 max-w-[200px]" />
                      <button
                        type="button"
                        onClick={() => setConsultVoiceNote(null)}
                        className="text-[9px] text-red-600 font-extrabold uppercase"
                      >
                        Delete
                      </button>
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 flex gap-2">
                      {isConsultRecording ? (
                        <div className="flex-1 flex flex-col items-center py-1">
                          <span className="text-[10px] font-bold text-red-650 animate-pulse">Recording Brief...</span>
                          <button
                            type="button"
                            onClick={stopConsultRecording}
                            className="mt-2 px-3 py-1 bg-red-650 text-white rounded text-[9px] font-bold uppercase"
                          >
                            Stop
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={startConsultRecording}
                            className="flex-1 py-2 bg-purple-650 text-white rounded-xl text-[10px] font-bold uppercase"
                          >
                            Record Voice
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const testBlob = generateSimulatedVoiceBlob();
                              const reader = new FileReader();
                              reader.onloadend = () => setConsultVoiceNote(reader.result as string);
                              reader.readAsDataURL(testBlob);
                            }}
                            className="flex-1 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-[10px] font-bold uppercase"
                          >
                            Simulate Voice
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setIsCreatingConsult(false)}
                  className="px-4 py-2 border border-slate-250 text-slate-500 rounded-xl text-[10px] font-black uppercase"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleCreateConsultation}
                  className="px-5 py-2 bg-purple-600 text-white rounded-xl text-[10px] font-black uppercase"
                >
                  Launch Consultation
                </button>
              </div>
            </div>
          ) : activeChatId ? (
            // Chat viewport
            <>
              {/* Right Pane Header */}
              <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setSelectedOrderId(null);
                      setSelectedDMUserId(null);
                    }}
                    className="p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white md:hidden"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <img
                    src={selectedOrderId
                      ? `https://ui-avatars.com/api/?name=${selectedFeedItem?.customerName}&background=4D109E&color=fff`
                      : activeDMUser?.avatar || `https://ui-avatars.com/api/?name=${activeDMUser?.name}&background=1A0B91&color=fff`
                    }
                    className="w-10 h-10 rounded-full border border-slate-800 object-cover"
                    alt="avatar"
                  />
                  <div className="text-left">
                    <h4 className="text-xs font-black text-white truncate max-w-[200px] md:max-w-xs">
                      {selectedOrderId ? selectedFeedItem?.customerName : activeDMUser?.name}
                    </h4>
                    <p className="text-[10px] text-slate-350 font-bold uppercase tracking-wide">
                      {selectedOrderId
                        ? `${selectedFeedItem?.category} • #${selectedOrderId.slice(-6)}`
                        : activeDMUser?.role?.replace('_', ' ') || 'User'
                      }
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {selectedOrderId && !selectedFeedItem?.isOrder && !isDesigner && (
                    <button
                      onClick={startOrderConversionFlow}
                      className="px-3 py-1.5 bg-purple-650 hover:bg-purple-750 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition"
                    >
                      Convert to Order
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSelectedOrderId(null);
                      setSelectedDMUserId(null);
                    }}
                    className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white hidden md:block"
                    title="Close session"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Chat Panel Body (Scroll Area) */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 flex flex-col min-h-0 bg-[#efeae2] relative select-text">
                {/* Spec details card (Only for design chats) */}
                {selectedOrderId && selectedFeedItem && !isConvertingToOrder && (
                  <div className="bg-white/95 backdrop-blur border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-3 font-sans shrink-0 text-left">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[9px] font-black uppercase text-purple-700 tracking-wider">
                        Spec sheet details
                      </span>
                      <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded">
                        {selectedFeedItem.statusText}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                      <div>
                        <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block">Customer</span>
                        <span className="font-bold text-slate-800">{selectedFeedItem.customerName}</span>
                      </div>
                      <div>
                        <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block">Quantity</span>
                        <span className="font-bold text-slate-800">{selectedFeedItem.isOrder ? `${selectedFeedItem.qty} units` : 'In Consultation'}</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-600 font-medium bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                      {selectedFeedItem.message}
                    </p>

                    {selectedFeedItem.voiceNote && (
                      <div className="bg-purple-50/50 p-2 rounded-xl flex items-center gap-3 border border-purple-100">
                        <Mic size={14} className="text-purple-600" />
                        <audio src={selectedFeedItem.voiceNote} controls className="h-7 w-full" />
                      </div>
                    )}

                    {selectedFeedItem.imageAttachments && selectedFeedItem.imageAttachments.length > 0 && (
                      <div>
                        <span className="text-[8px] text-slate-400 font-bold uppercase block mb-1.5">References</span>
                        <div className="flex gap-2 overflow-x-auto py-1">
                          {selectedFeedItem.imageAttachments.map((img, i) => (
                            <button
                              key={i}
                              onClick={() => setViewImage(img)}
                              className="relative w-16 h-16 border border-slate-200 rounded-lg overflow-hidden bg-slate-50 hover:scale-[1.02] transition shrink-0"
                            >
                              <img src={img} alt="ref" className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Conversion workflow Form in right pane */}
                {isConvertingToOrder && selectedFeedItem && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-md space-y-4 text-left font-sans max-w-xl mx-auto shrink-0">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <h4 className="text-xs font-black uppercase text-purple-700 tracking-wider">Book Formal Production Order</h4>
                      <button onClick={() => setIsConvertingToOrder(false)} className="p-1 hover:bg-slate-100 rounded-full text-slate-400">
                        <X size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="col-span-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Customer</label>
                        <input type="text" className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 font-bold text-slate-700 outline-none" value={selectedFeedItem.customerName} disabled />
                      </div>

                      <div>
                        <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Phone</label>
                        <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-semibold text-slate-750" placeholder="+91 XXXXX XXXXX" value={convPhone} onChange={(e) => setConvPhone(e.target.value)} />
                      </div>

                      <div>
                        <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Address</label>
                        <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-semibold text-slate-750" placeholder="City Address" value={convAddress} onChange={(e) => setConvAddress(e.target.value)} />
                      </div>

                      <div>
                        <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Category</label>
                        <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-semibold text-slate-750 outline-none" value={convCategory} onChange={(e) => setConvCategory(e.target.value)}>
                          <option value="Art Consult">Art Consult</option>
                          <option value="T-Shirt">T-Shirt</option>
                          <option value="Hoodie">Hoodie</option>
                          <option value="Sweatshirt">Sweatshirt</option>
                          <option value="Custom Wear">Custom Wear</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Print Type</label>
                        <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-semibold text-slate-750" value={convPrintType} onChange={(e) => setConvPrintType(e.target.value)} />
                      </div>

                      <div>
                        <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Quantity (pcs)</label>
                        <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-semibold text-slate-750" value={convQty} onChange={(e) => setConvQty(Number(e.target.value))} />
                      </div>

                      <div>
                        <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Price Amount</label>
                        <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-semibold text-slate-750" value={convTotalAmount} onChange={(e) => setConvTotalAmount(Number(e.target.value))} />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                      <button type="button" onClick={() => setIsConvertingToOrder(false)} className="px-4 py-2 border border-slate-250 text-slate-500 rounded-lg text-[10px] font-black uppercase">Cancel</button>
                      <button type="button" disabled={isProcessing} onClick={handleConfirmOrderConversion} className="px-5 py-2.5 bg-purple-600 text-white rounded-lg text-[10px] font-black uppercase">Place Production Order</button>
                    </div>
                  </div>
                )}

                {/* Message Bubble Stream */}
                <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
                  {/* DESIGN CHAT DIALOGUE */}
                  {selectedOrderId && (
                    <>
                      {(!activeChatConv || !activeChatConv.replies || activeChatConv.replies.length === 0) ? (
                        <div className="text-center py-10 text-slate-400 italic text-xs">
                          No conversation comments in this thread yet. Send a note or attach drawings below.
                        </div>
                      ) : (
                        activeChatConv.replies.map((rep) => {
                          const isMe = rep.senderName.startsWith(currentUser?.name || '---');
                          return (
                            <div
                              key={rep.id}
                              className={cn(
                                "p-3 rounded-2xl shadow-sm text-xs max-w-[85%] flex flex-col text-left font-sans relative",
                                isMe
                                  ? "bg-[#d9fdd3] text-slate-800 self-end rounded-tl-xl rounded-tr-sm rounded-b-xl"
                                  : "bg-white text-slate-800 self-start rounded-tr-xl rounded-tl-sm rounded-b-xl"
                              )}
                            >
                              <div className="flex justify-between items-baseline gap-4 mb-1 border-b border-slate-100 pb-0.5">
                                <span className={cn("font-black text-[9px] uppercase", isMe ? "text-green-750" : "text-purple-700")}>
                                  {rep.senderName}
                                </span>
                                <span className="text-[8px] text-slate-400 font-semibold">
                                  {new Date(rep.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-slate-700 font-semibold whitespace-pre-wrap leading-relaxed">{rep.message}</p>

                              {/* Attachments */}
                              {((rep.imageAttachments && rep.imageAttachments.length > 0) || (rep.pdfAttachments && rep.pdfAttachments.length > 0)) && (
                                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100">
                                  {rep.imageAttachments?.map((img, i) => (
                                    <div key={i} className="relative aspect-square border border-slate-100 rounded-lg overflow-hidden bg-slate-50 group cursor-pointer">
                                      <img src={img} alt="mockup" className="w-full h-full object-cover" />
                                      <div
                                        onClick={() => setViewImage(img)}
                                        className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[8px] font-black uppercase"
                                      >
                                        View HD
                                      </div>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDownloadImage(img, `design_file_${rep.id}_${i}.png`);
                                        }}
                                        className="absolute bottom-1 right-1 bg-black/75 p-1 rounded text-white shadow-md z-10"
                                      >
                                        <Download size={10} />
                                      </button>
                                    </div>
                                  ))}
                                  {rep.pdfAttachments?.map((pdf, i) => (
                                    <a
                                      key={i}
                                      href={pdf}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="aspect-square border border-slate-200 rounded-lg bg-white flex flex-col items-center justify-center p-2 text-center"
                                    >
                                      <FileText size={16} className="text-slate-400" />
                                      <span className="text-[8px] font-bold text-slate-500 truncate w-full mt-1">PDF File</span>
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </>
                  )}

                  {/* DIRECT MESSAGES DIALOGUE */}
                  {selectedDMUserId && (
                    <>
                      {activeDMMessages.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 italic text-xs">
                          No messages in this chat yet. Start a direct discussion with {activeDMUser?.name}!
                        </div>
                      ) : (
                        activeDMMessages.map((msg) => {
                          const isMe = msg.senderName === currentUser?.name;
                          return (
                            <div
                              key={msg.id}
                              className={cn(
                                "p-3 rounded-2xl shadow-sm text-xs max-w-[85%] flex flex-col text-left font-sans",
                                isMe
                                  ? "bg-[#d9fdd3] text-slate-800 self-end rounded-tl-xl rounded-tr-sm rounded-b-xl"
                                  : "bg-white text-slate-800 self-start rounded-tr-xl rounded-tl-sm rounded-b-xl"
                              )}
                            >
                              <div className="flex justify-between items-baseline gap-4 mb-1 border-b border-slate-105 pb-0.5">
                                <span className={cn("font-black text-[9px] uppercase", isMe ? "text-green-750" : "text-blue-700")}>
                                  {msg.senderName}
                                </span>
                                <span className="text-[8px] text-slate-400 font-semibold">
                                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-slate-700 font-semibold whitespace-pre-wrap leading-relaxed">{msg.message}</p>

                              {/* DM Attachments */}
                              {((msg.imageAttachments && msg.imageAttachments.length > 0) || (msg.pdfAttachments && msg.pdfAttachments.length > 0)) && (
                                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100">
                                  {msg.imageAttachments?.map((img, i) => (
                                    <div key={i} className="relative aspect-square border border-slate-100 rounded-lg overflow-hidden bg-slate-50 group cursor-pointer">
                                      <img src={img} alt="attachment" className="w-full h-full object-cover" />
                                      <div
                                        onClick={() => setViewImage(img)}
                                        className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[8px] font-black uppercase"
                                      >
                                        View HD
                                      </div>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDownloadImage(img, `dm_file_${msg.id}_${i}.png`);
                                        }}
                                        className="absolute bottom-1 right-1 bg-black/75 p-1 rounded text-white shadow-md z-10"
                                      >
                                        <Download size={10} />
                                      </button>
                                    </div>
                                  ))}
                                  {msg.pdfAttachments?.map((pdf, i) => (
                                    <a
                                      key={i}
                                      href={pdf}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="aspect-square border border-slate-200 rounded-lg bg-white flex flex-col items-center justify-center p-2 text-center"
                                    >
                                      <FileText size={16} className="text-slate-400" />
                                      <span className="text-[8px] font-bold text-slate-500 truncate w-full mt-1">PDF File</span>
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Compose Bar Footer & Spec Actions */}
              <div className="bg-slate-50 p-3 border-t border-slate-200 shrink-0">
                {/* Attachments Preview */}
                {activeChatId && replyAttachments[activeChatId] && replyAttachments[activeChatId].length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-1.5 bg-white border border-slate-200 rounded-xl mb-2 text-left">
                    {replyAttachments[activeChatId].map((att, i) => (
                      <div key={i} className="relative w-11 h-11 border border-slate-150 rounded-lg overflow-hidden flex items-center justify-center bg-slate-50">
                        {att.type.startsWith('image/') ? (
                          <img src={att.data} alt="thumb" className="w-full h-full object-cover" />
                        ) : (
                          <FileText size={18} className="text-slate-400" />
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setReplyAttachments(prev => ({
                              ...prev,
                              [activeChatId]: prev[activeChatId].filter((_, idx) => idx !== i)
                            }));
                          }}
                          className="absolute -top-1 -right-1 bg-red-500 text-white p-0.5 rounded-full shadow"
                        >
                          <X size={8} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Input row */}
                <div className="flex gap-2 items-center">
                  <input
                    type="file"
                    id={`chat-reply-file-select-${activeChatId}`}
                    className="hidden"
                    accept="image/*,.pdf"
                    multiple
                    onChange={(e) => handleReplyFileChange(activeChatId, e)}
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById(`chat-reply-file-select-${activeChatId}`)?.click()}
                    className="p-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl transition shadow-sm"
                    title="Attach files"
                  >
                    <Plus size={16} className="stroke-[3]" />
                  </button>

                  <input
                    type="text"
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-purple-400 font-semibold placeholder:text-slate-400 text-slate-800 shadow-sm"
                    placeholder="Type a message..."
                    value={replyInput[activeChatId] || ''}
                    onChange={(e) => setReplyInput(prev => ({ ...prev, [activeChatId]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendActiveChat();
                    }}
                  />

                  {/* Mic for Voice Note Simulation */}
                  {voiceNoteBase64 ? (
                    <div className="flex items-center gap-1">
                      <span className="text-[8px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded uppercase font-black tracking-widest animate-pulse">Voice brief loaded</span>
                      <button
                        type="button"
                        onClick={() => setVoiceNoteBase64(null)}
                        className="text-[9px] text-red-500 font-extrabold uppercase mr-1"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const testBlob = generateSimulatedVoiceBlob();
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setVoiceNoteBase64(reader.result as string);
                          alert("Notice: Simulated a 2.5s voice note message for instant preview.");
                        };
                        reader.readAsDataURL(testBlob);
                      }}
                      className="p-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-500 rounded-xl transition"
                      title="Record speech brief"
                    >
                      <Mic size={16} />
                    </button>
                  )}

                  {isReplyCompressing[activeChatId] ? (
                    <div className="w-8 h-8 flex items-center justify-center">
                      <span className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <button
                      onClick={handleSendActiveChat}
                      className="p-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl flex items-center justify-center transition shadow-md active:scale-95"
                    >
                      <Send size={14} />
                    </button>
                  )}
                </div>

                {/* Workflow footer buttons (Only for design chats) */}
                {selectedOrderId && selectedFeedItem && !isConvertingToOrder && (
                  <div className="mt-3 pt-2.5 border-t border-slate-200/50 flex gap-2 justify-end">
                    {isDesigner ? (
                      !selectedFeedItem.assignedDesigner || selectedFeedItem.assignedDesigner === 'Unassigned' || selectedFeedItem.assignedDesigner === 'Designer assigned' ? (
                        <button
                          disabled={isProcessing}
                          onClick={() => handleTakeArt(selectedOrderId)}
                          className="px-4 py-2 bg-purple-600 text-white rounded-xl text-[10px] font-black uppercase shadow tracking-wider"
                        >
                          Claim Design Workspace
                        </button>
                      ) : (
                        (selectedFeedItem.assignedDesigner.toLowerCase().includes((currentUser?.name || '').toLowerCase()) ||
                         (currentUser?.name || '').toLowerCase().includes(selectedFeedItem.assignedDesigner.toLowerCase())) && (
                          <button
                            disabled={isProcessing}
                            onClick={() => handleFinishAndSendToStaff(selectedOrderId)}
                            className="px-4 py-2 bg-slate-950 hover:bg-purple-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow"
                          >
                            <Check size={12} className="stroke-[3]" />
                            <span>Finish & Send to Staff</span>
                          </button>
                        )
                      )
                    ) : (
                      !selectedFeedItem.isOrder && (
                        <button
                          onClick={startOrderConversionFlow}
                          className="w-full py-2 bg-purple-600 hover:bg-purple-750 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 shadow"
                        >
                          <Plus size={12} className="stroke-[3]" />
                          <span>Convert to Production Order</span>
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            // Blank splash screen
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#f8f9fa] text-center font-sans">
              <div className="max-w-md space-y-4">
                <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto text-purple-650 shadow-inner">
                  <MessageSquare size={32} />
                </div>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest">
                  Pallywear Inbox
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto font-medium">
                  Send and receive direct messages with designers, staff, and team members. Direct channels will show up in the side feed.
                </p>
                <div className="flex justify-center gap-2 pt-2">
                  <span className="px-3 py-1 bg-purple-50 border border-purple-100 rounded-full text-[10px] font-black text-purple-700 uppercase tracking-wider">
                    WhatsApp Chat Mode
                  </span>
                  <span className="px-3 py-1 bg-green-50 border border-green-100 rounded-full text-[10px] font-black text-green-700 uppercase tracking-wider">
                    Secure local Sync
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Popover overlay for zoom viewing */}
      <AnimatePresence>
        {viewImage && (
          <ImageViewer
            src={viewImage}
            onClose={() => setViewImage(null)}
            fileName="pallywear_hd_artwork"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
