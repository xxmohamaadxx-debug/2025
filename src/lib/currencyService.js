// خدمة تحويل العملات مع تحديث تلقائي
// دعم: SYP -> USD, TRY -> USD

const EXCHANGE_RATES_STORAGE_KEY = 'exchange_rates';
const EXCHANGE_RATES_UPDATE_INTERVAL = 60 * 60 * 1000; // ساعة واحدة

// API endpoints (يمكن تغييرها حسب التطبيق المستخدم في سوريا)
const EXCHANGE_API_URLS = {
  SYP_TO_USD: 'https://api.exchangerate-api.com/v4/latest/USD', // يمكن استبداله بـ API سوري
  TRY_TO_USD: 'https://api.exchangerate-api.com/v4/latest/USD'
};

// الأسعار الافتراضية (سيتم تحديثها من API)
let exchangeRates = {
  SYP_TO_USD: 15000, // سعر افتراضي (سيتم تحديثه)
  TRY_TO_USD: 32, // سعر افتراضي (سيتم تحديثه)
  lastUpdate: null,
  autoUpdate: true
};

// تحميل الأسعار من localStorage
export const loadExchangeRates = () => {
  try {
    const stored = localStorage.getItem(EXCHANGE_RATES_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      exchangeRates = { ...exchangeRates, ...parsed };
    }
  } catch (error) {
    console.error('Error loading exchange rates:', error);
  }
  return exchangeRates;
};

// حفظ الأسعار في localStorage
const saveExchangeRates = () => {
  try {
    localStorage.setItem(EXCHANGE_RATES_STORAGE_KEY, JSON.stringify(exchangeRates));
  } catch (error) {
    console.error('Error saving exchange rates:', error);
  }
};

// تحديث الأسعار من API (محاكاة - يمكن استبداله بـ API حقيقي)
export const updateExchangeRates = async () => {
  try {
    // محاكاة API call - في الواقع يجب استبداله بـ API حقيقي
    // مثال: استخدام API مثل التي تستخدمها تطبيقات التحويل في سوريا
    
    // هنا يمكنك إضافة استدعاء API فعلي:
    /*
    const response = await fetch('YOUR_SYRIAN_EXCHANGE_API_URL');
    const data = await response.json();
    exchangeRates.SYP_TO_USD = data.SYP || 15000;
    exchangeRates.TRY_TO_USD = data.TRY || 32;
    */
    
    // حالياً: استخدام قيم محسّنة قريبة من الواقع
    // يمكن للمستخدم تحديثها يدوياً من الإعدادات
    exchangeRates.lastUpdate = new Date().toISOString();
    saveExchangeRates();
    
    return exchangeRates;
  } catch (error) {
    console.error('Error updating exchange rates:', error);
    return exchangeRates;
  }
};

// تحديث يدوي للأسعار
export const setExchangeRate = (fromCurrency, toCurrency, rate) => {
  const key = `${fromCurrency}_TO_${toCurrency}`;
  if (exchangeRates.hasOwnProperty(key)) {
    exchangeRates[key] = parseFloat(rate) || 0;
    exchangeRates.lastUpdate = new Date().toISOString();
    saveExchangeRates();
    return true;
  }
  return false;
};

// تحويل العملة
export const convertCurrency = (amount, fromCurrency, toCurrency) => {
  if (fromCurrency === toCurrency) {
    return parseFloat(amount) || 0;
  }

  const amountNum = parseFloat(amount) || 0;
  
  // تحويل إلى USD أولاً
  let usdAmount = 0;
  
  if (fromCurrency === 'USD') {
    usdAmount = amountNum;
  } else if (fromCurrency === 'SYP') {
    usdAmount = amountNum / exchangeRates.SYP_TO_USD;
  } else if (fromCurrency === 'TRY') {
    usdAmount = amountNum / exchangeRates.TRY_TO_USD;
  } else {
    return amountNum; // عملة غير مدعومة
  }
  
  // تحويل من USD إلى العملة المطلوبة
  if (toCurrency === 'USD') {
    return usdAmount;
  } else if (toCurrency === 'SYP') {
    return usdAmount * exchangeRates.SYP_TO_USD;
  } else if (toCurrency === 'TRY') {
    return usdAmount * exchangeRates.TRY_TO_USD;
  }
  
  return amountNum;
};

// الحصول على سعر الصرف
export const getExchangeRate = (fromCurrency, toCurrency) => {
  if (fromCurrency === toCurrency) return 1;
  
  const key = `${fromCurrency}_TO_${toCurrency}`;
  if (exchangeRates.hasOwnProperty(key)) {
    return exchangeRates[key];
  }
  
  // حساب عكسي
  if (fromCurrency === 'USD' && toCurrency === 'SYP') {
    return exchangeRates.SYP_TO_USD;
  } else if (fromCurrency === 'USD' && toCurrency === 'TRY') {
    return exchangeRates.TRY_TO_USD;
  } else if (fromCurrency === 'SYP' && toCurrency === 'USD') {
    return 1 / exchangeRates.SYP_TO_USD;
  } else if (fromCurrency === 'TRY' && toCurrency === 'USD') {
    return 1 / exchangeRates.TRY_TO_USD;
  } else if (fromCurrency === 'SYP' && toCurrency === 'TRY') {
    return (exchangeRates.SYP_TO_USD / exchangeRates.TRY_TO_USD);
  } else if (fromCurrency === 'TRY' && toCurrency === 'SYP') {
    return (exchangeRates.TRY_TO_USD / exchangeRates.SYP_TO_USD);
  }
  
  return 1;
};

// الحصول على جميع الأسعار
export const getAllExchangeRates = () => {
  return { ...exchangeRates };
};

// تفعيل التحديث التلقائي
export const enableAutoUpdate = () => {
  exchangeRates.autoUpdate = true;
  saveExchangeRates();
  
  // تحديث كل ساعة
  if (typeof window !== 'undefined') {
    const interval = setInterval(() => {
      if (exchangeRates.autoUpdate) {
        updateExchangeRates();
      }
    }, EXCHANGE_RATES_UPDATE_INTERVAL);
    
    return () => clearInterval(interval);
  }
};

// إيقاف التحديث التلقائي
export const disableAutoUpdate = () => {
  exchangeRates.autoUpdate = false;
  saveExchangeRates();
};

// التحقق من الحاجة للتحديث
const shouldUpdate = () => {
  if (!exchangeRates.lastUpdate) return true;
  
  const lastUpdate = new Date(exchangeRates.lastUpdate);
  const now = new Date();
  const diff = now - lastUpdate;
  
  return diff >= EXCHANGE_RATES_UPDATE_INTERVAL;
};

// تهيئة الخدمة
export const initCurrencyService = async () => {
  loadExchangeRates();
  
  if (shouldUpdate() && exchangeRates.autoUpdate) {
    await updateExchangeRates();
  }
  
  if (exchangeRates.autoUpdate) {
    enableAutoUpdate();
  }
  
  return exchangeRates;
};

// تصدير الوظائف (تصدير مباشر فقط)
export {
  convertCurrency,
  getExchangeRate,
  getAllExchangeRates,
  setExchangeRate,
  updateExchangeRates,
  initCurrencyService,
  enableAutoUpdate,
  disableAutoUpdate,
  loadExchangeRates
};

// تصدير كـ default object للتوافق
export default {
  convertCurrency,
  getExchangeRate,
  getAllExchangeRates,
  setExchangeRate,
  updateExchangeRates,
  initCurrencyService,
  enableAutoUpdate,
  disableAutoUpdate,
  loadExchangeRates
};

