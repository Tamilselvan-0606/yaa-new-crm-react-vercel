export type Role =
  | 'SUPER_ADMIN'
  | 'ORG_ADMIN'
  | 'SUB_ORG_ADMIN'
  | 'BRANCH_ADMIN'
  | 'STAFF'
  | 'ADMIN'
  | 'Admin'
  | 'SuperAdmin'
  | 'Staff'
  | 'OrgAdmin'
  | 'SubOrgAdmin'
  | 'BranchAdmin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  organizationId?: string;
  department?: string;
  avatar: string;
  phone?: string;
  active?: boolean;
  status?: 'Active' | 'Inactive';
  joinedDate?: string;
  title: string;
  assignedProducts?: string[];
  performanceMetrics?: {
    leadsHandled: number;
    tasksCompleted: number;
    contentCreated: number;
  };
  organization?: {
    id: string;
    name: string;
    organizationType?: number | string;
    organizationTypeName?: string;
  };
  organizationType?: number | string;
  organizationTypeName?: string;
  memberships?: any[];
}

export interface DocumentItem {
  id: string;
  title: string;
  fileType: string;
  fileSize: string;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
  category: 'Contract' | 'Agreement' | 'Invoice' | 'Brief' | 'Asset' | 'NDA' | 'Report' | 'Tax/GST' | 'Other' | string;
  type?: 'shared_by_company' | 'shared_by_client'; // 'shared_by_company' (Sent to Client) | 'shared_by_client' (Received from Client)
}

export type BillingCycle = 'Monthly' | 'Quarterly' | 'Annually' | 'One-Time' | 'Custom';
export type PricingType = 'Fixed' | 'Per-User' | 'Usage-Based' | 'Custom Quote' | 'Tiered';

export interface ProductPlan {
  id: string;
  name: string;
  price: number;
  billingCycle: BillingCycle;
  features: string[];
  status?: 'Active' | 'Inactive';
  isPopular?: boolean;
  tier?: 'Starter' | 'Growth' | 'Professional' | 'Enterprise' | 'Custom';
  pricingType?: PricingType;
  currency?: string;
  setupFee?: number;
  discountPercent?: number;
  description?: string;
  customizablePrice?: boolean;
  minDurationMonths?: number;
  maxBranchLimit?: number | string;
  specs?: Record<string, any>;
  permissions?: Record<string, 'all' | 'none'>;
}

export interface Product {
  id: string;
  name: string;
  code: 'PROD_1' | 'PROD_2' | 'PROD_3' | 'PROD_4' | string;
  tagline: string;
  description: string;
  websiteUrl: string;
  applicationUrl: string;
  iconName: string;
  color: string;
  badge: string;
  plans: ProductPlan[];
  documents: DocumentItem[];
  notes: string;
  createdAt: string;
  status?: 'Active' | 'Inactive' | 'Suspended';
  activeCustomersCount?: number;
  activeLeadsCount?: number;
  monthlyRevenue?: number;
  contactPerson?: string;
  mobileNumber?: string;
  supportPhone?: string;
  supportEmail?: string;
  supportWhatsapp?: string;
  gstNumber?: string;
  panNumber?: string;
  hqCity?: string;
  address?: string;
}

export type BranchStatus = 'Active' | 'Inactive' | 'Suspended';

export interface Branch {
  id: string;
  organizationId?: string;
  subOrganizationId?: string;
  productId?: string;
  productName?: string;
  organizationType?: 'Client Management' | 'Sales Management' | string;
  name: string;
  code: string;
  contactPerson?: string;
  mobileNumber?: string;
  whatsapp?: string;
  email?: string;
  location?: string;
  city?: string;
  state?: string;
  address?: string;
  gstNumber?: string;
  status: BranchStatus;
  createdAt: string;
}

export interface DigitalMarketingPlan {
  id: string;
  name: string;
  price: number;
  billingCycle: 'Monthly' | 'Quarterly' | 'Annually';
  description: string;
  features: string[];
  requiredDocs: string[];
  requiredAssets: string[];
  popular?: boolean;
}

export type LeadStatus =
  | 'New'
  | 'Contacted'
  | 'Qualified'
  | 'Proposal'
  | 'Negotiation'
  | 'Won'
  | 'Lost'
  | 'Follow-up'
  | 'Interested'
  | 'Onboarding'
  | 'Converted'
  | 'Not Interested'
  | string;

export type LeadSource =
  | 'Website'
  | 'Referral'
  | 'LinkedIn'
  | 'Cold Call'
  | 'Campaign'
  | 'Event'
  | 'Google'
  | 'Instagram'
  | 'Facebook'
  | 'WhatsApp'
  | 'Direct'
  | 'Other'
  | 'Google Ads'
  | 'Cold Outreach'
  | string;

export interface LeadFollowUp {
  id: string;
  date: string;
  staffId: string;
  staffName: string;
  type: 'Call' | 'WhatsApp' | 'Meeting' | 'Email' | 'Other';
  notes: string;
  outcome: string;
  nextActionDate?: string;
}

export interface Lead {
  id: string;
  leadId?: string;
  leadDate?: string;
  name: string; // Contact Person Name
  company: string; // Business Name
  designation?: string;
  phone: string;
  whatsapp?: string;
  email: string;
  alternatePhone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  location?: string;
  source?: LeadSource;
  leadSource?: LeadSource;
  interestedProducts?: string[];
  interestedProductOrService: string;
  assignedStaffId: string;
  assignedStaffName: string;
  status: LeadStatus;
  priority?: 'High' | 'Medium' | 'Low';
  interest?: 'High' | 'Medium' | 'Low';
  tags?: string[];
  requirements?: string;
  expectedBudget?: number | string;
  expectedOnboardingDate?: string;
  isContacted?: boolean;
  contactDate?: string;
  contactMethod?: 'Call' | 'WhatsApp' | 'Email' | 'Meeting' | 'Other';
  contactedBy?: string;
  feedback?: string;
  nextAction?: string;
  nextFollowUpDate?: string;
  notes?: string;
  createdAt?: string;
  followUps?: LeadFollowUp[];
  followUpHistory?: LeadFollowUp[];
}

export interface ClientProductLink {
  productId: string;
  productName: string;
  planName: string;
  amount: number;
  since?: string;
  status: 'Active' | 'Paused' | 'Expired';
}

export interface MarketingClientDetails {
  planId?: string;
  planName: string;
  monthlyFee: number;
  onboardingStatus?: 'Pending' | 'In Progress' | 'Completed';
  brandAssets?: {
    logoUrl?: string;
    photos?: string[];
    videos?: string[];
    brandGuidelines?: string;
  };
  socialHandles?: {
    instagram?: string;
    facebook?: string;
    linkedin?: string;
    youtube?: string;
    tiktok?: string;
    website?: string;
  };
  requirements?: string;
  targetAudience?: string;
  competitorUrls?: string[];
  startDate?: string;
}

export interface Customer {
  id: string;
  clientId?: string;
  clientName?: string;
  businessName?: string;
  contactPerson?: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  whatsapp?: string;
  alternatePhone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  location?: string;
  industry?: string;
  gstin?: string;
  taxId?: string;
  pan?: string;
  status: 'Active' | 'Inactive' | 'Onboarding' | string;
  linkedProducts: ClientProductLink[];
  usesDigitalMarketing?: boolean;
  hasDigitalMarketing?: boolean;
  marketingDetails?: MarketingClientDetails;
  documents?: DocumentItem[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  avatar?: string;
  activityHistory?: Array<{ id: string; action: string; details: string; date: string }>;
}

export type ContentType = 'Post' | 'Reel' | 'Video' | 'Story' | 'Carousel';

export type ContentStatus =
  | 'Idea'
  | 'Designing'
  | 'Editing'
  | 'Review'
  | 'Client Approval'
  | 'Scheduled'
  | 'Published';

export type PlatformType =
  | 'Instagram'
  | 'LinkedIn'
  | 'Facebook'
  | 'YouTube'
  | 'Twitter/X'
  | 'TikTok'
  | 'Website'
  | 'Multi-Platform';

export type ApprovalStatus = 'Pending Upload' | 'Pending Review' | 'Admin Approved' | 'Revision Requested';

export interface ContentItem {
  id: string;
  clientId?: string;
  clientName?: string;
  clientOrProduct?: string;
  contentType: ContentType;
  title: string;
  caption?: string;
  hashtags?: string[];
  assignedStaffId: string;
  assignedStaffName: string;
  dueDate?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  status: ContentStatus;
  approvalStatus?: ApprovalStatus;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  mediaThumbnail?: string;
  uploadedFileUrl?: string;
  uploadedAt?: string;
  uploadedBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  revisionNotes?: string;
  deliverableNumber?: number;
  totalDeliverables?: number;
  month?: string;
  notes?: string;
  platform: PlatformType;
  createdAt?: string;
}

export type TaskPriority = 'Urgent' | 'High' | 'Medium' | 'Low';
export type TaskStatus = 'Pending' | 'In Progress' | 'Completed';

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  targetType: 'Product' | 'Digital Marketing' | 'Marketing Client' | 'General';
  targetId?: string;
  targetName: string;
  clientId?: string;
  clientName?: string;
  assignedStaffId: string;
  assignedStaffName: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  notes?: string;
  createdAt?: string;
  completedAt?: string;
}

export type PaymentStatus = 'Pending' | 'Paid' | 'Partially Paid' | 'Overdue';
export type PaymentMethod = 'Bank Transfer' | 'Credit Card' | 'Stripe' | 'UPI' | 'PayPal' | 'Cash' | 'Other';

export interface PaymentItem {
  id: string;
  invoiceNumber: string;
  customerId?: string;
  customerName: string;
  productOrService?: string;
  productName?: string;
  plan?: string;
  amount: number;
  dueDate: string;
  paymentDate?: string;
  paymentMethod?: PaymentMethod;
  transactionId?: string;
  status: PaymentStatus;
  notes?: string;
  createdAt?: string;
}

export type SubscriptionStatus = 'Active' | 'Expiring Soon' | 'Expired' | 'Cancelled';

export interface SubscriptionItem {
  id: string;
  customerId?: string;
  customerName: string;
  productOrService?: string;
  productName?: string;
  plan: string;
  startDate: string;
  endDate: string;
  amount: number;
  billingCycle: BillingCycle;
  status: SubscriptionStatus;
  autoRenew: boolean;
  notes?: string;
}

export type ReminderType =
  | 'Lead Follow-up'
  | 'Overdue Follow-up'
  | 'Task Deadline'
  | 'Payment Due'
  | 'Payment Overdue'
  | 'Subscription Expiry';

export interface ReminderItem {
  id: string;
  type: ReminderType;
  title: string;
  description: string;
  relatedId?: string;
  relatedType?: string;
  dueDate: string;
  isRead: boolean;
  isCompleted: boolean;
  priority: TaskPriority;
  assignedStaffId?: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userRole: Role;
  action: string;
  entityType: 'Lead' | 'Client' | 'Payment' | 'Content' | 'Task' | 'Subscription' | 'Employee' | 'Product' | 'Marketing' | 'System';
  entityId: string;
  entityName: string;
  details: string;
  timestamp: string;
}

export interface CompanySettings {
  companyName: string;
  tagline: string;
  email: string;
  phone: string;
  address: string;
  currency: string;
  currencySymbol: string;
  timezone: string;
  primaryColor: string;
  accentColor: string;
  autoExpiryReminderDays: number;
  paymentGracePeriodDays: number;
}
