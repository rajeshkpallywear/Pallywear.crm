export type LeadType = 'Hot' | 'Warm' | 'Cold';

export interface Lead {
  id: string;
  name: string;
  number: string;
  companyName: string;
  gst: string;
  leadType: LeadType;
  entryDate: string;
  forecastedValue: number;
  convertedValue: number;
  totalOrderValue: number;
  discountCode?: string;
  discountAmount?: number;
  netTotal?: number;
  createdBy: string; // User ID
  createdByName: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  rate: number;
  quantity: number;
  tax: number;
  discount: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  createdAt: string;
  dueDate: string;
  fromName: string;
  fromEmail: string;
  fromPhone: string;
  fromAddress: string;
  billToName: string;
  billToEmail: string;
  billToPhone: string;
  billToAddress: string;
  shipToAddress?: string;
  trackingNumber?: string;
  items: InvoiceItem[];
  subtotal: number;
  discountTotal: number;
  shippingCost: number;
  salesTax: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  notes?: string;
  paymentInstructions?: string;
  paymentMethod?: 'GPay' | 'PhonePay' | 'Cash' | 'Account' | 'UPI';
  productType?: string;
  productSubCategory?: string;
  customerPhoneNumber?: string;
  companySignature?: string;
  bankName?: string;
  bankAccountName?: string;
  bankIfscCode?: string;
  bankAccountNumber?: string;
  createdBy: string;
  createdByName: string;
  leadId: string;
}

export enum UserRole {
  ADMIN = 'admin',
  STAFF = 'staff',
  ACCOUNTS = 'accounts',
  ORDER_MANAGEMENT = 'order_management',
  PRODUCTION = 'production',
  DELIVERY = 'delivery',
  MARKETING = 'marketing',
  DESIGNER = 'designer',
  DIGITIZER = 'digitizer',
  TELECALLER = 'telecaller'
}

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  name: string;
}

export enum OrderStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  ACCOUNTS = 'accounts',
  DESIGN = 'design',
  ORDER_MANAGEMENT = 'order_management',
  PRODUCTION = 'production',
  DELIVERY = 'delivery',
  DELIVERED = 'delivered',
  HOLD = 'hold'
}

export interface SizeBreakdown {
  category: string;
  size: string;
  quantity: number;
  price: number;
  colour?: string;
  printType?: string;
  sleeve?: string;
  pocket?: string;
  material?: string;
  model?: string;
}

export interface Financials {
  totalAmount: number;
  advancePay: number;
  balanceAmount: number;
}

export interface Order {
  id: string;
  customerInfo: {
    name: string;
    companyName?: string;
    phone: string;
    address: string;
  };
  category: string;
  quantity: number;
  details: Record<string, any>;
  sizeBreakdown: SizeBreakdown[];
  financials: Financials;
  status: OrderStatus;
  isUrgent?: boolean;
  notes?: string;
  staffImages: string[];
  staffPdfs: string[];
  staffAttachments?: string[];
  accountsAttachments: string[];
  orderManagementAttachments: string[];
  designAttachments?: string[];
  machineFiles?: string[];
  createdAt: number;
  updatedAt: number;
  holdReason?: string;
  previousStatus?: OrderStatus;
  assignedDesigner?: string;
}

export interface InventoryMovement {
  id: string;
  type: 'inward' | 'outward';
  vendor?: string;
  customer?: string;
  date: string;
  transportName?: string;
  transportNumber?: string;
  orderId?: string;
  product: string;
  productType: string;
  sleeve?: string;
  pocket?: string;
  quantity: number;
  createdAt: number;
}
