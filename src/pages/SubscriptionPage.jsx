
import React from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { CheckCircle, MessageCircle } from 'lucide-react';
import { SUBSCRIPTION_PLANS, CONTACT_INFO } from '@/lib/constants';
import { motion } from 'framer-motion';
import Logo from '@/components/Logo';
import { formatDateAR } from '@/lib/dateUtils';
import { formatDateAR } from '@/lib/dateUtils';

const SubscriptionPage = () => {
  const { tenant, user } = useAuth();
  const { t } = useLanguage();

  const handleContact = (plan) => {
    const planNames = {
      monthly: t('subscription.monthly'),
      '6months': t('subscription.sixMonths'),
      yearly: t('subscription.yearly')
    };
    const message = `مرحباً، أود ترقية متجري "${tenant?.name || ''}" إلى خطة ${planNames[plan.id] || plan.name} (${plan.price}$).`;
    const url = `${CONTACT_INFO.WHATSAPP_URL}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-8 pb-20">
      <Helmet><title>{t('subscription.title')} - {t('common.systemName')}</title></Helmet>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-2xl mx-auto"
      >
        <div className="flex justify-center mb-4">
          <Logo size="lg" showText={true} />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">الاشتراكات</h1>
        <p className="text-gray-500 dark:text-gray-400">اختر الخطة المناسبة لمتجرك</p>
      </motion.div>

      {tenant && (
        <div className="bg-gradient-to-r from-orange-500 to-pink-500 text-white p-6 rounded-2xl shadow-lg max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between">
            <div>
                <h3 className="text-lg font-semibold opacity-90">{t('subscription.currentPlan')}</h3>
                <p className="text-2xl font-bold">
                  {tenant.subscription_plan === 'trial' ? 'حساب تجريبي (15 يوم)' :
                   tenant.subscription_plan === 'monthly' ? t('subscription.monthly') :
                   tenant.subscription_plan === '6months' ? t('subscription.sixMonths') :
                   tenant.subscription_plan === 'yearly' ? t('subscription.yearly') :
                   tenant.subscription_plan || t('subscription.monthly')}
                </p>
                <p className="text-sm opacity-80 mt-1">
                    {t('common.status')}: {tenant.subscription_status === 'active' || tenant.subscription_status === 'trial' ? t('status.active') : t('status.expired')} • {t('adminPanel.expiresAt')}: {tenant.subscription_expires_at ? formatDateAR(tenant.subscription_expires_at) : '-'}
                </p>
            </div>
            <div className="mt-4 md:mt-0">
                <span className={`px-4 py-2 rounded-full text-sm font-bold ${tenant.isExpired ? 'bg-red-500 text-white' : 'bg-white text-orange-600'}`}>
                    {tenant.isExpired ? t('status.expired') : t('status.active')}
                </span>
            </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {Object.values(SUBSCRIPTION_PLANS).map((plan, index) => (
            <motion.div 
              key={plan.id} 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden relative hover:scale-105 transition-transform duration-300"
            >
                {plan.id === 'yearly' && (
                    <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                        {t('subscription.bestValue')}
                    </div>
                )}
                <div className="p-8">
                    <h3 className="text-lg font-semibold text-gray-500 uppercase tracking-wide">
                      {plan.id === 'monthly' ? t('subscription.monthly') : 
                       plan.id === '6months' ? t('subscription.sixMonths') : 
                       t('subscription.yearly')}
                    </h3>
                    <div className="mt-4 flex items-baseline text-gray-900 dark:text-white">
                        <span className="text-4xl font-extrabold tracking-tight">${plan.price}</span>
                        <span className="ml-1 rtl:mr-1 rtl:ml-0 text-xl font-semibold text-gray-500">
                          /{plan.id === 'monthly' ? t('subscription.perMonth') : plan.id === '6months' ? '6 أشهر' : 'سنة'}
                        </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                        {t('subscription.fullAccess').replace('{days}', plan.durationDays)}
                    </p>

                    <ul className="mt-6 space-y-4">
                        <li className="flex items-start">
                            <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                            <span className="ml-3 rtl:mr-3 rtl:ml-0 text-sm text-gray-700 dark:text-gray-300">{t('subscription.unlimitedInvoices')}</span>
                        </li>
                        <li className="flex items-start">
                            <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                            <span className="ml-3 rtl:mr-3 rtl:ml-0 text-sm text-gray-700 dark:text-gray-300">{t('subscription.inventoryManagement')}</span>
                        </li>
                        <li className="flex items-start">
                            <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                            <span className="ml-3 rtl:mr-3 rtl:ml-0 text-sm text-gray-700 dark:text-gray-300">{t('subscription.multiUserAccess')}</span>
                        </li>
                        <li className="flex items-start">
                            <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                            <span className="ml-3 rtl:mr-3 rtl:ml-0 text-sm text-gray-700 dark:text-gray-300">{t('subscription.prioritySupport')}</span>
                        </li>
                    </ul>
                </div>
                <div className="p-8 bg-gray-50 dark:bg-gray-750">
                    <Button 
                        onClick={() => handleContact(plan)} 
                        className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-4 h-auto transform hover:scale-[1.02] active:scale-[0.98] transition-transform"
                    >
                        <MessageCircle className="ml-2 rtl:mr-2 rtl:ml-0 h-5 w-5" />
                        {t('subscription.upgradeViaWhatsApp')}
                    </Button>
                    <p className="text-xs text-center mt-4 text-gray-400">
                        {t('subscription.instantActivation')}
                    </p>
                </div>
            </motion.div>
        ))}
      </div>
    </div>
  );
};

export default SubscriptionPage;
