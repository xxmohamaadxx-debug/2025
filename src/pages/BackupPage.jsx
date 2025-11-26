import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { neonService } from '@/lib/neonService';
import { Button } from '@/components/ui/button';
import { Download, Upload, Trash2, Loader2, Database, FileDown, FileUp, AlertCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { formatDateAR } from '@/lib/dateUtils';
import { saveAs } from 'file-saver';

const BackupPage = () => {
  const { user, tenant } = useAuth();
  const { t } = useLanguage();
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (user?.tenant_id) {
      loadBackups();
    }
  }, [user]);

  const loadBackups = async () => {
    if (!user?.tenant_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await neonService.getBackups(user.tenant_id);
      setBackups(data || []);
    } catch (error) {
      console.error('Load backups error:', error);
      toast({
        title: 'خطأ',
        description: 'فشل تحميل النسخ الاحتياطية',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    if (!user?.tenant_id) {
      toast({
        title: 'خطأ',
        description: 'يجب أن تكون مرتبطاً بمتجر',
        variant: 'destructive'
      });
      return;
    }

    try {
      setCreating(true);
      const backup = await neonService.createBackup(user.tenant_id, user.id);
      
      if (backup?.backup_data) {
        // تحميل النسخة الاحتياطية كملف JSON
        const blob = new Blob([JSON.stringify(backup.backup_data, null, 2)], { type: 'application/json' });
        const fileName = `backup_${tenant?.name || 'store'}_${new Date().toISOString().split('T')[0]}.json`;
        saveAs(blob, fileName);
      }

      toast({ title: 'تم إنشاء النسخة الاحتياطية بنجاح' });
      loadBackups();
    } catch (error) {
      console.error('Create backup error:', error);
      toast({
        title: 'خطأ',
        description: error.message || 'فشل إنشاء النسخة الاحتياطية',
        variant: 'destructive'
      });
    } finally {
      setCreating(false);
    }
  };

  const handleExportBackup = async () => {
    if (!user?.tenant_id) return;

    try {
      setCreating(true);
      const backupData = await neonService.exportBackupData(user.tenant_id);
      
      if (backupData) {
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const fileName = `backup_export_${tenant?.name || 'store'}_${new Date().toISOString().split('T')[0]}.json`;
        saveAs(blob, fileName);
        toast({ title: 'تم تصدير النسخة الاحتياطية بنجاح' });
      }
    } catch (error) {
      console.error('Export backup error:', error);
      toast({
        title: 'خطأ',
        description: error.message || 'فشل تصدير النسخة الاحتياطية',
        variant: 'destructive'
      });
    } finally {
      setCreating(false);
    }
  };

  const handleImportBackup = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!user?.tenant_id) {
      toast({
        title: 'خطأ',
        description: 'يجب أن تكون مرتبطاً بمتجر',
        variant: 'destructive'
      });
      return;
    }

    try {
      setImporting(true);
      const text = await file.text();
      const backupData = JSON.parse(text);

      if (!backupData.tenant || !backupData.invoices_in || !backupData.invoices_out) {
        throw new Error('صيغة ملف النسخة الاحتياطية غير صحيحة');
      }

      if (!window.confirm('⚠️ تحذير: استيراد النسخة الاحتياطية سيستبدل البيانات الحالية. هل أنت متأكد؟')) {
        return;
      }

      await neonService.importBackupData(backupData, user.tenant_id);
      
      toast({ title: 'تم استيراد النسخة الاحتياطية بنجاح. يرجى إعادة تحميل الصفحة.' });
      
      // إعادة تحميل الصفحة بعد ثانيتين
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Import backup error:', error);
      toast({
        title: 'خطأ',
        description: error.message || 'فشل استيراد النسخة الاحتياطية',
        variant: 'destructive'
      });
    } finally {
      setImporting(false);
      event.target.value = ''; // إعادة تعيين input
    }
  };

  const handleDeleteBackup = async (backupId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه النسخة الاحتياطية؟')) return;

    try {
      await neonService.deleteBackup(backupId, user.tenant_id);
      toast({ title: 'تم حذف النسخة الاحتياطية بنجاح' });
      loadBackups();
    } catch (error) {
      console.error('Delete backup error:', error);
      toast({
        title: 'خطأ',
        description: 'فشل حذف النسخة الاحتياطية',
        variant: 'destructive'
      });
    }
  };

  const handleDownloadBackup = async (backup) => {
    try {
      if (backup.backup_data) {
        const blob = new Blob([JSON.stringify(backup.backup_data, null, 2)], { type: 'application/json' });
        const fileName = backup.file_name || `backup_${backup.id.substring(0, 8)}.json`;
        saveAs(blob, fileName);
        toast({ title: 'تم تحميل النسخة الاحتياطية بنجاح' });
      } else {
        toast({
          title: 'خطأ',
          description: 'النسخة الاحتياطية لا تحتوي على بيانات',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Download backup error:', error);
      toast({
        title: 'خطأ',
        description: 'فشل تحميل النسخة الاحتياطية',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Helmet><title>النسخ الاحتياطي</title></Helmet>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Database className="h-8 w-8 text-orange-500" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">
            النسخ الاحتياطي والاستعادة
          </h1>
        </div>
      </div>

      {/* تحذير */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-1">مهم:</h3>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            النسخ الاحتياطي يشمل جميع بيانات المتجر (فواتير، مستودع، موظفين، إلخ). 
            احتفظ بنسخ احتياطية منتظمة لحماية بياناتك.
          </p>
        </div>
      </div>

      {/* أزرار الإجراءات */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={handleCreateBackup}
            disabled={creating || !user?.tenant_id}
            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white"
          >
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 ltr:mr-2 rtl:ml-2 animate-spin" />
                جاري الإنشاء...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                إنشاء وتحميل نسخة احتياطية
              </>
            )}
          </Button>

          <Button
            onClick={handleExportBackup}
            disabled={creating || !user?.tenant_id}
            variant="outline"
            className="flex-1"
          >
            <FileDown className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
            تصدير نسخة احتياطية
          </Button>

          <label className="flex-1">
            <Button
              disabled={importing || !user?.tenant_id}
              variant="outline"
              className="w-full"
              asChild
            >
              <span>
                <FileUp className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                {importing ? 'جاري الاستيراد...' : 'استيراد نسخة احتياطية'}
              </span>
            </Button>
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportBackup}
              disabled={importing}
            />
          </label>
        </div>
      </div>

      {/* قائمة النسخ الاحتياطية */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold">النسخ الاحتياطية السابقة</h2>
        </div>

        {backups.length === 0 ? (
          <div className="p-12 text-center">
            <Database className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">لا توجد نسخ احتياطية</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              قم بإنشاء نسخة احتياطية لحماية بياناتك
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    التاريخ
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    النوع
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    الحجم
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    أنشأه
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    إجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {backups.map((backup) => (
                  <tr key={backup.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {formatDateAR(backup.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                        {backup.backup_type === 'full' ? 'كامل' : 'مستورد'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {backup.file_size ? `${parseFloat(backup.file_size).toFixed(2)} KB` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {backup.created_by_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDownloadBackup(backup)}
                          title="تحميل"
                        >
                          <Download className="h-4 w-4 text-blue-500" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteBackup(backup.id)}
                          title="حذف"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default BackupPage;

