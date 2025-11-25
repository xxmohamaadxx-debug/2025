import React from 'react';
import { Link } from 'react-router-dom';

const Logo = ({ size = 'md', showText = true, className = '' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-xl',
    xl: 'text-2xl'
  };

  return (
    <Link to="/dashboard" className={`flex items-center gap-2 ${className}`}>
      <div className={`relative ${sizeClasses[size]} rounded-lg bg-gradient-to-tr from-orange-500 to-pink-500 flex items-center justify-center text-white font-bold shadow-lg overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-pink-500 opacity-90"></div>
        <span className="relative z-10 text-xl font-bold">I</span>
      </div>
      {showText && (
        <div className="flex flex-col">
          <span className={`${textSizes[size]} font-bold bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent leading-tight`}>
            إبراهيم
          </span>
          {size !== 'sm' && (
            <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">نظام المحاسبة</span>
          )}
        </div>
      )}
    </Link>
  );
};

export default Logo;

