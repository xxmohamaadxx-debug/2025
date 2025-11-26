import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { neonService } from '@/lib/neonService';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, MessageCircle, Send, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDateAR, getRelativeTimeAR } from '@/lib/dateUtils';

const SupportPage = () => {
  const { user, tenant } = useAuth();
  const { t } = useLanguage();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newTicket, setNewTicket] = useState({
    subject: '',
    message: '',
    priority: 'medium'
  });
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    if (user?.tenant_id || user?.isSuperAdmin) loadTickets();
  }, [user]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const data = await neonService.getSupportTickets(
        user?.tenant_id,
        user?.id,
        user?.isSuperAdmin
      );
      setTickets(data || []);
    } catch (error) {
      console.error('Load tickets error:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ في تحميل التذاكر',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTicketMessages = async (ticketId) => {
    try {
      const data = await neonService.getSupportTicketMessages(ticketId);
      setMessages(data || []);
    } catch (error) {
      console.error('Load messages error:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ في تحميل الرسائل',
        variant: 'destructive'
      });
    }
  };

  const handleCreateTicket = async () => {
    if (!newTicket.subject || !newTicket.message) {
      toast({
        title: 'خطأ',
        description: 'يرجى ملء جميع الحقول المطلوبة',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      await neonService.createSupportTicket({
        tenant_id: user?.tenant_id,
        user_id: user?.id,
        subject: newTicket.subject,
        message: newTicket.message,
        priority: newTicket.priority,
        is_from_admin: false
      });

      toast({
        title: 'تم بنجاح',
        description: 'تم إنشاء تذكرة الدعم بنجاح'
      });

      setNewTicket({ subject: '', message: '', priority: 'medium' });
      setDialogOpen(false);
      loadTickets();
    } catch (error) {
      console.error('Create ticket error:', error);
      toast({
        title: 'خطأ',
        description: error.message || 'حدث خطأ في إنشاء التذكرة',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTicket = async (ticket) => {
    setSelectedTicket(ticket);
    setMessageDialogOpen(true);
    await loadTicketMessages(ticket.id);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال رسالة',
        variant: 'destructive'
      });
      return;
    }

    try {
      await neonService.addSupportTicketMessage({
        ticket_id: selectedTicket.id,
        user_id: user?.id,
        message: newMessage,
        is_from_admin: user?.isSuperAdmin || false
      });

      setNewMessage('');
      await loadTicketMessages(selectedTicket.id);
      await loadTickets();
      
      toast({
        title: 'تم بنجاح',
        description: 'تم إرسال الرسالة'
      });
    } catch (error) {
      console.error('Send message error:', error);
      toast({
        title: 'خطأ',
        description: error.message || 'حدث خطأ في إرسال الرسالة',
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      open: { bg: 'bg-blue-100 text-blue-800', icon: Clock, text: 'مفتوح' },
      in_progress: { bg: 'bg-yellow-100 text-yellow-800', icon: AlertCircle, text: 'قيد المعالجة' },
      resolved: { bg: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'محلول' },
      closed: { bg: 'bg-gray-100 text-gray-800', icon: CheckCircle, text: 'مغلق' }
    };
    const badge = badges[status] || badges.open;
    const Icon = badge.icon;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${badge.bg}`}>
        <Icon className="h-3 w-3" />
        {badge.text}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const badges = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };
    const texts = {
      low: 'منخفض',
      medium: 'متوسط',
      high: 'عالي',
      urgent: 'عاجل'
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${badges[priority] || badges.medium}`}>
        {texts[priority] || texts.medium}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <Helmet>
        <title>الدعم والمساعدة - {t('common.systemName')}</title>
      </Helmet>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <MessageCircle className="h-8 w-8 text-blue-500" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              الدعم والمساعدة
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              تواصل معنا للحصول على المساعدة
            </p>
          </div>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-gradient-to-r from-blue-500 to-purple-500 text-white"
        >
          <Plus className="h-4 w-4 ml-2 rtl:mr-2 rtl:ml-0" />
          تذكرة دعم جديدة
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 p-12 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-center">
          <MessageCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">لا توجد تذاكر دعم</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleOpenTicket(ticket)}
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {ticket.subject}
                    </h3>
                    {getStatusBadge(ticket.status)}
                    {getPriorityBadge(ticket.priority)}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                    {ticket.message}
                  </p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                    <span>بواسطة: {ticket.user_name || 'غير معروف'}</span>
                    {ticket.tenant_name && <span>متجر: {ticket.tenant_name}</span>}
                    <span>{getRelativeTimeAR(ticket.created_at)}</span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenTicket(ticket);
                  }}
                >
                  <MessageCircle className="h-4 w-4 ml-2" />
                  عرض المحادثة
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Ticket Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>إنشاء تذكرة دعم جديدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium mb-1">الموضوع *</label>
              <input
                type="text"
                value={newTicket.subject}
                onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                placeholder="موضوع التذكرة"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">الأولوية</label>
              <select
                value={newTicket.priority}
                onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="low">منخفض</option>
                <option value="medium">متوسط</option>
                <option value="high">عالي</option>
                <option value="urgent">عاجل</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">الرسالة *</label>
              <textarea
                value={newTicket.message}
                onChange={(e) => setNewTicket({ ...newTicket, message: e.target.value })}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                placeholder="وصف مشكلتك أو استفسارك..."
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setDialogOpen(false)}
                variant="outline"
                className="flex-1"
              >
                إلغاء
              </Button>
              <Button
                onClick={handleCreateTicket}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'إرسال'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Messages Dialog */}
      <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedTicket?.subject}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 mt-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.is_from_admin ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[80%] p-4 rounded-lg ${
                    msg.is_from_admin
                      ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                      : 'bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <div className="text-sm font-medium mb-1">
                    {msg.user_name || (msg.is_from_admin ? 'الإدارة' : 'أنت')}
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {msg.message}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    {formatDateAR(msg.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              rows={3}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              placeholder="اكتب رسالتك..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  handleSendMessage();
                }
              }}
            />
            <Button
              onClick={handleSendMessage}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={!newMessage.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupportPage;

