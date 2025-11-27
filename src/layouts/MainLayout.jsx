
import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import TopNav from '@/components/TopNav';
import BottomNav from '@/components/BottomNav';
import { initOfflineService, isOnline, syncOfflineData, getPendingCount } from '@/lib/offlineService';
import { useAuth } from '@/contexts/AuthContext';
import { neonService } from '@/lib/neonService';
import { toast } from '@/components/ui/use-toast';

const MainLayout = ({ children }) => {
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });
  const [isOffline, setIsOffline] = useState(() => typeof window !== 'undefined' && navigator ? !navigator.onLine : false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // Initialize offline service
  useEffect(() => {
    initOfflineService();
    
    // Check pending items
    const checkPending = async () => {
      if (user?.tenant_id) {
        const count = await getPendingCount(user.tenant_id);
        setPendingSyncCount(count);
      }
    };
    checkPending();
    const interval = setInterval(checkPending, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [user?.tenant_id]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = async () => {
      setIsOffline(false);
      if (user?.tenant_id) {
        // Sync offline data
        try {
          const result = await syncOfflineData(async (item) => {
            // Sync function based on table and operation type
            const { table_name, operation_type, record_data, record_id } = item;
            
            switch (table_name) {
              case 'invoices_in':
                if (operation_type === 'create') {
                  await neonService.createInvoiceIn(record_data, user.tenant_id, record_data.items || []);
                } else if (operation_type === 'update' && record_id) {
                  await neonService.updateInvoiceIn(record_id, record_data, user.tenant_id);
                  if (record_data.items) {
                    await neonService.updateInvoiceItems(record_id, 'invoice_in', record_data.items, user.tenant_id);
                  }
                } else if (operation_type === 'delete' && record_id) {
                  await neonService.deleteInvoiceIn(record_id, user.tenant_id);
                }
                break;
              case 'invoices_out':
                if (operation_type === 'create') {
                  await neonService.createInvoiceOut(record_data, user.tenant_id, record_data.items || []);
                } else if (operation_type === 'update' && record_id) {
                  await neonService.updateInvoiceOut(record_id, record_data, user.tenant_id);
                  if (record_data.items) {
                    await neonService.updateInvoiceItems(record_id, 'invoice_out', record_data.items, user.tenant_id);
                  }
                } else if (operation_type === 'delete' && record_id) {
                  await neonService.deleteInvoiceOut(record_id, user.tenant_id);
                }
                break;
              case 'partners':
                if (operation_type === 'create') {
                  await neonService.createPartner(record_data, user.tenant_id);
                } else if (operation_type === 'update' && record_id) {
                  await neonService.updatePartner(record_id, record_data, user.tenant_id);
                } else if (operation_type === 'delete' && record_id) {
                  await neonService.deletePartner(record_id, user.tenant_id);
                }
                break;
              case 'customer_transactions':
                if (operation_type === 'create') {
                  await neonService.createCustomerTransaction(record_data, user.tenant_id);
                } else if (operation_type === 'update' && record_id) {
                  await neonService.updateCustomerTransaction(record_id, record_data, user.tenant_id);
                } else if (operation_type === 'delete' && record_id) {
                  await neonService.deleteCustomerTransaction(record_id, user.tenant_id);
                }
                break;
              default:
                console.warn('Unknown table for sync:', table_name);
            }
          }, user.tenant_id, user.id);
          
          if (result.synced > 0) {
            toast({
              title: 'تم مزامنة البيانات',
              description: `تم رفع ${result.synced} عنصر بنجاح`,
            });
          }
          
          const count = await getPendingCount(user.tenant_id);
          setPendingSyncCount(count);
        } catch (error) {
          console.error('Sync error:', error);
        }
      }
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, [user?.tenant_id, user?.id]);
  
  // Keep sidebar open on large screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      
      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300">
        <TopNav 
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} 
          isOffline={isOffline}
          pendingSyncCount={pendingSyncCount}
        />
        {isOffline && (
          <div className="bg-yellow-100 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 px-4 py-2 text-sm text-yellow-800 dark:text-yellow-200 text-center">
            <strong>وضع بدون إنترنت:</strong> يتم حفظ البيانات محلياً. سيتم رفعها تلقائياً عند الاتصال بالإنترنت.
            {pendingSyncCount > 0 && ` (${pendingSyncCount} عنصر في انتظار الرفع)`}
          </div>
        )}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 scroll-smooth pb-20 lg:pb-6">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
      
      {/* Bottom Navigation for Mobile */}
      <BottomNav />
    </div>
  );
};

export default MainLayout;
