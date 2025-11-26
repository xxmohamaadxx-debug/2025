import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { neonService } from '@/lib/neonService';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  Shield, Database, Smartphone, TrendingUp, Users, Store, 
  Wifi, Fuel, Building2, CheckCircle, Download, LogIn, 
  MessageCircle, Star, Lock, Zap, BarChart, CreditCard,
  Phone, Mail, Clock, Headphones
} from 'lucide-react';
import Logo from '@/components/Logo';
import { toast } from '@/components/ui/use-toast';

const LandingPage = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [storeTypes, setStoreTypes] = useState([]);
  const [appSettings, setAppSettings] = useState({});
  const [trialDialogOpen, setTrialDialogOpen] = useState(false);
  const [trialForm, setTrialForm] = useState({
    store_name: '',
    store_type: '',
    manager_name: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [types, settings] = await Promise.all([
        neonService.getStoreTypes(),
        neonService.getSystemSettings()
      ]);
      setStoreTypes(types || []);
      setAppSettings(settings || {});
    } catch (error) {
      console.error('Load data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTrialRequest = () => {
    if (!trialForm.store_name || !trialForm.store_type || !trialForm.manager_name || !trialForm.email || !trialForm.password) {
      toast({
        title: 'خطأ',
        description: 'يرجى ملء جميع الحقول',
        variant: 'destructive'
      });
      return;
    }

    const whatsappNumber = appSettings.support_whatsapp || appSettings.support_phone || '963994054027';
    const cleanNumber = whatsappNumber.replace(/[^0-9]/g, '');
    
    const message = `🎯 طلب نسخة تجريبية جديدة\n\n` +
      `📌 اسم المتجر: ${trialForm.store_name}\n` +
      `🏪 نوع المتجر: ${trialForm.store_type}\n` +
      `👤 اسم المدير: ${trialForm.manager_name}\n` +
      `📧 البريد الإلكتروني: ${trialForm.email}\n` +
      `🔑 كلمة المرور: ${trialForm.password}\n\n` +
      `يرجى إنشاء المتجر والتفعيل. شكراً!`;
    
    const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    
    toast({
      title: 'تم إرسال الطلب',
      description: 'سيتم التواصل معك قريباً'
    });
    
    setTrialDialogOpen(false);
    setTrialForm({
      store_name: '',
      store_type: '',
      manager_name: '',
      email: '',
      password: ''
    });
  };

  const pricingPlans = [
    {
      name: 'تجريبي',
      nameEn: 'Trial',
      duration: '15 يوم',
      price: 'مجاني',
      features: [
        'جميع المميزات',
        'دعم فني محدود',
        'لا يوجد التزام',
        'نسخ احتياطية يدوية'
      ],
      popular: false
    },
    {
      name: 'شهري',
      nameEn: 'Monthly',
      duration: 'شهر واحد',
      price: 'متغير',
      features: [
        'جميع المميزات',
        'دعم فني كامل',
        'نسخ احتياطية تلقائية',
        'تحديثات مستمرة',
        'دعم 24/7'
      ],
      popular: true
    },
    {
      name: 'نصف سنوي',
      nameEn: '6 Months',
      duration: '6 أشهر',
      price: 'متغير',
      features: [
        'جميع المميزات',
        'دعم فني كامل',
        'نسخ احتياطية تلقائية',
        'تحديثات مستمرة',
        'دعم 24/7',
        'خصم خاص'
      ],
      popular: false
    },
    {
      name: 'سنوي',
      nameEn: 'Yearly',
      duration: 'سنة واحدة',
      price: 'متغير',
      features: [
        'جميع المميزات',
        'دعم فني كامل',
        'نسخ احتياطية تلقائية',
        'تحديثات مستمرة',
        'دعم 24/7',
        'أفضل سعر',
        'أولوية في الدعم'
      ],
      popular: false
    }
  ];

  const features = [
    { icon: Shield, title: 'أمان عالي', desc: 'نظام حماية متقدم ونسخ احتياطية' },
    { icon: Database, title: 'نسخ احتياطية', desc: 'نسخ احتياطية تلقائية ويدوية' },
    { icon: BarChart, title: 'تقارير متقدمة', desc: 'تقارير شاملة وملخصات تفصيلية' },
    { icon: Smartphone, title: 'تطبيق جوال', desc: 'تطبيق جوال متاح للأندرويد والويندوز' },
    { icon: Zap, title: 'سريع وخفيف', desc: 'أداء عالي وسرعة في التحميل' },
    { icon: Headphones, title: 'دعم فني', desc: 'دعم فني متاح 24/7' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Helmet>
        <title>نظام إبراهيم للمحاسبة - إدارة متكاملة للمتاجر</title>
        <meta name="description" content="نظام إدارة محاسبي متكامل يدعم جميع أنواع المتاجر مع نسخ احتياطية وحماية عالية" />
      </Helmet>

      {/* Navigation */}
      <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Logo size="md" />
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">نظام إبراهيم</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">للمحاسبة والإدارة</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setTrialDialogOpen(true)}
                className="bg-gradient-to-r from-orange-500 to-pink-500 text-white hidden sm:flex"
              >
                <MessageCircle className="h-4 w-4 ml-2 rtl:mr-2 rtl:ml-0" />
                طلب نسخة تجريبية
              </Button>
              <Button
                onClick={() => navigate('/login')}
                variant="outline"
                className="hidden sm:flex"
              >
                <LogIn className="h-4 w-4 ml-2 rtl:mr-2 rtl:ml-0" />
                تسجيل الدخول
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-pink-400/20 blur-3xl"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center mb-8">
            <Logo size="xl" />
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 dark:text-white mb-6">
            نظام إدارة محاسبي
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-pink-500">
              متكامل ومتقدم
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            إدارة متكاملة لجميع أنواع المتاجر مع نسخ احتياطية تلقائية وحماية عالية وتقارير شاملة
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              onClick={() => setTrialDialogOpen(true)}
              size="lg"
              className="bg-gradient-to-r from-orange-500 to-pink-500 text-white text-lg px-8 py-6 hover:scale-105 transition-transform"
            >
              <MessageCircle className="h-5 w-5 ml-2 rtl:mr-2 rtl:ml-0" />
              طلب نسخة تجريبية مجانية
            </Button>
            <Button
              onClick={() => navigate('/login')}
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6 border-2"
            >
              <LogIn className="h-5 w-5 ml-2 rtl:mr-2 rtl:ml-0" />
              تسجيل الدخول
            </Button>
          </div>
          <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>نسخ احتياطية تلقائية</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>حماية عالية</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>دعم 24/7</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center text-gray-900 dark:text-white mb-12">
            مميزات النظام
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-6 rounded-xl bg-gradient-to-br from-gray-50 to-white dark:from-gray-700 dark:to-gray-800 border border-gray-200 dark:border-gray-600 hover:shadow-lg transition-shadow"
              >
                <feature.icon className="h-12 w-12 text-orange-500 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Store Types Section */}
      <section className="py-20 bg-gradient-to-br from-orange-50 to-pink-50 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center text-gray-900 dark:text-white mb-4">
            أنواع المتاجر المدعومة
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
            نظام مرن يدعم جميع أنواع المتاجر مع ميزات مخصصة لكل نوع
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {storeTypes.map((type, index) => (
              <div
                key={type.id || index}
                className="p-6 rounded-xl bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-orange-500 transition-colors"
              >
                <div className="flex items-center gap-3 mb-4">
                  {type.code === 'internet_cafe' && <Wifi className="h-8 w-8 text-blue-500" />}
                  {type.code === 'accessories' && <Store className="h-8 w-8 text-purple-500" />}
                  {type.code === 'fuel' && <Fuel className="h-8 w-8 text-yellow-500" />}
                  {type.code === 'contractor' && <Building2 className="h-8 w-8 text-orange-500" />}
                  {!['internet_cafe', 'accessories', 'fuel', 'contractor'].includes(type.code) && (
                    <Store className="h-8 w-8 text-gray-500" />
                  )}
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {type.name_ar || type.name_en}
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  {type.description_ar || type.description_en || 'متجر متكامل'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center text-gray-900 dark:text-white mb-4">
            خطط الاشتراك
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-12">
            اختر الخطة التي تناسب احتياجاتك
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pricingPlans.map((plan, index) => (
              <div
                key={index}
                className={`p-8 rounded-xl border-2 ${
                  plan.popular
                    ? 'border-orange-500 bg-gradient-to-br from-orange-50 to-pink-50 dark:from-gray-700 dark:to-gray-800 scale-105'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                } relative`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-pink-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    الأكثر شعبية
                  </div>
                )}
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {plan.name}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">{plan.duration}</p>
                <div className="text-4xl font-extrabold text-gray-900 dark:text-white mb-6">
                  {plan.price}
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600 dark:text-gray-400">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => setTrialDialogOpen(true)}
                  className={`w-full ${
                    plan.popular
                      ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                  }`}
                >
                  اختر الخطة
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* App Download Section */}
      {(appSettings.mobile_app_android_url || appSettings.mobile_app_windows_url) && (
        <section className="py-20 bg-gradient-to-r from-orange-500 to-pink-500 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <Smartphone className="h-16 w-16 mx-auto mb-6" />
            <h2 className="text-4xl font-bold mb-4">حمل تطبيق الجوال</h2>
            <p className="text-xl mb-8 opacity-90">
              استمتع بتجربة أفضل على هاتفك المحمول
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {appSettings.mobile_app_android_url && (
                <Button
                  onClick={() => window.open(appSettings.mobile_app_android_url, '_blank')}
                  size="lg"
                  className="bg-white text-orange-500 hover:bg-gray-100 text-lg px-8 py-6"
                >
                  <Download className="h-5 w-5 ml-2 rtl:mr-2 rtl:ml-0" />
                  تحميل للأندرويد
                </Button>
              )}
              {appSettings.mobile_app_windows_url && (
                <Button
                  onClick={() => window.open(appSettings.mobile_app_windows_url, '_blank')}
                  size="lg"
                  className="bg-white text-orange-500 hover:bg-gray-100 text-lg px-8 py-6"
                >
                  <Download className="h-5 w-5 ml-2 rtl:mr-2 rtl:ml-0" />
                  تحميل للويندوز
                </Button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Logo size="sm" />
                <span className="text-white font-bold">نظام إبراهيم</span>
              </div>
              <p className="text-sm">
                نظام إدارة محاسبي متكامل ومتقدم لجميع أنواع المتاجر
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">اتصل بنا</h4>
              <div className="space-y-2 text-sm">
                {appSettings.support_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span>{appSettings.support_phone}</span>
                  </div>
                )}
                {appSettings.support_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>{appSettings.support_email}</span>
                  </div>
                )}
              </div>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">روابط سريعة</h4>
              <div className="space-y-2 text-sm">
                <Link to="/login" className="block hover:text-orange-500 transition-colors">
                  تسجيل الدخول
                </Link>
                <button
                  onClick={() => setTrialDialogOpen(true)}
                  className="block hover:text-orange-500 transition-colors"
                >
                  طلب نسخة تجريبية
                </button>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            <p>&copy; {new Date().getFullYear()} نظام إبراهيم للمحاسبة. جميع الحقوق محفوظة.</p>
          </div>
        </div>
      </footer>

      {/* Trial Request Dialog */}
      <Dialog open={trialDialogOpen} onOpenChange={setTrialDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>طلب نسخة تجريبية</DialogTitle>
            <DialogDescription>
              املأ البيانات التالية وسيتم التواصل معك عبر الواتساب
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium mb-1">اسم المتجر *</label>
              <input
                type="text"
                required
                value={trialForm.store_name}
                onChange={(e) => setTrialForm({ ...trialForm, store_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                placeholder="اسم المتجر"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">نوع المتجر *</label>
              <select
                required
                value={trialForm.store_type}
                onChange={(e) => setTrialForm({ ...trialForm, store_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="">اختر نوع المتجر</option>
                {storeTypes.map(type => (
                  <option key={type.id} value={type.name_ar || type.name_en}>
                    {type.name_ar || type.name_en}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">اسم المدير *</label>
              <input
                type="text"
                required
                value={trialForm.manager_name}
                onChange={(e) => setTrialForm({ ...trialForm, manager_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                placeholder="اسم المدير"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">البريد الإلكتروني *</label>
              <input
                type="email"
                required
                value={trialForm.email}
                onChange={(e) => setTrialForm({ ...trialForm, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">كلمة المرور *</label>
              <input
                type="password"
                required
                value={trialForm.password}
                onChange={(e) => setTrialForm({ ...trialForm, password: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                placeholder="كلمة المرور"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setTrialDialogOpen(false)}
                variant="outline"
                className="flex-1"
              >
                إلغاء
              </Button>
              <Button
                onClick={handleTrialRequest}
                className="flex-1 bg-gradient-to-r from-orange-500 to-pink-500 text-white"
              >
                <MessageCircle className="h-4 w-4 ml-2 rtl:mr-2 rtl:ml-0" />
                إرسال عبر الواتساب
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LandingPage;

