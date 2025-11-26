
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Search, User, Menu, Shield, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import Logo from '@/components/Logo';
import Notifications from '@/components/Notifications';

const TopNav = ({ onMenuClick, isOffline = false, pendingSyncCount = 0 }) => {
  const { user } = useAuth();
  const { t } = useLanguage();

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
        {isOffline && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <WifiOff className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <span className="text-xs text-yellow-800 dark:text-yellow-200 hidden sm:inline">بدون إنترنت</span>
            {pendingSyncCount > 0 && (
              <span className="text-xs bg-yellow-200 dark:bg-yellow-800 px-2 py-0.5 rounded-full">
                {pendingSyncCount}
              </span>
            )}
          </div>
        )}
        {!isOffline && navigator.onLine && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <Wifi className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="text-xs text-green-800 dark:text-green-200 hidden sm:inline">متصل</span>
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
