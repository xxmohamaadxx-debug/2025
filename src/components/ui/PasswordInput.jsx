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
      <div className="relative">
        <motion.input
          id={id}
          type={showPassword ? 'text' : 'password'}
          required={required}
          whileFocus={{ scale: 1.01 }}
          className={`w-full px-4 sm:px-5 py-2.5 sm:py-3 pr-12 rtl:pl-12 rtl:pr-4 text-sm sm:text-base rounded-xl border-2 border-white/20 bg-white/10 backdrop-blur-sm text-white placeholder-purple-300 focus:border-orange-400 focus:bg-white/20 focus:ring-4 focus:ring-orange-500/30 transition-all outline-none font-medium ${className}`}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 rtl:left-3 top-1/2 -translate-y-1/2 text-purple-300 hover:text-white transition-colors focus:outline-none"
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className="h-5 w-5" />
          ) : (
            <Eye className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );
};

export default PasswordInput;

