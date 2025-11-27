import React from 'react';
import { motion } from 'framer-motion';
import { Button } from './button';
import { X, Save, Check } from 'lucide-react';

/**
 * مكون زر تفاعلي متقدم مع تأثيرات بصرية
 * @param {string} variant - نوع الزر: 'save' | 'cancel' | 'delete' | 'default'
 * @param {function} onClick - دالة عند الضغط
 * @param {boolean} loading - حالة التحميل
 * @param {boolean} disabled - تعطيل الزر
 * @param {string} className - كلاسات إضافية
 * @param {React.ReactNode} children - محتوى الزر
 */
export const InteractiveButton = ({
  variant = 'default',
  onClick,
  loading = false,
  disabled = false,
  className = '',
  children,
  type = 'button',
  ...props
}) => {
  const variants = {
    save: {
      base: 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/30',
      icon: <Save className="h-4 w-4" />,
      hover: { scale: 1.05, boxShadow: '0 10px 25px rgba(16, 185, 129, 0.4)' },
      tap: { scale: 0.95 }
    },
    cancel: {
      base: 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600',
      icon: <X className="h-4 w-4" />,
      hover: { scale: 1.05 },
      tap: { scale: 0.95 }
    },
    delete: {
      base: 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg shadow-red-500/30',
      icon: null,
      hover: { scale: 1.05, boxShadow: '0 10px 25px rgba(239, 68, 68, 0.4)' },
      tap: { scale: 0.95 }
    },
    default: {
      base: 'bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white shadow-lg shadow-orange-500/30',
      icon: null,
      hover: { scale: 1.05, boxShadow: '0 10px 25px rgba(251, 146, 60, 0.4)' },
      tap: { scale: 0.95 }
    }
  };

  const config = variants[variant] || variants.default;

  return (
    <motion.div
      whileHover={!disabled && !loading ? config.hover : {}}
      whileTap={!disabled && !loading ? config.tap : {}}
      className="flex-1"
    >
      <Button
        type={type}
        onClick={onClick}
        disabled={disabled || loading}
        className={`${config.base} ${className} relative overflow-hidden group`}
        {...props}
      >
        {loading ? (
          <motion.div
            className="flex items-center justify-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}
            />
            <span>جاري الحفظ...</span>
          </motion.div>
        ) : (
          <motion.div
            className="flex items-center justify-center gap-2"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {config.icon && (
              <motion.div
                animate={variant === 'save' ? {
                  rotate: [0, 360],
                } : {}}
                transition={variant === 'save' ? {
                  duration: 0.5,
                  ease: 'easeInOut'
                } : {}}
              >
                {config.icon}
              </motion.div>
            )}
            {children}
            {variant === 'save' && !loading && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{
                  x: ['-100%', '100%'],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />
            )}
          </motion.div>
        )}
      </Button>
    </motion.div>
  );
};

export default InteractiveButton;
