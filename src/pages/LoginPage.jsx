
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, AlertCircle } from 'lucide-react';
import { Helmet } from 'react-helmet';
import Logo from '@/components/Logo';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      console.error("Login error:", err);
      // Improve error message readability
      const message = err.message === "Database error querying schema" 
        ? t('errors.tryAgain')
        : (err.message || t('errors.invalidCredentials'));
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <>
      <Helmet>
        <title>{t('auth.loginTitle')} - {t('common.systemName')}</title>
      </Helmet>
      <div className="w-full space-y-6">
        <div className="text-center">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex justify-center mb-6"
          >
            <Logo size="xl" showText={false} />
          </motion.div>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            {t('auth.welcomeBack')}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {t('auth.signInToAccess')}
          </p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3 text-sm text-red-800 dark:text-red-300 overflow-hidden"
            >
              <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
              <div className="flex-1">
                <div className="whitespace-pre-line leading-relaxed">{error}</div>
                {error.includes('VITE_NEON_DATABASE_URL') && (
                  <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-800">
                    <a 
                      href="FIX_NEON_AUTHENTICATION.md" 
                      target="_blank"
                      className="text-red-700 dark:text-red-400 underline font-medium hover:text-red-900 dark:hover:text-red-300"
                    >
                      اقرأ دليل حل المشكلة →
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('auth.email')}</label>
              <input
                id="email"
                type="email"
                required
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none"
                placeholder={t('auth.email')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('auth.password')}</label>
              <input
                id="password"
                type="password"
                required
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none"
                placeholder={t('auth.password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-semibold py-2.5 rounded-lg shadow-md transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin ml-2 rtl:mr-2 rtl:ml-0" /> : null}
              {isLoading ? t('auth.signingIn') : t('auth.loginButton')}
            </Button>
          </div>

          <div className="text-center text-sm">
            <span className="text-gray-500">{t('auth.noAccount')} </span>
            <Link to="/register" className="font-semibold text-orange-600 hover:text-orange-500">
              {t('auth.startTrial')}
            </Link>
          </div>
        </form>
      </div>
    </>
  );
};

export default LoginPage;
