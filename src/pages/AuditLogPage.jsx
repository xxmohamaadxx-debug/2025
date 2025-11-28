import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { neonService } from '@/lib/neonService';
import { Loader2, Search, Filter, Calendar, User, FileText, Trash2, Edit, Plus, AlertCircle, CheckCircle, X, Clock, Activity, Eye, Download } from 'lucide-react';
import { formatDateAR } from '@/lib/dateUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const AuditLogPage = () => {
  const { user, tenant } = useAuth();
  const { t } = useLanguage();
  const [logs, setLogs] = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterDate, setFilterDate] = useState('all');
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [filterUser, setFilterUser] = useState('all');
  const [users, setUsers] = useState([]);
  const [showDiff, setShowDiff] = useState({ old: true, new: true });

  useEffect(() => {
    if (user?.tenant_id) {
      loadLogs();
      loadUsers();
    }
  }, [user]);

  const loadUsers = async () => {
    try {
      const userList = await neonService.getUsers(user.tenant_id);
      setUsers(userList || []);
    } catch (error) {
      console.error('Load users error:', error);
    }
  };

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await neonService.getAuditLogs(user.tenant_id);
      const sortedData = (data || []).sort((a, b) => {
        const dateA = new Date(a.created_at || a.timestamp || 0);
        const dateB = new Date(b.created_at || b.timestamp || 0);
        return dateB - dateA;
      });
      setAllLogs(sortedData);
      setLogs(sortedData);
    } catch (error) {
      console.error('Load logs error:', error);
      setLogs([]);
      setAllLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = [...allLogs];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(log => {
        const action = log.action_type || log.action || '';
        const details = typeof log.details === 'string' ? log.details : JSON.stringify(log.details || {});
        const userName = users.find(u => u.id === log.user_id)?.name || '';
        const changeSummary = log.change_summary || '';
        return action.toLowerCase().includes(searchTerm.toLowerCase()) ||
               details.toLowerCase().includes(searchTerm.toLowerCase()) ||
               changeSummary.toLowerCase().includes(searchTerm.toLowerCase()) ||
               userName.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    // Filter by action type
    if (filterAction !== 'all') {
      filtered = filtered.filter(log => (log.action_type || log.action) === filterAction);
    }

    // Filter by user
    if (filterUser !== 'all') {
      filtered = filtered.filter(log => log.user_id === filterUser);
    }

    // Filter by date
    if (filterDate !== 'all') {
      const now = new Date();
      let startDate = null;
      
      if (filterDate === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (filterDate === 'week') {
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        startDate = new Date(now.setDate(diff));
        startDate.setHours(0, 0, 0, 0);
      } else if (filterDate === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      if (startDate) {
        filtered = filtered.filter(log => {
          const logDate = new Date(log.created_at || log.timestamp);
          return logDate >= startDate;
        });
      }
    }

    setLogs(filtered);
  }, [searchTerm, filterAction, filterDate, filterUser, allLogs, users]);

  const getActionIcon = (action) => {
    const a = action || '';
    if (a.includes('CREATE') || a.includes('ADD')) return <Plus className="h-4 w-4 text-green-500" />;
    if (a.includes('UPDATE') || a.includes('EDIT')) return <Edit className="h-4 w-4 text-blue-500" />;
    if (a.includes('DELETE')) return <Trash2 className="h-4 w-4 text-red-500" />;
    if (a.includes('VIEW')) return <Eye className="h-4 w-4 text-teal-500" />;
    if (a.includes('EXPORT')) return <Download className="h-4 w-4 text-cyan-500" />;
    if (a.includes('LOGIN') || a.includes('LOGOUT')) return <User className="h-4 w-4 text-purple-500" />;
    return <Activity className="h-4 w-4 text-orange-500" />;
  };

  const getActionColor = (action) => {
    const a = action || '';
    if (a.includes('CREATE') || a.includes('ADD')) return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (a.includes('UPDATE') || a.includes('EDIT')) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    if (a.includes('DELETE')) return 'bg-red-500/20 text-red-400 border-red-500/30';
    if (a.includes('VIEW')) return 'bg-teal-500/20 text-teal-400 border-teal-500/30';
    if (a.includes('EXPORT')) return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
    if (a.includes('LOGIN') || a.includes('LOGOUT')) return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
  };

  const getUserName = (userId) => {
    const foundUser = users.find(u => u.id === userId);
    return foundUser?.name || 'مستخدم غير معروف';
  };

  const actionTypes = [
    { value: 'all', label: 'جميع الأنواع' },
    { value: 'CREATE', label: 'إضافة' },
    { value: 'UPDATE', label: 'تعديل' },
    { value: 'DELETE', label: 'حذف' },
    { value: 'VIEW', label: 'عرض' },
    { value: 'EXPORT', label: 'تصدير' },
    { value: 'LOGIN', label: 'تسجيل دخول' },
    { value: 'LOGOUT', label: 'تسجيل خروج' },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12 min-h-[400px]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 className="h-12 w-12 animate-spin text-orange-500" />
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>سجل التغييرات - {t('common.systemName')}</title>
      </Helmet>

      <div className="space-y-6 min-h-[500px] relative">
        {/* Ultra Advanced 3D Background */}
        <div className="absolute inset-0 -z-10 overflow-hidden rounded-2xl" style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 27, 75, 0.95) 50%, rgba(15, 23, 42, 0.95) 100%)',
          backdropFilter: 'blur(20px) saturate(180%)',
        }}>
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-orange-400/30"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -50, 0],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: Math.random() * 5 + 5,
                repeat: Infinity,
                delay: i * 0.3,
              }}
            />
          ))}
        </div>

        {/* Enhanced Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10"
        >
          <div>
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-3xl md:text-4xl font-black text-white bg-gradient-to-r from-orange-300 via-pink-300 to-purple-300 bg-clip-text text-transparent mb-2"
            >
              سجل التغييرات
            </motion.h1>
            <p className="text-purple-200 text-sm">
              تتبع جميع التغييرات والعمليات في النظام
            </p>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 text-white"
          >
            <Activity className="h-5 w-5 text-orange-400" />
            <span className="font-bold">{logs.length}</span>
            <span className="text-sm text-purple-200">سجل</span>
          </motion.div>
        </motion.div>

        {/* Advanced Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative z-10 bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-2xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2 h-5 w-5 text-purple-300" />
              <input
                type="text"
                placeholder="بحث في السجلات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 rtl:pr-10 rtl:pl-4 py-2.5 bg-white/10 border-2 border-white/20 rounded-xl text-white placeholder-purple-300 focus:border-orange-400 focus:ring-4 focus:ring-orange-500/30 transition-all outline-none"
              />
            </div>

            {/* Action Filter */}
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="px-4 py-2.5 bg-white/10 border-2 border-white/20 rounded-xl text-white focus:border-orange-400 focus:ring-4 focus:ring-orange-500/30 transition-all outline-none"
            >
              {actionTypes.map(type => (
                <option key={type.value} value={type.value} className="bg-gray-800 text-white">
                  {type.label}
                </option>
              ))}
            </select>

            {/* User Filter */}
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="px-4 py-2.5 bg-white/10 border-2 border-white/20 rounded-xl text-white focus:border-orange-400 focus:ring-4 focus:ring-orange-500/30 transition-all outline-none"
            >
              <option value="all" className="bg-gray-800 text-white">جميع المستخدمين</option>
              {users.map(u => (
                <option key={u.id} value={u.id} className="bg-gray-800 text-white">
                  {u.name}
                </option>
              ))}
            </select>

            {/* Date Filter */}
            <select
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-4 py-2.5 bg-white/10 border-2 border-white/20 rounded-xl text-white focus:border-orange-400 focus:ring-4 focus:ring-orange-500/30 transition-all outline-none"
            >
              <option value="all" className="bg-gray-800 text-white">جميع الفترات</option>
              <option value="today" className="bg-gray-800 text-white">اليوم</option>
              <option value="week" className="bg-gray-800 text-white">هذا الأسبوع</option>
              <option value="month" className="bg-gray-800 text-white">هذا الشهر</option>
            </select>
          </div>
        </motion.div>

        {/* Enhanced Logs List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative z-10 space-y-3"
        >
          {logs.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white/10 backdrop-blur-xl rounded-2xl p-12 text-center border border-white/20"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="inline-block mb-4"
              >
                <FileText className="h-16 w-16 text-purple-400 mx-auto" />
              </motion.div>
              <p className="text-purple-200 text-lg font-medium">لا توجد سجلات مطابقة للبحث</p>
            </motion.div>
          ) : (
            <AnimatePresence>
              {logs.map((log, index) => (
                <motion.div
                  key={log.id || index}
                  initial={{ opacity: 0, x: -20, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 20, scale: 0.95 }}
                  transition={{ delay: index * 0.05, type: "spring" }}
                  whileHover={{ scale: 1.02, x: 5 }}
                  onClick={() => {
                    setSelectedLog(log);
                    setDetailDialogOpen(true);
                  }}
                  className="group bg-white/10 backdrop-blur-xl rounded-2xl p-5 border-2 border-white/20 hover:border-orange-500/50 cursor-pointer transition-all duration-300 shadow-lg hover:shadow-2xl"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      {/* Action Icon */}
                      <motion.div
                        className={`p-3 rounded-xl border-2 ${getActionColor(log.action_type || log.action)} relative overflow-hidden`}
                        whileHover={{ rotate: 360, scale: 1.1 }}
                        transition={{ duration: 0.5 }}
                      >
                        {getActionIcon(log.action_type || log.action)}
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                          animate={{ x: ['-100%', '100%'] }}
                          transition={{ duration: 2, repeat: Infinity, delay: index * 0.1 }}
                        />
                      </motion.div>

                      {/* Log Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-bold text-white text-lg group-hover:text-orange-300 transition-colors">
                            {(log.change_summary || log.action_type || log.action || 'عملية غير معروفة')}
                          </h3>
                          <span className={`px-2 py-1 rounded-lg text-xs font-bold border ${getActionColor(log.action_type || log.action)}`}>
                            {(log.action_type || log.action || '').toString().replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-purple-200 mb-2">
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            <span>{getUserName(log.user_id)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{formatDateAR(new Date(log.created_at || log.timestamp), { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}</span>
                          </div>
                          {(log.table_name || log.record_id) && (
                            <div className="flex items-center gap-2">
                              {log.table_name && (
                                <span className="px-2 py-1 rounded-lg bg-white/10 border border-white/20 text-xs">{log.table_name}</span>
                              )}
                              {log.record_id && (
                                <span className="px-2 py-1 rounded-lg bg-white/10 border border-white/20 text-xs">ID: {log.record_id}</span>
                              )}
                            </div>
                          )}
                        </div>
                        {(log.change_summary || log.details) && (
                          <p className="text-sm text-purple-300 truncate">
                            {log.change_summary || (typeof log.details === 'string' 
                              ? log.details 
                              : JSON.stringify(log.details).substring(0, 100) + '...')}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* View Details Button */}
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="p-2 bg-orange-500/20 hover:bg-orange-500/30 rounded-lg border border-orange-500/30 text-orange-400 transition-all"
                    >
                      <FileText className="h-5 w-5" />
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </motion.div>

        {/* Detail Dialog */}
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="max-w-2xl glass-dark border-white/20 text-white max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white text-2xl">تفاصيل السجل</DialogTitle>
            </DialogHeader>
            {selectedLog && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 rounded-xl p-4 border border-white/20">
                    <p className="text-sm text-purple-300 mb-1">الإجراء</p>
                    <p className="font-bold text-white">{selectedLog.action_type || selectedLog.action}</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-4 border border-white/20">
                    <p className="text-sm text-purple-300 mb-1">المستخدم</p>
                    <p className="font-bold text-white">{getUserName(selectedLog.user_id)}</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-4 border border-white/20">
                    <p className="text-sm text-purple-300 mb-1">التاريخ والوقت</p>
                    <p className="font-bold text-white">
                      {formatDateAR(new Date(selectedLog.created_at || selectedLog.timestamp), {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-4 border border-white/20">
                    <p className="text-sm text-purple-300 mb-1">معرف السجل</p>
                    <p className="font-mono text-xs text-white">{selectedLog.id}</p>
                  </div>
                  {selectedLog.table_name && (
                    <div className="bg-white/10 rounded-xl p-4 border border-white/20">
                      <p className="text-sm text-purple-300 mb-1">اسم الجدول</p>
                      <p className="font-bold text-white">{selectedLog.table_name}</p>
                    </div>
                  )}
                  {selectedLog.record_id && (
                    <div className="bg-white/10 rounded-xl p-4 border border-white/20">
                      <p className="text-sm text-purple-300 mb-1">معرّف السجل</p>
                      <p className="font-bold text-white">{selectedLog.record_id}</p>
                    </div>
                  )}
                  {selectedLog.ip_address && (
                    <div className="bg-white/10 rounded-xl p-4 border border-white/20">
                      <p className="text-sm text-purple-300 mb-1">عنوان الـIP</p>
                      <p className="font-bold text-white">{selectedLog.ip_address}</p>
                    </div>
                  )}
                  {selectedLog.user_agent && (
                    <div className="bg-white/10 rounded-xl p-4 border border-white/20">
                      <p className="text-sm text-purple-300 mb-1">المتصفح</p>
                      <p className="font-bold text-white">{selectedLog.user_agent}</p>
                    </div>
                  )}
                </div>
                {selectedLog.change_summary && (
                  <div className="bg-white/10 rounded-xl p-4 border border-white/20">
                    <p className="text-sm text-purple-300 mb-2">ملخص التغيير</p>
                    <p className="text-sm text-white">{selectedLog.change_summary}</p>
                  </div>
                )}
                {(selectedLog.old_values || selectedLog.new_values) && (
                  <div className="bg-white/10 rounded-xl p-4 border border-white/20 space-y-3">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setShowDiff(s => ({...s, old: !s.old}))}>
                        عرض القديم
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setShowDiff(s => ({...s, new: !s.new}))}>
                        عرض الجديد
                      </Button>
                    </div>
                    {showDiff.old && (
                      <div>
                        <p className="text-sm text-purple-300 mb-2">القيم القديمة</p>
                        <pre className="text-sm text-white bg-black/30 p-4 rounded-lg overflow-auto max-h-60 font-mono">
                          {JSON.stringify(selectedLog.old_values || {}, null, 2)}
                        </pre>
                      </div>
                    )}
                    {showDiff.new && (
                      <div>
                        <p className="text-sm text-purple-300 mb-2">القيم الجديدة</p>
                        <pre className="text-sm text-white bg-black/30 p-4 rounded-lg overflow-auto max-h-60 font-mono">
                          {JSON.stringify(selectedLog.new_values || {}, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
                {!selectedLog.old_values && !selectedLog.new_values && (
                  <div className="bg-white/10 rounded-xl p-4 border border-white/20">
                    <p className="text-sm text-purple-300 mb-2">التفاصيل</p>
                    <pre className="text-sm text-white bg-black/30 p-4 rounded-lg overflow-auto max-h-60 font-mono">
                      {JSON.stringify(selectedLog.details || {}, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default AuditLogPage;
