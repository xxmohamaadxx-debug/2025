
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Mail, User, Building, MessageCircle } from 'lucide-react';
import { CONTACT_INFO } from '@/lib/constants';
import Logo from '@/components/Logo';
import PasswordInput from '@/components/ui/PasswordInput';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    storeName: '',
  });
  const [loading, setLoading] = useState(false);

  const handleFreeTrial = () => {
    const message = `مرحباً، أود تجربة مجانية لنظام إبراهيم للمحاسبة.\n\nالبيانات:\nالاسم: ${formData.name || 'غير محدد'}\nاسم المتجر: ${formData.storeName || 'غير محدد'}\nالبريد الإلكتروني: ${formData.email || 'غير محدد'}\nكلمة المرور: ${formData.password || 'غير محدد'}\n\nيرجى إنشاء حساب تجريبي مدته 15 يوم. شكراً!`;
    const url = `${CONTACT_INFO.WHATSAPP_URL}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(formData);
      navigate('/dashboard');
    } catch (error) {
      console.error('Register error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{t('auth.register')} - Ibrahim Accounting System</title>
        <meta name="description" content="Register for Ibrahim Accounting System - Start your 30-day free trial" />
      </Helmet>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="xl" showText={true} />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">
            {t('auth.register')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">ابدأ تجربتك المجانية اليوم</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('auth.name')}
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 transition-all"
                placeholder="John Doe"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('auth.storeName')}
            </label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                required
                value={formData.storeName}
                onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 transition-all"
                placeholder="My Store"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('auth.email')}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 transition-all"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <PasswordInput
              id="password"
              label={t('auth.password')}
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              className="dark:bg-gray-700 dark:text-gray-100 border-gray-300 dark:border-gray-600"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-semibold rounded-lg transition-all"
          >
            {loading ? t('common.loading') : t('auth.registerBtn')}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-center text-sm text-gray-600 dark:text-gray-400 mb-3">
            أو اطلب تجربة مجانية 15 يوم
          </p>
          <Button
            type="button"
            onClick={handleFreeTrial}
            className="w-full py-3 bg-[#25D366] hover:bg-[#128C7E] text-white font-semibold rounded-lg transition-all"
            disabled={!formData.name || !formData.storeName || !formData.email || !formData.password}
          >
            <MessageCircle className="h-4 w-4 ml-2 rtl:mr-2 rtl:ml-0" />
            طلب تجربة مجانية عبر واتساب
          </Button>
          <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
            سنتواصل معك عبر واتساب لإعداد حسابك التجريبي
          </p>
        </div>

        <p className="mt-6 text-center text-gray-600 dark:text-gray-400">
          {t('auth.haveAccount')}{' '}
          <Link to="/login" className="text-orange-500 hover:text-orange-600 font-semibold">
            {t('auth.login')}
          </Link>
        </p>
      </div>
    </>
  );
};

export default RegisterPage;
