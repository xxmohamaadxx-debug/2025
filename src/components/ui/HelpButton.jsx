import React, { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';

const HelpButton = ({ 
  section, 
  helpText, 
  helpTextAr, 
  helpTextEn, 
  helpTextTr,
  position = 'top-right',
  className = ''
}) => {
  const { locale } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  // تحديد النص حسب اللغة
  const getHelpText = () => {
    if (helpText) return helpText;
    if (locale === 'ar' && helpTextAr) return helpTextAr;
    if (locale === 'en' && helpTextEn) return helpTextEn;
    if (locale === 'tr' && helpTextTr) return helpTextTr;
    return helpTextAr || helpTextEn || helpTextTr || 'مساعدة';
  };

  const positionClasses = {
    'top-right': 'top-2 rtl:left-2 ltr:right-2',
    'top-left': 'top-2 rtl:right-2 ltr:left-2',
    'bottom-right': 'bottom-2 rtl:left-2 ltr:right-2',
    'bottom-left': 'bottom-2 rtl:right-2 ltr:left-2',
  };

  return (
    <div className={`relative ${className}`}>
      <motion.button
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`absolute ${positionClasses[position]} z-10 p-2 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 text-white shadow-lg hover:shadow-xl transition-all duration-300 group`}
        aria-label="مساعدة"
      >
        <HelpCircle className="h-5 w-5" />
        <motion.div
          className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-400 to-pink-400 opacity-0 group-hover:opacity-100 blur-md"
          animate={isOpen ? { opacity: 0.5 } : {}}
          transition={{ duration: 0.3 }}
        />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            />
            
            {/* Help Tooltip */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -10 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className={`absolute ${positionClasses[position]} z-50 mt-12 rtl:mt-12 ltr:mt-12 w-80 p-4 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-xl`}
              style={{
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 140, 0, 0.1)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-orange-500 to-pink-500">
                    <HelpCircle className="h-4 w-4 text-white" />
                  </div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                    {locale === 'ar' ? 'مساعدة' : locale === 'en' ? 'Help' : 'Yardım'}
                  </h4>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>

              {/* Content */}
              <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {getHelpText()}
              </div>

              {/* Decorative elements */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 rounded-t-xl" />
              <div className="absolute -bottom-1 -left-1 -right-1 h-2 bg-gradient-to-r from-orange-500/20 via-pink-500/20 to-purple-500/20 blur-sm rounded-b-xl" />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HelpButton;

