
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Search, User, Menu, Shield, Wifi, WifiOff, Cloud, CloudOff, Loader2, RefreshCw, Globe, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import Logo from '@/components/Logo';
import Notifications from '@/components/Notifications';
import ProfileDropdown from '@/components/ProfileDropdown';
import { isOnline, syncOfflineData, getPendingCount } from '@/lib/offlineService';
import { neonService } from '@/lib/neonService';
import { toast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

const TopNav = ({ onMenuClick, isOffline: propIsOffline = false, pendingSyncCount: propPendingSyncCount = 0 }) => {
  const { user } = useAuth();
  const { t, locale, setLocale } = useLanguage();
  const [isOffline, setIsOffline] = useState(() => typeof window !== 'undefined' ? !navigator.onLine : false);
  const [pendingSyncCount, setPendingSyncCount] = useState(propPendingSyncCount);
  const [isSyncing, setIsSyncing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(() => typeof window !== 'undefined' && navigator.onLine ? 'online' : 'offline');
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

  const languages = [
    { code: 'ar', name: 'العربية', flag: '🇸🇦' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'tr', name: 'Türkçe', flag: '🇹🇷' }
  ];

  const currentLanguage = languages.find(lang => lang.code === locale) || languages[0];

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

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    // Check periodically
    const interval = setInterval(async () => {
      if (typeof window !== 'undefined' && navigator) {
        const online = navigator.onLine;
        setIsOffline(!online);
        setConnectionStatus(online ? 'online' : 'offline');
        if (online && user?.tenant_id) {
          const count = await getPendingCount(user.tenant_id);
          setPendingSyncCount(count);
        }
      }
    }, 5000);

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
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

  // Close language menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isLangMenuOpen && !event.target.closest('.language-selector-container')) {
        setIsLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isLangMenuOpen]);

  return (
    <header className="h-16 bg-gradient-to-r from-slate-900/95 via-purple-900/80 to-slate-900/95 dark:from-gray-900/95 dark:via-purple-950/90 dark:to-gray-900/95 backdrop-blur-xl border-b border-orange-500/20 dark:border-orange-400/20 px-4 md:px-6 flex items-center justify-between sticky top-0 z-40 transition-all shadow-lg shadow-black/20">
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
        {/* Language Selector */}
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-orange-500/10 to-pink-500/10 hover:from-orange-500/20 hover:to-pink-500/20 border border-orange-500/20 hover:border-orange-500/40 transition-all duration-300 backdrop-blur-sm"
          >
            <Globe className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:inline">
              {currentLanguage.flag} {currentLanguage.name}
            </span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 sm:hidden">
              {currentLanguage.flag}
            </span>
            <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform duration-300 ${isLangMenuOpen ? 'rotate-180' : ''}`} />
          </motion.button>
          
          <AnimatePresence>
            {isLangMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute top-full mt-2 rtl:left-0 ltr:right-0 z-50 w-48 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden"
              >
                {languages.map((lang) => (
                  <motion.button
                    key={lang.code}
                    whileHover={{ x: 5, backgroundColor: 'rgba(255, 140, 0, 0.1)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (setLocale && typeof setLocale === 'function') {
                        setLocale(lang.code);
                        // Force update HTML dir and lang attributes
                        document.documentElement.lang = lang.code;
                        document.documentElement.dir = lang.code === 'ar' ? 'rtl' : 'ltr';
                        // Force page reload to apply translations
                        window.location.reload();
                      }
                      setIsLangMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left rtl:text-right transition-all duration-200 ${
                      locale === lang.code
                        ? 'bg-gradient-to-r from-orange-500/20 to-pink-500/20 text-orange-600 dark:text-orange-400 font-semibold'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <span className="text-xl">{lang.flag}</span>
                    <span className="flex-1">{lang.name}</span>
                    {locale === lang.code && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-2 h-2 rounded-full bg-orange-500"
                      />
                    )}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

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
        {pendingSyncCount > 0 && typeof window !== 'undefined' && isOnline() && (
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

        {pendingSyncCount > 0 && typeof window !== 'undefined' && !isOnline() && (
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
        
        <ProfileDropdown user={user} />
      </div>
    </header>
  );
};

export default React.memo(TopNav);
