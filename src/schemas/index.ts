import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().optional(),
});

export type LoginFormData = z.infer<typeof LoginSchema>;

export const LeadSchema = z.object({
  leadId: z.string().optional(),
  leadDate: z.string().optional(),
  name: z.string().min(2, 'Contact Person Name is required'),
  company: z.string().min(2, 'Lead / Business Name is required'),
  designation: z.string().optional(),
  phone: z.string().min(5, 'Phone number is required'),
  whatsapp: z.string().optional(),
  email: z.string().email('Invalid email format').or(z.literal('')),
  alternatePhone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  location: z.string().optional(),
  leadSource: z.string().optional(),
  interestedProducts: z.array(z.string()).optional(),
  interestedProductOrService: z.string().optional(),
  assignedStaffId: z.string().optional(),
  status: z.enum(['New', 'Contacted', 'Follow-up', 'Interested', 'Onboarding', 'Converted', 'Not Interested', 'Lost']),
  priority: z.enum(['High', 'Medium', 'Low']),
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
  clientId: z.string().min(1, 'Client ID is required'),
  clientName: z.string().min(2, 'Client Name is required'),
  businessName: z.string().min(2, 'Client Business Name is required'),
  contactPerson: z.string().min(2, 'Contact Person Name is required'),
  phone: z.string().min(5, 'Phone Number is required'),
  whatsapp: z.string().optional(),
  email: z.string().email('Invalid email address'),
  alternatePhone: z.string().optional(),
  address: z.string().min(2, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  pincode: z.string().min(3, 'Pincode is required'),
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
