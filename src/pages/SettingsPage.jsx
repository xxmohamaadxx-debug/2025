
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Globe, Moon, Sun, User, Shield, Store, DollarSign, RefreshCw } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { initCurrencyService, getAllExchangeRates, setExchangeRate, updateExchangeRates, enableAutoUpdate, disableAutoUpdate } from '@/lib/currencyService';
import { neonService } from '@/lib/neonService';
import ImageUploader from '@/components/ImageUploader';

const SettingsPage = () => {
  const { t, locale, setLocale } = useLanguage();
  const { isDark, toggleTheme } = useTheme();
  const { user, tenant } = useAuth();
  const [exchangeRates, setExchangeRates] = useState({
    SYP_TO_USD: 15000,
    TRY_TO_USD: 32,
    autoUpdate: false,
    lastUpdate: null
  });
  const [updatingRates, setUpdatingRates] = useState(false);

  useEffect(() => {
    loadExchangeRates();
  }, []);

  const loadExchangeRates = async () => {
    try {
      await initCurrencyService();
      const rates = getAllExchangeRates();
      setExchangeRates(rates);
    } catch (error) {
      console.error('Error loading exchange rates:', error);
    }
  };

  const handleUpdateRate = async (fromCurrency, toCurrency, rate) => {
    try {
      const success = setExchangeRate(fromCurrency, toCurrency, rate);
      if (success) {
        loadExchangeRates();
        toast({ title: 'تم تحديث السعر بنجاح' });
      }
    } catch (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    }
  };

  const handleAutoUpdateToggle = () => {
    if (exchangeRates.autoUpdate) {
      disableAutoUpdate();
    } else {
      enableAutoUpdate();
    }
    loadExchangeRates();
    toast({ title: exchangeRates.autoUpdate ? 'تم إيقاف التحديث التلقائي' : 'تم تفعيل التحديث التلقائي' });
  };

  const handleUpdateRates = async () => {
    setUpdatingRates(true);
    try {
      await updateExchangeRates();
      loadExchangeRates();
      toast({ title: 'تم تحديث الأسعار بنجاح' });
    } catch (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } finally {
      setUpdatingRates(false);
    }
  };

  const handleSave = () => {
    toast({ title: t('settings.saved'), description: t('settings.savedMessage') });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Helmet>
        <title>{t('common.settings')} - {t('common.systemName')}</title>
      </Helmet>

      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('common.settings')}</h1>
      </div>

      {/* Appearance Section */}
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
            <Sun className="h-5 w-5 text-orange-500" />
            {t('settings.appearance')}
          </h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 rtl:text-right">
                {t('settings.language')}
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button 
                  onClick={() => setLocale('en')}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${locale === 'en' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                >
                  English
                </button>
                <button 
                  onClick={() => setLocale('ar')}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${locale === 'ar' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                >
                  العربية
                </button>
                <button 
                  onClick={() => setLocale('tr')}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${locale === 'tr' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                >
                  Türkçe
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 rtl:text-right">
                {t('settings.theme')}
              </label>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  toggleTheme();
                }}
                className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 w-full transition-all cursor-pointer"
                type="button"
              >
                <div className="flex items-center gap-3">
                  {isDark ? <Moon className="h-5 w-5 text-blue-400" /> : <Sun className="h-5 w-5 text-orange-500" />}
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-200">
                    {isDark ? t('settings.darkMode') : t('settings.lightMode')}
                  </span>
                </div>
                <div className={`relative w-11 h-6 rounded-full transition-colors ${isDark ? 'bg-blue-600' : 'bg-gray-300'}`}>
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${isDark ? 'translate-x-5' : 'translate-x-0'}`}></div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Profile Section */}
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
            <User className="h-5 w-5 text-blue-500" />
            {t('settings.profile')}
          </h2>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <ImageUploader
              currentImage={user?.avatar_url || null}
              onImageChange={async (base64Image) => {
                try {
                  if (base64Image) {
                    await neonService.updateUser(user.id, { avatar_url: base64Image }, user.tenant_id);
                    toast({
                      title: 'تم الحفظ',
                      description: 'تم تحديث الصورة الشخصية بنجاح'
                    });
                    // Refresh user data
                    window.location.reload();
                  }
                } catch (error) {
                  toast({
                    title: 'خطأ',
                    description: 'فشل تحديث الصورة الشخصية',
                    variant: 'destructive'
                  });
                }
              }}
              label="الصورة الشخصية"
              maxSizeMB={2}
            />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 rtl:text-right">{t('settings.fullName')}</label>
               <input type="text" disabled value={user?.name || ''} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-500" />
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 rtl:text-right">{t('common.email')}</label>
               <input type="text" disabled value={user?.email || ''} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-500" />
             </div>
          </div>
        </div>
      </section>

      {/* Currency Exchange Rates Section */}
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
            <DollarSign className="h-5 w-5 text-green-500" />
            أسعار صرف العملات
          </h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                آخر تحديث: {exchangeRates.lastUpdate ? new Date(exchangeRates.lastUpdate).toLocaleString('ar-EG') : 'لم يتم التحديث بعد'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleUpdateRates}
                disabled={updatingRates}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${updatingRates ? 'animate-spin' : ''}`} />
                تحديث الآن
              </Button>
              <Button
                variant={exchangeRates.autoUpdate ? "default" : "outline"}
                size="sm"
                onClick={handleAutoUpdateToggle}
              >
                {exchangeRates.autoUpdate ? 'التحديث التلقائي مفعل' : 'تفعيل التحديث التلقائي'}
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 rtl:text-right">
                سعر الليرة السورية مقابل الدولار (SYP → USD)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={exchangeRates.SYP_TO_USD}
                  onChange={(e) => setExchangeRates({ ...exchangeRates, SYP_TO_USD: parseFloat(e.target.value) || 0 })}
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  placeholder="15000"
                />
                <Button
                  size="sm"
                  onClick={() => handleUpdateRate('SYP', 'USD', exchangeRates.SYP_TO_USD)}
                >
                  حفظ
                </Button>
              </div>
              <p className="text-xs text-gray-500">1 دولار = {exchangeRates.SYP_TO_USD.toLocaleString('ar-EG')} ليرة سورية</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 rtl:text-right">
                سعر الليرة التركية مقابل الدولار (TRY → USD)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={exchangeRates.TRY_TO_USD}
                  onChange={(e) => setExchangeRates({ ...exchangeRates, TRY_TO_USD: parseFloat(e.target.value) || 0 })}
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  placeholder="32"
                />
                <Button
                  size="sm"
                  onClick={() => handleUpdateRate('TRY', 'USD', exchangeRates.TRY_TO_USD)}
                >
                  حفظ
                </Button>
              </div>
              <p className="text-xs text-gray-500">1 دولار = {exchangeRates.TRY_TO_USD.toLocaleString('ar-EG')} ليرة تركية</p>
            </div>
          </div>

          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              💡 يمكنك تحديث الأسعار يدوياً أو تفعيل التحديث التلقائي كل ساعة. الأسعار تستخدم لتحويل العملات في النظام.
            </p>
          </div>
        </div>
      </section>

      {/* Tenant Section */}
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
            <Store className="h-5 w-5 text-green-500" />
            {t('settings.organization')}
          </h2>
        </div>
        <div className="p-6 space-y-6">
          {tenant && (
            <div>
              <ImageUploader
                currentImage={tenant?.logo_url || null}
                onImageChange={async (base64Image) => {
                  try {
                    if (base64Image && tenant?.id) {
                      await neonService.updateTenant(tenant.id, { logo_url: base64Image });
                      toast({
                        title: 'تم الحفظ',
                        description: 'تم تحديث شعار المتجر بنجاح'
                      });
                      // Refresh tenant data
                      window.location.reload();
                    }
                  } catch (error) {
                    toast({
                      title: 'خطأ',
                      description: 'فشل تحديث شعار المتجر',
                      variant: 'destructive'
                    });
                  }
                }}
                label="شعار المتجر"
                maxSizeMB={2}
              />
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 rtl:text-right">{t('settings.tenantId')}</label>
               <input type="text" disabled value={user?.tenant_id || ''} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-500 font-mono text-xs" />
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 rtl:text-right">{t('settings.plan')}</label>
               <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase">{t('settings.trial')}</span>
                <Button variant="link" className="text-orange-600 p-0 h-auto text-xs">{t('settings.upgradeNow')}</Button>
               </div>
             </div>
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <Button onClick={handleSave} className="bg-gradient-to-r from-orange-500 to-pink-500 text-white">
          {t('settings.saveChanges')}
        </Button>
      </div>
    </div>
  );
};

export default SettingsPage;
