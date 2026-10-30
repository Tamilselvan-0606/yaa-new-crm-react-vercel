import {
  User,
  Product,
  DigitalMarketingPlan,
  Lead,
  Customer,
  ContentItem,
  TaskItem,
  PaymentItem,
  SubscriptionItem,
  ReminderItem,
  ActivityLog,
  CompanySettings,
  Branch,
} from '../types';

export const INITIAL_USERS: User[] = [];

export const INITIAL_PRODUCTS: Product[] = [];

export const INITIAL_MARKETING_PLANS: DigitalMarketingPlan[] = [];

export const INITIAL_LEADS: Lead[] = [];

export const INITIAL_CUSTOMERS: Customer[] = [];

export const INITIAL_CONTENT: ContentItem[] = [];

export const INITIAL_TASKS: TaskItem[] = [];

export const INITIAL_PAYMENTS: PaymentItem[] = [];

export const INITIAL_SUBSCRIPTIONS: SubscriptionItem[] = [];

export const INITIAL_REMINDERS: ReminderItem[] = [];

export const INITIAL_ACTIVITIES: ActivityLog[] = [];

export const INITIAL_SETTINGS: CompanySettings = {
  companyName: 'Yaa Creations',
  tagline: 'Multi-Product Enterprise Ecosystem & Digital Marketing Solutions',
  email: 'operations@yaacreations.com',
  phone: '+91 98765 43210',
  address: 'Plot No. 42, Image Gardens Rd, VIP Hills, Silicon Valley, Madhapur, Hyderabad, Telangana 500081',
  currency: 'INR',
  currencySymbol: '₹',
  timezone: 'Asia/Kolkata',
  primaryColor: '#33077C',
  accentColor: '#4309A2',
  autoExpiryReminderDays: 7,
  paymentGracePeriodDays: 5,
};

export const DEFAULT_CLIENT_BRANCHES: Branch[] = [];

export const DEFAULT_SALE_BRANCHES: Branch[] = [];

export const INITIAL_BRANCHES: Branch[] = [];
