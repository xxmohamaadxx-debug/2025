import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

const PasswordInput = ({ 
  id, 
  value, 
  onChange, 
  placeholder, 
  required = false, 
  className = '',
  label,
  ...props 
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative">
      {label && (
        <label htmlFor={id} className="block text-xs sm:text-sm font-bold text-white mb-2">
          {label}
          {required && <span className="text-red-500 ml-1 rtl:mr-1">*</span>}
        </label>
      )}
      <div className="flex items-center gap-2">
        {/* Eye icon button - خارج الحقل على اليسار */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowPassword(!showPassword);
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowPassword(!showPassword);
          }}
          className="flex-shrink-0 text-purple-300 hover:text-white active:text-orange-400 transition-colors focus:outline-none p-2 touch-manipulation"
          tabIndex={-1}
          aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
        >
          {showPassword ? (
            <EyeOff className="h-5 w-5 sm:h-6 sm:w-6" />
          ) : (
            <Eye className="h-5 w-5 sm:h-6 sm:w-6" />
          )}
        </button>
        {/* Input field - بدون padding للأيقونة */}
        <motion.input
          id={id}
          type={showPassword ? 'text' : 'password'}
          required={required}
          whileFocus={{ scale: 1.01 }}
          className={`flex-1 px-4 sm:px-5 py-2.5 sm:py-3 text-base rounded-xl border-2 border-white/20 bg-white/10 backdrop-blur-sm text-white placeholder-purple-300 focus:border-orange-400 focus:bg-white/20 focus:ring-4 focus:ring-orange-500/30 transition-all outline-none font-medium touch-manipulation ${className}`}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          {...props}
        />
      </div>
    </div>
  );
};

export default PasswordInput;

