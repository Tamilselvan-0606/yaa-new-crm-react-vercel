import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { CustomThemeProvider } from './theme/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';

// Views
import { DashboardView } from './views/dashboard/DashboardView';
import { BranchesView } from './views/branches/BranchesView';
import { ProductsView } from './views/products/ProductsView';
import { LeadsView } from './views/leads/LeadsView';
import { NewInvoiceView } from './views/invoices/NewInvoiceView';
import { InvoicesView } from './views/invoices/InvoicesView';
import { NewProformaInvoiceView } from './views/proforma/NewProformaInvoiceView';
import { ProformaInvoicesView } from './views/proforma/ProformaInvoicesView';
import { ContentPlannerView } from './views/work-management/ContentPlannerView';
import { TasksView } from './views/work-management/TasksView';
import { PaymentsView } from './views/payments/PaymentsView';
import { SubscriptionsView } from './views/subscriptions/SubscriptionsView';
import { SubscriptionPlansView } from './views/subscriptions/SubscriptionPlansView';
import { OrganizationSubscriptionsView } from './views/subscriptions/OrganizationSubscriptionsView';
import { RemindersView } from './views/reminders/RemindersView';
import { EmployeesView } from './views/employees/EmployeesView';
import { ReportsView } from './views/reports/ReportsView';
import { SettingsView } from './views/settings/SettingsView';
import { QuotesView } from './views/quotes/QuotesView';
import { LoginView } from './views/login/LoginView';
import { OrganizationView } from './views/organizations/OrganizationView';

// Sale Management Views
import { CategoryView } from './views/sale-management/inventory/CategoryView';
import { SubcategoryView } from './views/sale-management/inventory/SubcategoryView';
import { InventoryProductsView } from './views/sale-management/inventory/InventoryProductsView';
import { StocksView } from './views/sale-management/inventory/StocksView';
import { InventoryReportView } from './views/sale-management/inventory/InventoryReportView';
import { CustomerView } from './views/sale-management/sales-hub/CustomerView';
import { SalesView } from './views/sale-management/sales-hub/SalesView';
import { EstimateQuotationView } from './views/sale-management/sales-hub/EstimateQuotationView';
import { ProformaInvoiceView } from './views/sale-management/sales-hub/ProformaInvoiceView';
import { SaleOrderView } from './views/sale-management/sales-hub/SaleOrderView';
import { DeliveryChallanView } from './views/sale-management/sales-hub/DeliveryChallanView';
import { PaymentInView } from './views/sale-management/sales-hub/PaymentInView';
import { SalesReturnView } from './views/sale-management/sales-hub/SalesReturnView';
import { SalesReportView } from './views/sale-management/sales-hub/SalesReportView';
import { SupplierView } from './views/sale-management/purchase/SupplierView';
import { PurchaseRequestView } from './views/sale-management/purchase/PurchaseRequestView';
import { PurchaseOrderView } from './views/sale-management/purchase/PurchaseOrderView';
import { PurchaseReturnView } from './views/sale-management/purchase/PurchaseReturnView';
import { PaymentOutView } from './views/sale-management/purchase/PaymentOutView';
import { ExpenseView } from './views/sale-management/purchase/ExpenseView';
import { SaleManagementReportsView } from './views/sale-management/reports/SaleManagementReportsView';
import { PendingDuesView } from './views/pending-dues/PendingDuesView';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 30, // 30 seconds
      retry: 1,
    },
  },
});

const MainLayout: React.FC = () => {
  const { currentUser, isAdmin, isSuperAdmin, isOrgSuperAdmin, isAuthenticated, isLoading } = useAuth();
  const isBranchAdmin = currentUser?.email?.toLowerCase() === 'branchadmin@gmail.com';
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Quick Action Modal States
  const [quickLeadOpen, setQuickLeadOpen] = useState(false);
  const [quickTaskOpen, setQuickTaskOpen] = useState(false);
  const [quickContentOpen, setQuickContentOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0F142A]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-[#4309A2] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-300">Loading Yaa Creations...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen w-full bg-[#F5F7FA] overflow-hidden font-sans print:block print:h-auto print:overflow-visible print:bg-white">
      {/* Primary Left Navigation */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden print:block print:h-auto print:overflow-visible">
        {/* Top Header */}
        <Header
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          onOpenAddLead={() => setQuickLeadOpen(true)}
          onOpenCreateTask={() => setQuickTaskOpen(true)}
          onOpenCreateContent={() => setQuickContentOpen(true)}
        />

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-5 lg:p-6 w-full max-w-[1600px] mx-auto min-w-0 print:block print:h-auto print:overflow-visible print:p-0 print:m-0 print:max-w-none">
          {isSuperAdmin && !isOrgSuperAdmin ? (
            // ==========================================
            // SUPER ADMIN ROUTES:
            // Only Dashboard, Organization, Subscription Plans, Organization Subscriptions
            // ==========================================
            <Routes>
              <Route
                path="/"
                element={
                  <DashboardView
                    onOpenAddLead={() => setQuickLeadOpen(true)}
                    onOpenCreateTask={() => setQuickTaskOpen(true)}
                    onOpenCreateContent={() => setQuickContentOpen(true)}
                  />
                }
              />
              <Route path="/organization" element={<OrganizationView />} />
              <Route path="/subscription-plans" element={<SubscriptionPlansView />} />
              <Route path="/organization-subscriptions" element={<OrganizationSubscriptionsView />} />
              <Route path="/quotes" element={<QuotesView />} />
              <Route path="/quotes/new" element={<QuotesView initialCreateOpen={true} />} />
              <Route path="/proforma" element={<Navigate to="/proforma/invoices" replace />} />
              <Route path="/proforma/new" element={<NewProformaInvoiceView />} />
              <Route path="/proforma/invoices" element={<ProformaInvoicesView />} />
              <Route path="/customers" element={<InvoicesView />} />
              <Route path="/sales" element={<Navigate to="/sales/new" replace />} />
              <Route path="/sales/new" element={<NewInvoiceView />} />
              <Route path="/sales/invoices" element={<InvoicesView />} />
              <Route path="/settings" element={<SettingsView />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          ) : (
            // ==========================================
            // ADMIN & STAFF ROUTES (UNCHANGED)
            // Plus Organization for Org Super Admin
            // ==========================================
            <Routes>
              <Route
                path="/"
                element={
                  <DashboardView
                    onOpenAddLead={() => setQuickLeadOpen(true)}
                    onOpenCreateTask={() => setQuickTaskOpen(true)}
                    onOpenCreateContent={() => setQuickContentOpen(true)}
                  />
                }
              />
              <Route path="/organization" element={<OrganizationView />} />
              <Route
                path="/branches"
                element={isBranchAdmin ? <Navigate to="/" replace /> : <BranchesView />}
              />
              <Route path="/products" element={<ProductsView />} />
              <Route path="/products/:productId" element={<ProductsView />} />
              <Route
                path="/leads"
                element={
                  <LeadsView
                    initialCreateOpen={quickLeadOpen}
                    onCloseInitialCreate={() => setQuickLeadOpen(false)}
                  />
                }
              />
              <Route path="/quotes" element={<QuotesView />} />
              <Route path="/quotes/new" element={<QuotesView initialCreateOpen={true} />} />
              <Route path="/proforma" element={<Navigate to="/proforma/invoices" replace />} />
              <Route path="/proforma/new" element={<NewProformaInvoiceView />} />
              <Route path="/proforma/invoices" element={<ProformaInvoicesView />} />
              <Route path="/customers" element={<InvoicesView />} />
              <Route path="/sales" element={<Navigate to="/sales/new" replace />} />
              <Route path="/sales/new" element={<NewInvoiceView />} />
              <Route path="/sales/invoices" element={<InvoicesView />} />
              <Route
                path="/content"
                element={
                  <ContentPlannerView
                    initialCreateOpen={quickContentOpen}
                    onCloseInitialCreate={() => setQuickContentOpen(false)}
                  />
                }
              />
              <Route
                path="/tasks"
                element={
                  <TasksView
                    initialCreateOpen={quickTaskOpen}
                    onCloseInitialCreate={() => setQuickTaskOpen(false)}
                  />
                }
              />
              <Route path="/payments" element={<PaymentsView />} />
              <Route path="/subscriptions" element={<SubscriptionsView />} />
              <Route path="/reminders" element={<RemindersView />} />

              {/* Admin Protected Views */}
              <Route
                path="/employees"
                element={isAdmin ? <EmployeesView /> : <Navigate to="/" replace />}
              />
              <Route
                path="/reports"
                element={isAdmin ? <ReportsView /> : <Navigate to="/" replace />}
              />

              {/* Sale Management - Inventory */}
              <Route
                path="/sale-management/inventory/category"
                element={<CategoryView />}
              />
              <Route
                path="/sale-management/inventory/subcategory"
                element={<SubcategoryView />}
              />
              <Route
                path="/sale-management/inventory/products"
                element={<InventoryProductsView />}
              />
              <Route
                path="/sale-management/inventory/stocks"
                element={<StocksView />}
              />
              <Route
                path="/sale-management/inventory/report"
                element={<Navigate to="/sale-management/reports" replace />}
              />

              {/* Sale Management - Sales Hub */}
              <Route
                path="/sale-management/sales/customer"
                element={<CustomerView />}
              />
              <Route
                path="/sale-management/sales/sale"
                element={<SalesView />}
              />
              <Route
                path="/sale-management/sales/quotation"
                element={<EstimateQuotationView />}
              />
              <Route
                path="/sale-management/sales/estimate"
                element={<EstimateQuotationView />}
              />
              <Route
                path="/sale-management/sales/proforma"
                element={<ProformaInvoiceView />}
              />
              <Route
                path="/sale-management/sales/proforma/new"
                element={<ProformaInvoiceView initialMode="form" />}
              />
              <Route
                path="/sale-management/sales/sale-order"
                element={<SaleOrderView />}
              />
              <Route
                path="/sale-management/sales/order"
                element={<SaleOrderView />}
              />
              <Route
                path="/sale-management/sales/order/new"
                element={<SaleOrderView initialMode="form" />}
              />
              <Route
                path="/sale-management/sales/payment-in"
                element={<PaymentInView />}
              />
              <Route
                path="/sale-management/sales/payment"
                element={<PaymentInView />}
              />
              <Route
                path="/sale-management/sales/delivery-challan"
                element={<DeliveryChallanView />}
              />
              <Route
                path="/sale-management/sales/challan"
                element={<DeliveryChallanView />}
              />
              <Route
                path="/sale-management/sales/challan/new"
                element={<DeliveryChallanView initialMode="form" />}
              />
              <Route
                path="/sale-management/sales/return"
                element={<SalesReturnView />}
              />
              <Route
                path="/sale-management/sales/report"
                element={<Navigate to="/sale-management/reports" replace />}
              />

              {/* Sale Management - Purchase */}
              <Route
                path="/sale-management/purchase/supplier"
                element={<SupplierView />}
              />
              <Route
                path="/sale-management/purchase/request"
                element={<PurchaseRequestView />}
              />
              <Route
                path="/sale-management/purchase/purchase"
                element={<PurchaseOrderView />}
              />
              <Route
                path="/sale-management/purchase/return"
                element={<PurchaseReturnView />}
              />
              <Route
                path="/sale-management/purchase/payment-out"
                element={<PaymentOutView />}
              />
              <Route
                path="/sale-management/purchase/expense"
                element={<ExpenseView />}
              />

              {/* Sale Management - Common Reports Hub */}
              <Route
                path="/sale-management/reports"
                element={<SaleManagementReportsView />}
              />

              {/* Pending Dues Module */}
              <Route
                path="/pending-dues"
                element={<PendingDuesView />}
              />

              <Route
                path="/settings"
                element={isAdmin ? <SettingsView /> : <Navigate to="/" replace />}
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          )}
        </main>
      </div>
    </div>
  );
};

const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginView />}
      />
      <Route path="/*" element={<MainLayout />} />
    </Routes>
  );
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CustomThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
            <Toaster position="top-right" richColors closeButton />
          </BrowserRouter>
        </AuthProvider>
      </CustomThemeProvider>
    </QueryClientProvider>
  );
}
