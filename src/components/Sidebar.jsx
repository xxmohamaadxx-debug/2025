
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { neonService } from '@/lib/neonService';
import { 
  LayoutDashboard, FileText, ShoppingCart, Package, 
  Users, Settings, LogOut, Shield, BarChart, 
  CreditCard, Briefcase, X, MessageCircle, Database, Activity,
  Wifi, Fuel, Store, Building2, Bell
} from 'lucide-react';
import Logo from '@/components/Logo';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const location = useLocation();
  const { t } = useLanguage();
  const { user, tenant, logout } = useAuth();
  const [storeTypes, setStoreTypes] = useState([]);
  const [loadingStoreTypes, setLoadingStoreTypes] = useState(false);
  
  const isActive = (path) => location.pathname === path;
  
  const navItemClass = (path) => {
    const isActivePath = isActive(path);
    return `
      group relative flex items-center px-4 py-3 mb-2 rounded-xl 
      transition-all duration-300 ease-out
      ${isActivePath 
        ? 'bg-gradient-to-r from-orange-500/30 via-pink-500/20 to-purple-500/20 text-white font-semibold shadow-lg shadow-orange-500/20 transform scale-[1.02]' 
        : 'text-gray-300 hover:text-white hover:bg-gradient-to-r hover:from-orange-500/10 hover:via-pink-500/5 hover:to-purple-500/10 hover:shadow-md hover:shadow-orange-500/10'}
      before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-r before:from-orange-500/0 before:via-pink-500/0 before:to-purple-500/0
      before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300
      after:absolute after:left-0 after:top-1/2 after:-translate-y-1/2 after:w-1 after:h-0 
      after:bg-gradient-to-b after:from-orange-500 after:to-pink-500 after:rounded-r-full
      after:transition-all after:duration-300
      ${isActivePath ? 'after:h-8' : 'after:h-0 group-hover:after:h-6'}
    `;
  };

  // جلب أنواع المتاجر للمستخدم الحالي
  useEffect(() => {
    const loadStoreTypes = async () => {
      if (!user?.tenant_id) return;
      
      try {
        setLoadingStoreTypes(true);
        const types = await neonService.getTenantStoreTypes(user.tenant_id);
        setStoreTypes(types || []);
      } catch (error) {
        console.error('Load store types error:', error);
      } finally {
        setLoadingStoreTypes(false);
      }
    };
    
    if (user?.tenant_id && !user?.isSuperAdmin) {
      loadStoreTypes();
    }
  }, [user?.tenant_id, user?.isSuperAdmin]);

  const handleLinkClick = () => {
    if (window.innerWidth < 1024) setIsOpen(false);
  };

  // دالة للتحقق من إظهار قسم معين حسب نوع المتجر
  const shouldShowSection = (sectionCodes) => {
    // Super Admin يرى كل شيء
    if (user?.isSuperAdmin) return true;
    
    // إذا لم يكن هناك أنواع متاجر محددة، أظهر كل شيء (للتوافق مع النظام القديم)
    if (!storeTypes || storeTypes.length === 0) return true;
    
    // التحقق من وجود نوع متجر يطابق الأقسام المطلوبة
    const storeTypeCodes = storeTypes.map(st => st.store_type_code).filter(Boolean);
    
    // إذا كان القسم مطلوباً لأنواع متعددة، يجب أن يكون أحدها موجود
    if (Array.isArray(sectionCodes)) {
      return sectionCodes.some(code => storeTypeCodes.includes(code));
    }
    
    return storeTypeCodes.includes(sectionCodes);
  };

  // تحديد الأقسام لكل نوع متجر
  const isInternetCafe = shouldShowSection(['internet_cafe', 'internet_cafe_accessories']);
  const isFuelStation = shouldShowSection(['fuel', 'general_with_fuel']);
  const isContractor = shouldShowSection(['contractor']);

  return (
    <div className={`
      fixed inset-y-0 rtl:right-0 ltr:left-0 z-30 w-64 
      bg-gradient-to-br from-gray-900 via-gray-800 to-black dark:from-gray-950 dark:via-gray-900 dark:to-black
      backdrop-blur-xl bg-opacity-95
      border-l rtl:border-r rtl:border-l-0 
      border-transparent
      shadow-2xl shadow-black/50
      transform transition-all duration-300 ease-in-out
      lg:relative lg:translate-x-0 lg:static
      ${isOpen ? 'translate-x-0' : 'rtl:translate-x-full ltr:-translate-x-full lg:translate-x-0'}
      before:absolute before:inset-0 before:bg-gradient-to-br before:from-orange-500/10 before:via-pink-500/5 before:to-purple-500/10 before:opacity-50
      after:absolute after:inset-0 after:bg-[radial-gradient(circle_at_20%_50%,rgba(255,140,0,0.1),transparent_50%)] after:pointer-events-none
    `}
    style={{
      backgroundImage: 'linear-gradient(135deg, rgba(255,140,0,0.05) 0%, rgba(236,72,153,0.05) 50%, rgba(168,85,247,0.05) 100%)'
    }}>
      <div className="p-4 md:p-6 flex justify-between items-center border-b border-orange-500/20 relative z-10 bg-gradient-to-r from-orange-500/5 to-transparent">
        <Link 
          to="/dashboard" 
          className="flex items-center gap-2 group relative" 
          onClick={handleLinkClick}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-pink-500/20 rounded-lg opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300 -z-10"></div>
          <Logo size="md" showText={true} className="flex-shrink-0 transform group-hover:scale-110 transition-transform duration-300" />
        </Link>
        <button 
          onClick={() => setIsOpen(false)} 
          className="lg:hidden text-gray-400 hover:text-white p-2 rounded-lg hover:bg-orange-500/20 backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:rotate-90"
          aria-label="إغلاق القائمة"
        >
          <X className="h-5 w-5" />
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

        <Link to="/daily-transactions" className={navItemClass('/daily-transactions')} onClick={handleLinkClick}>
          <Activity className="h-5 w-5 ltr:mr-3 rtl:ml-3" />
          الحركة اليومية
        </Link>

        <Link to="/customers" className={navItemClass('/customers')} onClick={handleLinkClick}>
          <Users className="h-5 w-5 ltr:mr-3 rtl:ml-3" />
          العملاء والديون
        </Link>

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

        {/* صالات الإنترنت - تظهر فقط إذا كان نوع المتجر يدعمها */}
        {(isInternetCafe || user?.isSuperAdmin) && (
          <>
            <div className="px-4 mb-2 mt-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">صالات الإنترنت</div>
            
            <Link to="/subscribers" className={navItemClass('/subscribers')} onClick={handleLinkClick}>
              <Users className="h-5 w-5 ltr:mr-3 rtl:ml-3" />
              المشتركين
            </Link>

            <Link to="/internet-usage" className={navItemClass('/internet-usage')} onClick={handleLinkClick}>
              <Wifi className="h-5 w-5 ltr:mr-3 rtl:ml-3" />
              استخدام الإنترنت
            </Link>
          </>
        )}

        {/* محطات المحروقات - تظهر فقط إذا كان نوع المتجر يدعمها */}
        {(isFuelStation || user?.isSuperAdmin) && (
          <>
            <div className="px-4 mb-2 mt-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">محطات المحروقات</div>
            
            <Link to="/fuel-station" className={navItemClass('/fuel-station')} onClick={handleLinkClick}>
              <Fuel className="h-5 w-5 ltr:mr-3 rtl:ml-3" />
              متجر المحروقات
            </Link>
          </>
        )}

        {/* متجر المقاولين - يظهر فقط إذا كان نوع المتجر يدعمه */}
        {(isContractor || user?.isSuperAdmin) && (
          <>
            <div className="px-4 mb-2 mt-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">متجر المقاولين</div>
            
            <Link to="/contractor-projects" className={navItemClass('/contractor-projects')} onClick={handleLinkClick}>
              <Building2 className="h-5 w-5 ltr:mr-3 rtl:ml-3" />
              المشاريع
            </Link>

            <Link to="/contractor-project-items" className={navItemClass('/contractor-project-items')} onClick={handleLinkClick}>
              <FileText className="h-5 w-5 ltr:mr-3 rtl:ml-3" />
              بنود الكميات (BOQ)
            </Link>
          </>
        )}

        {user?.isSuperAdmin && (
          <Link to="/store-types" className={navItemClass('/store-types')} onClick={handleLinkClick}>
            <Store className="h-5 w-5 ltr:mr-3 rtl:ml-3 text-purple-500 dark:text-purple-400" />
            أنواع المتاجر
          </Link>
        )}

        <div className="px-4 mb-2 mt-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('nav.system') || 'النظام'}</div>

        <Link to="/subscription" className={navItemClass('/subscription')} onClick={handleLinkClick}>
          <CreditCard className="h-5 w-5 ltr:mr-3 rtl:ml-3" />
          {t('common.subscription')}
        </Link>

        <Link to="/notification-settings" className={navItemClass('/notification-settings')} onClick={handleLinkClick}>
          <Bell className="h-5 w-5 ltr:mr-3 rtl:ml-3" />
          إعدادات الإشعارات
        </Link>

        <Link to="/support" className={navItemClass('/support')} onClick={handleLinkClick}>
          <MessageCircle className="h-5 w-5 ltr:mr-3 rtl:ml-3" />
          الدعم والمساعدة
        </Link>

        {(user?.isStoreOwner || user?.isSuperAdmin) && (
          <Link to="/backup" className={navItemClass('/backup')} onClick={handleLinkClick}>
            <Database className="h-5 w-5 ltr:mr-3 rtl:ml-3" />
            النسخ الاحتياطي
          </Link>
        )}

        <Link to="/settings" className={navItemClass('/settings')} onClick={handleLinkClick}>
          <Settings className="h-5 w-5 ltr:mr-3 rtl:ml-3" />
          {t('common.settings')}
        </Link>

        <div className="pt-4 pb-8 border-t border-orange-500/20 mt-4 relative z-10">
          <button 
            onClick={logout}
            className="group flex items-center w-full px-4 py-3 text-sm text-red-400 hover:text-white rounded-xl transition-all duration-300 relative overflow-hidden
                       hover:bg-gradient-to-r hover:from-red-500/20 hover:via-pink-500/10 hover:to-red-500/20
                       before:absolute before:inset-0 before:bg-gradient-to-r before:from-red-500/0 before:to-pink-500/0 
                       before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300
                       hover:shadow-lg hover:shadow-red-500/20 hover:scale-[1.02]"
          >
            <LogOut className="h-5 w-5 ltr:mr-3 rtl:ml-3 transform group-hover:rotate-12 transition-transform duration-300" />
            <span className="relative z-10">{t('common.logout')}</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default React.memo(Sidebar);
