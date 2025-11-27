
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { neonService } from '@/lib/neonService';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, FileText, ShoppingCart, Package, 
  Users, Settings, LogOut, Shield, BarChart, 
  CreditCard, Briefcase, X, MessageCircle, Database, Activity,
  Wifi, Fuel, Store, Building2, Bell
} from 'lucide-react';
import Logo from '@/components/Logo';
import NavItem from './NavItem';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const location = useLocation();
  const { t } = useLanguage();
  const { user, tenant, logout } = useAuth();
  const [storeTypes, setStoreTypes] = useState([]);
  const [loadingStoreTypes, setLoadingStoreTypes] = useState(false);
  
  const isActive = (path) => location.pathname === path;
  
  // لا نحتاج navItemClass بعد الآن - سنستخدم motion.div مباشرة

  // جلب أنواع المتاجر للمستخدم الحالي
  useEffect(() => {
    const loadStoreTypes = async () => {
      if (!user?.tenant_id) {
        setStoreTypes([]);
        return;
      }
      
      try {
        setLoadingStoreTypes(true);
        const types = await neonService.getTenantStoreTypes(user.tenant_id);
        // التأكد من أن البيانات في الصيغة الصحيحة
        const formattedTypes = (types || []).map(type => ({
          ...type,
          store_type_code: type.store_type_code || type.code || '',
          code: type.store_type_code || type.code || ''
        }));
        setStoreTypes(formattedTypes);
      } catch (error) {
        console.error('Load store types error:', error);
        setStoreTypes([]);
      } finally {
        setLoadingStoreTypes(false);
      }
    };
    
    if (user?.tenant_id && !user?.isSuperAdmin) {
      loadStoreTypes();
    } else if (user?.isSuperAdmin) {
      // Super Admin لا يحتاج تحميل الأنواع
      setStoreTypes([]);
    }
  }, [user?.tenant_id, user?.isSuperAdmin]);

  const handleLinkClick = () => {
    if (window.innerWidth < 1024) setIsOpen(false);
  };

  // دالة للتحقق من إظهار قسم معين حسب نوع المتجر
  const shouldShowSection = (sectionCodes) => {
    // Super Admin يرى كل شيء
    if (user?.isSuperAdmin) return true;
    
    // إذا لم يكن هناك أنواع متاجر محددة، لا تعرض الأقسام المتخصصة
    if (!storeTypes || storeTypes.length === 0) {
      return false;
    }
    
    // التحقق من وجود نوع متجر يطابق الأقسام المطلوبة
    const storeTypeCodes = storeTypes.map(st => {
      // الحصول على code من store_type_code أو code مباشرة
      const code = st.store_type_code || st.code || '';
      return code.toLowerCase().trim();
    }).filter(Boolean);
    
    // إذا كان القسم مطلوباً لأنواع متعددة، يجب أن يكون أحدها موجود
    if (Array.isArray(sectionCodes)) {
      const normalizedSectionCodes = sectionCodes.map(c => c.toLowerCase().trim());
      const hasMatch = normalizedSectionCodes.some(code => storeTypeCodes.includes(code));
      return hasMatch;
    }
    
    const normalizedCode = sectionCodes.toLowerCase().trim();
    return storeTypeCodes.includes(normalizedCode);
  };

  // تحديد الأقسام لكل نوع متجر - فقط إذا كان نوع المتجر يطابق
  const isInternetCafe = shouldShowSection(['internet_cafe', 'internet_cafe_accessories']);
  const isFuelStation = shouldShowSection(['fuel', 'general_with_fuel']);
  const isContractor = shouldShowSection(['contractor']);

  const getSidebarVariants = () => {
    if (typeof window === 'undefined') return { open: { x: 0 }, closed: { x: 0 } };
    const isDesktop = window.innerWidth >= 1024;
    const isRTL = document.documentElement.dir === 'rtl';
    return {
      open: { 
        x: 0, 
        opacity: 1,
        transition: { type: "spring", stiffness: 300, damping: 30 }
      },
      closed: { 
        x: isDesktop ? 0 : (isRTL ? 256 : -256), 
        opacity: 1,
        transition: { type: "spring", stiffness: 300, damping: 30 }
      }
    };
  };
  
  const sidebarVariants = getSidebarVariants();

  return (
    <motion.div
      initial={false}
      animate={isOpen ? 'open' : 'closed'}
      variants={sidebarVariants}
      className={`
        fixed inset-y-0 rtl:right-0 ltr:left-0 z-30 w-64 
        lg:relative lg:translate-x-0 lg:static
      `}
      style={{
        perspective: '1000px',
      }}
    >
      {/* 3D Container with Advanced Glassmorphism & Neon Effects */}
      <div 
        className="relative h-full w-full overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 27, 75, 0.98) 50%, rgba(15, 23, 42, 0.98) 100%)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderRight: '1px solid rgba(255, 140, 0, 0.15)',
          boxShadow: 'inset -10px 0 30px -15px rgba(255, 140, 0, 0.3), 10px 0 60px rgba(0, 0, 0, 0.6), 0 0 100px rgba(255, 140, 0, 0.1)',
        }}
      >
        {/* Animated Neon Border Sweep */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255, 140, 0, 0.4), rgba(236, 72, 153, 0.4), transparent)',
            opacity: 0.6,
          }}
          animate={{
            x: ['-100%', '200%'],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
        
        {/* Glowing Particles Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(25)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(255, 140, 0, 1), transparent)',
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                boxShadow: '0 0 15px rgba(255, 140, 0, 0.8), 0 0 30px rgba(255, 140, 0, 0.4)',
              }}
              animate={{
                y: [0, -40, 0],
                opacity: [0.1, 1, 0.1],
                scale: [1, 2, 1],
              }}
              transition={{
                duration: 4 + Math.random() * 3,
                repeat: Infinity,
                delay: Math.random() * 3,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
        {/* Header with 3D Effect */}
        <motion.div 
          className="p-4 md:p-6 flex justify-between items-center border-b border-orange-500/20 relative z-10"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 140, 0, 0.1) 0%, rgba(236, 72, 153, 0.05) 100%)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <motion.div
            whileHover={{ scale: 1.05, rotateY: 5 }}
            whileTap={{ scale: 0.95 }}
            style={{ transformStyle: 'preserve-3d' }}
          >
            <Link 
              to="/dashboard" 
              className="flex items-center gap-2 group relative" 
              onClick={handleLinkClick}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-orange-500/30 to-pink-500/30 rounded-lg blur-xl"
                animate={{
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              <Logo size="md" showText={true} className="flex-shrink-0 relative z-10" />
            </Link>
          </motion.div>
          <motion.button 
            onClick={() => setIsOpen(false)} 
            className="lg:hidden text-gray-400 hover:text-white p-2 rounded-lg hover:bg-orange-500/20 backdrop-blur-sm relative z-10"
            whileHover={{ scale: 1.2, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            aria-label="إغلاق القائمة"
          >
            <X className="h-5 w-5" />
          </motion.button>
        </motion.div>

      <nav className="flex-1 px-2 sm:px-4 overflow-y-auto h-[calc(100vh-80px)] pb-4">
        {/* Admin Panel - فقط للمشرفين */}
        {user?.isSuperAdmin && (
          <>
             <div className="px-4 mb-2 mt-4 text-xs font-semibold text-purple-500 dark:text-purple-400 uppercase tracking-wider">
               {t('common.adminPanel')}
             </div>
             <NavItem
               to="/admin"
               icon={Shield}
               label={t('common.adminPanel')}
               isActive={isActive('/admin')}
               onClick={handleLinkClick}
               delay={0.05}
             />
             <NavItem
               to="/admin-settings"
               icon={Settings}
               label="إعدادات المدير"
               isActive={isActive('/admin-settings')}
               onClick={handleLinkClick}
               delay={0.1}
             />
          </>
        )}

        <div className="px-4 mb-2 mt-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('nav.overview') || 'نظرة عامة'}</div>
        
        <NavItem
          to="/dashboard"
          icon={LayoutDashboard}
          label={t('common.dashboard')}
          isActive={isActive('/dashboard')}
          onClick={handleLinkClick}
          delay={0.15}
        />
        <NavItem
          to="/invoices-in"
          icon={FileText}
          label={t('common.invoicesIn')}
          isActive={isActive('/invoices-in')}
          onClick={handleLinkClick}
          delay={0.2}
        />
        <NavItem
          to="/invoices-out"
          icon={ShoppingCart}
          label={t('common.invoicesOut')}
          isActive={isActive('/invoices-out')}
          onClick={handleLinkClick}
          delay={0.25}
        />
        <NavItem
          to="/inventory"
          icon={Package}
          label={t('common.inventory')}
          isActive={isActive('/inventory')}
          onClick={handleLinkClick}
          delay={0.3}
        />

        <div className="px-4 mb-2 mt-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('nav.management') || 'إدارة'}</div>

        <NavItem
          to="/daily-transactions"
          icon={Activity}
          label="الحركة اليومية"
          isActive={isActive('/daily-transactions')}
          onClick={handleLinkClick}
          delay={0.35}
        />
        <NavItem
          to="/customers"
          icon={Users}
          label="العملاء والديون"
          isActive={isActive('/customers')}
          onClick={handleLinkClick}
          delay={0.4}
        />
        <NavItem
          to="/partners"
          icon={Users}
          label={t('common.partners')}
          isActive={isActive('/partners')}
          onClick={handleLinkClick}
          delay={0.45}
        />
        <NavItem
          to="/employees"
          icon={Briefcase}
          label={t('common.employees')}
          isActive={isActive('/employees')}
          onClick={handleLinkClick}
          delay={0.5}
        />
        {(user?.isStoreOwner || user?.isSuperAdmin) && (
          <NavItem
            to="/store-users"
            icon={Users}
            label={t('common.storeUsers')}
            isActive={isActive('/store-users')}
            onClick={handleLinkClick}
            delay={0.55}
          />
        )}
        <NavItem
          to="/reports"
          icon={BarChart}
          label={t('common.reports')}
          isActive={isActive('/reports')}
          onClick={handleLinkClick}
          delay={0.6}
        />

        {/* صالات الإنترنت - تظهر فقط إذا كان نوع المتجر يدعمها */}
        {(isInternetCafe || user?.isSuperAdmin) && (
          <>
            <div className="px-4 mb-2 mt-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">صالات الإنترنت</div>
            
            <NavItem
              to="/subscribers"
              icon={Users}
              label="المشتركين"
              isActive={isActive('/subscribers')}
              onClick={handleLinkClick}
              delay={0.65}
            />
            <NavItem
              to="/internet-usage"
              icon={Wifi}
              label="استخدام الإنترنت"
              isActive={isActive('/internet-usage')}
              onClick={handleLinkClick}
              delay={0.7}
            />
          </>
        )}

        {/* محطات المحروقات - تظهر فقط إذا كان نوع المتجر يدعمها */}
        {(isFuelStation || user?.isSuperAdmin) && (
          <>
            <div className="px-4 mb-2 mt-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">محطات المحروقات</div>
            
            <NavItem
              to="/fuel-station"
              icon={Fuel}
              label="متجر المحروقات"
              isActive={isActive('/fuel-station')}
              onClick={handleLinkClick}
              delay={0.75}
            />
          </>
        )}

        {/* متجر المقاولين - يظهر فقط إذا كان نوع المتجر يدعمه */}
        {(isContractor || user?.isSuperAdmin) && (
          <>
            <div className="px-4 mb-2 mt-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">متجر المقاولين</div>
            
            <NavItem
              to="/contractor-projects"
              icon={Building2}
              label="المشاريع"
              isActive={isActive('/contractor-projects')}
              onClick={handleLinkClick}
              delay={0.8}
            />
            <NavItem
              to="/contractor-project-items"
              icon={FileText}
              label="بنود الكميات (BOQ)"
              isActive={isActive('/contractor-project-items')}
              onClick={handleLinkClick}
              delay={0.85}
            />
          </>
        )}

        {user?.isSuperAdmin && (
          <NavItem
            to="/store-types"
            icon={Store}
            label="أنواع المتاجر"
            isActive={isActive('/store-types')}
            onClick={handleLinkClick}
            delay={0.9}
          />
        )}

        <div className="px-4 mb-2 mt-6 text-xs font-semibold text-gray-400 uppercase tracking-wider relative z-10">
          {t('nav.system') || 'النظام'}
        </div>

        <NavItem
          to="/subscription"
          icon={CreditCard}
          label={t('common.subscription')}
          isActive={isActive('/subscription')}
          onClick={handleLinkClick}
          delay={0.95}
        />
        <NavItem
          to="/notification-settings"
          icon={Bell}
          label="إعدادات الإشعارات"
          isActive={isActive('/notification-settings')}
          onClick={handleLinkClick}
          delay={1.0}
        />
        <NavItem
          to="/support"
          icon={MessageCircle}
          label="الدعم والمساعدة"
          isActive={isActive('/support')}
          onClick={handleLinkClick}
          delay={1.05}
        />
        {(user?.isStoreOwner || user?.isSuperAdmin) && (
          <NavItem
            to="/backup"
            icon={Database}
            label="النسخ الاحتياطي"
            isActive={isActive('/backup')}
            onClick={handleLinkClick}
            delay={1.1}
          />
        )}
        <NavItem
          to="/settings"
          icon={Settings}
          label={t('common.settings')}
          isActive={isActive('/settings')}
          onClick={handleLinkClick}
          delay={1.15}
        />

        {/* Logout Button with Advanced Animation */}
        <motion.div 
          className="pt-4 pb-8 border-t border-orange-500/20 mt-4 relative z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.3 }}
        >
          <motion.button 
            onClick={logout}
            whileHover={{ 
              scale: 1.02,
              x: 5,
              boxShadow: '0 10px 30px rgba(239, 68, 68, 0.3)'
            }}
            whileTap={{ scale: 0.98 }}
            className="group flex items-center w-full px-4 py-3 text-sm text-red-400 hover:text-white rounded-xl transition-all duration-300 relative overflow-hidden
                       hover:bg-gradient-to-r hover:from-red-500/30 hover:via-pink-500/20 hover:to-red-500/30"
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-pink-500/0 to-red-500/0 opacity-0 group-hover:opacity-100 blur-xl"
              transition={{ duration: 0.3 }}
            />
            <motion.div
              whileHover={{ rotate: 12 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <LogOut className="h-5 w-5 ltr:mr-3 rtl:ml-3 relative z-10" />
            </motion.div>
            <span className="relative z-10 font-medium">{t('common.logout')}</span>
          </motion.button>
        </motion.div>
      </nav>
      </div>
    </motion.div>
  );
};

export default React.memo(Sidebar);
