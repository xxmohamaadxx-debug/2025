
import React from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';
import Logo from '@/components/Logo';
import { useLanguage } from '@/contexts/LanguageContext';

const NotFoundPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <>
      <Helmet>
        <title>404 - Page Not Found - Ibrahim Accounting System</title>
        <meta name="description" content="The page you are looking for does not exist" />
      </Helmet>

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <Logo size="xl" showText={true} />
          </div>
          <h1 className="text-9xl font-bold text-gray-800 dark:text-gray-100">404</h1>
          <p className="text-2xl text-gray-600 dark:text-gray-400 mt-4 mb-8">
            {t('errors.notFound') || 'الصفحة غير موجودة'}
          </p>
          <Button
            onClick={() => navigate('/dashboard')}
            className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
          >
            <Home className="h-4 w-4 mr-2" />
            Go to Dashboard
          </Button>
        </div>
      </div>
    </>
  );
};

export default NotFoundPage;
