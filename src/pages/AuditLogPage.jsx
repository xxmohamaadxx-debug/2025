import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { neonService } from '@/lib/neonService';
import { Loader2 } from 'lucide-react';
import { formatDateAR } from '@/lib/dateUtils';

const AuditLogPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.tenant_id) {
      loadLogs();
    }
  }, [user]);

  const loadLogs = async () => {
    try {
      const data = await neonService.getAuditLogs(user.tenant_id);
      setLogs(data || []);
    } catch (error) {
      console.error('Load logs error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{t('common.auditLog')} - {t('common.systemName')}</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
            {t('common.auditLog')}
          </h1>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          {logs.length === 0 ? (
             <div className="text-center text-gray-500">لا توجد نشاطات مسجلة بعد</div>
          ) : (
              <div className="space-y-4">
                  {logs.map(log => (
                      <div key={log.id} className="flex items-center justify-between p-4 border-b dark:border-gray-700 last:border-0">
                          <div>
                              <div className="font-semibold text-gray-800 dark:text-gray-200">{log.action}</div>
                              <div className="text-sm text-gray-500">{typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}</div>
                          </div>
                          <div className="text-sm text-gray-400">
                              {formatDateAR(log.created_at, { hour: '2-digit', minute: '2-digit' })}
                          </div>
                      </div>
                  ))}
              </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AuditLogPage;
