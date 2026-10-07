import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import jwt from 'jsonwebtoken';
import {
  INITIAL_USERS,
  INITIAL_PRODUCTS,
  INITIAL_MARKETING_PLANS,
  INITIAL_LEADS,
  INITIAL_CUSTOMERS,
  INITIAL_CONTENT,
  INITIAL_TASKS,
  INITIAL_PAYMENTS,
  INITIAL_SUBSCRIPTIONS,
  INITIAL_REMINDERS,
  INITIAL_ACTIVITIES,
  INITIAL_SETTINGS,
  INITIAL_BRANCHES,
} from './src/data/initialData';
import {
  User,
  Role,
  Product,
  Branch,
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
} from './src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-Memory Database Store initialized from seed
interface AppStore {
  currentUser: User;
  users: User[];
  products: Product[];
  marketingPlans: DigitalMarketingPlan[];
  leads: Lead[];
  customers: Customer[];
  content: ContentItem[];
  tasks: TaskItem[];
  payments: PaymentItem[];
  subscriptions: SubscriptionItem[];
  reminders: ReminderItem[];
  activities: ActivityLog[];
  settings: CompanySettings;
  branches: Branch[];
}

const db: AppStore = {
  currentUser: INITIAL_USERS[0], // Default logged-in as Admin
  users: [...INITIAL_USERS],
  products: JSON.parse(JSON.stringify(INITIAL_PRODUCTS)),
  marketingPlans: JSON.parse(JSON.stringify(INITIAL_MARKETING_PLANS)),
  leads: JSON.parse(JSON.stringify(INITIAL_LEADS)),
  customers: JSON.parse(JSON.stringify(INITIAL_CUSTOMERS)),
  content: JSON.parse(JSON.stringify(INITIAL_CONTENT)),
  tasks: JSON.parse(JSON.stringify(INITIAL_TASKS)),
  payments: JSON.parse(JSON.stringify(INITIAL_PAYMENTS)),
  subscriptions: JSON.parse(JSON.stringify(INITIAL_SUBSCRIPTIONS)),
  reminders: JSON.parse(JSON.stringify(INITIAL_REMINDERS)),
  activities: JSON.parse(JSON.stringify(INITIAL_ACTIVITIES)),
  settings: { ...INITIAL_SETTINGS },
  branches: JSON.parse(JSON.stringify(INITIAL_BRANCHES)),
};

function logActivity(
  user: User,
  action: string,
  entityType: ActivityLog['entityType'],
  entityId: string,
  entityName: string,
  details: string
) {
  const newActivity: ActivityLog = {
    id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action,
    entityType,
    entityId,
    entityName,
    details,
    timestamp: new Date().toISOString(),
  };
  db.activities.unshift(newActivity);
}

// Check reminders & subscriptions automatically
function runAutoReminders() {
  const todayStr = new Date().toISOString().split('T')[0];
  const now = new Date();

  // Check subscriptions expiring within 7 days
  db.subscriptions.forEach((sub) => {
    const end = new Date(sub.endDate);
    const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) {
      sub.status = 'Expired';
    } else if (diffDays <= 7) {
      sub.status = 'Expiring Soon';
      // ensure reminder exists
      const exists = db.reminders.some((r) => r.relatedId === sub.id && !r.isCompleted);
      if (!exists) {
        db.reminders.unshift({
          id: `rem_sub_${sub.id}`,
          type: 'Subscription Expiry',
          title: `Subscription Expiring: ${sub.customerName} (${sub.productOrService})`,
          description: `Contract ends in ${diffDays} day(s) on ${sub.endDate}. Renewal follow-up recommended.`,
          relatedId: sub.id,
          relatedType: 'Subscription',
          dueDate: sub.endDate,
          isRead: false,
          isCompleted: false,
          priority: 'High',
          createdAt: new Date().toISOString(),
        });
      }
    }
  });

  // Check overdue payments
  db.payments.forEach((pay) => {
    if (pay.status === 'Pending') {
      const due = new Date(pay.dueDate);
      if (due < now && !pay.paymentDate) {
        pay.status = 'Overdue';
        const exists = db.reminders.some((r) => r.relatedId === pay.id && !r.isCompleted);
        if (!exists) {
          db.reminders.unshift({
            id: `rem_pay_${pay.id}`,
            type: 'Payment Overdue',
            title: `Payment Overdue: ${pay.customerName} ($${pay.amount.toLocaleString()})`,
            description: `Invoice ${pay.invoiceNumber} was due on ${pay.dueDate}.`,
            relatedId: pay.id,
            relatedType: 'Payment',
            dueDate: pay.dueDate,
            isRead: false,
            isCompleted: false,
            priority: 'High',
            createdAt: new Date().toISOString(),
          });
        }
      }
    }
  });
}

const JWT_SECRET = process.env.JWT_SECRET || 'nexus-crm-jwt-secret-key-2026';

function generateToken(user: User): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function createApiApp() {
  const app = express();

  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // Middleware to attach authenticated user (supports Authorization: Bearer JWT token or X-User-Id header or session default)
  app.use((req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        if (decoded && decoded.id) {
          const found = db.users.find((u) => u.id === decoded.id);
          if (found) {
            (req as any).user = found;
            return next();
          }
        }
      } catch (err) {
        // invalid token, fallback
      }
    }

    const userIdHeader = req.headers['x-user-id'] as string;
    if (userIdHeader) {
      const found = db.users.find((u) => u.id === userIdHeader);
      if (found) {
        (req as any).user = found;
        return next();
      }
    }
    (req as any).user = db.currentUser;
    next();
  });

  // Role authorization helpers
  const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    const user: User = (req as any).user;
    if (user.role !== 'ADMIN') {
      return res.status(403).json({
        error: 'Forbidden: Admin privilege required.',
        message: 'This operation is restricted to Admin users only.',
      });
    }
    next();
  };

  // Run auto reminders check
  runAutoReminders();

  // ==========================================
  // AUTH & USER ENDPOINTS (JWT-based)
  // ==========================================
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check specific credentials required: yaaadmin@gmail.com, suborgadmin@gmail.com, superadmin@gmail.com, orgsuperadmin@gmail.com, orgadmin@gmail.com, branchadmin@gmail.com / Test@12345
    if (
      normalizedEmail === 'yaaadmin@gmail.com' ||
      normalizedEmail === 'suborgadmin@gmail.com' ||
      normalizedEmail === 'superadmin@gmail.com' ||
      normalizedEmail === 'orgsuperadmin@gmail.com' ||
      normalizedEmail === 'orgadmin@gmail.com' ||
      normalizedEmail === 'branchadmin@gmail.com'
    ) {
      if (password !== 'Test@12345') {
        return res.status(401).json({ error: 'Invalid password. Please check your credentials.' });
      }
    }

    let user = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (!user) {
      const initialMatch = INITIAL_USERS.find((u) => u.email.toLowerCase() === normalizedEmail);
      if (initialMatch) {
        db.users.push(initialMatch);
        user = initialMatch;
      }
    }
    if (!user) {
      return res.status(401).json({ error: 'User not found. Please check your email address.' });
    }

    const token = generateToken(user);
    db.currentUser = user;

    logActivity(user, 'User Logged In', 'System', user.id, user.name, `User ${user.name} authenticated via JWT login`);
    res.json({
      success: true,
      token,
      user,
    });
  });

  app.get('/api/auth/verify', (req: Request, res: Response) => {
    const user: User = (req as any).user;
    const token = generateToken(user);
    res.json({
      valid: true,
      token,
      user,
    });
  });

  app.get('/api/auth/current-user', (req: Request, res: Response) => {
    const user: User = (req as any).user;
    const token = generateToken(user);
    res.json({
      ...user,
      token,
    });
  });

  app.get('/api/auth/users', (req: Request, res: Response) => {
    res.json(db.users);
  });

  app.post('/api/auth/switch-user', (req: Request, res: Response) => {
    const { userId } = req.body;
    const user = db.users.find((u) => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    db.currentUser = user;
    const token = generateToken(user);
    logActivity(user, 'Switched Active Session', 'System', user.id, user.name, `Active session switched to ${user.name} (${user.role})`);
    res.json({ success: true, token, user });
  });

  // ==========================================
  // DASHBOARD & OVERVIEW
  // ==========================================
  app.get('/api/dashboard/stats', (req: Request, res: Response) => {
    const user: User = (req as any).user;
    const today = new Date().toISOString().split('T')[0];

    if (user.role === 'ADMIN') {
      const totalLeads = db.leads.length;
      const totalCustomers = db.customers.length;
      const digitalMarketingClients = db.customers.filter((c) => c.usesDigitalMarketing).length;
      const pendingPaymentsCount = db.payments.filter((p) => p.status === 'Pending' || p.status === 'Overdue').length;
      const pendingPaymentsAmount = db.payments
        .filter((p) => p.status === 'Pending' || p.status === 'Overdue')
        .reduce((sum, p) => sum + p.amount, 0);
      const activeSubscriptions = db.subscriptions.filter((s) => s.status === 'Active').length;
      const expiringSubscriptions = db.subscriptions.filter((s) => s.status === 'Expiring Soon').length;
      const todayFollowUps = db.leads.filter((l) => l.nextFollowUpDate && l.nextFollowUpDate.startsWith(today)).length;
      const todayTasks = db.tasks.filter((t) => t.dueDate === today && t.status !== 'Completed').length;
      const contentPending = db.content.filter((c) => c.status !== 'Published').length;

      // Product-wise customer breakdown
      const productBreakdown = db.products.map((prod) => {
        const count = db.customers.filter((c) => c.linkedProducts.some((lp) => lp.productId === prod.id)).length;
        const leadsCount = db.leads.filter((l) => l.interestedProductOrService === prod.name).length;
        const revenue = db.subscriptions
          .filter((s) => s.productOrService === prod.name && s.status === 'Active')
          .reduce((sum, s) => sum + s.amount, 0);
        return {
          productId: prod.id,
          productName: prod.name,
          color: prod.color,
          customerCount: count,
          leadsCount,
          monthlyRevenue: revenue,
        };
      });

      // Digital Marketing Revenue
      const marketingRevenue = db.subscriptions
        .filter((s) => s.productOrService === 'Digital Marketing' && s.status === 'Active')
        .reduce((sum, s) => sum + s.amount, 0);

      res.json({
        role: 'ADMIN',
        totalLeads,
        totalCustomers,
        digitalMarketingClients,
        pendingPaymentsCount,
        pendingPaymentsAmount,
        activeSubscriptions,
        expiringSubscriptions,
        todayFollowUps,
        todayTasks,
        contentPending,
        productBreakdown,
        marketingRevenue,
        recentActivities: db.activities.slice(0, 10),
      });
    } else {
      // Staff Dashboard
      const myLeads = db.leads.filter((l) => l.assignedStaffId === user.id);
      const myFollowUps = myLeads.filter((l) => l.nextFollowUpDate && l.nextFollowUpDate.startsWith(today));
      const myClients = db.customers.filter((c) =>
        db.leads.some((l) => l.assignedStaffId === user.id && l.name === c.name) ||
        db.tasks.some((t) => t.assignedStaffId === user.id && t.clientId === c.id) ||
        db.content.some((ct) => ct.assignedStaffId === user.id && ct.clientId === c.id)
      );
      const myTasks = db.tasks.filter((t) => t.assignedStaffId === user.id && t.status !== 'Completed');
      const myTodayTasks = myTasks.filter((t) => t.dueDate === today);
      const myPendingContent = db.content.filter((c) => c.assignedStaffId === user.id && c.status !== 'Published');
      const myReminders = db.reminders.filter((r) => (!r.assignedStaffId || r.assignedStaffId === user.id) && !r.isCompleted);

      res.json({
        role: 'STAFF',
        myLeadsCount: myLeads.length,
        myFollowUpsCount: myFollowUps.length,
        myFollowUps,
        myClientsCount: myClients.length,
        myTasksCount: myTasks.length,
        myTodayTasks,
        myPendingContentCount: myPendingContent.length,
        myRemindersCount: myReminders.length,
        myReminders: myReminders.slice(0, 6),
        myRecentActivities: db.activities.filter((a) => a.userId === user.id).slice(0, 8),
      });
    }
  });

  // ==========================================
  // PRODUCTS (4 Products Management)
  // ==========================================
  app.get('/api/products', (req: Request, res: Response) => {
    // Keep plans synchronized with INITIAL_PRODUCTS definitions
    INITIAL_PRODUCTS.forEach((initProd) => {
      const dbProd = db.products.find((p) => p.id === initProd.id);
      if (dbProd) {
        initProd.plans.forEach((initPlan) => {
          const planItem = dbProd.plans.find((p) => p.id === initPlan.id);
          if (planItem) {
            planItem.name = initPlan.name;
            planItem.price = initPlan.price;
            planItem.billingCycle = initPlan.billingCycle;
          }
        });
      }
    });

    // Enrich with dynamic customer and lead counts
    const enriched = db.products.map((p) => {
      const customers = db.customers.filter((c) => c.linkedProducts.some((lp) => lp.productId === p.id));
      const leads = db.leads.filter((l) => l.interestedProductOrService === p.name);
      const payments = db.payments.filter((pay) => pay.productOrService === p.name);
      const subscriptions = db.subscriptions.filter((s) => s.productOrService === p.name);
      const mrr = subscriptions.filter((s) => s.status === 'Active').reduce((sum, s) => sum + s.amount, 0);

      return {
        ...p,
        activeCustomersCount: customers.length,
        activeLeadsCount: leads.length,
        totalPaymentsVolume: payments.filter((pay) => pay.status === 'Paid').reduce((sum, pay) => sum + pay.amount, 0),
        activeSubscriptionsCount: subscriptions.filter((s) => s.status === 'Active').length,
        mrr,
      };
    });
    res.json(enriched);
  });

  app.get('/api/products/:id', (req: Request, res: Response) => {
    const prod = db.products.find((p) => p.id === req.params.id);
    if (!prod) return res.status(404).json({ error: 'Product not found' });

    const customers = db.customers.filter((c) => c.linkedProducts.some((lp) => lp.productId === prod.id));
    const leads = db.leads.filter((l) => l.interestedProductOrService === prod.name);
    const payments = db.payments.filter((pay) => pay.productOrService === prod.name);
    const subscriptions = db.subscriptions.filter((s) => s.productOrService === prod.name);
    const tasks = db.tasks.filter((t) => t.targetId === prod.id);

    res.json({
      product: prod,
      customers,
      leads,
      payments,
      subscriptions,
      tasks,
    });
  });

  app.post('/api/products', requireAdmin, (req: Request, res: Response) => {
    const user: User = (req as any).user;
    const { name, code, tagline, description, websiteUrl, applicationUrl, iconName, color, badge } = req.body;
    if (!name) return res.status(400).json({ error: 'Product name is required' });

    const newProduct: Product = {
      id: `prod_${Date.now()}`,
      name: name.trim(),
      code: code ? code.trim().toUpperCase() : name.trim().toUpperCase().replace(/\s+/g, '_'),
      tagline: tagline || '',
      description: description || '',
      websiteUrl: websiteUrl || '',
      applicationUrl: applicationUrl || '',
      iconName: iconName || 'Boxes',
      color: color || '#6366F1',
      badge: badge || 'Active Suite',
      plans: [],
      documents: [],
      notes: '',
      createdAt: new Date().toISOString(),
      activeCustomersCount: 0,
      monthlyRevenue: 0,
    };

    db.products.push(newProduct);
    logActivity(user, 'Product Created', 'Product', newProduct.id, newProduct.name, `Created new product ${newProduct.name}`);
    res.status(201).json(newProduct);
  });

  app.put('/api/products/:id', requireAdmin, (req: Request, res: Response) => {
    const user: User = (req as any).user;
    const index = db.products.findIndex((p) => p.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Product not found' });

    db.products[index] = { ...db.products[index], ...req.body };
    logActivity(user, 'Product Updated', 'Product', db.products[index].id, db.products[index].name, `Updated product metadata and documentation`);
    res.json(db.products[index]);
  });

  app.delete('/api/products/:id', requireAdmin, (req: Request, res: Response) => {
    const user: User = (req as any).user;
    const index = db.products.findIndex((p) => p.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Product not found' });

    const deleted = db.products.splice(index, 1)[0];
    logActivity(user, 'Product Deleted', 'Product', deleted.id, deleted.name, `Deleted product ${deleted.name}`);
    res.json({ success: true, deletedProduct: deleted });
  });

  app.post('/api/products/:id/documents', (req: Request, res: Response) => {
    const user: User = (req as any).user;
    const prod = db.products.find((p) => p.id === req.params.id);
    if (!prod) return res.status(404).json({ error: 'Product not found' });

    const newDoc = {
      id: `doc_${Date.now()}`,
      title: req.body.title || 'Untitled Document',
      fileType: req.body.fileType || 'PDF',
      fileSize: req.body.fileSize || '1.5 MB',
      url: req.body.url || '#',
      uploadedBy: user.name,
      uploadedAt: new Date().toISOString().split('T')[0],
      category: req.body.category || 'Brief',
    };
    prod.documents.unshift(newDoc);
    logActivity(user, 'Document Uploaded', 'Product', prod.id, prod.name, `Uploaded "${newDoc.title}" to ${prod.name}`);
    res.json(newDoc);
  });

  // Product Plans Management
  app.post('/api/products/:id/plans', (req: Request, res: Response) => {
    const user: User = (req as any).user;
    const prod = db.products.find((p) => p.id === req.params.id);
    if (!prod) return res.status(404).json({ error: 'Product not found' });

    const newPlan = {
      id: `plan_${Date.now()}`,
      name: req.body.name || 'New Plan',
      price: Number(req.body.price) || 0,
      billingCycle: req.body.billingCycle || 'Monthly',
      features: Array.isArray(req.body.features) ? req.body.features : [],
      isPopular: !!req.body.isPopular,
      tier: req.body.tier || 'Professional',
      pricingType: req.body.pricingType || 'Fixed',
      currency: req.body.currency || '$',
      setupFee: Number(req.body.setupFee) || 0,
      discountPercent: Number(req.body.discountPercent) || 0,
      description: req.body.description || '',
      customizablePrice: !!req.body.customizablePrice,
      minDurationMonths: Number(req.body.minDurationMonths) || 1,
    };

    prod.plans.push(newPlan);
    logActivity(user, 'Product Plan Created', 'Product', prod.id, prod.name, `Added new plan "${newPlan.name}" ($${newPlan.price}/${newPlan.billingCycle}) to ${prod.name}`);
    res.json({ product: prod, plan: newPlan });
  });

  app.put('/api/products/:id/plans/:planId', (req: Request, res: Response) => {
    const user: User = (req as any).user;
    const prod = db.products.find((p) => p.id === req.params.id);
    if (!prod) return res.status(404).json({ error: 'Product not found' });

    const planIndex = prod.plans.findIndex((p) => p.id === req.params.planId);
    if (planIndex === -1) return res.status(404).json({ error: 'Plan not found' });

    prod.plans[planIndex] = {
      ...prod.plans[planIndex],
      ...req.body,
      price: req.body.price !== undefined ? Number(req.body.price) : prod.plans[planIndex].price,
      setupFee: req.body.setupFee !== undefined ? Number(req.body.setupFee) : prod.plans[planIndex].setupFee,
      discountPercent: req.body.discountPercent !== undefined ? Number(req.body.discountPercent) : prod.plans[planIndex].discountPercent,
    };

    logActivity(user, 'Product Plan Updated', 'Product', prod.id, prod.name, `Updated plan "${prod.plans[planIndex].name}" terms & pricing for ${prod.name}`);
    res.json({ product: prod, plan: prod.plans[planIndex] });
  });

  app.delete('/api/products/:id/plans/:planId', (req: Request, res: Response) => {
    const user: User = (req as any).user;
    const prod = db.products.find((p) => p.id === req.params.id);
    if (!prod) return res.status(404).json({ error: 'Product not found' });

    const planIndex = prod.plans.findIndex((p) => p.id === req.params.planId);
    if (planIndex === -1) return res.status(404).json({ error: 'Plan not found' });

    const deletedPlan = prod.plans.splice(planIndex, 1)[0];
    logActivity(user, 'Product Plan Deleted', 'Product', prod.id, prod.name, `Removed plan "${deletedPlan.name}" from ${prod.name}`);
    res.json({ product: prod, deletedPlan });
  });

  // ==========================================
  // DIGITAL MARKETING MODULE
  // ==========================================
  app.get('/api/marketing/overview', (req: Request, res: Response) => {
    const clients = db.customers.filter((c) => c.usesDigitalMarketing);
    const leads = db.leads.filter((l) => l.interestedProductOrService === 'Digital Marketing');
    const content = db.content;
    const tasks = db.tasks.filter((t) => t.targetType === 'Digital Marketing');
    const payments = db.payments.filter((p) => p.productOrService === 'Digital Marketing');
    const subscriptions = db.subscriptions.filter((s) => s.productOrService === 'Digital Marketing');
    const activeMRR = subscriptions.filter((s) => s.status === 'Active').reduce((sum, s) => sum + s.amount, 0);

    res.json({
      plans: db.marketingPlans,
      clientsCount: clients.length,
      clients,
      leadsCount: leads.length,
      leads,
      content,
      tasks,
      payments,
      subscriptions,
      activeMRR,
    });
  });

  // ==========================================
  // BRANCHES API
  // ==========================================
  app.get('/api/branches', (req: Request, res: Response) => {
    const { productId } = req.query;
    if (productId) {
      const filtered = db.branches.filter((b) => b.productId === productId);
      return res.json(filtered);
    }
    res.json(db.branches);
  });

  app.post('/api/branches', requireAdmin, (req: Request, res: Response) => {
    const user: User = (req as any).user;
    const { productId, name, code, contactPerson, mobileNumber, whatsapp, email, location, city, state, address, gstNumber, status } = req.body;
    if (!name) return res.status(400).json({ error: 'Branch name is required' });

    const prod = productId ? db.products.find((p) => p.id === productId) : null;
    const newBranch: Branch = {
      id: `br_${Date.now()}`,
      productId: productId || undefined,
      productName: prod ? prod.name : undefined,
      name: name.trim(),
      code: code ? code.trim().toUpperCase() : `BR-${Date.now().toString().slice(-4)}`,
      contactPerson: contactPerson || '',
      mobileNumber: mobileNumber || '',
      whatsapp: whatsapp || '',
      email: email || '',
      location: location || city || '',
      city: city || location || '',
      state: state || '',
      address: address || '',
      gstNumber: gstNumber || '',
      status: (status as any) || 'Active',
      createdAt: new Date().toISOString().split('T')[0],
    };

    db.branches.unshift(newBranch);
    logActivity(user, 'Branch Created', 'Product', newBranch.id, newBranch.name, `Added branch ${newBranch.name}`);
    res.status(201).json(newBranch);
  });

  app.put('/api/branches/:id', requireAdmin, (req: Request, res: Response) => {
    const user: User = (req as any).user;
    const index = db.branches.findIndex((b) => b.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Branch not found' });

    const prod = req.body.productId ? db.products.find((p) => p.id === req.body.productId) : null;
    const productName = prod ? prod.name : db.branches[index].productName;

    db.branches[index] = {
      ...db.branches[index],
      ...req.body,
      productName,
    };
    logActivity(user, 'Branch Updated', 'Product', db.branches[index].id, db.branches[index].name, `Updated branch details`);
    res.json(db.branches[index]);
  });

  app.delete('/api/branches/:id', requireAdmin, (req: Request, res: Response) => {
    const user: User = (req as any).user;
    const index = db.branches.findIndex((b) => b.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Branch not found' });

    const deleted = db.branches.splice(index, 1)[0];
    logActivity(user, 'Branch Deleted', 'Product', deleted.id, deleted.name, `Deleted branch ${deleted.name}`);
    res.json({ success: true, deletedBranch: deleted });
  });

  app.get('/api/marketing/plans', (req: Request, res: Response) => {
    res.json(db.marketingPlans);
  });

  app.put('/api/marketing/plans/:id', requireAdmin, (req: Request, res: Response) => {
    const user: User = (req as any).user;
    const index = db.marketingPlans.findIndex((p) => p.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Plan not found' });

    db.marketingPlans[index] = { ...db.marketingPlans[index], ...req.body };
    logActivity(user, 'Marketing Plan Updated', 'Marketing', db.marketingPlans[index].id, db.marketingPlans[index].name, `Updated marketing package pricing/features`);
    res.json(db.marketingPlans[index]);
  });

  // Digital Marketing Client Onboarding Wizard Endpoint
  app.post('/api/marketing/onboarding', (req: Request, res: Response) => {
    const user: User = (req as any).user;
    const {
      clientName,
      companyName,
      email,
      phone,
      whatsapp,
      location,
      industry,
      planId,
      brandGuidelines,
      logoUrl,
      photos,
      videos,
      socialHandles,
      requirements,
      targetAudience,
      competitorUrls,
    } = req.body;

    const plan = db.marketingPlans.find((p) => p.id === planId) || db.marketingPlans[0];

    // Check if customer already exists or create new
    let customer = db.customers.find((c) => c.email.toLowerCase() === email?.toLowerCase());
    const isNew = !customer;

    if (!customer) {
      customer = {
        id: `cust_${Date.now()}`,
        name: clientName,
        company: companyName,
        email,
        phone: phone || '',
        whatsapp: whatsapp || phone || '',
        location: location || 'Remote',
        industry: industry || 'Digital Business',
        status: 'Active',
        linkedProducts: [],
        usesDigitalMarketing: true,
        documents: [],
        notes: `Onboarded into Digital Marketing (${plan.name}).`,
        createdAt: new Date().toISOString().split('T')[0],
      };
      db.customers.unshift(customer);
    }

    customer.usesDigitalMarketing = true;
    customer.marketingDetails = {
      planId: plan.id,
      planName: plan.name,
      monthlyFee: plan.price,
      onboardingStatus: 'Completed',
      brandAssets: {
        logoUrl: logoUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
        photos: photos || [],
        videos: videos || [],
        brandGuidelines: brandGuidelines || '',
      },
      socialHandles: socialHandles || {},
      requirements: requirements || '',
      targetAudience: targetAudience || '',
      competitorUrls: competitorUrls || [],
      startDate: new Date().toISOString().split('T')[0],
    };

    // Create Subscription
    const newSub: SubscriptionItem = {
      id: `sub_${Date.now()}`,
      customerId: customer.id,
      customerName: customer.company,
      productOrService: 'Digital Marketing',
      plan: plan.name,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      amount: plan.price,
      billingCycle: plan.billingCycle,
      status: 'Active',
      autoRenew: true,
      notes: `Onboarding subscription for ${plan.name}`,
    };
    db.subscriptions.unshift(newSub);

    // Create Initial Onboarding Tasks
    const initialTasks: TaskItem[] = [
      {
        id: `tsk_${Date.now()}_1`,
        title: `Setup brand media library & social scheduler for ${customer.company}`,
        description: `Import logo, setup brand hex colors, and configure monthly calendar.`,
        targetType: 'Digital Marketing',
        targetId: 'mkt_agency',
        targetName: 'Digital Marketing',
        clientId: customer.id,
        clientName: customer.company,
        assignedStaffId: user.id,
        assignedStaffName: user.name,
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priority: 'High',
        status: 'In Progress',
        createdAt: new Date().toISOString().split('T')[0],
      },
      {
        id: `tsk_${Date.now()}_2`,
        title: `Draft first 4 social post concepts & reels scripts for ${customer.company}`,
        description: `Draft captions, hashtag research, and visual creative boards.`,
        targetType: 'Digital Marketing',
        targetId: 'mkt_agency',
        targetName: 'Digital Marketing',
        clientId: customer.id,
        clientName: customer.company,
        assignedStaffId: user.id,
        assignedStaffName: user.name,
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priority: 'Medium',
        status: 'Pending',
        createdAt: new Date().toISOString().split('T')[0],
      },
    ];
    db.tasks.unshift(...initialTasks);

    // Log Activity
    logActivity(
      user,
      'Client Onboarded to Marketing',
      'Client',
      customer.id,
      customer.company,
      `Completed Digital Marketing onboarding on ${plan.name} ($${plan.price}/mo). Generated subscription & tasks.`
    );

    res.json({
      success: true,
      customer,
      subscription: newSub,
      tasks: initialTasks,
    });
  });

  // ==========================================
  // LEADS (CRM)
  // ==========================================
  app.get('/api/leads', (req: Request, res: Response) => {
    const user: User = (req as any).user;
    if (user.role === 'ADMIN') {
      res.json(db.leads);
    } else {
      // Staff can view assigned leads or leads they created
      const staffLeads = db.leads.filter((l) => l.assignedStaffId === user.id || !l.assignedStaffId);
      res.json(staffLeads);
    }
  });

  app.post('/api/leads', (req: Request, res: Response) => {
    const user: User = (req as any).user;
    const newLead: Lead = {
      id: `lead_${Date.now()}`,
      name: req.body.name,
      company: req.body.company || '',
      phone: req.body.phone || '',
      whatsapp: req.body.whatsapp || req.body.phone || '',
      email: req.body.email || '',
      location: req.body.location || '',
      leadSource: req.body.leadSource || 'Website',
      interestedProductOrService: req.body.interestedProductOrService || 'OmniFlow ERP',
      assignedStaffId: req.body.assignedStaffId || (user.role === 'STAFF' ? user.id : INITIAL_USERS[1].id),
      assignedStaffName: req.body.assignedStaffName || user.name,
      status: req.body.status || 'New',
      interest: req.body.interest || 'Medium',
      requirements: req.body.requirements || '',
      feedback: req.body.feedback || '',
      nextFollowUpDate: req.body.nextFollowUpDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      notes: req.body.notes || '',
      createdAt: new Date().toISOString().split('T')[0],
      followUps: [],
    };

    // If staff assigned, ensure name matches
    const staffObj = db.users.find((u) => u.id === newLead.assignedStaffId);
    if (staffObj) newLead.assignedStaffName = staffObj.name;

    db.leads.unshift(newLead);
    logActivity(user, 'Lead Created', 'Lead', newLead.id, `${newLead.name} (${newLead.company})`, `Created new lead interested in ${newLead.interestedProductOrService}`);

    // Create Reminder if follow-up set
    if (newLead.nextFollowUpDate) {
      db.reminders.unshift({
        id: `rem_lead_${newLead.id}_${Date.now()}`,
        type: 'Lead Follow-up',
        title: `Follow-up: ${newLead.name} (${newLead.company})`,
        description: `Follow up regarding ${newLead.interestedProductOrService}.`,
        relatedId: newLead.id,
        relatedType: 'Lead',
        dueDate: newLead.nextFollowUpDate,
        isRead: false,
        isCompleted: false,
        priority: newLead.interest === 'High' ? 'High' : 'Medium',
        assignedStaffId: newLead.assignedStaffId,
        createdAt: new Date().toISOString(),
      });
    }

    res.json(newLead);
  });

  app.put('/api/leads/:id', (req: Request, res: Response) => {
    const user: User = (req as any).user;
    const index = db.leads.findIndex((l) => l.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Lead not found' });

    // RBAC: Staff can only edit if assigned or if Admin
    if (user.role !== 'ADMIN' && db.leads[index].assignedStaffId && db.leads[index].assignedStaffId !== user.id) {
      return res.status(403).json({ error: 'Forbidden: You can only modify your assigned leads.' });
    }

    const prevStatus = db.leads[index].status;
    db.leads[index] = { ...db.leads[index], ...req.body };

    // Update staff name if assignedStaffId changed
    if (req.body.assignedStaffId) {
      const staffObj = db.users.find((u) => u.id === req.body.assignedStaffId);
      if (staffObj) db.leads[index].assignedStaffName = staffObj.name;
    }

    logActivity(
      user,
      'Lead Updated',
      'Lead',
      db.leads[index].id,
      `${db.leads[index].name} (${db.leads[index].company})`,
      `Updated lead status from "${prevStatus}" to "${db.leads[index].status}"`
    );

    res.json(db.leads[index]);
  });

  // Add Follow-up to Lead
  app.post('/api/leads/:id/followups', (req: Request, res: Response) => {
    const user: User = (req as any).user;
    const lead = db.leads.find((l) => l.id === req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const newFollowUp = {
      id: `fup_${Date.now()}`,
      date: req.body.date || new Date().toISOString().split('T')[0],
      staffId: user.id,
      staffName: user.name,
      type: req.body.type || 'Call',
      notes: req.body.notes || '',
      outcome: req.body.outcome || '',
      nextActionDate: req.body.nextActionDate,
    };

    lead.followUps.unshift(newFollowUp);
    if (req.body.nextActionDate) {
      lead.nextFollowUpDate = req.body.nextActionDate;
      // create reminder
      db.reminders.unshift({
        id: `rem_fup_${newFollowUp.id}`,
        type: 'Lead Follow-up',
        title: `Follow-up: ${lead.name} (${lead.company})`,
        description: `Outcome: ${newFollowUp.outcome || newFollowUp.notes}`,
        relatedId: lead.id,
        relatedType: 'Lead',
        dueDate: req.body.nextActionDate,
        isRead: false,
        isCompleted: false,
        priority: lead.interest === 'High' ? 'High' : 'Medium',
        assignedStaffId: lead.assignedStaffId,
        createdAt: new Date().toISOString(),
      });
    }

    logActivity(user, 'Follow-up Added', 'Lead', lead.id, lead.name, `Logged ${newFollowUp.type} follow-up. Outcome: "${newFollowUp.outcome}"`);
    res.json({ lead, followUp: newFollowUp });
  });

  // Convert Lead to Customer
  app.post('/api/leads/:id/convert', (req: Request, res: Response) => {
    const user: User = (req as any).user;
    const lead = db.leads.find((l) => l.id === req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    lead.status = 'Converted';

    // Find or create customer
    let customer = db.customers.find((c) => c.email.toLowerCase() === lead.email.toLowerCase());
    if (!customer) {
      customer = {
        id: `cust_${Date.now()}`,
        name: lead.name,
        company: lead.company || lead.name,
        email: lead.email,
        phone: lead.phone,
        whatsapp: lead.whatsapp,
        location: lead.location,
        industry: req.body.industry || 'Enterprise',
        status: 'Active',
        linkedProducts: [],
        usesDigitalMarketing: lead.interestedProductOrService === 'Digital Marketing',
        documents: [],
        notes: `Converted from Lead #${lead.id} on ${new Date().toISOString().split('T')[0]}. Original requirements: ${lead.requirements}`,
        createdAt: new Date().toISOString().split('T')[0],
      };
      db.customers.unshift(customer);
    }

    // Attach Product or Marketing
    if (lead.interestedProductOrService === 'Digital Marketing') {
      customer.usesDigitalMarketing = true;
      if (!customer.marketingDetails) {
        customer.marketingDetails = {
          planId: 'mkt_plan_2',
          planName: 'Growth Accelerator 360',
          monthlyFee: 1299,
          onboardingStatus: 'In Progress',
          brandAssets: { photos: [], videos: [] },
          socialHandles: {},
          requirements: lead.requirements,
          targetAudience: '',
          competitorUrls: [],
          startDate: new Date().toISOString().split('T')[0],
        };
      }
    } else {
      const prod = db.products.find((p) => p.name === lead.interestedProductOrService);
      if (prod) {
        const existingLink = customer.linkedProducts.find((lp) => lp.productId === prod.id);
        if (!existingLink) {
          customer.linkedProducts.push({
            productId: prod.id,
            productName: prod.name,
            planName: req.body.planName || prod.plans[1]?.name || 'Standard Plan',
            amount: req.body.amount || prod.plans[1]?.price || 499,
            since: new Date().toISOString().split('T')[0],
            status: 'Active',
          });
        }
      }
    }

    logActivity(user, 'Lead Converted', 'Lead', lead.id, lead.name, `Successfully converted lead into active customer record (${customer.company})`);
    res.json({ success: true, lead, customer });
  });

  app.delete('/api/leads/:id', requireAdmin, (req: Request, res: Response) => {
    const user: User = (req as any).user;
    const index = db.leads.findIndex((l) => l.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Lead not found' });

    const deleted = db.leads.splice(index, 1)[0];
    logActivity(user, 'Lead Deleted', 'Lead', deleted.id, deleted.name, `Admin deleted lead record`);
    res.json({ success: true, deleted });
  });

  // ==========================================
  // CUSTOMERS / CLIENTS
  // ==========================================
  app.get('/api/customers', (req: Request, res: Response) => {
    res.json(db.customers);
  });

  app.get('/api/customers/:id', (req: Request, res: Response) => {
    const customer = db.customers.find((c) => c.id === req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const payments = db.payments.filter((p) => p.customerId === customer.id);
    const subscriptions = db.subscriptions.filter((s) => s.customerId === customer.id);
    const tasks = db.tasks.filter((t) => t.clientId === customer.id);
    const content = db.content.filter((c) => c.clientId === customer.id);
    const activities = db.activities.filter((a) => a.entityId === customer.id || a.details.includes(customer.company));

    res.json({
      customer,
      payments,
      subscriptions,
      tasks,
      content,
      activities,
    });
  });

  app.post('/api/customers', (req: Request, res: Response) => {
    const user: User = (req as any).user;
    const clientName = req.body.clientName || req.body.name || 'New Client';
    const businessName = req.body.businessName || req.body.company || clientName;
    const locationStr = [req.body.city, req.body.state].filter(Boolean).join(', ') || req.body.location || '';

    const newCustomer: Customer = {
      id: req.body.clientId || `cust_${Date.now()}`,
      clientId: req.body.clientId || `CLI-${Date.now().toString().slice(-4)}`,
      clientName: clientName,
      businessName: businessName,
      name: clientName,
      company: businessName,
      contactPerson: req.body.contactPerson || clientName,
      email: req.body.email || '',
      phone: req.body.phone || '',
      whatsapp: req.body.whatsapp || req.body.phone || '',
      alternatePhone: req.body.alternatePhone || '',
      address: req.body.address || '',
      city: req.body.city || '',
      state: req.body.state || '',
      pincode: req.body.pincode || '',
      location: locationStr,
      industry: req.body.industry || 'General',
      status: req.body.status || 'Active',
      linkedProducts: req.body.linkedProducts || [],
      usesDigitalMarketing: req.body.usesDigitalMarketing || false,
      marketingDetails: req.body.marketingDetails,
      documents: req.body.documents || [],
      notes: req.body.notes || '',
      createdAt: new Date().toISOString().split('T')[0],
      avatar: req.body.avatar,
    };

    db.customers.unshift(newCustomer);
    logActivity(user, 'Customer Created', 'Client', newCustomer.id, newCustomer.company, `Created client profile for ${newCustomer.company} (${newCustomer.clientId})`);
    res.json(newCustomer);
  });

  app.put('/api/customers/:id', (req: Request, res: Response) => {
    const user: User = (req as any).user;
    const index = db.customers.findIndex((c) => c.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Customer not found' });

    db.customers[index] = { ...db.customers[index], ...req.body };
    logActivity(user, 'Customer Updated', 'Client', db.customers[index].id, db.customers[index].company, `Updated customer profile`);
    res.json(db.customers[index]);
  });

  app.post('/api/customers/:id/link-product', (req: Request, res: Response) => {
    const user: User = (req as any).user;
    const customer = db.customers.find((c) => c.id === req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const { productId, planName, amount } = req.body;
    const prod = db.products.find((p) => p.id === productId);
    if (!prod) return res.status(404).json({ error: 'Product not found' });

    // Check if already linked
    const existing = customer.linkedProducts.find((lp) => lp.productId === productId);
    if (existing) {
      existing.planName = planName || existing.planName;
      existing.amount = amount || existing.amount;
      existing.status = 'Active';
    } else {
      customer.linkedProducts.push({
        productId: prod.id,
        productName: prod.name,
        planName: planName || prod.plans[0]?.name || 'Standard Plan',
        amount: amount || prod.plans[0]?.price || 299,
        since: new Date().toISOString().split('T')[0],
        status: 'Active',
      });
    }

    logActivity(user, 'Product Linked to Customer', 'Client', customer.id, customer.company, `Linked product ${prod.name} (${planName}) to ${customer.company}`);
    res.json(customer);
  });

  app.delete('/api/customers/:id', requireAdmin, (req: Request, res: Response) => {
    const user: User = (req as any).user;
    const index = db.customers.findIndex((c) => c.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Customer not found' });

    const deleted = db.customers.splice(index, 1)[0];
    logActivity(user, 'Customer Deleted', 'Client', deleted.id, deleted.company, `Admin deleted customer profile`);
    res.json({ success: true, deleted });
  });

  // ==========================================
  // CONTENT MANAGEMENT
  // ==========================================
  app.get('/api/content', (req: Request, res: Response) => {
    res.json(db.content);
  });

  app.post('/api/content', (req: Request, res: Response) => {
    const user: User = (req as any).user;
    const client = db.customers.find((c) => c.id === req.body.clientId);
    const assignedStaff = db.users.find((u) => u.id === req.body.assignedStaffId) || user;

    const newContent: ContentItem = {
      id: `cnt_${Date.now()}`,
      clientId: req.body.clientId,
      clientName: client ? client.company : req.body.clientName || 'General Brand',
      contentType: req.body.contentType || 'Post',
      title: req.body.title,
      caption: req.body.caption || '',
      hashtags: req.body.hashtags || [],
      assignedStaffId: assignedStaff.id,
      assignedStaffName: assignedStaff.name,
      dueDate: req.body.dueDate || new Date().toISOString().split('T')[0],
      scheduledDate: req.body.scheduledDate,
      status: req.body.status || 'Idea',
      mediaUrl: req.body.mediaUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
      mediaType: req.body.mediaType || 'image',
      mediaThumbnail: req.body.mediaThumbnail,
      notes: req.body.notes || '',
      platform: req.body.platform || 'Instagram',
      createdAt: new Date().toISOString().split('T')[0],
    };

    db.content.unshift(newContent);
    logActivity(user, 'Content Created', 'Content', newContent.id, newContent.title, `Created ${newContent.contentType} for ${newContent.clientName}`);
    res.json(newContent);
  });

  app.put('/api/content/:id', (req: Request, res: Response) => {
    const user: User = (req as any).user;
    const index = db.content.findIndex((c) => c.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Content item not found' });

    const prevStatus = db.content[index].status;
    db.content[index] = { ...db.content[index], ...req.body };

    logActivity(
      user,
      'Content Updated',
      'Content',
      db.content[index].id,
      db.content[index].title,
      `Updated content status to "${db.content[index].status}"`
    );
    res.json(db.content[index]);
  });

  app.delete('/api/content/:id', (req: Request, res: Response) => {
    const user: User = (req as any).user;
    const index = db.content.findIndex((c) => c.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Content not found' });

    if (user.role !== 'ADMIN' && db.content[index].assignedStaffId !== user.id) {
      return res.status(403).json({ error: 'Forbidden: You cannot delete content assigned to another staff.' });
    }

    const deleted = db.content.splice(index, 1)[0];
    logActivity(user, 'Content Deleted', 'Content', deleted.id, deleted.title, `Deleted content draft`);
    res.json({ success: true, deleted });
  });

  // ==========================================
  // TASKS & TODAY'S WORK
  // ==========================================
  app.get('/api/tasks', (req: Request, res: Response) => {
    res.json(db.tasks);
  });

  app.get('/api/tasks/today', (req: Request, res: Response) => {
    const user: User = (req as any).user;
    const today = new Date().toISOString().split('T')[0];

    let tasksQuery = db.tasks;
    if (user.role === 'STAFF') {
      tasksQuery = tasksQuery.filter((t) => t.assignedStaffId === user.id);
    }

    const todayTasks = tasksQuery.filter((t) => t.dueDate === today || (t.dueDate < today && t.status !== 'Completed'));
    const todayFollowUps = db.leads.filter((l) => {
      const matchStaff = user.role === 'ADMIN' || l.assignedStaffId === user.id;
      return matchStaff && l.nextFollowUpDate && l.nextFollowUpDate.startsWith(today);
    });

    res.json({
      today,
      tasks: todayTasks,
      followUps: todayFollowUps,
    });
  });

  app.post('/api/tasks', (req: Request, res: Response) => {
    const user: User = (req as any).user;
    const assignedStaff = db.users.find((u) => u.id === req.body.assignedStaffId) || user;

    const newTask: TaskItem = {
      id: `tsk_${Date.now()}`,
      title: req.body.title,
      description: req.body.description || '',
      targetType: req.body.targetType || 'Product',
      targetId: req.body.targetId || 'prod_1',
      targetName: req.body.targetName || 'OmniFlow ERP',
      clientId: req.body.clientId,
      clientName: req.body.clientName,
      assignedStaffId: assignedStaff.id,
      assignedStaffName: assignedStaff.name,
      dueDate: req.body.dueDate || new Date().toISOString().split('T')[0],
      priority: req.body.priority || 'Medium',
      status: req.body.status || 'Pending',
      notes: req.body.notes || '',
      createdAt: new Date().toISOString().split('T')[0],
    };

    db.tasks.unshift(newTask);
    logActivity(user, 'Task Created', 'Task', newTask.id, newTask.title, `Assigned task to ${assignedStaff.name} (Due: ${newTask.dueDate})`);

    // Create deadline reminder
    db.reminders.unshift({
      id: `rem_tsk_${newTask.id}`,
      type: 'Task Deadline',
      title: `Task Due: ${newTask.title}`,
      description: `Target: ${newTask.targetName} | Priority: ${newTask.priority}`,
      relatedId: newTask.id,
      relatedType: 'Task',
      dueDate: newTask.dueDate,
      isRead: false,
      isCompleted: false,
      priority: newTask.priority,
      assignedStaffId: newTask.assignedStaffId,
      createdAt: new Date().toISOString(),
    });

    res.json(newTask);
  });

  app.put('/api/tasks/:id', (req: Request, res: Response) => {
    const user: User = (req as any).user;
    const index = db.tasks.findIndex((t) => t.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Task not found' });

    const prevStatus = db.tasks[index].status;
    db.tasks[index] = { ...db.tasks[index], ...req.body };

    if (req.body.status === 'Completed' && prevStatus !== 'Completed') {
      db.tasks[index].completedAt = new Date().toISOString();
      logActivity(user, 'Task Completed', 'Task', db.tasks[index].id, db.tasks[index].title, `Completed task ahead of deadline`);
    } else {
      logActivity(user, 'Task Updated', 'Task', db.tasks[index].id, db.tasks[index].title, `Updated task status to "${db.tasks[index].status}"`);
    }

    res.json(db.tasks[index]);
  });

  app.delete('/api/tasks/:id', (req: Request, res: Response) => {
    const user: User = (req as any).user;
    const index = db.tasks.findIndex((t) => t.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Task not found' });

    if (user.role !== 'ADMIN' && db.tasks[index].assignedStaffId !== user.id) {
      return res.status(403).json({ error: 'Forbidden: You cannot delete tasks assigned to other employees.' });
    }

    const deleted = db.tasks.splice(index, 1)[0];
    logActivity(user, 'Task Deleted', 'Task', deleted.id, deleted.title, `Deleted task`);
    res.json({ success: true, deleted });
  });

  // ==========================================
  // PAYMENTS & FINANCIALS
  // ==========================================
  app.get('/api/payments', (req: Request, res: Response) => {
    res.json(db.payments);
  });

  app.post('/api/payments', requireAdmin, (req: Request, res: Response) => {
    const user: User = (req as any).user;
    const newPayment: PaymentItem = {
      id: `pay_${Date.now()}`,
      invoiceNumber: req.body.invoiceNumber || `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      customerId: req.body.customerId,
      customerName: req.body.customerName || 'Direct Client',
      productOrService: req.body.productOrService || 'OmniFlow ERP',
      plan: req.body.plan || 'Growth Tier',
      amount: parseFloat(req.body.amount) || 0,
      dueDate: req.body.dueDate || new Date().toISOString().split('T')[0],
      paymentDate: req.body.paymentDate,
      paymentMethod: req.body.paymentMethod,
      transactionId: req.body.transactionId,
      status: req.body.status || 'Pending',
      notes: req.body.notes || '',
      createdAt: new Date().toISOString().split('T')[0],
    };

    db.payments.unshift(newPayment);
    logActivity(user, 'Payment Recorded', 'Payment', newPayment.id, newPayment.invoiceNumber, `Recorded invoice for $${newPayment.amount.toLocaleString()} (${newPayment.status})`);
    res.json(newPayment);
  });

  app.put('/api/payments/:id', requireAdmin, (req: Request, res: Response) => {
    const user: User = (req as any).user;
    const index = db.payments.findIndex((p) => p.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Payment record not found' });

    db.payments[index] = { ...db.payments[index], ...req.body };
    logActivity(user, 'Payment Updated', 'Payment', db.payments[index].id, db.payments[index].invoiceNumber, `Updated payment record (${db.payments[index].status})`);
    res.json(db.payments[index]);
  });

  app.delete('/api/payments/:id', requireAdmin, (req: Request, res: Response) => {
    const user: User = (req as any).user;
    const index = db.payments.findIndex((p) => p.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Payment not found' });

    const deleted = db.payments.splice(index, 1)[0];
    logActivity(user, 'Payment Record Deleted', 'Payment', deleted.id, deleted.invoiceNumber, `Admin deleted payment record`);
    res.json({ success: true, deleted });
  });

  // ==========================================
  // SUBSCRIPTIONS
  // ==========================================
  app.get('/api/subscriptions', (req: Request, res: Response) => {
    runAutoReminders();
    res.json(db.subscriptions);
  });

  app.post('/api/subscriptions', requireAdmin, (req: Request, res: Response) => {
    const user: User = (req as any).user;
    const newSub: SubscriptionItem = {
      id: `sub_${Date.now()}`,
      customerId: req.body.customerId,
      customerName: req.body.customerName || 'Client Subscription',
      productOrService: req.body.productOrService || 'OmniFlow ERP',
      plan: req.body.plan || 'Standard Tier',
      startDate: req.body.startDate || new Date().toISOString().split('T')[0],
      endDate: req.body.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      amount: parseFloat(req.body.amount) || 0,
      billingCycle: req.body.billingCycle || 'Monthly',
      status: req.body.status || 'Active',
      autoRenew: req.body.autoRenew ?? true,
      notes: req.body.notes || '',
    };

    db.subscriptions.unshift(newSub);
    logActivity(user, 'Subscription Created', 'Subscription', newSub.id, newSub.customerName, `Created subscription for ${newSub.productOrService} ($${newSub.amount}/${newSub.billingCycle})`);
    res.json(newSub);
  });

  app.put('/api/subscriptions/:id', requireAdmin, (req: Request, res: Response) => {
    const user: User = (req as any).user;
    const index = db.subscriptions.findIndex((s) => s.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Subscription not found' });

    db.subscriptions[index] = { ...db.subscriptions[index], ...req.body };
    logActivity(user, 'Subscription Updated', 'Subscription', db.subscriptions[index].id, db.subscriptions[index].customerName, `Updated subscription terms & renewal`);
    res.json(db.subscriptions[index]);
  });

  app.delete('/api/subscriptions/:id', requireAdmin, (req: Request, res: Response) => {
    const user: User = (req as any).user;
    const index = db.subscriptions.findIndex((s) => s.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Subscription not found' });

    const deleted = db.subscriptions.splice(index, 1)[0];
    logActivity(user, 'Subscription Deleted', 'Subscription', deleted.id, deleted.customerName, `Admin removed subscription contract`);
    res.json({ success: true, deleted });
  });

  // ==========================================
  // REMINDERS & NOTIFICATIONS
  // ==========================================
  app.get('/api/reminders', (req: Request, res: Response) => {
    const user: User = (req as any).user;
    runAutoReminders();
    if (user.role === 'ADMIN') {
      res.json(db.reminders);
    } else {
      res.json(db.reminders.filter((r) => !r.assignedStaffId || r.assignedStaffId === user.id));
    }
  });

  app.post('/api/reminders', (req: Request, res: Response) => {
    const user: User = (req as any).user;
    const newRem: ReminderItem = {
      id: `rem_${Date.now()}`,
      type: req.body.type || 'Task Deadline',
      title: req.body.title,
      description: req.body.description || '',
      relatedId: req.body.relatedId,
      relatedType: req.body.relatedType,
      dueDate: req.body.dueDate || new Date().toISOString(),
      isRead: false,
      isCompleted: false,
      priority: req.body.priority || 'Medium',
      assignedStaffId: req.body.assignedStaffId || user.id,
      createdAt: new Date().toISOString(),
    };
    db.reminders.unshift(newRem);
    res.json(newRem);
  });

  app.put('/api/reminders/:id', (req: Request, res: Response) => {
    const index = db.reminders.findIndex((r) => r.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Reminder not found' });

    db.reminders[index] = { ...db.reminders[index], ...req.body };
    res.json(db.reminders[index]);
  });

  app.post('/api/reminders/mark-all-read', (req: Request, res: Response) => {
    const user: User = (req as any).user;
    db.reminders.forEach((r) => {
      if (user.role === 'ADMIN' || !r.assignedStaffId || r.assignedStaffId === user.id) {
        r.isRead = true;
      }
    });
    res.json({ success: true });
  });

  // ==========================================
  // EMPLOYEES (Admin Only)
  // ==========================================
  app.get('/api/employees', (req: Request, res: Response) => {
    const user: User = (req as any).user;
    if (user.role !== 'ADMIN') {
      // Staff only sees basic list for assignment selectors
      return res.json(
        db.users.map((u) => ({
          id: u.id,
          name: u.name,
          department: u.department,
          avatar: u.avatar,
          title: u.title,
        }))
      );
    }

    // Admin receives full employee workload & performance metrics
    const enriched = db.users.map((emp) => {
      const assignedLeads = db.leads.filter((l) => l.assignedStaffId === emp.id).length;
      const convertedLeads = db.leads.filter((l) => l.assignedStaffId === emp.id && l.status === 'Converted').length;
      const assignedTasks = db.tasks.filter((t) => t.assignedStaffId === emp.id).length;
      const completedTasks = db.tasks.filter((t) => t.assignedStaffId === emp.id && t.status === 'Completed').length;
      const pendingTasks = db.tasks.filter((t) => t.assignedStaffId === emp.id && t.status !== 'Completed').length;
      const assignedContent = db.content.filter((c) => c.assignedStaffId === emp.id).length;

      return {
        ...emp,
        assignedLeads,
        convertedLeads,
        assignedTasks,
        completedTasks,
        pendingTasks,
        assignedContent,
      };
    });

    res.json(enriched);
  });

  app.post('/api/employees', requireAdmin, (req: Request, res: Response) => {
    const user: User = (req as any).user;
    const newEmp: User = {
      id: `usr_staff_${Date.now()}`,
      name: req.body.name,
      email: req.body.email,
      role: req.body.role || 'STAFF',
      department: req.body.department || 'Operations',
      title: req.body.title || 'Staff Associate',
      avatar: req.body.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      phone: req.body.phone || '',
      active: req.body.active ?? true,
      joinedDate: new Date().toISOString().split('T')[0],
    };

    db.users.push(newEmp);
    logActivity(user, 'Employee Created', 'Employee', newEmp.id, newEmp.name, `Added new staff member: ${newEmp.name} (${newEmp.department})`);
    res.json(newEmp);
  });

  app.put('/api/employees/:id', requireAdmin, (req: Request, res: Response) => {
    const user: User = (req as any).user;
    const index = db.users.findIndex((u) => u.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Employee not found' });

    db.users[index] = { ...db.users[index], ...req.body };
    logActivity(user, 'Employee Updated', 'Employee', db.users[index].id, db.users[index].name, `Updated employee profile & permissions`);
    res.json(db.users[index]);
  });

  app.delete('/api/employees/:id', requireAdmin, (req: Request, res: Response) => {
    const user: User = (req as any).user;
    const index = db.users.findIndex((u) => u.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Employee not found' });

    if (db.users[index].id === user.id) {
      return res.status(400).json({ error: 'Cannot delete yourself.' });
    }

    const deleted = db.users.splice(index, 1)[0];
    logActivity(user, 'Employee Deleted', 'Employee', deleted.id, deleted.name, `Admin removed employee record`);
    res.json({ success: true, deleted });
  });

  // ==========================================
  // ACTIVITIES (Audit Trail)
  // ==========================================
  app.get('/api/activities', (req: Request, res: Response) => {
    const user: User = (req as any).user;
    if (user.role === 'ADMIN') {
      res.json(db.activities);
    } else {
      res.json(db.activities.filter((a) => a.userId === user.id));
    }
  });

  // ==========================================
  // REPORTS & ANALYTICS (Admin Only)
  // ==========================================
  app.get('/api/reports', requireAdmin, (req: Request, res: Response) => {
    // 1. Revenue by Product + Digital Marketing
    const productRevenue = db.products.map((p) => {
      const activeSubs = db.subscriptions.filter((s) => s.productOrService === p.name && s.status === 'Active');
      const mrr = activeSubs.reduce((sum, s) => sum + s.amount, 0);
      const paidInvoices = db.payments.filter((pay) => pay.productOrService === p.name && pay.status === 'Paid');
      const totalCollected = paidInvoices.reduce((sum, pay) => sum + pay.amount, 0);
      return {
        name: p.name,
        color: p.color,
        mrr,
        totalCollected,
        activeSubscriptions: activeSubs.length,
      };
    });

    const mktSubs = db.subscriptions.filter((s) => s.productOrService === 'Digital Marketing' && s.status === 'Active');
    const mktPaid = db.payments.filter((pay) => pay.productOrService === 'Digital Marketing' && pay.status === 'Paid');
    productRevenue.push({
      name: 'Digital Marketing Services',
      color: '#4309A2',
      mrr: mktSubs.reduce((sum, s) => sum + s.amount, 0),
      totalCollected: mktPaid.reduce((sum, pay) => sum + pay.amount, 0),
      activeSubscriptions: mktSubs.length,
    });

    // 2. Lead Funnel Conversion
    const totalLeads = db.leads.length;
    const leadsByStatus = {
      New: db.leads.filter((l) => l.status === 'New').length,
      Contacted: db.leads.filter((l) => l.status === 'Contacted').length,
      FollowUp: db.leads.filter((l) => l.status === 'Follow-up').length,
      Interested: db.leads.filter((l) => l.status === 'Interested').length,
      Onboarding: db.leads.filter((l) => l.status === 'Onboarding').length,
      Converted: db.leads.filter((l) => l.status === 'Converted').length,
      Lost: db.leads.filter((l) => l.status === 'Lost' || l.status === 'Not Interested').length,
    };
    const conversionRate = totalLeads > 0 ? ((leadsByStatus.Converted / totalLeads) * 100).toFixed(1) : 0;

    // 3. Staff Productivity
    const staffLeaderboard = db.users
      .filter((u) => u.role === 'STAFF')
      .map((staff) => {
        const myLeads = db.leads.filter((l) => l.assignedStaffId === staff.id);
        const myConverted = myLeads.filter((l) => l.status === 'Converted').length;
        const myTasks = db.tasks.filter((t) => t.assignedStaffId === staff.id);
        const myCompletedTasks = myTasks.filter((t) => t.status === 'Completed').length;
        const myContent = db.content.filter((c) => c.assignedStaffId === staff.id && c.status === 'Published').length;

        return {
          staffId: staff.id,
          name: staff.name,
          department: staff.department,
          avatar: staff.avatar,
          totalLeads: myLeads.length,
          convertedLeads: myConverted,
          conversionRate: myLeads.length > 0 ? ((myConverted / myLeads.length) * 100).toFixed(0) : 0,
          completedTasks: myCompletedTasks,
          publishedContent: myContent,
        };
      });

    res.json({
      productRevenue,
      totalMRR: productRevenue.reduce((sum, item) => sum + item.mrr, 0),
      totalCollectedAllTime: productRevenue.reduce((sum, item) => sum + item.totalCollected, 0),
      leadFunnel: {
        totalLeads,
        leadsByStatus,
        conversionRate,
      },
      staffLeaderboard,
    });
  });

  // ==========================================
  // SETTINGS (Admin Only)
  // ==========================================
  app.get('/api/settings', (req: Request, res: Response) => {
    res.json(db.settings);
  });

  app.put('/api/settings', requireAdmin, (req: Request, res: Response) => {
    const user: User = (req as any).user;
    db.settings = { ...db.settings, ...req.body };
    logActivity(user, 'Company Settings Updated', 'System', 'settings_1', db.settings.companyName, `Updated global company settings & rules`);
    res.json(db.settings);
  });

  return app;
}

export async function startServer() {
  const app = createApiApp();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Company Management System running on http://localhost:${PORT}`);
  });
}

// Auto-run if executed directly as entrypoint via tsx or node
const isMainModule = process.argv[1] && (
  process.argv[1].endsWith('server.ts') ||
  process.argv[1].endsWith('server.cjs') ||
  process.argv[1].endsWith('server.js')
);

if (isMainModule || process.env.RUN_STANDALONE === 'true') {
  startServer();
}
