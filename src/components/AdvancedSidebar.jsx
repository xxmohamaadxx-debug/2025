
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
  Wifi, Fuel, Store, Building2, Bell, ChevronLeft, ChevronRight, Menu, Home
} from 'lucide-react';
import Logo from '@/components/Logo';
import NavItem from './NavItem';

const SIDEBAR_MODES = {
  FULL: 'full',
  COLLAPSED: 'collapsed',
  ICON_ONLY: 'icon_only'
};

const AdvancedSidebar = ({ isOpen, setIsOpen, mode: initialMode = SIDEBAR_MODES.FULL, onModeChange }) => {
  const location = useLocation();
  const { t } = useLanguage();
  const { user, tenant, logout } = useAuth();
  const [storeTypes, setStoreTypes] = useState([]);
  const [loadingStoreTypes, setLoadingStoreTypes] = useState(false);
  const [sidebarMode, setSidebarMode] = useState(initialMode);
  const [isHovered, setIsHovered] = useState(false);
  
  const isActive = (path) => location.pathname === path;
  
  useEffect(() => {
    const loadStoreTypes = async () => {
      if (!user?.tenant_id) {
        setStoreTypes([]);
        return;
      }
      
      try {
        setLoadingStoreTypes(true);
        const types = await neonService.getTenantStoreTypes(user.tenant_id);
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
      setStoreTypes([]);
    }
  }, [user?.tenant_id, user?.isSuperAdmin]);

  const handleLinkClick = () => {
    if (window.innerWidth < 1024) setIsOpen(false);
  };

  const shouldShowSection = (sectionCodes) => {
    if (user?.isSuperAdmin) return true;
    if (!storeTypes || storeTypes.length === 0) return false;
    
    const storeTypeCodes = storeTypes.map(st => {
      const code = st.store_type_code || st.code || '';
      return code.toLowerCase().trim();
    }).filter(Boolean);
    
    if (Array.isArray(sectionCodes)) {
      const normalizedSectionCodes = sectionCodes.map(c => c.toLowerCase().trim());
      const hasMatch = normalizedSectionCodes.some(code => storeTypeCodes.includes(code));
      return hasMatch;
    }
    
    const normalizedCode = sectionCodes.toLowerCase().trim();
    return storeTypeCodes.includes(normalizedCode);
  };

  const isInternetCafe = shouldShowSection(['internet_cafe', 'internet_cafe_accessories']);
  const isFuelStation = shouldShowSection(['fuel', 'general_with_fuel']);
  const isContractor = shouldShowSection(['contractor']);

  const toggleMode = () => {
    const modes = [SIDEBAR_MODES.FULL, SIDEBAR_MODES.COLLAPSED, SIDEBAR_MODES.ICON_ONLY];
    const currentIndex = modes.indexOf(sidebarMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setSidebarMode(nextMode);
    if (onModeChange) onModeChange(nextMode);
  };

  const getSidebarWidth = () => {
    if (sidebarMode === SIDEBAR_MODES.ICON_ONLY) return 'w-16';
    if (sidebarMode === SIDEBAR_MODES.COLLAPSED) return 'w-48';
    return 'w-64';
  };

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
  const sidebarWidth = getSidebarWidth();

  return (
    <motion.div
      initial={false}
      animate={isOpen ? 'open' : 'closed'}
      variants={sidebarVariants}
      className={`
        fixed inset-y-0 rtl:right-0 ltr:left-0 z-30 ${sidebarWidth}
        lg:relative lg:translate-x-0 lg:static
        transition-all duration-300
      `}
      style={{
        perspective: '1000px',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Unified Dark Gradient Background - No White Space */}
      <div 
        className="relative h-full w-full overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 27, 75, 0.98) 50%, rgba(15, 23, 42, 0.98) 100%)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderRight: '1px solid rgba(255, 140, 0, 0.2)',
          boxShadow: 'inset -10px 0 30px -15px rgba(255, 140, 0, 0.2), 10px 0 60px rgba(0, 0, 0, 0.5), 0 0 100px rgba(255, 140, 0, 0.05)',
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

        {/* Header */}
        <motion.div 
          className="p-4 md:p-6 flex justify-between items-center border-b border-orange-500/20 relative z-10"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 140, 0, 0.1) 0%, rgba(236, 72, 153, 0.05) 100%)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <AnimatePresence mode="wait">
            {sidebarMode !== SIDEBAR_MODES.ICON_ONLY && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
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
                  <Logo noLink size="md" showText={sidebarMode === SIDEBAR_MODES.FULL} className="flex-shrink-0 relative z-10" />
                </Link>
              </motion.div>
            )}
            {sidebarMode === SIDEBAR_MODES.ICON_ONLY && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex justify-center w-full"
              >
                <Logo size="sm" showText={false} />
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="flex items-center gap-2">
            {/* Mode Toggle Button */}
            <motion.button 
              onClick={toggleMode}
              className="hidden lg:flex text-gray-400 hover:text-white p-2 rounded-lg hover:bg-orange-500/20 backdrop-blur-sm relative z-10"
              whileHover={{ scale: 1.2, rotate: 180 }}
              whileTap={{ scale: 0.9 }}
              title="Toggle Sidebar Mode"
            >
              {sidebarMode === SIDEBAR_MODES.FULL ? <ChevronLeft className="h-4 w-4" /> : 
               sidebarMode === SIDEBAR_MODES.COLLAPSED ? <ChevronRight className="h-4 w-4" /> :
               <Menu className="h-4 w-4" />}
            </motion.button>
            
            {/* Close Button for Mobile */}
            <motion.button 
              onClick={() => setIsOpen(false)} 
              className="lg:hidden text-gray-400 hover:text-white p-2 rounded-lg hover:bg-orange-500/20 backdrop-blur-sm relative z-10"
              whileHover={{ scale: 1.2, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              aria-label="إغلاق القائمة"
            >
              <X className="h-5 w-5" />
            </motion.button>
          </div>
        </motion.div>

        <nav className="flex-1 px-2 sm:px-4 overflow-y-auto h-[calc(100vh-80px)] pb-4 custom-scrollbar">
          {/* Navigation Items - Same structure as before but with mode-aware rendering */}
          {user?.isSuperAdmin && (
            <>
              {sidebarMode !== SIDEBAR_MODES.ICON_ONLY && (
                <div className="px-4 mb-2 mt-4 text-xs font-semibold text-purple-500 dark:text-purple-400 uppercase tracking-wider">
                  {t('common.adminPanel')}
                </div>
              )}
              <NavItem
                to="/admin"
                icon={Shield}
                label={t('common.adminPanel')}
                isActive={isActive('/admin')}
                onClick={handleLinkClick}
                delay={0.05}
                compact={sidebarMode !== SIDEBAR_MODES.FULL}
                iconOnly={sidebarMode === SIDEBAR_MODES.ICON_ONLY}
              />
              {/* Admin settings, RBAC and store-types are consolidated inside AdminPanel to reduce sidebar clutter */}
            </>
          )}

          {sidebarMode !== SIDEBAR_MODES.ICON_ONLY && (
            <div className="px-4 mb-2 mt-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {t('nav.overview') || 'نظرة عامة'}
            </div>
          )}
          
          <NavItem
            to="/dashboard"
            icon={LayoutDashboard}
            label={t('common.dashboard')}
            isActive={isActive('/dashboard')}
            onClick={handleLinkClick}
            delay={0.15}
            compact={sidebarMode !== SIDEBAR_MODES.FULL}
            iconOnly={sidebarMode === SIDEBAR_MODES.ICON_ONLY}
          />
          
          {/* Add more NavItems here with same pattern */}
          {/* For brevity, I'll add a few key ones */}
          
          <NavItem
            to="/invoices-in"
            icon={FileText}
            label={t('common.invoicesIn')}
            isActive={isActive('/invoices-in')}
            onClick={handleLinkClick}
            delay={0.2}
            compact={sidebarMode !== SIDEBAR_MODES.FULL}
            iconOnly={sidebarMode === SIDEBAR_MODES.ICON_ONLY}
          />
          
          <NavItem
            to="/invoices-out"
            icon={ShoppingCart}
            label={t('common.invoicesOut')}
            isActive={isActive('/invoices-out')}
            onClick={handleLinkClick}
            delay={0.25}
            compact={sidebarMode !== SIDEBAR_MODES.FULL}
            iconOnly={sidebarMode === SIDEBAR_MODES.ICON_ONLY}
          />

          {/* Logout Button */}
          <div className="mt-auto pt-4 border-t border-orange-500/20">
            <NavItem
              to="#"
              icon={LogOut}
              label={t('common.logout')}
              isActive={false}
              onClick={(e) => {
                e.preventDefault();
                logout();
              }}
              delay={0.3}
              compact={sidebarMode !== SIDEBAR_MODES.FULL}
              iconOnly={sidebarMode === SIDEBAR_MODES.ICON_ONLY}
              className="text-red-400 hover:text-red-300"
            />
          </div>
        </nav>
      </div>
    </motion.div>
  );
};

export default AdvancedSidebar;
export { SIDEBAR_MODES };

