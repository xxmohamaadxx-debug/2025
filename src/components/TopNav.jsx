
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Search, User, Menu, Shield, Wifi, WifiOff, Cloud, CloudOff, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import Logo from '@/components/Logo';
import Notifications from '@/components/Notifications';
import { isOnline, syncOfflineData, getPendingCount } from '@/lib/offlineService';
import { neonService } from '@/lib/neonService';
import { toast } from '@/components/ui/use-toast';

const TopNav = ({ onMenuClick, isOffline: propIsOffline = false, pendingSyncCount: propPendingSyncCount = 0 }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(propPendingSyncCount);
  const [isSyncing, setIsSyncing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(navigator.onLine ? 'online' : 'offline');

  useEffect(() => {
    const handleOnline = async () => {
      setIsOffline(false);
      setConnectionStatus('online');
      if (user?.tenant_id) {
        const count = await getPendingCount(user.tenant_id);
        setPendingSyncCount(count);
      }
    };

    const handleOffline = () => {
      setIsOffline(true);
      setConnectionStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check periodically
    const interval = setInterval(async () => {
      const online = navigator.onLine;
      setIsOffline(!online);
      setConnectionStatus(online ? 'online' : 'offline');
      if (online && user?.tenant_id) {
        const count = await getPendingCount(user.tenant_id);
        setPendingSyncCount(count);
      }
    }, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [user?.tenant_id]);

  const handleManualSync = async () => {
    if (!user?.tenant_id || isSyncing) return;
    
    setIsSyncing(true);
    try {
      const result = await syncOfflineData(async (item) => {
        const { table_name, operation_type, record_data, record_id } = item;
        
        switch (table_name) {
          case 'invoices_in':
            if (operation_type === 'create') {
              await neonService.createInvoiceIn(record_data, user.tenant_id, record_data.items || []);
            } else if (operation_type === 'update' && record_id) {
              await neonService.updateInvoiceIn(record_id, record_data, user.tenant_id);
            }
            break;
          case 'invoices_out':
            if (operation_type === 'create') {
              await neonService.createInvoiceOut(record_data, user.tenant_id, record_data.items || []);
            } else if (operation_type === 'update' && record_id) {
              await neonService.updateInvoiceOut(record_id, record_data, user.tenant_id);
            }
            break;
          default:
            console.warn('Unknown table for sync:', table_name);
        }
      }, user.tenant_id, user.id);

      if (result.synced > 0) {
        toast({
          title: 'تمت المزامنة بنجاح',
          description: `تم رفع ${result.synced} عنصر بنجاح`,
        });
      }
      if (result.failed > 0) {
        toast({
          title: 'فشل مزامنة بعض العناصر',
          description: `فشل رفع ${result.failed} عنصر`,
          variant: 'destructive',
        });
      }

      const count = await getPendingCount(user.tenant_id);
      setPendingSyncCount(count);
    } catch (error) {
      console.error('Manual sync error:', error);
      toast({
        title: 'خطأ في المزامنة',
        description: error.message || 'حدث خطأ أثناء المزامنة',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 md:px-6 flex items-center justify-between sticky top-0 z-10 transition-colors">
      <div className="flex items-center gap-4 flex-1">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          aria-label="قائمة التنقل"
        >
          <Menu className="h-6 w-6" />
        </button>
        
        {/* Logo visible on mobile and desktop */}
        <div className="lg:hidden">
          <Logo size="sm" showText={false} />
        </div>
        
        <div className="relative w-full max-w-md hidden md:block">
          <Search className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder={t('common.search')}
            className="w-full ltr:pl-10 ltr:pr-4 rtl:pr-10 rtl:pl-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {/* Connection Status Indicator with Animation */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-300 ${
          connectionStatus === 'online' 
            ? 'bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-800 animate-pulse' 
            : 'bg-yellow-100 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
        }`}>
          {connectionStatus === 'online' ? (
            <Wifi className="h-4 w-4 text-green-600 dark:text-green-400 animate-pulse" />
          ) : (
            <WifiOff className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          )}
          <span className={`text-xs hidden sm:inline ${
            connectionStatus === 'online' 
              ? 'text-green-800 dark:text-green-200' 
              : 'text-yellow-800 dark:text-yellow-200'
          }`}>
            {connectionStatus === 'online' ? 'متصل' : 'بدون إنترنت'}
          </span>
        </div>

        {/* Manual Sync Button */}
        {pendingSyncCount > 0 && isOnline() && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualSync}
            disabled={isSyncing}
            className={`gap-2 border-blue-500 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-900/20 transition-all hover:scale-105 active:scale-95 shadow-sm hover:shadow-md ${
              isSyncing ? 'animate-pulse' : ''
            }`}
          >
            {isSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {isSyncing ? 'جاري المزامنة...' : `مزامنة (${pendingSyncCount})`}
            </span>
          </Button>
        )}

        {pendingSyncCount > 0 && !isOnline() && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-100 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
            <CloudOff className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <span className="text-xs text-orange-800 dark:text-orange-200 hidden sm:inline">
              {pendingSyncCount} في الانتظار
            </span>
          </div>
        )}
        
        {user?.isSuperAdmin && (
          <Link to="/admin">
            <Button variant="outline" size="sm" className="gap-2 border-purple-500 text-purple-600 hover:bg-purple-50 dark:border-purple-400 dark:text-purple-400 dark:hover:bg-purple-900/20">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">{t('common.adminPanel')}</span>
            </Button>
          </Link>
        )}
        
        <Notifications />
        
        <div className="flex items-center gap-3 pl-4 rtl:pr-4 rtl:pl-0 border-l rtl:border-r rtl:border-l-0 border-gray-200 dark:border-gray-700">
          <div className="text-right rtl:text-left hidden sm:block">
            <div className="text-sm font-semibold text-gray-900 dark:text-white">{user?.name || 'User'}</div>
            <div className="text-xs text-gray-500">{user?.role || 'Admin'}</div>
          </div>
          <div className="h-9 w-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center border border-gray-200 dark:border-gray-600">
            <User className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default React.memo(TopNav);
