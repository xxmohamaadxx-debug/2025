// Utility functions for date formatting and localization

/**
 * Format date to Arabic locale (Gregorian calendar)
 * @param {Date|string} date - Date to format
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export const formatDateAR = (date, options = {}) => {
  if (!date) return '-';
  
  const dateObj = date instanceof Date ? date : new Date(date);
  
  if (isNaN(dateObj.getTime())) return '-';
  
  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    calendar: 'gregory',
    numberingSystem: 'arab',
    locale: 'ar-SA'
  };
  
  return new Intl.DateTimeFormat('ar-SA', { ...defaultOptions, ...options }).format(dateObj);
};

/**
 * Format date to short Arabic format (dd/mm/yyyy)
 */
export const formatDateShort = (date) => {
  if (!date) return '-';
  
  const dateObj = date instanceof Date ? date : new Date(date);
  
  if (isNaN(dateObj.getTime())) return '-';
  
  const day = dateObj.getDate().toString().padStart(2, '0');
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const year = dateObj.getFullYear();
  
  return `${day}/${month}/${year}`;
};

/**
 * Get relative time in Arabic (منذ ساعة، منذ يومين، إلخ)
 */
export const getRelativeTimeAR = (date) => {
  if (!date) return '-';
  
  const dateObj = date instanceof Date ? date : new Date(date);
  
  if (isNaN(dateObj.getTime())) return '-';
  
  const now = new Date();
  const diffMs = now - dateObj;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSecs < 60) return 'الآن';
  if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  if (diffDays === 1) return 'منذ يوم';
  if (diffDays < 7) return `منذ ${diffDays} أيام`;
  if (diffDays < 30) return `منذ ${Math.floor(diffDays / 7)} أسابيع`;
  if (diffDays < 365) return `منذ ${Math.floor(diffDays / 30)} أشهر`;
  return `منذ ${Math.floor(diffDays / 365)} سنة`;
};

/**
 * Format date for input type="date" (YYYY-MM-DD)
 */
export const formatDateForInput = (date) => {
  if (!date) return '';
  
  const dateObj = date instanceof Date ? date : new Date(date);
  
  if (isNaN(dateObj.getTime())) return '';
  
  const year = dateObj.getFullYear();
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const day = dateObj.getDate().toString().padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Get current date in input format
 */
export const getCurrentDateInput = () => {
  return formatDateForInput(new Date());
};

/**
 * Parse date from input format (YYYY-MM-DD) to Date object
 */
export const parseDateFromInput = (dateString) => {
  if (!dateString) return null;
  
  const dateObj = new Date(dateString + 'T00:00:00');
  
  if (isNaN(dateObj.getTime())) return null;
  
  return dateObj;
};

