import React, { forwardRef } from 'react';

// Minimal, accessible switch component compatible with our UI
export const Switch = forwardRef(({ checked = false, onCheckedChange, disabled = false, className = '' }, ref) => {
  const handleToggle = (e) => {
    if (disabled) return;
    onCheckedChange?.(!checked);
  };

  return (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={handleToggle}
      className={`inline-flex items-center h-6 w-11 rounded-full transition-colors duration-200
        ${checked ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
    >
      <span
        className={`inline-block h-5 w-5 bg-white rounded-full shadow transform transition-transform duration-200
          ${checked ? 'translate-x-5' : 'translate-x-1'}`}
      />
    </button>
  );
});

export default Switch;
