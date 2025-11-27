
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
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"
          animate={{
            x: [0, 50, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-orange-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"
          animate={{
            x: [0, -50, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      <Helmet>
        <title>{t('auth.loginTitle')} - {t('common.systemName')}</title>
      </Helmet>
      
      <div className="relative z-10 w-full min-h-screen flex items-center justify-center p-3 sm:p-4 md:p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          {/* Glassmorphism Card */}
          <div className="relative backdrop-blur-xl bg-white/10 dark:bg-gray-900/30 rounded-2xl sm:rounded-3xl shadow-2xl border border-white/20 p-6 sm:p-8 md:p-10 overflow-hidden w-full">
            {/* Animated Border Glow */}
            <motion.div
              className="absolute inset-0 rounded-3xl"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 140, 0, 0.3), rgba(236, 72, 153, 0.3), rgba(168, 85, 247, 0.3))',
                padding: '2px',
                WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                WebkitMaskComposite: 'xor',
                maskComposite: 'exclude',
              }}
              animate={{
                rotate: [0, 360],
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
            
            <div className="relative z-10">
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="flex justify-center mb-6"
                >
                  <Logo size="xl" showText={true} />
                </motion.div>
                <motion.h2 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-2 text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white mb-2"
                >
                  {t('auth.welcomeBack')}
                </motion.h2>
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mt-2 text-xs sm:text-sm text-purple-200 font-medium"
                >
                  {t('auth.signInToAccess')}
                </motion.p>
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

              <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-5">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <label htmlFor="email" className="block text-xs sm:text-sm font-bold text-white mb-2">{t('auth.email')}</label>
                    <motion.input
                      id="email"
                      type="email"
                      required
                      whileFocus={{ scale: 1.01 }}
                      className="w-full px-4 sm:px-5 py-2.5 sm:py-3 text-sm sm:text-base rounded-xl border-2 border-white/20 bg-white/10 backdrop-blur-sm text-white placeholder-purple-300 focus:border-orange-400 focus:bg-white/20 focus:ring-4 focus:ring-orange-500/30 transition-all outline-none font-medium"
                      placeholder={t('auth.email')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <label htmlFor="password" className="block text-xs sm:text-sm font-bold text-white mb-2">{t('auth.password')}</label>
                    <motion.input
                      id="password"
                      type="password"
                      required
                      whileFocus={{ scale: 1.01 }}
                      className="w-full px-4 sm:px-5 py-2.5 sm:py-3 text-sm sm:text-base rounded-xl border-2 border-white/20 bg-white/10 backdrop-blur-sm text-white placeholder-purple-300 focus:border-orange-400 focus:bg-white/20 focus:ring-4 focus:ring-orange-500/30 transition-all outline-none font-medium"
                      placeholder={t('auth.password')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </motion.div>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="space-y-4"
                >
                  <Button
                    type="submit"
                    variant="neon"
                    size="lg"
                    className="w-full text-base sm:text-lg font-bold py-2.5 sm:py-3"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin ml-2 rtl:mr-2 rtl:ml-0" />
                        {t('auth.signingIn')}
                      </>
                    ) : (
                      <>{t('auth.loginButton')}</>
                    )}
                  </Button>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="text-center text-sm"
                >
                  <span className="text-purple-200">{t('auth.noAccount')} </span>
                  <Link to="/register" className="font-bold text-orange-300 hover:text-orange-200 transition-colors underline underline-offset-4">
                    {t('auth.startTrial')}
                  </Link>
                </motion.div>
              </form>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;
