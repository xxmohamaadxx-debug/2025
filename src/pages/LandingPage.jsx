import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { neonService } from '@/lib/neonService';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, Database, Smartphone, TrendingUp, Users, Store, 
  Wifi, Fuel, Building2, CheckCircle, Download, LogIn, 
  MessageCircle, Star, Lock, Zap, BarChart, CreditCard,
  Phone, Mail, Clock, Headphones, Rocket, Sparkles, Globe, ChevronDown,
  Package, FileText, Activity, ShoppingCart
} from 'lucide-react';
import Logo from '@/components/Logo';
import { toast } from '@/components/ui/use-toast';

const LandingPage = () => {
  const { t, locale, setLocale } = useLanguage();
  const navigate = useNavigate();
  const [storeTypes, setStoreTypes] = useState([]);
  const [appSettings, setAppSettings] = useState({});
  const [trialDialogOpen, setTrialDialogOpen] = useState(false);
  const [trialForm, setTrialForm] = useState({
    full_name: '',
    store_name: '',
    store_types: [], // أنواع متعددة
    email: '',
    password: '',
    subscription_duration: 'trial'
  });
  const [loading, setLoading] = useState(true);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

  const languages = [
    { code: 'ar', name: 'العربية', flag: '🇸🇦', dir: 'rtl' },
    { code: 'en', name: 'English', flag: '🇬🇧', dir: 'ltr' },
    { code: 'tr', name: 'Türkçe', flag: '🇹🇷', dir: 'ltr' }
  ];

  const currentLanguage = languages.find(lang => lang.code === locale) || languages[0];

  // Animation preference and device detection
  const prefersReduceMotion = typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
  const isDesktop = typeof window !== 'undefined' ? window.innerWidth >= 1024 : true;
  const shouldAnimate = !prefersReduceMotion && isDesktop;

  // Update document direction when locale changes
  useEffect(() => {
    if (currentLanguage) {
      document.documentElement.lang = currentLanguage.code;
      document.documentElement.dir = currentLanguage.dir;
    }
  }, [locale, currentLanguage]);

  // Close language menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isLangMenuOpen && !event.target.closest('.language-selector-container')) {
        setIsLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isLangMenuOpen]);

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
    if (!trialForm.store_name || !trialForm.full_name || trialForm.store_types.length === 0 || !trialForm.email || !trialForm.password) {
      toast({
        title: 'خطأ',
        description: 'يرجى ملء جميع الحقول المطلوبة',
        variant: 'destructive'
      });
      return;
    }

    const whatsappNumber = appSettings.support_whatsapp || appSettings.support_phone || '963994054027';
    const cleanNumber = whatsappNumber.replace(/[^0-9]/g, '');
    
    const selectedTypes = trialForm.store_types.map(typeId => {
      const type = storeTypes.find(t => t.id === typeId);
      return type ? (type.name_ar || type.name_en) : '';
    }).filter(Boolean).join(' + ');
    
    const durationMap = {
      'trial': '15 يوم (تجريبي)',
      'monthly': 'شهري',
      '6months': '6 أشهر',
      'yearly': 'سنوي'
    };
    
    const message = `🎯 طلب نسخة تجريبية جديدة\n\n` +
      `👤 الاسم الكامل: ${trialForm.full_name}\n` +
      `📌 اسم المتجر: ${trialForm.store_name}\n` +
      `🏪 نوع المتجر: ${selectedTypes}\n` +
      `📧 البريد الإلكتروني: ${trialForm.email}\n` +
      `🔑 كلمة المرور: ${trialForm.password}\n` +
      `📅 مدة الاشتراك المطلوبة: ${durationMap[trialForm.subscription_duration] || trialForm.subscription_duration}\n\n` +
      `يرجى إنشاء المتجر والتفعيل. شكراً!`;
    
    const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    
    toast({
      title: 'تم إرسال الطلب',
      description: 'سيتم التواصل معك قريباً عبر الواتساب'
    });
    
    setTrialDialogOpen(false);
    setTrialForm({
      full_name: '',
      store_name: '',
      store_types: [],
      email: '',
      password: '',
      subscription_duration: 'trial'
    });
  };

  const pricingPlans = [
    {
      name: 'تجريبي',
      nameEn: 'Trial',
      duration: '15 يوم',
      price: 'مجاني',
      priceValue: 0,
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
      price: '$5',
      priceValue: 5,
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
      price: '$30',
      priceValue: 30,
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
      price: '$40',
      priceValue: 40,
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

  // Features with translations
  const features = [
    { icon: Shield, titleKey: 'landing.feature1Title', descKey: 'landing.feature1Desc' },
    { icon: Database, titleKey: 'landing.feature2Title', descKey: 'landing.feature2Desc' },
    { icon: BarChart, titleKey: 'landing.feature3Title', descKey: 'landing.feature3Desc' },
    { icon: Smartphone, titleKey: 'landing.feature4Title', descKey: 'landing.feature4Desc' },
    { icon: Zap, titleKey: 'landing.feature5Title', descKey: 'landing.feature5Desc' },
    { icon: Headphones, titleKey: 'landing.feature6Title', descKey: 'landing.feature6Desc' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>
      <Helmet>
        <title>{t('landing.systemName')} - {t('landing.storeTypesSubtitle')}</title>
        <meta name="description" content={t('landing.heroSubtitle')} />
      </Helmet>

      {/* Navigation */}
      <nav className="glass sticky top-0 z-50 border-b border-white/10 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <div className="p-2 bg-gradient-to-br from-orange-500/20 to-pink-500/20 rounded-xl backdrop-blur-sm">
                <Logo size="md" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white drop-shadow-lg">{t('landing.systemNameShort')}</h1>
                <p className="text-xs text-purple-200">{t('landing.systemTagline')}</p>
              </div>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              {/* Language Selector */}
              <div className="relative language-selector-container">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg glass border border-white/20 hover:border-orange-400/50 text-white transition-all duration-300"
                >
                  <Globe className="h-4 w-4" />
                  <span className="text-sm font-medium hidden sm:inline">
                    {currentLanguage.flag} {currentLanguage.name}
                  </span>
                  <span className="text-sm font-medium sm:hidden">
                    {currentLanguage.flag}
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isLangMenuOpen ? 'rotate-180' : ''}`} />
                </motion.button>
                
                <AnimatePresence>
                  {isLangMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-full mt-2 rtl:left-0 ltr:right-0 z-50 w-48 glass border border-white/20 rounded-xl shadow-2xl overflow-hidden"
                    >
                      {languages.map((lang) => (
                        <motion.button
                          key={lang.code}
                          whileHover={{ x: 5, backgroundColor: 'rgba(255, 140, 0, 0.2)' }}
                          whileTap={{ scale: 0.98 }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (setLocale && typeof setLocale === 'function') {
                              setLocale(lang.code);
                              // Force update HTML dir and lang attributes
                              document.documentElement.lang = lang.code;
                              document.documentElement.dir = lang.code === 'ar' ? 'rtl' : 'ltr';
                              // Force page reload to apply translations
                              window.location.reload();
                            }
                            setIsLangMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left rtl:text-right transition-all duration-200 ${
                            locale === lang.code
                              ? 'bg-gradient-to-r from-orange-500/30 to-pink-500/30 text-white font-semibold'
                              : 'text-white/90 hover:bg-white/10'
                          }`}
                        >
                          <span className="text-xl">{lang.flag}</span>
                          <span className="flex-1">{lang.name}</span>
                          {locale === lang.code && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-2 h-2 rounded-full bg-orange-400"
                            />
                          )}
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Button
                onClick={() => setTrialDialogOpen(true)}
                className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 text-white hidden sm:flex shadow-xl hover:shadow-2xl hover:shadow-orange-500/50 transition-all hover:scale-105 border-0"
              >
                <Rocket className="h-4 w-4 ml-2 rtl:mr-2 rtl:ml-0" />
                طلب نسخة تجريبية
              </Button>
              <Button
                onClick={() => navigate('/login')}
                variant="outline"
                className="hidden sm:flex glass border-white/20 text-white hover:bg-white/10 backdrop-blur-sm"
              >
                <LogIn className="h-4 w-4 ml-2 rtl:mr-2 rtl:ml-0" />
                تسجيل الدخول
              </Button>
            </motion.div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-32 overflow-hidden min-h-[90vh] flex items-center">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-600/40 via-pink-600/40 to-purple-600/40 blur-3xl animate-pulse"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,140,0,0.2),transparent_70%)]"></div>
        <div className="absolute inset-0 bg-[conic-gradient(from_180deg_at_50%_50%,rgba(255,140,0,0.1),rgba(236,72,153,0.1),rgba(168,85,247,0.1),rgba(255,140,0,0.1))] animate-spin-slow"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex justify-center mb-12"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full blur-2xl opacity-50 animate-pulse"></div>
              <div className="relative transform hover:scale-110 transition-transform duration-300 p-8 bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20">
                <Logo size="xl" />
              </div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-6xl lg:text-8xl font-black text-white mb-6 drop-shadow-2xl leading-tight">
              {t('landing.systemName')}
            </h1>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <p className="text-2xl md:text-4xl text-white mb-6 max-w-4xl mx-auto font-bold drop-shadow-lg">
              {t('landing.heroTitle')}
            </p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <p className="text-lg md:text-xl text-purple-100 mb-10 max-w-3xl mx-auto leading-relaxed">
              {t('landing.heroSubtitle')}
              <br />
              <span className="text-orange-300 font-bold text-xl mt-4 inline-block bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent">
                {t('landing.ctaFreeTrial')}
              </span>
            </p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Button
              onClick={() => setTrialDialogOpen(true)}
              size="lg"
              className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 text-white text-lg px-8 py-6 hover:scale-110 transition-all shadow-2xl hover:shadow-orange-500/50 group relative overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2">
                <Rocket className="h-5 w-5 group-hover:animate-bounce" />
                {t('landing.requestTrial')}
              </span>
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity"
                initial={false}
              />
            </Button>
            <Button
              onClick={() => navigate('/login')}
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6 glass border-2 border-white/30 text-white hover:border-orange-400 hover:bg-white/10 backdrop-blur-sm transition-all hover:scale-105 hover:shadow-xl hover:shadow-white/20"
            >
              <LogIn className="h-5 w-5 ml-2 rtl:mr-2 rtl:ml-0" />
              {t('landing.loginButton')}
            </Button>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-16 flex flex-wrap justify-center gap-8 text-base text-white"
          >
            <div className="flex items-center gap-3 glass px-6 py-3 rounded-full border border-white/20 hover:border-green-400/50 transition-all">
              <CheckCircle className="h-6 w-6 text-green-400" />
              <span className="font-medium">{t('landing.autoBackups')}</span>
            </div>
            <div className="flex items-center gap-3 glass px-6 py-3 rounded-full border border-white/20 hover:border-green-400/50 transition-all">
              <CheckCircle className="h-6 w-6 text-green-400" />
              <span className="font-medium">{t('landing.highSecurity')}</span>
            </div>
            <div className="flex items-center gap-3 glass px-6 py-3 rounded-full border border-white/20 hover:border-green-400/50 transition-all">
              <CheckCircle className="h-6 w-6 text-green-400" />
              <span className="font-medium">{t('landing.support24_7')}</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 glass-dark relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-5xl font-black text-center text-white mb-16 drop-shadow-lg"
          >
            {t('landing.featuresTitle')}
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group p-8 rounded-2xl glass border border-white/20 hover:border-orange-500/50 hover:shadow-2xl hover:shadow-orange-500/20 transition-all duration-300 transform hover:-translate-y-2"
              >
                <div className="p-4 bg-gradient-to-br from-orange-500/20 to-pink-500/20 rounded-xl w-fit mb-6 group-hover:scale-110 transition-transform">
                  <feature.icon className="h-8 w-8 text-orange-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-orange-300 transition-colors">
                  {t(feature.titleKey)}
                </h3>
                <p className="text-purple-200 leading-relaxed">
                  {t(feature.descKey)}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Store Types Section */}
      <section className="py-20 glass relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-5xl font-black text-center text-white mb-6 drop-shadow-lg"
          >
            {t('landing.storeTypesTitle')}
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-center text-purple-200 mb-16 max-w-3xl mx-auto text-lg"
          >
            {t('landing.storeTypesSubtitle')}
          </motion.p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {storeTypes.map((type, index) => (
              <motion.div
                key={type.id || index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="group p-8 rounded-2xl glass border-2 border-white/20 hover:border-gradient-to-r hover:from-orange-500 hover:to-pink-500 hover:shadow-2xl hover:shadow-orange-500/30 transition-all duration-300"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-gradient-to-br from-orange-500/30 to-pink-500/30 rounded-xl group-hover:scale-110 transition-transform">
                    {type.code === 'internet_cafe' && <Wifi className="h-8 w-8 text-orange-300" />}
                    {type.code === 'accessories' && <Store className="h-8 w-8 text-purple-300" />}
                    {type.code === 'fuel' && <Fuel className="h-8 w-8 text-yellow-300" />}
                    {type.code === 'contractor' && <Building2 className="h-8 w-8 text-orange-300" />}
                    {!['internet_cafe', 'accessories', 'fuel', 'contractor'].includes(type.code) && (
                      <Store className="h-8 w-8 text-gray-300" />
                    )}
                  </div>
                  <h3 className="text-2xl font-bold text-white group-hover:text-orange-300 transition-colors">
                    {type.name_ar || type.name_en}
                  </h3>
                </div>
                <p className="text-purple-200 leading-relaxed">
                  {type.description_ar || type.description_en || 'متجر متكامل'}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section - نظام العمل لكل متجر */}
      <section className="py-24 glass-dark relative z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-600/10 via-pink-600/10 to-purple-600/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-5xl md:text-6xl font-black text-center text-white mb-6 drop-shadow-2xl"
          >
            {locale === 'ar' ? 'كيف يعمل النظام؟' : locale === 'en' ? 'How It Works?' : 'Sistem Nasıl Çalışır?'}
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-center text-purple-200 mb-16 max-w-3xl mx-auto text-xl leading-relaxed"
          >
            {locale === 'ar' 
              ? 'نظام موحد يعمل بذكاء مع جميع أنواع المتاجر - من صالات الإنترنت إلى محطات المحروقات ومتاجر المقاولين'
              : locale === 'en'
              ? 'A unified system that works intelligently with all store types - from internet cafes to fuel stations and contractor stores'
              : 'Tüm mağaza türleriyle akıllıca çalışan birleşik bir sistem - internet kafelerden benzin istasyonlarına ve müteahhit mağazalarına'}
          </motion.p>

          {/* Universal System Flow */}
          <div className="mb-16">
            <motion.h3 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl font-bold text-center text-white mb-12"
            >
              {locale === 'ar' ? 'النظام العالمي الموحد' : locale === 'en' ? 'Universal Unified System' : 'Evrensel Birleşik Sistem'}
            </motion.h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {[
                {
                  icon: Database,
                  title: locale === 'ar' ? 'المستودع' : locale === 'en' ? 'Warehouse' : 'Depo',
                  desc: locale === 'ar' ? 'الوارد يزيد المخزون، الصادر ينقصه. كل عملية مرتبطة تلقائياً' : locale === 'en' ? 'Inbound increases stock, outbound decreases it. Every operation is automatically linked' : 'Gelen stoku artırır, giden azaltır. Her işlem otomatik olarak bağlanır',
                  color: 'from-blue-500 to-cyan-500'
                },
                {
                  icon: BarChart,
                  title: locale === 'ar' ? 'اليومية' : locale === 'en' ? 'Journal' : 'Günlük',
                  desc: locale === 'ar' ? 'كل عملية تُسجل تلقائياً (مدين/دائن) لضمان التوازن المحاسبي' : locale === 'en' ? 'Every transaction is automatically recorded (debit/credit) to ensure accounting balance' : 'Her işlem otomatik olarak kaydedilir (borç/alacak) muhasebe dengesini sağlamak için',
                  color: 'from-green-500 to-emerald-500'
                },
                {
                  icon: Users,
                  title: locale === 'ar' ? 'العملاء' : locale === 'en' ? 'Customers' : 'Müşteriler',
                  desc: locale === 'ar' ? 'إدارة الديون والدفعات مع تاريخ السداد التلقائي' : locale === 'en' ? 'Manage debts and payments with automatic settlement date' : 'Otomatik ödeme tarihi ile borç ve ödemeleri yönetin',
                  color: 'from-purple-500 to-pink-500'
                },
                {
                  icon: CreditCard,
                  title: locale === 'ar' ? 'الصندوق المالي' : locale === 'en' ? 'Financial Box' : 'Mali Kasa',
                  desc: locale === 'ar' ? 'تتبع تلقائي لجميع العملات مع تحديث فوري' : locale === 'en' ? 'Automatic tracking of all currencies with instant updates' : 'Anlık güncellemelerle tüm para birimlerinin otomatik takibi'
                }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ scale: 1.05, y: -8, rotateY: 5 }}
                  className="group p-6 rounded-2xl glass border-2 border-white/20 hover:border-orange-400/50 hover:shadow-2xl hover:shadow-orange-500/30 transition-all duration-300 relative overflow-hidden"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${item.color || 'from-orange-500 to-pink-500'} opacity-0 group-hover:opacity-10 transition-opacity`}></div>
                  <div className="relative z-10">
                    <div className={`p-4 bg-gradient-to-br ${item.color || 'from-orange-500 to-pink-500'} rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform`}>
                      <item.icon className="h-8 w-8 text-white" />
                    </div>
                    <h4 className="text-xl font-bold text-white mb-3 group-hover:text-orange-300 transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-purple-200 text-sm leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Store-Specific Features */}
          <div className="space-y-12">
            {/* Internet Cafe */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="p-8 rounded-2xl glass border-2 border-white/20 hover:border-orange-400/50 transition-all"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="p-4 bg-gradient-to-br from-orange-500/30 to-pink-500/30 rounded-xl">
                  <Wifi className="h-10 w-10 text-orange-300" />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-white mb-2">
                    {locale === 'ar' ? 'صالات الإنترنت' : locale === 'en' ? 'Internet Cafes' : 'İnternet Kafeler'}
                  </h3>
                  <p className="text-purple-200">
                    {locale === 'ar' ? 'إدارة المشتركين والجلسات والأجهزة' : locale === 'en' ? 'Manage subscribers, sessions, and devices' : 'Aboneleri, oturumları ve cihazları yönetin'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { icon: Users, text: locale === 'ar' ? 'إدارة المشتركين والاشتراكات' : locale === 'en' ? 'Manage subscribers & subscriptions' : 'Aboneleri ve abonelikleri yönetin' },
                  { icon: Activity, text: locale === 'ar' ? 'تتبع الجلسات والاستهلاك' : locale === 'en' ? 'Track sessions & consumption' : 'Oturumları ve tüketimi takip edin' },
                  { icon: Database, text: locale === 'ar' ? 'إدارة الأجهزة والحزم' : locale === 'en' ? 'Manage devices & bundles' : 'Cihazları ve paketleri yönetin' }
                ].map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-4 glass border border-white/10 rounded-xl">
                    <feature.icon className="h-6 w-6 text-orange-400" />
                    <span className="text-purple-100 text-sm">{feature.text}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Contractor Store */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="p-8 rounded-2xl glass border-2 border-white/20 hover:border-orange-400/50 transition-all"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="p-4 bg-gradient-to-br from-orange-500/30 to-pink-500/30 rounded-xl">
                  <Building2 className="h-10 w-10 text-orange-300" />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-white mb-2">
                    {locale === 'ar' ? 'متجر المقاولين' : locale === 'en' ? 'Contractor Store' : 'Müteahhit Mağazası'}
                  </h3>
                  <p className="text-purple-200">
                    {locale === 'ar' ? 'إدارة المشاريع والعقود وبنود الكميات (BOQ)' : locale === 'en' ? 'Manage projects, contracts, and BOQ items' : 'Projeleri, sözleşmeleri ve BOQ öğelerini yönetin'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { icon: Building2, text: locale === 'ar' ? 'إدارة المشاريع والجدول الزمني' : locale === 'en' ? 'Manage projects & timeline' : 'Projeleri ve zaman çizelgesini yönetin' },
                  { icon: FileText, text: locale === 'ar' ? 'بنود الكميات (BOQ) مع ربط المستودع' : locale === 'en' ? 'BOQ items with warehouse link' : 'Depo bağlantılı BOQ öğeleri' },
                  { icon: CreditCard, text: locale === 'ar' ? 'عقود ودفعات المقاولين' : locale === 'en' ? 'Contracts & contractor payments' : 'Sözleşmeler ve müteahhit ödemeleri' }
                ].map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-4 glass border border-white/10 rounded-xl">
                    <feature.icon className="h-6 w-6 text-orange-400" />
                    <span className="text-purple-100 text-sm">{feature.text}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Fuel Station */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="p-8 rounded-2xl glass border-2 border-white/20 hover:border-orange-400/50 transition-all"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="p-4 bg-gradient-to-br from-orange-500/30 to-pink-500/30 rounded-xl">
                  <Fuel className="h-10 w-10 text-yellow-300" />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-white mb-2">
                    {locale === 'ar' ? 'محطات المحروقات' : locale === 'en' ? 'Fuel Stations' : 'Benzin İstasyonları'}
                  </h3>
                  <p className="text-purple-200">
                    {locale === 'ar' ? 'إدارة أنواع الوقود والأسعار اليومية والمخزون' : locale === 'en' ? 'Manage fuel types, daily prices, and inventory' : 'Yakıt türlerini, günlük fiyatları ve envanteri yönetin'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { icon: Fuel, text: locale === 'ar' ? 'أنواع الوقود (بنزين، ديزل، غاز)' : locale === 'en' ? 'Fuel types (gasoline, diesel, gas)' : 'Yakıt türleri (benzin, dizel, gaz)' },
                  { icon: TrendingUp, text: locale === 'ar' ? 'أسعار يومية مرتبطة بالسوق' : locale === 'en' ? 'Daily prices linked to market' : 'Piyasaya bağlı günlük fiyatlar' },
                  { icon: Users, text: locale === 'ar' ? 'عملاء أفراد وشركات مع عقود' : locale === 'en' ? 'Individual & company customers with contracts' : 'Sözleşmeli bireysel ve şirket müşterileri' }
                ].map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-4 glass border border-white/10 rounded-xl">
                    <feature.icon className="h-6 w-6 text-orange-400" />
                    <span className="text-purple-100 text-sm">{feature.text}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Mobile Accessories */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 }}
              className="p-8 rounded-2xl glass border-2 border-white/20 hover:border-orange-400/50 transition-all"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="p-4 bg-gradient-to-br from-orange-500/30 to-pink-500/30 rounded-xl">
                  <Store className="h-10 w-10 text-purple-300" />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-white mb-2">
                    {locale === 'ar' ? 'متجر إكسسوارات الجوال' : locale === 'en' ? 'Mobile Accessories Store' : 'Mobil Aksesuar Mağazası'}
                  </h3>
                  <p className="text-purple-200">
                    {locale === 'ar' ? 'إدارة المنتجات والمبيعات والحزم' : locale === 'en' ? 'Manage products, sales, and bundles' : 'Ürünleri, satışları ve paketleri yönetin'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { icon: Package, text: locale === 'ar' ? 'إدارة المنتجات والمخزون' : locale === 'en' ? 'Manage products & inventory' : 'Ürünleri ve envanteri yönetin' },
                  { icon: ShoppingCart, text: locale === 'ar' ? 'نقاط البيع (POS) المتقدمة' : locale === 'en' ? 'Advanced POS system' : 'Gelişmiş POS sistemi' },
                  { icon: FileText, text: locale === 'ar' ? 'فواتير المبيعات والمشتريات' : locale === 'en' ? 'Sales & purchase invoices' : 'Satış ve satın alma faturaları' }
                ].map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-4 glass border border-white/10 rounded-xl">
                    <feature.icon className="h-6 w-6 text-orange-400" />
                    <span className="text-purple-100 text-sm">{feature.text}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 glass-dark relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-5xl font-black text-center text-white mb-6 drop-shadow-lg"
          >
            خطط الاشتراك
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-center text-purple-200 mb-16 text-lg"
          >
            اختر الخطة التي تناسب احتياجاتك
          </motion.p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {pricingPlans.map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ scale: 1.05, y: -10 }}
                className={`group p-8 rounded-2xl border-2 relative transition-all duration-300 ${
                  plan.popular
                    ? 'border-gradient-to-r border-orange-500/50 bg-gradient-to-br from-orange-500/20 via-pink-500/20 to-purple-500/20 glass scale-105 shadow-2xl shadow-orange-500/30'
                    : 'border-white/20 glass hover:border-orange-500/50'
                }`}
              >
                {plan.popular && (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="absolute -top-5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg"
                  >
                    ⭐ {t('subscription.bestValue') || 'الأكثر شعبية'}
                  </motion.div>
                )}
                <h3 className="text-3xl font-black mb-3 group-hover:text-orange-300 transition-colors">
                  {plan.name === 'تجريبي' ? (
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">
                      {plan.name}
                    </span>
                  ) : (
                    <span className="text-white">{plan.name}</span>
                  )}
                </h3>
                {plan.priceValue > 0 && (
                  <p className="text-purple-200 mb-6">{plan.duration}</p>
                )}
                <div className="mb-8">
                  {plan.priceValue > 0 ? (
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-400">
                        {plan.price}
                      </span>
                      {plan.duration.includes('شهر') && (
                        <span className="text-xl text-purple-300 font-medium">/شهر</span>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-start gap-1">
                      <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 drop-shadow-lg">
                        {plan.price}
                      </span>
                      <span className="text-lg text-green-300 font-medium opacity-90">
                        {plan.duration}
                      </span>
                    </div>
                  )}
                </div>
                <ul className="space-y-4 mb-10">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle className="h-6 w-6 text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-purple-100 leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => setTrialDialogOpen(true)}
                  className={`w-full py-6 text-lg font-bold transition-all duration-300 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 text-white hover:shadow-2xl hover:shadow-orange-500/50 hover:scale-105'
                      : 'glass border border-white/20 text-white hover:bg-white/10 hover:border-orange-400 hover:scale-105'
                  }`}
                >
                  {plan.popular ? '🚀 ابدأ الآن' : 'اختر الخطة'}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* App Download Section - Enhanced */}
      <section className="py-24 glass relative z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-600/20 via-pink-600/20 to-purple-600/20"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,140,0,0.15),transparent_70%)]"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <motion.div
              animate={shouldAnimate ? { rotate: [0, 10, -10, 0] } : undefined}
              transition={shouldAnimate ? { duration: 2, repeat: Infinity, repeatDelay: 3 } : undefined}
              className="inline-block mb-6"
            >
              <div className="p-6 bg-gradient-to-br from-orange-500/30 to-pink-500/30 rounded-3xl backdrop-blur-xl border border-white/20">
                <Smartphone className="h-20 w-20 text-white mx-auto" />
              </div>
            </motion.div>
            <h2 className="text-5xl md:text-6xl font-black text-white mb-6 drop-shadow-2xl">
              {locale === 'ar' ? 'حمل التطبيق الآن' : locale === 'en' ? 'Download the App Now' : 'Uygulamayı İndir'}
            </h2>
            <p className="text-xl md:text-2xl text-purple-100 mb-4 max-w-3xl mx-auto leading-relaxed">
              {locale === 'ar' 
                ? 'استمتع بتجربة أفضل على هاتفك المحمول أو جهاز الكمبيوتر' 
                : locale === 'en' 
                ? 'Enjoy a better experience on your mobile phone or computer'
                : 'Mobil telefonunuzda veya bilgisayarınızda daha iyi bir deneyim yaşayın'}
            </p>
            <p className="text-lg text-purple-200 mb-12 max-w-2xl mx-auto">
              {locale === 'ar'
                ? 'تطبيق سريع، آمن، وسهل الاستخدام - متوفر الآن على جميع المنصات'
                : locale === 'en'
                ? 'Fast, secure, and easy-to-use app - Available now on all platforms'
                : 'Hızlı, güvenli ve kullanımı kolay uygulama - Tüm platformlarda mevcut'}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Mobile App Button */}
            {appSettings.mobile_app_android_url && (
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="group"
              >
                <Button
                  onClick={() => window.open(appSettings.mobile_app_android_url, '_blank')}
                  size="xl"
                  className="w-full h-24 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 text-white text-xl font-bold shadow-2xl hover:shadow-green-500/50 transition-all duration-300 relative overflow-hidden group"
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    initial={false}
                  />
                  <div className="relative z-10 flex items-center justify-center gap-4">
                    <motion.div
                      animate={shouldAnimate ? { rotate: [0, 5, -5, 0] } : undefined}
                      transition={shouldAnimate ? { duration: 2, repeat: Infinity } : undefined}
                    >
                      <Smartphone className="h-10 w-10" />
                    </motion.div>
                    <div className="text-right rtl:text-left">
                      <div className="text-sm opacity-90">
                        {locale === 'ar' ? 'تطبيق الجوال' : locale === 'en' ? 'Mobile App' : 'Mobil Uygulama'}
                      </div>
                      <div className="text-lg font-black">
                        {locale === 'ar' ? 'للأندرويد' : locale === 'en' ? 'For Android' : 'Android için'}
                      </div>
                    </div>
                    <Download className="h-8 w-8 group-hover:animate-bounce" />
                  </div>
                </Button>
              </motion.div>
            )}

            {/* Desktop App Button */}
            {appSettings.mobile_app_windows_url && (
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="group"
              >
                <Button
                  onClick={() => window.open(appSettings.mobile_app_windows_url, '_blank')}
                  size="xl"
                  className="w-full h-24 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white text-xl font-bold shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 relative overflow-hidden group"
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    initial={false}
                  />
                  <div className="relative z-10 flex items-center justify-center gap-4">
                    <motion.div
                      animate={shouldAnimate ? { scale: [1, 1.1, 1] } : undefined}
                      transition={shouldAnimate ? { duration: 2, repeat: Infinity } : undefined}
                    >
                      <Database className="h-10 w-10" />
                    </motion.div>
                    <div className="text-right rtl:text-left">
                      <div className="text-sm opacity-90">
                        {locale === 'ar' ? 'تطبيق الحاسوب' : locale === 'en' ? 'Desktop App' : 'Masaüstü Uygulama'}
                      </div>
                      <div className="text-lg font-black">
                        {locale === 'ar' ? 'للوندوز' : locale === 'en' ? 'For Windows' : 'Windows için'}
                      </div>
                    </div>
                    <Download className="h-8 w-8 group-hover:animate-bounce" />
                  </div>
                </Button>
              </motion.div>
            )}

            {/* Fallback if no URLs */}
            {!appSettings.mobile_app_android_url && !appSettings.mobile_app_windows_url && (
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="col-span-2 text-center py-12"
              >
                <p className="text-purple-200 text-lg">
                  {locale === 'ar' 
                    ? 'التطبيقات قريباً...' 
                    : locale === 'en' 
                    ? 'Apps coming soon...'
                    : 'Uygulamalar yakında...'}
                </p>
              </motion.div>
            )}
          </div>

          {/* App Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto"
          >
            {[
              { icon: Zap, title: locale === 'ar' ? 'سريع جداً' : locale === 'en' ? 'Super Fast' : 'Çok Hızlı', desc: locale === 'ar' ? 'أداء سريع وسلس' : locale === 'en' ? 'Fast and smooth performance' : 'Hızlı ve akıcı performans' },
              { icon: Lock, title: locale === 'ar' ? 'آمن 100%' : locale === 'en' ? '100% Secure' : '%100 Güvenli', desc: locale === 'ar' ? 'حماية كاملة لبياناتك' : locale === 'en' ? 'Full protection for your data' : 'Verileriniz için tam koruma' },
              { icon: Globe, title: locale === 'ar' ? 'متعدد اللغات' : locale === 'en' ? 'Multi-language' : 'Çok Dilli', desc: locale === 'ar' ? 'عربي، إنجليزي، تركي' : locale === 'en' ? 'Arabic, English, Turkish' : 'Arapça, İngilizce, Türkçe' }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 + index * 0.1 }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="p-6 glass border border-white/20 rounded-2xl text-center hover:border-orange-400/50 transition-all"
              >
                <div className="p-4 bg-gradient-to-br from-orange-500/20 to-pink-500/20 rounded-xl w-fit mx-auto mb-4">
                  <feature.icon className="h-8 w-8 text-orange-300" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-purple-200">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="glass-dark border-t border-white/10 py-12 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Logo size="sm" />
                <span className="text-white font-bold">{t('landing.systemNameShort')}</span>
              </div>
              <p className="text-sm text-purple-200 leading-relaxed">
                {t('landing.heroSubtitle')}
              </p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-6 text-lg">{t('common.contact') || 'اتصل بنا'}</h4>
              <div className="space-y-4">
                {appSettings.support_phone && (
                  <div className="flex items-center gap-3 glass px-4 py-3 rounded-xl border border-white/10 hover:border-orange-400/50 transition-all">
                    <Phone className="h-5 w-5 text-orange-400" />
                    <span className="text-purple-200">{appSettings.support_phone}</span>
                  </div>
                )}
                {appSettings.support_email && (
                  <div className="flex items-center gap-3 glass px-4 py-3 rounded-xl border border-white/10 hover:border-orange-400/50 transition-all">
                    <Mail className="h-5 w-5 text-orange-400" />
                    <span className="text-purple-200">{appSettings.support_email}</span>
                  </div>
                )}
              </div>
            </div>
            <div>
              <h4 className="text-white font-bold mb-6 text-lg">{t('common.quickLinks') || 'روابط سريعة'}</h4>
              <div className="space-y-3">
                <Link to="/login" className="block glass px-4 py-3 rounded-xl border border-white/10 hover:border-orange-400/50 hover:bg-white/5 text-purple-200 hover:text-white transition-all">
                  {t('landing.loginButton')}
                </Link>
                <button
                  onClick={() => setTrialDialogOpen(true)}
                  className="w-full text-right glass px-4 py-3 rounded-xl border border-white/10 hover:border-orange-400/50 hover:bg-white/5 text-purple-200 hover:text-white transition-all"
                >
                  {t('landing.requestTrial')}
                </button>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 mt-8 pt-8 text-center">
            <p className="text-purple-300">{t('landing.footerCopyright').replace('{year}', new Date().getFullYear())}</p>
          </div>
        </div>
      </footer>

      {/* Trial Request Dialog */}
      <Dialog open={trialDialogOpen} onOpenChange={setTrialDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
              🚀 ابدأ رحلتك الآن - نسخة تجريبية مجانية
            </DialogTitle>
            <DialogDescription>
              املأ البيانات التالية وسيتم التواصل معك عبر الواتساب خلال دقائق
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium mb-2">الاسم الكامل *</label>
              <input
                type="text"
                required
                value={trialForm.full_name}
                onChange={(e) => setTrialForm({ ...trialForm, full_name: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                placeholder="أدخل اسمك الكامل"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">اسم المتجر *</label>
              <input
                type="text"
                required
                value={trialForm.store_name}
                onChange={(e) => setTrialForm({ ...trialForm, store_name: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                placeholder="اسم المتجر"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">نوع المتجر * (يمكن اختيار أكثر من نوع)</label>
              <div className="space-y-2 max-h-48 overflow-y-auto border-2 border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
                {storeTypes.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">جاري تحميل أنواع المتاجر...</p>
                ) : (
                  storeTypes.map(type => (
                    <label key={type.id} className="flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-orange-300">
                      <input
                        type="checkbox"
                        checked={trialForm.store_types?.includes(type.id) || false}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setTrialForm({
                              ...trialForm,
                              store_types: [...(trialForm.store_types || []), type.id]
                            });
                          } else {
                            setTrialForm({
                              ...trialForm,
                              store_types: trialForm.store_types?.filter(id => id !== type.id) || []
                            });
                          }
                        }}
                        className="w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500 focus:ring-2"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {type.name_ar || type.name_en}
                        </span>
                        {type.description_ar && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {type.description_ar}
                          </p>
                        )}
                      </div>
                    </label>
                  ))
                )}
              </div>
              {trialForm.store_types && trialForm.store_types.length > 0 && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  تم اختيار {trialForm.store_types.length} نوع متجر
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">البريد الإلكتروني *</label>
              <input
                type="email"
                required
                value={trialForm.email}
                onChange={(e) => setTrialForm({ ...trialForm, email: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">كلمة المرور *</label>
              <input
                type="password"
                required
                minLength={6}
                value={trialForm.password}
                onChange={(e) => setTrialForm({ ...trialForm, password: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                placeholder="كلمة المرور (6 أحرف على الأقل)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">مدة الاشتراك المطلوبة</label>
              <select
                value={trialForm.subscription_duration}
                onChange={(e) => setTrialForm({ ...trialForm, subscription_duration: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
              >
                <option value="trial">15 يوم تجريبي (مجاني)</option>
                <option value="monthly">شهري</option>
                <option value="6months">6 أشهر</option>
                <option value="yearly">سنوي</option>
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => setTrialDialogOpen(false)}
                variant="outline"
                className="flex-1"
              >
                إلغاء
              </Button>
              <Button
                onClick={handleTrialRequest}
                className="flex-1 bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:from-orange-600 hover:to-pink-600 shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95"
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

