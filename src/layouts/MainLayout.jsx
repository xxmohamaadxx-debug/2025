
import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import TopNav from '@/components/TopNav';
import BottomNav from '@/components/BottomNav';
import { motion } from 'framer-motion';
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
    <div className="flex min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900/30 to-slate-900 dark:from-gray-900 dark:via-purple-950/40 dark:to-gray-900">
      {/* Unified Dark Gradient Background - Full Coverage */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900/30 to-slate-900 dark:from-gray-900 dark:via-purple-950/40 dark:to-gray-900 pointer-events-none z-0" />
      
      {/* Animated Background Particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-purple-500/10 dark:bg-orange-500/5"
            style={{
              width: `${Math.random() * 300 + 50}px`,
              height: `${Math.random() * 300 + 50}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, Math.random() * 100 - 50],
              x: [0, Math.random() * 100 - 50],
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.3, 0.1],
            }}
            transition={{
              duration: 15 + Math.random() * 10,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* Sidebar - No White Space */}
      <div className="relative z-20">
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      </div>
      
      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 lg:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content - No White Space, Seamless Connection */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <TopNav 
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} 
          isOffline={isOffline}
          pendingSyncCount={pendingSyncCount}
        />
        {isOffline && (
          <div className="bg-yellow-500/20 dark:bg-yellow-900/40 backdrop-blur-md border-b border-yellow-400/30 dark:border-yellow-800/50 px-4 py-2 text-sm text-yellow-900 dark:text-yellow-100 text-center relative z-20">
            <strong>وضع بدون إنترنت:</strong> يتم حفظ البيانات محلياً. سيتم رفعها تلقائياً عند الاتصال بالإنترنت.
            {pendingSyncCount > 0 && ` (${pendingSyncCount} عنصر في انتظار الرفع)`}
          </div>
        )}
        <main className="flex-1 overflow-y-auto scroll-smooth pb-20 lg:pb-6 custom-scrollbar relative z-10">
          <div className="w-full h-full">
            {children}
          </div>
        </main>
      </div>
      
      {/* Bottom Navigation for Mobile */}
      <BottomNav />
      
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            opacity: 0.3;
          }
          50% {
            transform: translate(${Math.random() * 50 - 25}px, ${Math.random() * 50 - 25}px) scale(1.1);
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  );
};

export default MainLayout;
