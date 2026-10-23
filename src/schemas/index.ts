import { z } from 'zod';
import { isValidIndianPhone, INDIAN_PHONE_ERROR_MESSAGE } from '../utils/validation';

export const LoginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().optional(),
});

export type LoginFormData = z.infer<typeof LoginSchema>;

export const LeadSchema = z.object({
  leadId: z.string().trim().min(1, 'Lead ID is required'),
  leadDate: z.string().trim().min(1, 'Date is required'),
  name: z.string().trim().min(1, 'Contact Person Name is required'),
  company: z.string().trim().min(1, 'Lead Name is required'),
  designation: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z
    .string()
    .trim()
    .min(1, 'WhatsApp number is required')
    .refine(
      (val) => {
        const clean = val.replace(/\D/g, '');
        return clean.length === 10;
      },
      'WhatsApp number must be exactly 10 digits'
    ),
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  alternatePhone: z
    .string()
    .optional()
    .refine(
      (val) => !val || !val.trim() || isValidIndianPhone(val),
      'Enter a valid 10-digit Indian alternate phone number'
    ),
  address: z.string().trim().min(1, 'Address is required'),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  location: z.string().optional(),
  leadSource: z.string().optional(),
  interestedProducts: z.array(z.string()).optional(),
  interestedProductOrService: z.string().trim().min(1, 'Product Interest is required'),
  assignedStaffId: z.string().optional(),
  status: z.enum(['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost', 'Follow-up', 'Interested', 'Onboarding', 'Converted', 'Not Interested', 'All']).optional(),
  priority: z.enum(['High', 'Medium', 'Low']).optional(),
  interest: z.enum(['High', 'Medium', 'Low']),
  tags: z.string().optional(),
  requirements: z.string().optional(),
  expectedBudget: z.union([z.number(), z.string()]).optional(),
  expectedOnboardingDate: z.string().optional(),
  isContacted: z.boolean(),
  contactDate: z.string().optional(),
  contactMethod: z.enum(['Call', 'WhatsApp', 'Email', 'Meeting', 'Other']),
  contactedBy: z.string().optional(),
  feedback: z.string().optional(),
  nextAction: z.string().optional(),
  nextFollowUpDate: z.string().optional(),
  notes: z.string().optional(),
});

export type LeadFormData = z.infer<typeof LeadSchema>;

export const TaskSchema = z.object({
  title: z.string().min(3, 'Task title is required'),
  description: z.string().optional(),
  targetType: z.enum(['Product', 'Digital Marketing', 'Marketing Client', 'General']),
  targetId: z.string().optional(),
  targetName: z.string().min(1, 'Target Name is required'),
  clientId: z.string().optional(),
  clientName: z.string().optional(),
  assignedStaffId: z.string().min(1, 'Please assign a staff member'),
  dueDate: z.string().min(1, 'Due date is required'),
  priority: z.enum(['Urgent', 'High', 'Medium', 'Low']),
  status: z.enum(['Pending', 'In Progress', 'Completed']),
  notes: z.string().optional(),
});

export type TaskFormData = z.infer<typeof TaskSchema>;

export const ContentSchema = z.object({
  title: z.string().min(3, 'Content title is required'),
  clientId: z.string().optional(),
  clientName: z.string().min(1, 'Client/Brand name is required'),
  contentType: z.enum(['Post', 'Reel', 'Video', 'Story', 'Carousel']),
  platform: z.enum(['Instagram', 'LinkedIn', 'Facebook', 'YouTube', 'Twitter/X', 'TikTok', 'Website']),
  caption: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
  assignedStaffId: z.string().min(1, 'Assignee is required'),
  dueDate: z.string().optional(),
  scheduledDate: z.string().optional(),
  status: z.enum(['Idea', 'Designing', 'Editing', 'Review', 'Client Approval', 'Scheduled', 'Published']),
  mediaUrl: z.string().optional(),
  mediaType: z.enum(['image', 'video']).optional(),
  notes: z.string().optional(),
});

export type ContentFormData = z.infer<typeof ContentSchema>;

export const PaymentSchema = z.object({
  customerId: z.string().min(1, 'Client is required'),
  customerName: z.string().min(1, 'Client name is required'),
  productOrService: z.string().min(1, 'Product or Service is required'),
  plan: z.string().min(1, 'Plan tier is required'),
  amount: z.number().positive('Amount must be greater than 0'),
  dueDate: z.string().min(1, 'Due date is required'),
  paymentDate: z.string().optional(),
  paymentMethod: z.enum(['Bank Transfer', 'Credit Card', 'Stripe', 'UPI', 'PayPal', 'Cash', 'Other']).optional(),
  transactionId: z.string().optional(),
  status: z.enum(['Pending', 'Paid', 'Partially Paid', 'Overdue']),
  notes: z.string().optional(),
});

export type PaymentFormData = z.infer<typeof PaymentSchema>;

export const CustomerSchema = z.object({
  clientId: z.string().trim().min(1, 'Client ID is required'),
  clientName: z.string().trim().min(1, 'Client Name is required'),
  businessName: z.string().trim().min(1, 'Client Business is required'),
  contactPerson: z.string().trim().min(1, 'Contact Person is required'),
  phone: z
    .string()
    .trim()
    .min(1, 'Phone Number is required')
    .refine(
      (val) => {
        const clean = val.replace(/\D/g, '');
        return clean.length === 10;
      },
      'Phone Number must be exactly 10 digits'
    ),
  whatsapp: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || !val.trim()) return true;
        const clean = val.replace(/\D/g, '');
        return clean.length === 10;
      },
      'WhatsApp Number must be exactly 10 digits'
    ),
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  gstNumber: z
    .string()
    .trim()
    .min(1, 'GST Number is required')
    .refine(
      (val) => {
        const clean = val.replace(/[^a-zA-Z0-9]/g, '');
        return clean.length === 15;
      },
      'GST Number must be exactly 15 alphanumeric characters'
    ),
  panNumber: z
    .string()
    .trim()
    .min(1, 'PAN Number is required')
    .refine(
      (val) => {
        const clean = val.replace(/[^a-zA-Z0-9]/g, '');
        return clean.length === 10;
      },
      'PAN Number must be exactly 10 alphanumeric characters'
    ),
  address: z.string().trim().min(1, 'Address is required'),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  alternatePhone: z
    .string()
    .optional()
    .refine(
      (val) => !val || !val.trim() || isValidIndianPhone(val),
      'Enter a valid 10-digit Indian alternate phone number'
    ),
});

export type CustomerFormData = z.infer<typeof CustomerSchema>;

export const EmployeeSchema = z.object({
  name: z.string().min(2, 'Full name is required'),
  email: z.string().email('Valid email is required'),
  role: z.enum(['ADMIN', 'STAFF', 'Admin', 'Staff']),
  title: z.string().min(2, 'Job title is required'),
  department: z.string().optional(),
  phone: z.string().optional(),
  status: z.enum(['Active', 'Inactive']).optional(),
});

export type EmployeeFormData = z.infer<typeof EmployeeSchema>;

export const SalesRepresentativeSchema = z.object({
  name: z.string().min(2, 'Full name must be at least 2 characters'),
  mobile: z
    .string()
    .min(1, 'Mobile number is required')
    .refine(
      (val) => {
        if (!val) return false;
        const clean = val.replace(/\D/g, '');
        return /^[6-9]\d{9}$/.test(clean);
      },
      'Mobile number must be a valid 10-digit number starting with 6, 7, 8, or 9'
    ),
  email: z
    .string()
    .min(1, 'Email address is required')
    .email('Enter a valid email address'),
  designation: z.string().optional(),
  status: z.enum(['Active', 'Inactive']),
});

export type SalesRepFormData = z.infer<typeof SalesRepresentativeSchema>;
