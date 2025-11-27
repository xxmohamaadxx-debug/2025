
export const ROLES = {
  SUPER_ADMIN: 'Super Admin',
  STORE_OWNER: 'Store Owner',
  ACCOUNTANT: 'Accountant',
  WAREHOUSE_MANAGER: 'Warehouse Manager',
  EMPLOYEE: 'Employee',
};

export const SUBSCRIPTION_PLANS = {
  MONTHLY: { id: 'monthly', name: 'Monthly Plan', price: 5, durationDays: 30 },
  SIX_MONTHS: { id: '6months', name: '6 Months Plan', price: 30, durationDays: 180 },
  YEARLY: { id: 'yearly', name: 'Yearly Plan', price: 40, durationDays: 365 },
};

export const CURRENCIES = {
  TRY: { code: 'TRY', symbol: '₺', name: 'Turkish Lira', nameAr: 'الليرة التركية' },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', nameAr: 'الدولار الأمريكي' },
  SYP: { code: 'SYP', symbol: '£S', name: 'Syrian Pound', nameAr: 'الليرة السورية' },
  SAR: { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal', nameAr: 'الريال السعودي' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', nameAr: 'اليورو' },
};

export const LANGUAGES = {
  EN: { code: 'en', name: 'English', dir: 'ltr' },
  AR: { code: 'ar', name: 'العربية', dir: 'rtl' },
  TR: { code: 'tr', name: 'Türkçe', dir: 'ltr' },
};

export const INVOICE_STATUS = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  PAID: 'Paid',
  OVERDUE: 'Overdue',
};

export const EMPLOYEE_STATUS = {
  ACTIVE: 'Active',
  ON_LEAVE: 'On Leave',
  TERMINATED: 'Terminated',
};

export const CONTACT_INFO = {
  WHATSAPP: '+963994054027',
  EMAIL: 'systemibrahem@gmail.com',
  WHATSAPP_URL: 'https://wa.me/963994054027',
};

// سيتم تحديثها من قاعدة البيانات
export const getContactInfo = async () => {
  try {
    const { neonService } = await import('./neonService');
    const settings = await neonService.getSystemSettings();
    return {
      WHATSAPP: settings.support_phone || CONTACT_INFO.WHATSAPP,
      EMAIL: settings.support_email || CONTACT_INFO.EMAIL,
      WHATSAPP_URL: `https://wa.me/${(settings.support_whatsapp || CONTACT_INFO.WHATSAPP).replace(/[^0-9]/g, '')}`,
    };
  } catch (error) {
    console.error('Error loading contact info:', error);
    return CONTACT_INFO;
  }
};
