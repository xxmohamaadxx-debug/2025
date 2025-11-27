import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, CheckCircle, XCircle, AlertCircle, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const SmartInput = ({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  validation,
  suggestions = [],
  helpText,
  icon: Icon,
  className = '',
  disabled = false,
  ...props
}) => {
  const { locale } = useLanguage();
  const [focused, setFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [isValid, setIsValid] = useState(null);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  useEffect(() => {
    if (validation && value) {
      const result = validation(value);
      if (result === true) {
        setIsValid(true);
        setValidationError(null);
      } else {
        setIsValid(false);
        setValidationError(typeof result === 'string' ? result : 'Invalid input');
      }
    } else if (value) {
      setIsValid(null);
    } else {
      setIsValid(null);
      setValidationError(null);
    }
  }, [value, validation]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSuggestions = suggestions.filter(s =>
    typeof s === 'string' 
      ? s.toLowerCase().includes(value?.toLowerCase() || '')
      : s.label?.toLowerCase().includes(value?.toLowerCase() || '')
  );

  const handleSuggestionClick = (suggestion) => {
    const suggestionValue = typeof suggestion === 'string' ? suggestion : suggestion.value;
    onChange({ target: { value: suggestionValue } });
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const inputClasses = `
    w-full px-4 py-3 pr-10
    border-2 rounded-lg
    dark:bg-gray-700 dark:text-gray-100
    transition-all duration-300
    ${focused ? 'border-orange-500 ring-2 ring-orange-200 dark:ring-orange-800' : 'border-gray-300 dark:border-gray-600'}
    ${isValid === true ? 'border-green-500 dark:border-green-500' : ''}
    ${isValid === false ? 'border-red-500 dark:border-red-500' : ''}
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    focus:outline-none
    ${className}
  `;

  return (
    <div className="relative">
      {label && (
        <label className="block text-sm font-medium mb-2 rtl:text-right text-gray-700 dark:text-gray-300">
          {label}
          {required && <span className="text-red-500 ml-1 rtl:mr-1">*</span>}
        </label>
      )}

      <div className="relative">
        {Icon && (
          <div className="absolute left-3 rtl:right-3 top-1/2 -translate-y-1/2 z-10">
            <Icon className={`h-5 w-5 ${focused ? 'text-orange-500' : 'text-gray-400'}`} />
          </div>
        )}

        <input
          ref={inputRef}
          type={type}
          value={value || ''}
          onChange={onChange}
          onFocus={() => {
            setFocused(true);
            if (suggestions.length > 0 && value) {
              setShowSuggestions(true);
            }
          }}
          onBlur={() => {
            setFocused(false);
            // Delay to allow suggestion click
            setTimeout(() => setShowSuggestions(false), 200);
          }}
          onInput={(e) => {
            if (suggestions.length > 0 && e.target.value) {
              setShowSuggestions(true);
            }
          }}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={inputClasses + (Icon ? ' pl-10 rtl:pr-10 rtl:pl-4' : '')}
          {...props}
        />

        {/* Validation Icons */}
        <div className="absolute right-3 rtl:left-3 top-1/2 -translate-y-1/2 z-10">
          <AnimatePresence>
            {isValid === true && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
              >
                <CheckCircle className="h-5 w-5 text-green-500" />
              </motion.div>
            )}
            {isValid === false && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
              >
                <XCircle className="h-5 w-5 text-red-500" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Smart Suggestions Dropdown */}
        <AnimatePresence>
          {showSuggestions && filteredSuggestions.length > 0 && (
            <motion.div
              ref={suggestionsRef}
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto"
            >
              {filteredSuggestions.map((suggestion, index) => (
                <motion.button
                  key={index}
                  whileHover={{ backgroundColor: 'rgba(255, 140, 0, 0.1)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-right rtl:text-left px-4 py-3 hover:bg-orange-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-3"
                >
                  <Sparkles className="h-4 w-4 text-orange-500 flex-shrink-0" />
                  <span className="flex-1 text-gray-700 dark:text-gray-300">
                    {typeof suggestion === 'string' ? suggestion : suggestion.label}
                  </span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Validation Error Message */}
      <AnimatePresence>
        {validationError && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="mt-2 flex items-center gap-2 text-sm text-red-600 dark:text-red-400"
          >
            <AlertCircle className="h-4 w-4" />
            <span>{validationError}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help Text */}
      {helpText && !validationError && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-2 text-xs text-gray-500 dark:text-gray-400 rtl:text-right"
        >
          {helpText}
        </motion.p>
      )}
    </div>
  );
};

export default SmartInput;

