import React from 'react';
import { motion } from 'framer-motion';

/**
 * مكون بطاقة زجاجية موحدة مع تصميم متسق
 * @param {React.ReactNode} children - المحتوى
 * @param {string} className - كلاسات إضافية
 * @param {boolean} animated - تفعيل الخلفية المتحركة
 */
export const GlassCard = ({ children, className = '', animated = true, ...props }) => {
  return (
    <div
      className={`relative bg-gradient-to-br from-white/95 to-white/90 dark:from-gray-800/95 dark:to-gray-800/90 backdrop-blur-xl rounded-lg shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden ${className}`}
      style={{
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
      }}
      {...props}
    >
      {animated && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-orange-500/0 via-pink-500/0 to-purple-500/0 pointer-events-none"
          animate={{
            background: [
              'linear-gradient(135deg, rgba(255, 140, 0, 0) 0%, rgba(236, 72, 153, 0) 100%)',
              'linear-gradient(135deg, rgba(255, 140, 0, 0.05) 0%, rgba(236, 72, 153, 0.05) 100%)',
              'linear-gradient(135deg, rgba(255, 140, 0, 0) 0%, rgba(236, 72, 153, 0) 100%)',
            ],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default GlassCard;
