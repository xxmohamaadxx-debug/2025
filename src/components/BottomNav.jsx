import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, FileText, ShoppingCart, Package, Users, BarChart, Settings
} from 'lucide-react';

const BottomNav = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();

  const isActive = (path) => location.pathname === path;

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: t('common.dashboard') },
    { path: '/invoices-out', icon: ShoppingCart, label: t('common.invoicesOut') },
    { path: '/invoices-in', icon: FileText, label: t('common.invoicesIn') },
    { path: '/customers', icon: Users, label: 'العملاء' },
    { path: '/reports', icon: BarChart, label: t('common.reports') },
  ];

  return (
    <motion.nav
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 27, 75, 0.98) 100%)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderTop: '1px solid rgba(255, 140, 0, 0.2)',
        boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.5), 0 0 60px rgba(255, 140, 0, 0.1)',
      }}
    >
      <div className="flex justify-around items-center px-2 py-2 safe-area-bottom">
        {navItems.map((item, index) => {
          const active = isActive(item.path);
          return (
            <Link key={item.path} to={item.path}>
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.05, duration: 0.2 }}
                whileTap={{ scale: 0.9 }}
                className="flex flex-col items-center justify-center px-4 py-2 rounded-xl relative"
              >
                {/* Active Background Glow */}
                {active && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-orange-500/30 via-pink-500/30 to-purple-500/30 rounded-xl blur-lg"
                    layoutId="activeTab"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}

                {/* Icon */}
                <motion.div
                  animate={{
                    scale: active ? 1.2 : 1,
                    y: active ? -5 : 0,
                  }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="relative z-10"
                >
                  <item.icon
                    className={`h-6 w-6 transition-colors duration-300 ${
                      active
                        ? 'text-orange-400'
                        : 'text-gray-400'
                    }`}
                  />
                </motion.div>

                {/* Label */}
                <motion.span
                  animate={{
                    opacity: active ? 1 : 0.7,
                    fontSize: active ? '0.65rem' : '0.6rem',
                  }}
                  className={`mt-1 text-xs font-medium transition-colors duration-300 relative z-10 ${
                    active
                      ? 'text-orange-400'
                      : 'text-gray-400'
                  }`}
                >
                  {item.label}
                </motion.span>

                {/* Active Indicator Dot */}
                {active && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 w-1.5 h-1.5 bg-orange-400 rounded-full"
                  />
                )}
              </motion.div>
            </Link>
          );
        })}
      </div>
    </motion.nav>
  );
};

export default BottomNav;

