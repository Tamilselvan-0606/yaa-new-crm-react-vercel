import { z } from 'zod';
import { isValidIndianPhone, INDIAN_PHONE_ERROR_MESSAGE } from '../utils/validation';

// ==========================================
// 1. AUTHENTICATION SCHEMAS
// ==========================================
export const LoginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email address is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(4, 'Password must be at least 4 characters'),
  rememberMe: z.boolean().optional(),
});
export type LoginFormData = z.infer<typeof LoginSchema>;

export const ForgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email address is required')
    .email('Please enter a valid email address'),
});
export type ForgotPasswordFormData = z.infer<typeof ForgotPasswordSchema>;

export const ResetPasswordSchema = z.object({
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters'),
  confirmPassword: z
    .string()
    .min(6, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});
export type ResetPasswordFormData = z.infer<typeof ResetPasswordSchema>;

// ==========================================
// 2. ORGANIZATION & BRANCH SCHEMAS
// ==========================================
export const OrganizationSchema = z.object({
  name: z.string().trim().min(2, 'Organization name is required'),
  code: z.string().trim().optional(),
  legalName: z.string().trim().optional(),
  organizationType: z.string().optional(),
  industry: z.string().trim().optional(),
  location: z.string().trim().optional(),
  subscriptionPlan: z.string().trim().optional(),
  contactPerson: z.string().trim().optional(),
  email: z.string().trim().email('Invalid email address').or(z.literal('')).optional(),
  phone: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || isValidIndianPhone(val), INDIAN_PHONE_ERROR_MESSAGE),
  whatsapp: z.string().trim().optional(),
  logo: z.string().optional(),
  gstNumber: z.string().trim().optional(),
  panNumber: z.string().trim().optional(),
  registrationType: z.string().optional(),
  status: z.enum(['Active', 'Inactive', 'Suspend', 'Pending']).optional(),
  address: z.string().trim().optional(),
  password: z.string().optional(),
  subOrganizationSupport: z.boolean().optional(),
});
export type OrganizationFormData = z.infer<typeof OrganizationSchema>;

export const BranchSchema = z.object({
  productId: z.string().optional(),
  name: z.string().trim().min(2, 'Branch name is required'),
  code: z.string().trim().optional(),
  contactPerson: z.string().trim().optional(),
  mobileNumber: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || isValidIndianPhone(val), INDIAN_PHONE_ERROR_MESSAGE),
  whatsapp: z.string().trim().optional(),
  email: z.string().trim().email('Invalid email format').or(z.literal('')).optional(),
  location: z.string().trim().optional(),
  status: z.enum(['Active', 'Inactive', 'Suspended']).optional(),
});
export type BranchFormData = z.infer<typeof BranchSchema>;

// ==========================================
// 3. EMPLOYEE & USER SCHEMAS
// ==========================================
export const EmployeeSchema = z.object({
  name: z.string().trim().min(2, 'Full name is required'),
  email: z.string().trim().min(1, 'Email address is required').email('Valid email is required'),
  role: z.string().min(1, 'Role is required'),
  title: z.string().trim().min(1, 'Job title is required'),
  department: z.string().trim().optional(),
  phone: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || isValidIndianPhone(val), INDIAN_PHONE_ERROR_MESSAGE),
  status: z.enum(['Active', 'Inactive']).optional(),
  avatar: z.string().optional(),
});
export type EmployeeFormData = z.infer<typeof EmployeeSchema>;

// ==========================================
// 4. CRM LEADS & WORK MANAGEMENT SCHEMAS
// ==========================================
export const LeadSchema = z.object({
  leadId: z.string().optional(),
  leadDate: z.string().optional(),
  name: z.string().trim().min(2, 'Contact Person Name is required'),
  company: z.string().trim().min(2, 'Lead / Business Name is required'),
  designation: z.string().trim().optional(),
  phone: z
    .string()
    .trim()
    .min(1, 'Phone number is required')
    .refine((val) => isValidIndianPhone(val), INDIAN_PHONE_ERROR_MESSAGE),
  whatsapp: z
    .string()
    .trim()
    .optional()
    .refine(
      (val) => !val || isValidIndianPhone(val),
      'Enter a valid 10-digit Indian WhatsApp number'
    ),
  email: z.string().trim().email('Invalid email format').or(z.literal('')).optional(),
  alternatePhone: z
    .string()
    .trim()
    .optional()
    .refine(
      (val) => !val || isValidIndianPhone(val),
      'Enter a valid 10-digit Indian alternate phone number'
    ),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  pincode: z.string().trim().optional(),
  location: z.string().trim().optional(),
  leadSource: z.string().trim().optional(),
  interestedProducts: z.array(z.string()).optional(),
  interestedProductOrService: z.string().trim().optional(),
  assignedStaffId: z.string().optional(),
  status: z.enum(['New', 'Contacted', 'Follow-up', 'Interested', 'Onboarding', 'Converted', 'Not Interested', 'Lost']),
  priority: z.enum(['High', 'Medium', 'Low']),
  interest: z.enum(['High', 'Medium', 'Low']),
  tags: z.string().trim().optional(),
  requirements: z.string().trim().optional(),
  expectedBudget: z.union([z.number(), z.string()]).optional(),
  expectedOnboardingDate: z.string().optional(),
  isContacted: z.boolean().optional(),
  contactDate: z.string().optional(),
  contactMethod: z.enum(['Call', 'WhatsApp', 'Email', 'Meeting', 'Other']).optional(),
  contactedBy: z.string().trim().optional(),
  feedback: z.string().trim().optional(),
  nextAction: z.string().trim().optional(),
  nextFollowUpDate: z.string().optional(),
  notes: z.string().trim().optional(),
});
export type LeadFormData = z.infer<typeof LeadSchema>;

export const LeadFeedbackSchema = z.object({
  leadFeedback: z.string().trim().min(1, 'Conversation feedback is required'),
  newStatus: z.string().optional(),
  nextDate: z.string().optional(),
  nextAction: z.string().trim().optional(),
  callNotes: z.string().trim().optional(),
});
export type LeadFeedbackFormData = z.infer<typeof LeadFeedbackSchema>;

export const TaskSchema = z.object({
  title: z.string().trim().min(3, 'Task title must be at least 3 characters'),
  description: z.string().trim().optional(),
  targetType: z.enum(['Product', 'Digital Marketing', 'Marketing Client', 'General']),
  targetId: z.string().optional(),
  targetName: z.string().trim().min(1, 'Target Name is required'),
  clientId: z.string().optional(),
  clientName: z.string().trim().optional(),
  assignedStaffId: z.string().min(1, 'Please assign a staff member'),
  dueDate: z.string().min(1, 'Due date is required'),
  priority: z.enum(['Urgent', 'High', 'Medium', 'Low']),
  status: z.enum(['Pending', 'In Progress', 'Completed']),
  notes: z.string().trim().optional(),
});
export type TaskFormData = z.infer<typeof TaskSchema>;

export const ContentSchema = z.object({
  title: z.string().trim().min(3, 'Content title is required'),
  clientId: z.string().optional(),
  clientName: z.string().trim().min(1, 'Client / Brand name is required'),
  contentType: z.enum(['Post', 'Reel', 'Video', 'Story', 'Carousel']),
  platform: z.enum(['Instagram', 'LinkedIn', 'Facebook', 'YouTube', 'Twitter/X', 'TikTok', 'Website']),
  caption: z.string().trim().optional(),
  hashtags: z.array(z.string()).optional(),
  assignedStaffId: z.string().min(1, 'Assignee is required'),
  dueDate: z.string().optional(),
  scheduledDate: z.string().optional(),
  status: z.enum(['Idea', 'Designing', 'Editing', 'Review', 'Client Approval', 'Scheduled', 'Published']),
  mediaUrl: z.string().optional(),
  mediaType: z.enum(['image', 'video']).optional(),
  notes: z.string().trim().optional(),
});
export type ContentFormData = z.infer<typeof ContentSchema>;

// ==========================================
// 5. CUSTOMER & PARTY SCHEMAS
// ==========================================
export const CustomerSchema = z.object({
  clientId: z.string().trim().optional(),
  clientName: z.string().trim().min(2, 'Client / Party Name is required'),
  businessName: z.string().trim().min(2, 'Business / Company Name is required'),
  contactPerson: z.string().trim().min(2, 'Contact Person Name is required'),
  phone: z
    .string()
    .trim()
    .min(1, 'Phone number is required')
    .refine((val) => isValidIndianPhone(val), INDIAN_PHONE_ERROR_MESSAGE),
  whatsapp: z
    .string()
    .trim()
    .optional()
    .refine(
      (val) => !val || isValidIndianPhone(val),
      'Enter a valid 10-digit Indian WhatsApp number'
    ),
  email: z.string().trim().email('Invalid email address').or(z.literal('')).optional(),
  alternatePhone: z
    .string()
    .trim()
    .optional()
    .refine(
      (val) => !val || isValidIndianPhone(val),
      'Enter a valid 10-digit Indian alternate phone number'
    ),
  address: z.string().trim().min(2, 'Address is required'),
  city: z.string().trim().min(2, 'City is required'),
  state: z.string().trim().min(2, 'State is required'),
  pincode: z.string().trim().min(3, 'Pincode is required'),
  customerType: z.enum(['Retail', 'Wholesale', 'Corporate', 'Business', 'Individual']).optional(),
  creditLimit: z.number().nonnegative().optional(),
  openingBalance: z.number().optional(),
  paymentTerms: z.string().optional(),
  gstin: z.string().trim().optional(),
  salesRepresentativeId: z.string().optional(),
});
export type CustomerFormData = z.infer<typeof CustomerSchema>;

export const QuickCustomerSchema = z.object({
  name: z.string().trim().min(2, 'Customer / Party name is required'),
  phone: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || isValidIndianPhone(val), INDIAN_PHONE_ERROR_MESSAGE),
  company: z.string().trim().optional(),
  email: z.string().trim().email('Invalid email address').or(z.literal('')).optional(),
});
export type QuickCustomerFormData = z.infer<typeof QuickCustomerSchema>;

// ==========================================
// 6. PRODUCT & INVENTORY SCHEMAS
// ==========================================
export const CategorySchema = z.object({
  name: z.string().trim().min(2, 'Category name is required'),
  description: z.string().trim().optional(),
  code: z.string().trim().optional(),
});
export type CategoryFormData = z.infer<typeof CategorySchema>;

export const SubcategorySchema = z.object({
  name: z.string().trim().min(2, 'Subcategory name is required'),
  categoryId: z.string().min(1, 'Parent category is required'),
  description: z.string().trim().optional(),
});
export type SubcategoryFormData = z.infer<typeof SubcategorySchema>;

export const ProductSchema = z.object({
  name: z.string().trim().min(2, 'Product name is required'),
  sku: z.string().trim().min(1, 'SKU / Item code is required'),
  category: z.string().trim().min(1, 'Category is required'),
  subcategory: z.string().trim().optional(),
  unit: z.string().trim().optional(),
  purchasePrice: z.number().nonnegative('Purchase price must be positive'),
  salesPrice: z.number().nonnegative('Sales price must be positive'),
  mrp: z.number().nonnegative().optional(),
  taxPercent: z.number().min(0).max(100).optional(),
  hsnCode: z.string().trim().optional(),
  minStockLevel: z.number().nonnegative().optional(),
  openingStock: z.number().nonnegative().optional(),
  description: z.string().trim().optional(),
});
export type ProductFormData = z.infer<typeof ProductSchema>;

export const PlatformProductSchema = z.object({
  name: z.string().trim().min(2, 'Product name is required'),
  code: z.string().trim().optional(),
  contactPerson: z.string().trim().optional(),
  mobileNumber: z.string().trim().optional(),
  supportWhatsapp: z.string().trim().optional(),
  supportEmail: z.string().trim().email('Invalid email address').or(z.literal('')).optional(),
  gstNumber: z.string().trim().optional(),
  panNumber: z.string().trim().optional(),
  hqCity: z.string().trim().optional(),
  address: z.string().trim().optional(),
  status: z.enum(['Active', 'Inactive', 'Suspended']).optional(),
  tagline: z.string().optional(),
  description: z.string().optional(),
  websiteUrl: z.string().optional(),
  applicationUrl: z.string().optional(),
  supportPhone: z.string().optional(),
  badge: z.string().optional(),
  color: z.string().optional(),
});
export type PlatformProductFormData = z.infer<typeof PlatformProductSchema>;

export const StockAdjustSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  adjustmentType: z.enum(['Add', 'Reduce', 'Set']),
  quantity: z.number().positive('Quantity must be greater than 0'),
  reason: z.string().trim().min(2, 'Reason for adjustment is required'),
  notes: z.string().trim().optional(),
});
export type StockAdjustFormData = z.infer<typeof StockAdjustSchema>;

// ==========================================
// 7. SUPPLIER & PURCHASE SCHEMAS
// ==========================================
export const SupplierSchema = z.object({
  supplierCode: z.string().optional(),
  name: z.string().trim().min(2, 'Supplier / Company name is required'),
  contactPerson: z.string().trim().optional(),
  phone: z
    .string()
    .trim()
    .min(1, 'Phone number is required')
    .refine((val) => isValidIndianPhone(val), INDIAN_PHONE_ERROR_MESSAGE),
  email: z.string().trim().email('Invalid email address').or(z.literal('')).optional(),
  address: z.string().trim().min(1, 'Address is required'),
  city: z.string().trim().min(1, 'City is required'),
  state: z.string().trim().min(1, 'State is required'),
  country: z.string().trim().optional(),
  pincode: z.string().trim().min(1, 'Pincode is required'),
  gstNumber: z.string().trim().optional(),
  panNumber: z.string().trim().optional(),
  paymentTerms: z.string().trim().optional(),
  creditLimit: z.union([z.number(), z.string()]).optional(),
  bankName: z.string().trim().optional(),
  accountNumber: z.string().trim().optional(),
  ifscCode: z.string().trim().optional(),
  branchName: z.string().trim().optional(),
  status: z.enum(['Active', 'Inactive', 'Blocked']).optional(),
  notes: z.string().trim().optional(),
});
export type SupplierFormData = z.infer<typeof SupplierSchema>;

export const ExpenseSchema = z.object({
  expenseNo: z.string().optional(),
  expenseDate: z.string().min(1, 'Expense date is required'),
  category: z.string().trim().min(1, 'Expense category is required'),
  categoryId: z.string().optional(),
  supplierId: z.string().optional(),
  branchId: z.string().optional().nullable(),
  title: z.string().trim().min(2, 'Expense title/description is required'),
  payee: z.string().trim().optional(),
  amount: z.union([z.number().positive('Amount must be greater than 0'), z.string().min(1, 'Amount is required')]),
  taxPercent: z.union([z.number(), z.string()]).optional(),
  paymentMode: z.string().min(1, 'Payment mode is required'),
  referenceNo: z.string().trim().optional(),
  receiptImage: z.string().optional(),
  notes: z.string().trim().optional(),
  status: z.enum(['Paid', 'Pending', 'Approved']).optional(),
});
export type ExpenseFormData = z.infer<typeof ExpenseSchema>;

export const PaymentOutSchema = z.object({
  paymentNo: z.string().optional(),
  supplierId: z.string().min(1, 'Supplier is required'),
  amount: z.union([
    z.number().positive('Payment amount must be greater than 0'),
    z.string().min(1, 'Payment amount is required').refine((v) => Number(v) > 0, 'Payment amount must be greater than 0'),
  ]),
  paymentDate: z.string().min(1, 'Payment date is required'),
  paymentMode: z.string().min(1, 'Payment mode is required'),
  referenceNo: z.string().trim().optional(),
  receiptImage: z.string().optional(),
  notes: z.string().trim().optional(),
  purchaseId: z.string().optional(),
});
export type PaymentOutFormData = z.infer<typeof PaymentOutSchema>;

export const PurchaseRequestSchema = z.object({
  requestNo: z.string().trim().min(1, 'Request number is required'),
  requestedBy: z.string().trim().min(2, 'Requester name is required'),
  department: z.string().min(1, 'Department is required'),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']),
  supplierId: z.string().trim().optional(),
  supplierName: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});
export type PurchaseRequestFormData = z.infer<typeof PurchaseRequestSchema>;

export const PurchaseReturnSchema = z.object({
  purchaseId: z.string().optional(),
  purchaseNo: z.string().trim().optional(),
  supplierId: z.string().trim().optional(),
  supplierName: z.string().trim().optional(),
  returnDate: z.string().min(1, 'Return date is required'),
  refundStatus: z.string().optional(),
  returnStatus: z.string().optional(),
  reason: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});
export type PurchaseReturnFormData = z.infer<typeof PurchaseReturnSchema>;

// ==========================================
// 8. PAYMENT & VOUCHER SCHEMAS
// ==========================================
export const PaymentSchema = z.object({
  customerId: z.string().min(1, 'Client is required'),
  customerName: z.string().trim().min(1, 'Client name is required'),
  productOrService: z.string().trim().min(1, 'Product or Service is required'),
  plan: z.string().trim().min(1, 'Plan tier is required'),
  amount: z.number().positive('Amount must be greater than 0'),
  dueDate: z.string().min(1, 'Due date is required'),
  paymentDate: z.string().optional(),
  paymentMethod: z.string().optional(),
  transactionId: z.string().trim().optional(),
  status: z.enum(['Pending', 'Paid', 'Partially Paid', 'Overdue']).optional(),
  notes: z.string().trim().optional(),
});
export type PaymentFormData = z.infer<typeof PaymentSchema>;

export const PaymentInSchema = z.object({
  customerId: z.string().optional(),
  partyName: z.string().trim().min(2, 'Party / Customer name is required'),
  customerPhone: z.string().trim().optional(),
  customerCompany: z.string().trim().optional(),
  receiptNo: z.string().trim().min(1, 'Receipt number is required'),
  date: z.string().min(1, 'Payment date is required'),
  paymentType: z.string().min(1, 'Payment mode is required'),
  receivedAmount: z.number().positive('Received amount must be greater than 0'),
  referenceNo: z.string().trim().optional(),
  description: z.string().trim().optional(),
  invoiceId: z.string().optional(),
  invoiceNo: z.string().optional(),
  status: z.string().optional(),
});
export type PaymentInFormData = z.infer<typeof PaymentInSchema>;

export const RecordPaymentSchema = z.object({
  amountPaid: z.number().positive('Payment amount must be greater than 0'),
  paymentDate: z.string().min(1, 'Payment date is required'),
  paymentMode: z.string().min(1, 'Payment mode is required'),
  taxDeductedType: z.enum(['none', 'gst', 'income_tax', 'both']).optional(),
  gstTdsPercentage: z.union([z.number(), z.string()]).optional(),
  incomeTaxTdsPercentage: z.union([z.number(), z.string()]).optional(),
  bankDeductions: z.number().min(0).optional(),
  referenceId: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});
export type RecordPaymentFormData = z.infer<typeof RecordPaymentSchema>;

// ==========================================
// 9. SALES REPRESENTATIVE & COLLECTIONS
// ==========================================
export const SalesRepresentativeSchema = z.object({
  name: z.string().trim().min(2, 'Sales Representative Name is required'),
  mobile: z.string().trim().min(10, 'Mobile number must contain at least 10 digits'),
  email: z.string().trim().email('Valid email is required').or(z.literal('')).optional(),
  designation: z.string().trim().optional(),
  status: z.enum(['Active', 'Inactive']).optional(),
});
export type SalesRepresentativeFormData = z.infer<typeof SalesRepresentativeSchema>;

export const CollectionFollowUpSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  invoiceId: z.string().optional(),
  contactMethod: z.enum(['Phone', 'WhatsApp', 'Email', 'Visit', 'Other']),
  followUpDate: z.string().min(1, 'Follow-up date is required'),
  outcome: z.string().min(1, 'Outcome is required'),
  notes: z.string().trim().optional(),
  promisedAmount: z.number().nonnegative().optional(),
  promiseDate: z.string().optional(),
  nextFollowUpDate: z.string().optional(),
});
export type CollectionFollowUpFormData = z.infer<typeof CollectionFollowUpSchema>;

// ==========================================
// 10. SUBSCRIPTION & PLAN SCHEMAS
// ==========================================
export const PlanSchema = z.object({
  name: z.string().trim().min(1, 'Plan Name is required'),
  price: z.number({ message: 'Price is required' }).positive('Price must be greater than 0'),
  gstRate: z
    .union([z.number(), z.string()])
    .refine((val) => val !== '' && val !== undefined && val !== null, {
      message: 'GST Rate is required',
    }),
  currency: z.string().optional(),
  billingCycle: z
    .string()
    .trim()
    .min(1, 'Billing Cycle is required')
    .refine((val) => ['Monthly', 'Quarterly', 'Annually', 'One-Time', 'Custom'].includes(val), {
      message: 'Billing Cycle is required',
    }),
  planType: z
    .string()
    .trim()
    .min(1, 'Plan Type is required')
    .refine((val) => ['Fixed', 'Per-User', 'Usage-Based', 'Custom Quote', 'Tiered'].includes(val), {
      message: 'Plan Type is required',
    }),
  status: z
    .string()
    .trim()
    .min(1, 'Status is required')
    .refine((val) => ['Active', 'Inactive'].includes(val), {
      message: 'Status is required',
    }),
  maxBranchLimit: z.union([z.number(), z.string()]).optional(),
  description: z.string().trim().optional(),
  isPopular: z.boolean().optional(),
  features: z.array(z.string()).optional(),
});
export type PlanFormData = z.infer<typeof PlanSchema>;

// ==========================================
// 11. RE-EXPORTS FOR BACKWARD COMPATIBILITY
// ==========================================
export * from '../schemas/index';
