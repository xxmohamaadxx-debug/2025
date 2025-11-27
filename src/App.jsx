
import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Toaster } from '@/components/ui/toaster';
import AuthLayout from '@/layouts/AuthLayout';
import MainLayout from '@/layouts/MainLayout';
import ErrorBoundary from '@/components/ErrorBoundary';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import SubscriptionWarning from '@/components/SubscriptionWarning';
import { Loader2 } from 'lucide-react';

// Lazy Load Pages for Performance
const LoginPage = React.lazy(() => import('@/pages/LoginPage'));
const RegisterPage = React.lazy(() => import('@/pages/RegisterPage'));
const DashboardPage = React.lazy(() => import('@/pages/DashboardPage'));
const InvoicesInPage = React.lazy(() => import('@/pages/InvoicesInPage'));
const InvoicesOutPage = React.lazy(() => import('@/pages/InvoicesOutPage'));
const InventoryPage = React.lazy(() => import('@/pages/InventoryPage'));
const EmployeesPage = React.lazy(() => import('@/pages/EmployeesPage'));
const PayrollPage = React.lazy(() => import('@/pages/PayrollPage'));
const ReportsPage = React.lazy(() => import('@/pages/ReportsPage'));
const PartnersPage = React.lazy(() => import('@/pages/PartnersPage'));
const UsersPage = React.lazy(() => import('@/pages/UsersPage'));
const StoreUsersPage = React.lazy(() => import('@/pages/StoreUsersPage'));
const AdminPanel = React.lazy(() => import('@/pages/AdminPanel'));
const AdminSettingsPage = React.lazy(() => import('@/pages/AdminSettingsPage'));
const AuditLogPage = React.lazy(() => import('@/pages/AuditLogPage'));
const SettingsPage = React.lazy(() => import('@/pages/SettingsPage'));
const SubscriptionPage = React.lazy(() => import('@/pages/SubscriptionPage'));
const SupportPage = React.lazy(() => import('@/pages/SupportPage'));
const BackupPage = React.lazy(() => import('@/pages/BackupPage'));
const DailyTransactionsPage = React.lazy(() => import('@/pages/DailyTransactionsPage'));
const CustomersPage = React.lazy(() => import('@/pages/CustomersPage'));
const SubscribersPage = React.lazy(() => import('@/pages/SubscribersPage'));
const InternetUsagePage = React.lazy(() => import('@/pages/InternetUsagePage'));
const FuelStationPage = React.lazy(() => import('@/pages/FuelStationPage'));
const StoreTypesPage = React.lazy(() => import('@/pages/StoreTypesPage'));
const ContractorProjectsPage = React.lazy(() => import('@/pages/ContractorProjectsPage'));
const ContractorProjectItemsPage = React.lazy(() => import('@/pages/ContractorProjectItemsPage'));
const NotificationSettingsPage = React.lazy(() => import('@/pages/NotificationSettingsPage'));
const LandingPage = React.lazy(() => import('@/pages/LandingPage'));
const NotFoundPage = React.lazy(() => import('@/pages/NotFoundPage'));

// Internet Cafe Pages
const InternetCafeSubscribersPage = React.lazy(() => import('@/pages/internet-cafe/InternetCafeSubscribersPage'));
const SubscriptionTypesPage = React.lazy(() => import('@/pages/internet-cafe/SubscriptionTypesPage'));
const InternetSessionsPage = React.lazy(() => import('@/pages/internet-cafe/InternetSessionsPage'));
const InternetCafeDevicesPage = React.lazy(() => import('@/pages/internet-cafe/InternetCafeDevicesPage'));

// Store Pages
const ProductsPage = React.lazy(() => import('@/pages/store/ProductsPage'));
const POSPage = React.lazy(() => import('@/pages/store/POSPage'));
const SalesInvoicesPage = React.lazy(() => import('@/pages/store/SalesInvoicesPage'));
const PurchaseInvoicesPage = React.lazy(() => import('@/pages/store/PurchaseInvoicesPage'));
const ProductBundlesPage = React.lazy(() => import('@/pages/store/ProductBundlesPage'));

// Reports
const ComprehensiveReportsPage = React.lazy(() => import('@/pages/reports/ComprehensiveReportsPage'));

const LoadingSpinner = () => (
  <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
    <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
  </div>
);

function PrivateRoute({ children, roles = [] }) {
  const { user, tenant, loading } = useAuth();
  const location = useLocation();
  
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  
  // حماية من الوصول عند انتهاء الاشتراك أو تعليق البيانات (ماعدا المدير والصفحات المسموحة)
  const allowedPathsWhenExpired = ['/subscription', '/settings', '/login', '/register'];
  const isPathAllowed = allowedPathsWhenExpired.some(path => location.pathname.startsWith(path));
  
  // التحقق من تعليق البيانات
  if (!user.isSuperAdmin && tenant?.data_suspended && !isPathAllowed) {
    return (
      <Navigate to="/subscription" replace state={{ suspended: true }} />
    );
  }
  
  // التحقق من انتهاء الصلاحية
  if (!user.isSuperAdmin && tenant?.isExpired && !tenant?.data_suspended && !isPathAllowed) {
    return <Navigate to="/subscription" replace />;
  }
  
  if (roles.length > 0) {
      const hasRole = roles.includes('ANY') || 
                      (roles.includes('SUPER_ADMIN') && user.isSuperAdmin) ||
                      (roles.includes('STORE_OWNER') && user.isStoreOwner);
      if (!hasRole && !user.isSuperAdmin) return <Navigate to="/dashboard" replace />;
  }
  
  return children;
}

function PublicRoute({ children, allowAuthenticated = false }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  // إذا كان المستخدم مسجل دخول ولم نسمح له بالبقاء، أرسله للوحة التحكم
  // لكن إذا كان المسار هو Landing Page، اسمح له بالبقاء
  if (user && !allowAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
}

function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <ThemeProvider>
          <AuthProvider>
            <Router>
              <Helmet>
                <title>نظام إبراهيم للمحاسبة</title>
                <meta name="description" content="نظام محاسبة متعدد المتاجر احترافي" />
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
                <html lang="ar" dir="rtl" />
              </Helmet>
              <Suspense fallback={<LoadingSpinner />}>
                <Routes>
                  <Route path="/landing" element={
                    <PublicRoute allowAuthenticated={true}>
                      <LandingPage />
                    </PublicRoute>
                  } />
                  <Route path="/" element={
                    <PublicRoute allowAuthenticated={true}>
                      <LandingPage />
                    </PublicRoute>
                  } />
                  <Route path="/login" element={
                    <PublicRoute>
                      <AuthLayout>
                        <LoginPage />
                      </AuthLayout>
                    </PublicRoute>
                  } />
                  <Route path="/register" element={
                    <PublicRoute>
                      <AuthLayout>
                        <RegisterPage />
                      </AuthLayout>
                    </PublicRoute>
                  } />
                  
                  {/* Protected Routes */}
                  <Route path="/dashboard" element={
                    <PrivateRoute roles={['ANY']}>
                      <MainLayout>
                          <SubscriptionWarning />
                          <DashboardPage />
                      </MainLayout>
                    </PrivateRoute>
                  } />

                  <Route path="/admin" element={
                    <PrivateRoute roles={['SUPER_ADMIN']}>
                      <MainLayout>
                        <AdminPanel />
                      </MainLayout>
                    </PrivateRoute>
                  } />

                  <Route path="/admin-settings" element={
                    <PrivateRoute roles={['SUPER_ADMIN']}>
                      <MainLayout>
                        <AdminSettingsPage />
                      </MainLayout>
                    </PrivateRoute>
                  } />

                  <Route path="/store-users" element={
                    <PrivateRoute roles={['STORE_OWNER', 'SUPER_ADMIN']}>
                      <MainLayout>
                          <SubscriptionWarning />
                          <StoreUsersPage />
                      </MainLayout>
                    </PrivateRoute>
                  } />

                  <Route path="/invoices-in" element={<PrivateRoute roles={['ANY']}><MainLayout><SubscriptionWarning /><InvoicesInPage /></MainLayout></PrivateRoute>} />
                  <Route path="/invoices-out" element={<PrivateRoute roles={['ANY']}><MainLayout><SubscriptionWarning /><InvoicesOutPage /></MainLayout></PrivateRoute>} />
                  <Route path="/inventory" element={<PrivateRoute roles={['ANY']}><MainLayout><SubscriptionWarning /><InventoryPage /></MainLayout></PrivateRoute>} />
                  <Route path="/employees" element={<PrivateRoute roles={['ANY']}><MainLayout><SubscriptionWarning /><EmployeesPage /></MainLayout></PrivateRoute>} />
                  <Route path="/payroll" element={<PrivateRoute roles={['ANY']}><MainLayout><SubscriptionWarning /><PayrollPage /></MainLayout></PrivateRoute>} />
                  <Route path="/reports" element={<PrivateRoute roles={['ANY']}><MainLayout><SubscriptionWarning /><ReportsPage /></MainLayout></PrivateRoute>} />
                  <Route path="/partners" element={<PrivateRoute roles={['ANY']}><MainLayout><SubscriptionWarning /><PartnersPage /></MainLayout></PrivateRoute>} />
                  <Route path="/users" element={<PrivateRoute roles={['ANY']}><MainLayout><SubscriptionWarning /><UsersPage /></MainLayout></PrivateRoute>} />
                  <Route path="/audit-log" element={<PrivateRoute roles={['ANY']}><MainLayout><SubscriptionWarning /><AuditLogPage /></MainLayout></PrivateRoute>} />
                  <Route path="/settings" element={<PrivateRoute roles={['ANY']}><MainLayout><SubscriptionWarning /><SettingsPage /></MainLayout></PrivateRoute>} />
                  <Route path="/subscription" element={<PrivateRoute roles={['ANY']}><MainLayout><SubscriptionWarning /><SubscriptionPage /></MainLayout></PrivateRoute>} />
                  <Route path="/support" element={<PrivateRoute roles={['ANY']}><MainLayout><SubscriptionWarning /><SupportPage /></MainLayout></PrivateRoute>} />
                  <Route path="/backup" element={<PrivateRoute roles={['STORE_OWNER', 'SUPER_ADMIN']}><MainLayout><SubscriptionWarning /><BackupPage /></MainLayout></PrivateRoute>} />
                  <Route path="/daily-transactions" element={<PrivateRoute roles={['ANY']}><MainLayout><SubscriptionWarning /><DailyTransactionsPage /></MainLayout></PrivateRoute>} />
                  <Route path="/customers" element={<PrivateRoute roles={['ANY']}><MainLayout><SubscriptionWarning /><CustomersPage /></MainLayout></PrivateRoute>} />
                  <Route path="/subscribers" element={<PrivateRoute roles={['ANY']}><MainLayout><SubscriptionWarning /><SubscribersPage /></MainLayout></PrivateRoute>} />
                  <Route path="/internet-usage" element={<PrivateRoute roles={['ANY']}><MainLayout><SubscriptionWarning /><InternetUsagePage /></MainLayout></PrivateRoute>} />
                  
                  {/* Internet Cafe Routes */}
                  <Route path="/internet-cafe/subscribers" element={<PrivateRoute roles={['ANY']}><MainLayout><SubscriptionWarning /><InternetCafeSubscribersPage /></MainLayout></PrivateRoute>} />
                  <Route path="/internet-cafe/subscription-types" element={<PrivateRoute roles={['ANY']}><MainLayout><SubscriptionWarning /><SubscriptionTypesPage /></MainLayout></PrivateRoute>} />
                  <Route path="/internet-cafe/sessions" element={<PrivateRoute roles={['ANY']}><MainLayout><SubscriptionWarning /><InternetSessionsPage /></MainLayout></PrivateRoute>} />
                  <Route path="/internet-cafe/devices" element={<PrivateRoute roles={['ANY']}><MainLayout><SubscriptionWarning /><InternetCafeDevicesPage /></MainLayout></PrivateRoute>} />
                  
                  {/* Store Routes */}
                  <Route path="/store/products" element={<PrivateRoute roles={['ANY']}><MainLayout><SubscriptionWarning /><ProductsPage /></MainLayout></PrivateRoute>} />
                  <Route path="/store/pos" element={<PrivateRoute roles={['ANY']}><MainLayout><SubscriptionWarning /><POSPage /></MainLayout></PrivateRoute>} />
                  <Route path="/store/sales-invoices" element={<PrivateRoute roles={['ANY']}><MainLayout><SubscriptionWarning /><SalesInvoicesPage /></MainLayout></PrivateRoute>} />
                  <Route path="/store/purchase-invoices" element={<PrivateRoute roles={['ANY']}><MainLayout><SubscriptionWarning /><PurchaseInvoicesPage /></MainLayout></PrivateRoute>} />
                  <Route path="/store/bundles" element={<PrivateRoute roles={['ANY']}><MainLayout><SubscriptionWarning /><ProductBundlesPage /></MainLayout></PrivateRoute>} />
                  
                  {/* Comprehensive Reports */}
                  <Route path="/comprehensive-reports" element={<PrivateRoute roles={['ANY']}><MainLayout><SubscriptionWarning /><ComprehensiveReportsPage /></MainLayout></PrivateRoute>} />
                  
                  <Route path="/fuel-station" element={<PrivateRoute roles={['ANY']}><MainLayout><SubscriptionWarning /><FuelStationPage /></MainLayout></PrivateRoute>} />
                  <Route path="/contractor-projects" element={<PrivateRoute roles={['ANY']}><MainLayout><SubscriptionWarning /><ContractorProjectsPage /></MainLayout></PrivateRoute>} />
                  <Route path="/contractor-project-items" element={<PrivateRoute roles={['ANY']}><MainLayout><SubscriptionWarning /><ContractorProjectItemsPage /></MainLayout></PrivateRoute>} />
                  <Route path="/store-types" element={<PrivateRoute roles={['SUPER_ADMIN']}><MainLayout><StoreTypesPage /></MainLayout></PrivateRoute>} />
                  <Route path="/notification-settings" element={<PrivateRoute roles={['ANY']}><MainLayout><SubscriptionWarning /><NotificationSettingsPage /></MainLayout></PrivateRoute>} />
                  
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
              <Toaster />
            </Router>
          </AuthProvider>
        </ThemeProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;
