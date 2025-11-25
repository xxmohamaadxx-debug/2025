
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  LayoutDashboard, FileText, ShoppingCart, Package, 
  Users, Settings, LogOut, Shield, BarChart, 
  CreditCard, Briefcase, X
} from 'lucide-react';
import Logo from '@/components/Logo';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const location = useLocation();
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  
  const isActive = (path) => location.pathname === path;
  
  const navItemClass = (path) => `
    flex items-center px-4 py-3 mb-1 rounded-lg transition-all duration-200
    ${isActive(path) 
      ? 'bg-gradient-to-r from-orange-500/10 to-pink-500/10 text-orange-600 dark:text-orange-400 font-medium' 
      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}
  `;

  const handleLinkClick = () => {
    if (window.innerWidth < 1024) setIsOpen(false);
  };

  return (
    <div className={`
      fixed inset-y-0 rtl:right-0 ltr:left-0 z-30 w-64 bg-white dark:bg-gray-900 border-l rtl:border-r rtl:border-l-0 border-gray-200 dark:border-gray-800 
      transform transition-transform duration-300 ease-in-out
      lg:relative lg:translate-x-0 lg:static
      ${isOpen ? 'translate-x-0' : 'rtl:translate-x-full ltr:-translate-x-full lg:translate-x-0'}
    `}>
      <div className="p-4 md:p-6 flex justify-between items-center border-b border-gray-200 dark:border-gray-800">
        <Link to="/dashboard" className="flex items-center gap-2" onClick={handleLinkClick}>
          <Logo size="md" showText={true} className="flex-shrink-0" />
        </Link>
        <button 
          onClick={() => setIsOpen(false)} 
          className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="إغلاق القائمة"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <nav className="flex-1 px-2 sm:px-4 overflow-y-auto h-[calc(100vh-80px)] pb-4">
        {/* Admin Panel - فقط للمشرفين */}
        {user?.isSuperAdmin && (
          <>
             <div className="px-4 mb-2 mt-4 text-xs font-semibold text-purple-500 dark:text-purple-400 uppercase tracking-wider">
               {t('common.adminPanel')}
             </div>
             <Link to="/admin" className={navItemClass('/admin')} onClick={handleLinkClick}>
                <Shield className="h-5 w-5 ltr:mr-3 rtl:ml-3 text-purple-500 dark:text-purple-400" />
                <span className="font-medium">{t('common.adminPanel')}</span>
             </Link>
             <Link to="/admin-settings" className={navItemClass('/admin-settings')} onClick={handleLinkClick}>
                <Settings className="h-5 w-5 ltr:mr-3 rtl:ml-3 text-purple-500 dark:text-purple-400" />
                <span className="font-medium">إعدادات المدير</span>
             </Link>
          </>
        )}

        <div className="px-4 mb-2 mt-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('nav.overview') || 'نظرة عامة'}</div>
        
        <Link to="/dashboard" className={navItemClass('/dashboard')} onClick={handleLinkClick}>
          <LayoutDashboard className="h-5 w-5 ltr:mr-3 rtl:ml-3" />
          {t('common.dashboard')}
        </Link>

        <Link to="/invoices-in" className={navItemClass('/invoices-in')} onClick={handleLinkClick}>
          <FileText className="h-5 w-5 ltr:mr-3 rtl:ml-3" />
          {t('common.invoicesIn')}
        </Link>

        <Link to="/invoices-out" className={navItemClass('/invoices-out')} onClick={handleLinkClick}>
          <ShoppingCart className="h-5 w-5 ltr:mr-3 rtl:ml-3" />
          {t('common.invoicesOut')}
        </Link>

        <Link to="/inventory" className={navItemClass('/inventory')} onClick={handleLinkClick}>
          <Package className="h-5 w-5 ltr:mr-3 rtl:ml-3" />
          {t('common.inventory')}
        </Link>

        <div className="px-4 mb-2 mt-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('nav.management') || 'إدارة'}</div>

        <Link to="/partners" className={navItemClass('/partners')} onClick={handleLinkClick}>
          <Users className="h-5 w-5 ltr:mr-3 rtl:ml-3" />
          {t('common.partners')}
        </Link>
        
        <Link to="/employees" className={navItemClass('/employees')} onClick={handleLinkClick}>
          <Briefcase className="h-5 w-5 ltr:mr-3 rtl:ml-3" />
          {t('common.employees')}
        </Link>

        {(user?.isStoreOwner || user?.isSuperAdmin) && (
          <Link to="/store-users" className={navItemClass('/store-users')} onClick={handleLinkClick}>
            <Users className="h-5 w-5 ltr:mr-3 rtl:ml-3" />
            {t('common.storeUsers')}
          </Link>
        )}

        <Link to="/reports" className={navItemClass('/reports')} onClick={handleLinkClick}>
          <BarChart className="h-5 w-5 ltr:mr-3 rtl:ml-3" />
          {t('common.reports')}
        </Link>

        <div className="px-4 mb-2 mt-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('nav.system') || 'النظام'}</div>

        <Link to="/subscription" className={navItemClass('/subscription')} onClick={handleLinkClick}>
          <CreditCard className="h-5 w-5 ltr:mr-3 rtl:ml-3" />
          {t('common.subscription')}
        </Link>

        <Link to="/settings" className={navItemClass('/settings')} onClick={handleLinkClick}>
          <Settings className="h-5 w-5 ltr:mr-3 rtl:ml-3" />
          {t('common.settings')}
        </Link>

        <div className="pt-4 pb-8 border-t border-gray-200 dark:border-gray-800 mt-4">
          <button 
            onClick={logout}
            className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="h-5 w-5 ltr:mr-3 rtl:ml-3" />
            {t('common.logout')}
          </button>
        </div>
      </nav>
    </div>
  );
};

export default React.memo(Sidebar);
