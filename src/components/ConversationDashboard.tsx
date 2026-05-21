/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare, X, Mic, Send, Paperclip, User,
  Clock, Trash2, Download, AlertCircle, Check,
  Plus, Play, Square, FileText, Image as ImageIcon, Sparkles
} from 'lucide-react';
import FileUpload from './FileUpload';
import imageCompression from 'browser-image-compression';
import ImageViewer from './ImageViewer';
import { Order, OrderStatus, UserRole } from '../types';

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
}

interface ConversationDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: { name: string; role: string } | null;
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
    // Force clear old mock/built-in seeds to start with zero default items
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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen && initialSelectedId) {
      setSelectedOrderId(initialSelectedId);
    }
  }, [isOpen, initialSelectedId]);

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
      alert('Failed to trigger download automatically, please view image in HD and download.');
    }
  };

  // Reply text state mapped by Conversation ID
  const [replyInput, setReplyInput] = useState<{ [convId: string]: string }>({});

  // Attachments state for inline responses mapped by Conversation ID
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
        [convId]: [...current, ...processed].slice(-4) // limit to max 4 files per reply
      };
    });
    setIsReplyCompressing(prev => ({ ...prev, [convId]: false }));
    if (e.target) e.target.value = '';
  };

  useEffect(() => {
    if (isOpen) {
      setConversations(seedConversationsIfNeeded());
    }
  }, [isOpen]);

  const saveToStorage = (updatedConv: Conversation[]) => {
    localStorage.setItem('pallywear_conversations', JSON.stringify(updatedConv));
    setConversations(updatedConv);
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
        alert('Notice: Voice recording is simulated for instant preview inside the web iframe environment.');
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

  const handleFinishAndSendToStaff = async (orderId: string) => {
    if (!onUpdateOrder) return;
    const orderMatch = orders.find(o => o.id === orderId);
    if (!orderMatch) return;

    setIsProcessing(true);
    try {
      // Collect design attachments & machine files uploaded in the replies
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
      alert('Success: Artwork finished and sent to Staff/Accounts. Showing remaining balance art.');
    } catch (err) {
      console.error(err);
      alert('An error occurred while moving the order.');
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
        alert('Notice: Voice recording is simulated for instant preview inside the web iframe environment.');
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
            maxSizeMB: 0.1, // compress down to ~100KB for localstorage efficiency
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
      localStorage.setItem('pallywear_conversations', JSON.stringify(updatedConvs));
      setConversations(updatedConvs);

      // Reset Form State
      setIsCreatingConsult(false);
      setConsultCustomerName('');
      setConsultDescription('');
      setConsultImageAttachments([]);
      setConsultVoiceNote(null);

      alert(`Success: Consultation conversation started for ${consultCustomerName.trim()}! Designers can now view and reply with mockups.`);
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

    // Auto-gather design mockups uploaded by designers in this thread
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
      alert(`Success: Formal order #${newOrderId} created successfully! All files have been moved to the design order stream.`);
    } catch (err: any) {
      console.error(err);
      alert('Failed to convert conversation to formal order.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  const isDesigner = currentUser?.role && ['designer', 'DESIGNER', UserRole.DESIGNER].includes(currentUser.role as any);

  // Filter orders needing design work
  const pendingOrders = (orders || []).filter(o => {
    const s = (o.status as string).toLowerCase();
    return s === 'design' || s === 'hold';
  });

  // Keep if not assigned, OR if assigned to me. Hide if assigned to another designer.
  const visibleOrders = pendingOrders.filter(order => {
    if (!isDesigner) return true; // staff/admins see everything
    if (!order.assignedDesigner) return true;
    const cleanAssigned = order.assignedDesigner.trim().toLowerCase();
    const cleanUser = (currentUser?.name || '').trim().toLowerCase();
    return cleanAssigned.includes(cleanUser) || cleanUser.includes(cleanAssigned);
  });

  const pureConversations = conversations.filter(c =>
    !orders.some(o => o.id === c.id)
  );

  const feedItems = [
    ...pureConversations.map(c => ({
      id: c.id,
      isOrder: false,
      customerName: c.customerName,
      category: 'Pure Conversation',
      qty: 0,
      message: c.message,
      isUrgent: false,
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

  const visibleFeedItems = feedItems.filter(item => {
    if (!isDesigner) return true;
    if (item.assignedDesigner === 'Unassigned' || !item.assignedDesigner || item.assignedDesigner === 'Designer assigned') return true;
    const cleanAssigned = item.assignedDesigner.trim().toLowerCase();
    const cleanUser = (currentUser?.name || '').trim().toLowerCase();
    return cleanAssigned.includes(cleanUser) || cleanUser.includes(cleanAssigned);
  });

  const selectedFeedItem = visibleFeedItems.find(o => o.id === selectedOrderId);
  const selectedOrder = visibleOrders.find(o => o.id === selectedOrderId);
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

      {/* Slideout Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 220 }}
        className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col z-10 border-l border-slate-200"
      >
        {/* Header Block */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg">
              <MessageSquare size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-purple-300">
                {selectedOrderId
                  ? (isDesigner ? "Artwork Workspace" : "Design Consultation")
                  : (isDesigner ? "Pending Art Studio" : "Talk to Design Team")}
              </h3>
              <p className="text-[10px] text-slate-300 font-bold uppercase tracking-tight">
                {selectedOrderId
                  ? `Active session • ID #${selectedOrderId.slice(-8)}`
                  : (isDesigner ? `Balance Artworks: ${visibleOrders.length}` : `Active Design Orders: ${visibleOrders.length}`)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedOrderId && (
              <button
                onClick={() => setSelectedOrderId(null)}
                className="px-3 py-1.5 bg-slate-800 text-slate-200 hover:bg-slate-700 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-700 transition"
              >
                ← Balance List
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Dynamic Content Body */}
        <div className="flex-1 overflow-y-auto bg-slate-50/60 p-5 font-sans">
          {!selectedOrderId ? (
            /* ================== LIST MODE: ALL PENDING ARTWORKS ================== */
            <div className="space-y-4 text-left">

              {/* ================== NEW CONSULT FORM MODE ================== */}
              {isCreatingConsult ? (
                <div className="space-y-5 text-left bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="text-xs font-black uppercase text-purple-700 tracking-widest">Artist Intake Form</h4>
                      <p className="text-[10px] text-slate-500 font-semibold">Initiate a custom pattern design request</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingConsult(false);
                        setConsultCustomerName('');
                        setConsultDescription('');
                        setConsultImageAttachments([]);
                        setConsultVoiceNote(null);
                      }}
                      className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition"
                      title="Discard Request"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Customer Name */}
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                        Customer Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                          <User size={14} />
                        </span>
                        <input
                          type="text"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-purple-400 font-bold placeholder:text-slate-400 text-slate-800"
                          placeholder="e.g. Gaurav Nair / Pallywear Custom"
                          value={consultCustomerName}
                          onChange={(e) => setConsultCustomerName(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5 font-sans font-medium">
                        Design Concept / Description Idea brief
                      </label>
                      <textarea
                        rows={3}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-purple-400 font-medium placeholder:text-slate-400 text-slate-700 resize-none leading-relaxed"
                        placeholder="Specify layout, printing size, sleeve designs, colours, reference details..."
                        value={consultDescription}
                        onChange={(e) => setConsultDescription(e.target.value)}
                      />
                    </div>

                    {/* Image attachments upload */}
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                        Upload Reference Images
                      </label>

                      {consultImageAttachments.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          {consultImageAttachments.map((img, idx) => (
                            <div key={idx} className="relative aspect-[4/3] rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                              <img src={img} alt="ref preview" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => setConsultImageAttachments(prev => prev.filter((_, i) => i !== idx))}
                                className="absolute top-1.5 right-1.5 bg-red-600 text-white p-1 rounded-full shadow hover:bg-red-700 transition"
                              >
                                <X size={10} className="stroke-[3]" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <input
                        type="file"
                        id="consult-image-input"
                        accept="image/*"
                        className="hidden"
                        multiple
                        onChange={handleConsultImageChange}
                      />

                      <button
                        type="button"
                        disabled={isConsultCompressing}
                        onClick={() => document.getElementById('consult-image-input')?.click()}
                        className="w-full py-2.5 border border-dashed border-purple-200 hover:border-purple-400 bg-purple-50/20 hover:bg-purple-50/50 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase text-purple-700 tracking-wider transition-all animate-none"
                      >
                        {isConsultCompressing ? (
                          <>
                            <span className="w-3 h-3 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                            <span>Optimizing files...</span>
                          </>
                        ) : (
                          <>
                            <Plus size={14} className="stroke-[3]" />
                            <ImageIcon size={14} />
                            <span>{consultImageAttachments.length > 0 ? "Add More Images" : "Upload Reference Artwork"}</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Audio / Voice note Briefing */}
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                        Speech briefing / Voice Note
                      </label>

                      {consultVoiceNote ? (
                        <div className="bg-purple-50 border border-purple-150 p-3 rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black text-purple-700 uppercase tracking-wider flex items-center gap-1.5">
                              <Mic size={12} className="animate-pulse text-purple-600" />
                              Speech Brief Loaded
                            </span>
                            <button
                              type="button"
                              onClick={() => setConsultVoiceNote(null)}
                              className="text-[9px] text-red-600 hover:text-red-700 font-extrabold uppercase tracking-wider"
                            >
                              Delete Note
                            </button>
                          </div>
                          <audio src={consultVoiceNote} controls className="w-full h-8 text-xs bg-white rounded-lg p-0.5" />
                        </div>
                      ) : (
                        <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-3">
                          {isConsultRecording ? (
                            <div className="flex flex-col items-center justify-center py-2 text-center space-y-2">
                              <div className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                                <span className="w-2.5 h-2.5 absolute rounded-full bg-red-600" />
                                <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest pl-2">Recording active</span>
                              </div>
                              <div className="flex items-center gap-0.5 h-6">
                                <span className="w-1 h-3 bg-red-500 rounded animate-pulse" />
                                <span className="w-1 h-5 bg-red-500 rounded animate-pulse [animation-delay:0.1s]" />
                                <span className="w-1 h-2 bg-red-500 rounded animate-pulse [animation-delay:0.2s]" />
                                <span className="w-1 h-6 bg-red-500 rounded animate-pulse [animation-delay:0.3s]" />
                                <span className="w-1 h-3 bg-red-500 rounded animate-pulse [animation-delay:0.4s]" />
                              </div>
                              <button
                                type="button"
                                onClick={stopConsultRecording}
                                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition active:scale-95"
                              >
                                Stop & Process Recording
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-3">
                              <button
                                type="button"
                                onClick={startConsultRecording}
                                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider transition active:scale-95 shadow"
                              >
                                <Mic size={14} className="stroke-[3]" />
                                Record Brief
                              </button>

                              <input
                                type="file"
                                id="consult-audio-input"
                                accept="audio/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  if (file.size > 15 * 1024 * 1024) {
                                    alert("File size is too large (max 15MB).");
                                    return;
                                  }
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setConsultVoiceNote(reader.result as string);
                                  };
                                  reader.readAsDataURL(file);
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => document.getElementById('consult-audio-input')?.click()}
                                className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider hover:bg-slate-50 transition"
                              >
                                <Paperclip size={14} />
                                Upload Audio File
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => {
                        setIsCreatingConsult(false);
                        setConsultCustomerName('');
                        setConsultDescription('');
                        setConsultImageAttachments([]);
                        setConsultVoiceNote(null);
                      }}
                      className="px-4 py-2 border border-slate-200 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-50 transition"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={handleCreateConsultation}
                      className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:shadow-lg transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <>
                          <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <Send size={12} />
                          <span>Launch Consultation</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100/70 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-purple-900 uppercase tracking-wider block">
                        {isDesigner ? "Remaining Balance Arts & Chats" : "Talk to Design Team"}
                      </h4>
                      <span className="text-[10px] text-purple-700 mt-0.5 block">
                        {isDesigner ? "Assigned to you or unassigned for claiming" : "Active chat discussions and design orders"}
                      </span>
                    </div>
                    <div className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-black tabular-nums">
                      {visibleFeedItems.length} {isDesigner ? "Left" : "Active"}
                    </div>
                  </div>

                  {!isDesigner && (
                    <button
                      onClick={() => setIsCreatingConsult(true)}
                      className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-2xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider transition-all duration-200 shadow-md active:scale-[0.98] border border-purple-500/10 mb-2 font-sans"
                    >
                      <Plus size={16} className="stroke-[3]" />
                      <span>Start New Consult Form</span>
                    </button>
                  )}

                  {visibleFeedItems.length === 0 ? (
                    <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-3xl p-6">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Check className="text-green-500 stroke-[3]" size={22} />
                      </div>
                      <p className="text-xs font-black text-slate-800 uppercase tracking-wider">
                        {isDesigner ? "No Pending Artwork Balance" : "No Outstanding Chats"}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto">
                        {isDesigner
                          ? "All design assignments matches have been claimed and finished successfully."
                          : "There are currently no active discussions or orders requiring feedback."}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {visibleFeedItems.map((item) => {
                        const isMyAssigned = item.assignedDesigner &&
                          (item.assignedDesigner.toLowerCase().includes((currentUser?.name || '').toLowerCase()) ||
                            (currentUser?.name || '').toLowerCase().includes(item.assignedDesigner.toLowerCase()));

                        return (
                          <div
                            key={item.id}
                            className={`p-4 rounded-2xl border relative group transition-all duration-200 text-left ${!item.isOrder
                                ? 'bg-purple-50/20 border-purple-250/70 hover:border-purple-400'
                                : 'bg-white border-slate-200/60 hover:border-purple-300 shadow-sm hover:shadow'
                              }`}
                          >
                            {item.isUrgent && (
                              <span className="absolute top-4 right-4 bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded tracking-widest uppercase animate-pulse">
                                URGENT
                              </span>
                            )}

                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">#{item.id.slice(-8)}</span>
                              <span className="text-slate-300">•</span>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${!item.isOrder
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-indigo-50 text-indigo-700'
                                }`}>
                                {item.category}
                              </span>
                              {!item.isOrder && (
                                <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded text-[8px] font-black uppercase tracking-wider">
                                  Inquiry Chat
                                </span>
                              )}
                            </div>

                            <h4 className="text-sm font-black text-slate-900 leading-tight mb-1">
                              {item.customerName}
                            </h4>

                            <p className="text-[10px] text-slate-500 font-semibold mb-3 truncate max-w-md">
                              {item.isOrder
                                ? `Details: Qty ${item.qty} • Spec: ${item.message}`
                                : `Inquiry discussion: "${item.message}"`}
                            </p>

                            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                              {/* Assignment Pill badge */}
                              <div>
                                {item.statusText === 'Converted' ? (
                                  <span className="text-[9px] font-extrabold uppercase text-green-700 bg-green-50 px-2 py-1 rounded-md border border-green-150">
                                    🟢 Converted to Order
                                  </span>
                                ) : item.statusText === 'On Hold' ? (
                                  <span className="text-[9px] font-extrabold uppercase text-red-600 bg-red-50 px-2 py-1 rounded-md border border-red-100 animate-pulse">
                                    On Hold
                                  </span>
                                ) : item.assignedDesigner && item.assignedDesigner !== 'Unassigned' ? (
                                  <span className={`text-[9px] font-extrabold uppercase px-2 py-1 rounded-md border ${isMyAssigned
                                      ? 'text-green-700 bg-green-50 border-green-100'
                                      : 'text-amber-700 bg-amber-50 border-amber-100'
                                    }`}>
                                    {isMyAssigned ? 'Active Studio' : `🔒 ${item.assignedDesigner}`}
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-extrabold uppercase text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                                    Unassigned Chat
                                  </span>
                                )}
                              </div>

                              <div className="flex gap-2">
                                {!isDesigner ? (
                                  <button
                                    onClick={() => setSelectedOrderId(item.id)}
                                    className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition active:scale-95 shadow-sm"
                                  >
                                    Open Chat
                                  </button>
                                ) : !item.assignedDesigner ? (
                                  <button
                                    disabled={isProcessing}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTakeArt(item.id);
                                    }}
                                    className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition active:scale-95 disabled:opacity-50 shadow-sm"
                                  >
                                    {isProcessing ? "claiming..." : "claim chat"}
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setSelectedOrderId(item.id)}
                                    className="px-3.5 py-1.5 bg-slate-950 hover:bg-slate-800 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition active:scale-95"
                                  >
                                    {isMyAssigned ? "Open Chat" : "View Specs"}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            /* ================== WORKSPACE MODE: DETAILED VIEW + CHAT CHANNEL ================== */
            <div className="space-y-5 text-left bg-transparent">
              {isConvertingToOrder ? (
                /* ================== ORDER CONVERSION FORM ================== */
                <div className="space-y-4 text-left bg-white border border-slate-200 rounded-2xl p-5 shadow-sm font-sans">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="text-xs font-black uppercase text-purple-700 tracking-widest">Book Formal Production Order</h4>
                      <p className="text-[10px] text-slate-500 font-semibold">Transform this conversation into an official production order</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsConvertingToOrder(false)}
                      className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition"
                      title="Back to discussion"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Customer Name (ReadOnly) */}
                    <div className="col-span-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Customer Name</label>
                      <input
                        type="text"
                        className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none"
                        value={selectedFeedItem?.customerName || ''}
                        disabled
                      />
                    </div>

                    {/* Customer Contact Details */}
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-wide block mb-1">Customer Phone</label>
                      <input
                        type="text"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-purple-400"
                        placeholder="+91 XXXXX XXXXX"
                        value={convPhone}
                        onChange={(e) => setConvPhone(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-wide block mb-1">Customer Address</label>
                      <input
                        type="text"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-purple-400"
                        placeholder="Delivery City/Address"
                        value={convAddress}
                        onChange={(e) => setConvAddress(e.target.value)}
                      />
                    </div>

                    {/* Category Selection */}
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-wide block mb-1">Category</label>
                      <select
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-purple-400"
                        value={convCategory}
                        onChange={(e) => setConvCategory(e.target.value)}
                      >
                        <option value="Art Consult">Art Consult</option>
                        <option value="T-Shirt">T-Shirt</option>
                        <option value="Hoodie">Hoodie</option>
                        <option value="Sweatshirt">Sweatshirt</option>
                        <option value="Custom Wear">Custom Wear</option>
                      </select>
                    </div>

                    {/* Print Type selection */}
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-wide block mb-1">Print Type</label>
                      <input
                        type="text"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-purple-400"
                        placeholder="DTF / Screen Print / Sublimation"
                        value={convPrintType}
                        onChange={(e) => setConvPrintType(e.target.value)}
                      />
                    </div>

                    {/* Quantity */}
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-wide block mb-1">Quantity (pcs)</label>
                      <input
                        type="number"
                        min="1"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-purple-400"
                        value={convQty}
                        onChange={(e) => setConvQty(Number(e.target.value))}
                      />
                    </div>

                    {/* Model Details */}
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-wide block mb-1">Garment Model Type</label>
                      <input
                        type="text"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-purple-400"
                        placeholder="Regular fit / Oversized"
                        value={convModel}
                        onChange={(e) => setConvModel(e.target.value)}
                      />
                    </div>

                    {/* Financial entries */}
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-wide block mb-1">Total Pricing Amount</label>
                      <input
                        type="number"
                        min="0"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-purple-400"
                        value={convTotalAmount}
                        onChange={(e) => setConvTotalAmount(Number(e.target.value))}
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-wide block mb-1">Advance Payment Received</label>
                      <input
                        type="number"
                        min="0"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-purple-400"
                        value={convAdvancePay}
                        onChange={(e) => setConvAdvancePay(Number(e.target.value))}
                      />
                    </div>

                    {/* Selected Designer mockups selection */}
                    <div className="col-span-2">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-wide block mb-2 font-mono">Selected Design Mockup to lock</span>
                      {selectedDesignerImages.length > 0 ? (
                        <div className="flex gap-2">
                          {selectedDesignerImages.map((img, i) => (
                            <div key={i} className="relative w-24 h-24 border-2 border-purple-500 rounded-xl overflow-hidden bg-slate-50 shadow-md">
                              <img src={img} alt="chosen" className="w-full h-full object-cover" />
                              <div className="absolute top-1 right-1 bg-purple-600 text-white rounded-full p-0.5 shadow">
                                <Check size={10} className="stroke-[3]" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[9px] text-amber-600 font-extrabold uppercase bg-amber-55 px-2.5 py-2 rounded-xl border border-amber-200 block">
                          ⚠️ No specific artwork selected yet. We will attach the conversation's original references.
                        </span>
                      )}
                    </div>

                    {/* Urgent Booking Option */}
                    <div className="col-span-2 flex items-center gap-2 py-2">
                      <input
                        type="checkbox"
                        id="conv-is-urgent"
                        className="w-4 h-4 text-purple-600 outline-none bg-slate-50 rounded"
                        checked={convIsUrgent}
                        onChange={(e) => setConvIsUrgent(e.target.checked)}
                      />
                      <label htmlFor="conv-is-urgent" className="text-[10px] font-black text-slate-700 uppercase tracking-wide cursor-pointer">
                        🚨 Mark Order as Urgent Production Priority
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsConvertingToOrder(false)}
                      className="px-4 py-2 border border-slate-200 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-50 transition"
                    >
                      Back to Chat
                    </button>

                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={handleConfirmOrderConversion}
                      className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:shadow-lg transition-all active:scale-95 flex items-center gap-1.5"
                    >
                      {isProcessing ? (
                        <>
                          <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Generating order...</span>
                        </>
                      ) : (
                        <>
                          <Check size={12} className="stroke-[3]" />
                          <span>Place Production Order</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Reference Spec Sheet Card */}
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-3 font-sans">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-black uppercase tracking-widest block ${selectedFeedItem?.isOrder ? 'text-indigo-750' : 'text-purple-700'
                        }`}>
                        {selectedFeedItem?.isOrder ? '📦 Artwork Specification Sheet' : '🎨 Design Brief & Discussion'}
                      </span>
                      {!selectedFeedItem?.isOrder && !isDesigner && (
                        <button
                          onClick={startOrderConversionFlow}
                          className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-650 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 animate-pulse shadow-sm"
                        >
                          Create Order
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl">
                      <div>
                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Customer</p>
                        <p className="text-xs font-black text-slate-800">{selectedFeedItem?.customerName}</p>
                        <p className="text-[9px] text-slate-400 font-mono mt-0.5">{selectedFeedItem?.isOrder ? selectedOrderReal?.customerInfo.phone : 'Inquiry Client'}</p>
                      </div>
                      <div>
                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Spec Description</p>
                        <p className="text-xs font-black text-slate-800 uppercase tracking-tighter">
                          {selectedFeedItem?.category} / {selectedFeedItem?.isOrder ? (selectedOrderReal?.details.model || 'Standard') : 'Pattern Mockups'}
                        </p>
                        <p className="text-[9px] text-slate-500 font-bold">
                          {selectedFeedItem?.isOrder ? `Qty ${selectedFeedItem?.qty} units` : 'In Consultation'}
                        </p>
                      </div>
                    </div>

                    {selectedFeedItem?.message && (
                      <div>
                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Brief / Idea description</p>
                        <div className="text-xs text-slate-700 leading-relaxed font-semibold bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-2">
                          <p>{selectedFeedItem.message}</p>
                        </div>
                      </div>
                    )}

                    {selectedFeedItem?.voiceNote && (
                      <div className="bg-purple-50/75 hover:bg-purple-100/90 p-2.5 rounded-xl border border-purple-100 flex items-center gap-3 transition">
                        <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                          <Mic size={14} className="animate-pulse" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[8px] text-purple-700 font-extrabold uppercase tracking-wide font-mono">Audio briefing / Voice brief</p>
                          <audio src={selectedFeedItem.voiceNote} controls className="w-full h-8 mt-0.5 rounded outline-none" />
                        </div>
                      </div>
                    )}

                    {/* Reference layouts uploaded by creator */}
                    {selectedFeedItem?.imageAttachments && selectedFeedItem.imageAttachments.length > 0 && (
                      <div>
                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mb-1.5">Reference Assets</p>
                        <div className="grid grid-cols-4 gap-2">
                          {selectedFeedItem.imageAttachments?.map((img, i) => (
                            <button
                              key={i}
                              onClick={() => setViewImage(img)}
                              className="relative aspect-square border border-slate-200 rounded-lg overflow-hidden bg-slate-100 group hover:scale-[1.03] transition-all cursor-zoom-in"
                            >
                              <img src={img} alt="ref" className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Chat Thread section for this artwork order */}
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col min-h-[300px]">
                    <div className="pb-2 border-b border-slate-100 flex justify-between items-center mb-3">
                      <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider">
                        Studio Dialogue Stream
                      </span>
                      <span className="text-[9px] bg-slate-100 text-slate-500 py-0.5 px-2 rounded font-bold">
                        Order Discussion
                      </span>
                    </div>

                    {/* Messages scroll box */}
                    <div className="flex-1 space-y-4 max-h-[220px] overflow-y-auto pr-1">
                      {(!activeChatConv || !activeChatConv.replies || activeChatConv.replies.length === 0) ? (
                        <div className="text-center py-8 text-slate-400 italic text-[11px]">
                          No chat replies or files uploaded in this session yet. Upload drawing cards using the (+) button below.
                        </div>
                      ) : (
                        activeChatConv.replies.map((rep) => (
                          <div
                            key={rep.id}
                            className={`p-3 rounded-2xl text-xs text-left ${rep.senderRole === 'designer'
                                ? 'bg-purple-50/70 border border-purple-100 ml-5'
                                : 'bg-slate-50 border border-slate-150'
                              }`}
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span className={`font-black uppercase text-[9px] ${rep.senderRole === 'designer' ? 'text-purple-700' : 'text-slate-700'
                                }`}>
                                {rep.senderName}
                              </span>
                              <span className="text-[8px] text-slate-400 font-semibold">
                                {new Date(rep.createdAt).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-slate-600 font-medium whitespace-pre-wrap">{rep.message}</p>

                            {/* Attachments inside the replies with direct Download & Create actions */}
                            {((rep.imageAttachments && rep.imageAttachments.length > 0) ||
                              (rep.pdfAttachments && rep.pdfAttachments.length > 0)) && (
                                <div className="grid grid-cols-4 gap-2 mt-2 pt-2 border-t border-slate-200/40 font-sans">
                                  {rep.imageAttachments?.map((img, i) => (
                                    <div key={i} className="relative aspect-square border border-slate-200 rounded-lg overflow-hidden bg-slate-50 group hover:border-purple-300 transition-all duration-150">
                                      <img src={img} alt="attached artwork" className="w-full h-full object-cover" />

                                      <button
                                        type="button"
                                        onClick={() => setViewImage(img)}
                                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[8px] font-black uppercase tracking-wider cursor-zoom-in"
                                      >
                                        View HD
                                      </button>

                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDownloadImage(img, `designer_mockup_${rep.id}_${i}.png`);
                                        }}
                                        className="absolute bottom-1 right-1 bg-black/75 hover:bg-black p-1 rounded hover:scale-105 transition-all text-white shadow-md z-10 flex items-center justify-center"
                                        title="Download Design Mockup"
                                      >
                                        <Download size={10} className="stroke-[3]" />
                                      </button>
                                    </div>
                                  ))}
                                  {rep.pdfAttachments?.map((pdf, i) => (
                                    <a
                                      key={i}
                                      href={pdf}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="aspect-square border border-slate-200 rounded-lg bg-white flex flex-col items-center justify-center p-1 text-center"
                                    >
                                      <FileText size={14} className="text-slate-400" />
                                      <span className="text-[7px] font-bold text-slate-500 truncate w-full mt-1">PDF</span>
                                    </a>
                                  ))}
                                </div>
                              )}

                            {/* Inline Order Builder inside Chat Item when designer shares drawings */}
                            {rep.senderRole === 'designer' && rep.imageAttachments && rep.imageAttachments.length > 0 && !selectedFeedItem?.isOrder && !isDesigner && (
                              <div className="mt-3 p-2 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-200/50 rounded-xl flex items-center justify-between gap-3 text-left font-sans">
                                <div className="min-w-0">
                                  <p className="text-[9px] font-extrabold text-purple-800 uppercase tracking-wider">Like this design?</p>
                                  <p className="text-[8px] text-slate-500 leading-normal">Instantly book the formal order using this design draft.</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedDesignerImages(rep.imageAttachments || []);
                                    startOrderConversionFlow();
                                  }}
                                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-sm shrink-0 font-sans"
                                >
                                  Create Order
                                </button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    {/* Textbox typing area */}
                    <div className="space-y-2 pt-3 border-t border-slate-150 mt-3">
                      {replyAttachments[selectedOrderId] && replyAttachments[selectedOrderId].length > 0 && (
                        <div className="flex flex-wrap gap-1.5 p-1.5 bg-slate-50 border border-slate-200 rounded-lg">
                          {replyAttachments[selectedOrderId].map((att, i) => (
                            <div key={i} className="relative w-10 h-10 border border-slate-200 bg-white rounded-lg overflow-hidden flex items-center justify-center">
                              {att.type.startsWith('image/') ? (
                                <img src={att.data} alt="thumb" className="w-full h-full object-cover" />
                              ) : (
                                <FileText size={16} className="text-slate-400" />
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setReplyAttachments(prev => ({
                                    ...prev,
                                    [selectedOrderId]: prev[selectedOrderId].filter((_, idx) => idx !== i)
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

                      <div className="flex gap-2 items-center">
                        <input
                          type="file"
                          id={`reply-file-select-${selectedOrderId}`}
                          className="hidden"
                          accept="image/*,.pdf"
                          multiple
                          onChange={(e) => handleReplyFileChange(selectedOrderId, e)}
                        />

                        <button
                          type="button"
                          onClick={() => document.getElementById(`reply-file-select-${selectedOrderId}`)?.click()}
                          className="p-2.5 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-xl transition border border-purple-100 flex items-center justify-center shrink-0"
                          title="Attach artwork drawings / cards (+ button)"
                        >
                          <Plus size={16} className="stroke-[3]" />
                        </button>

                        <input
                          type="text"
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-purple-400 font-medium placeholder:text-slate-400"
                          placeholder="Comment or upload drawings..."
                          value={replyInput[selectedOrderId] || ''}
                          onChange={(e) => setReplyInput(prev => ({ ...prev, [selectedOrderId]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSendReply(selectedOrderId);
                          }}
                        />

                        {isReplyCompressing[selectedOrderId] ? (
                          <div className="w-8 h-8 flex items-center justify-center">
                            <span className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                          </div>
                        ) : (
                          <button
                            onClick={() => handleSendReply(selectedOrderId)}
                            className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl flex items-center justify-center transition"
                          >
                            <Send size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Interaction workflows footer inside the workspace */}
                  <div className="pt-3 border-t border-slate-100 font-sans">
                    {!isDesigner ? (
                      !selectedFeedItem?.isOrder ? (
                        <button
                          onClick={startOrderConversionFlow}
                          className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                        >
                          <Plus size={14} className="stroke-[3]" />
                          <span>Convert to Production Order</span>
                        </button>
                      ) : (
                        <div className="text-center py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-purple-700 font-extrabold uppercase tracking-wide flex items-center justify-center gap-2">
                          <Sparkles size={14} className="animate-pulse" />
                          <span>Active Art Studio Session</span>
                        </div>
                      )
                    ) : !selectedFeedItem?.assignedDesigner || selectedFeedItem.assignedDesigner === 'Unassigned' || selectedFeedItem.assignedDesigner === 'Designer assigned' ? (
                      <button
                        disabled={isProcessing}
                        onClick={() => handleTakeArt(selectedOrderId)}
                        className="w-full py-3 bg-purple-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-purple-700 transition shadow"
                      >
                        Claim Workspace & Chat Space
                      </button>
                    ) : (
                      (isDesigner && selectedFeedItem.assignedDesigner && (
                        selectedFeedItem.assignedDesigner.toLowerCase().includes((currentUser?.name || '').toLowerCase()) ||
                        (currentUser?.name || '').toLowerCase().includes(selectedFeedItem.assignedDesigner.toLowerCase())
                      )) ? (
                        <button
                          disabled={isProcessing}
                          onClick={() => handleFinishAndSendToStaff(selectedOrderId)}
                          className="w-full py-3 bg-slate-950 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-purple-800 transition shadow flex items-center justify-center gap-1.5"
                        >
                          <Check size={14} className="stroke-[3]" />
                          Finish & Send to Staff
                        </button>
                      ) : (
                        <div className="text-center py-2 text-xs text-amber-600 italic font-bold uppercase tracking-wider">
                          Locked to workspace of {selectedFeedItem.assignedDesigner}
                        </div>
                      )
                    )}
                  </div>
                </>
              )}
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
