import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { neonService } from '@/lib/neonService';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, Send, Search, User, Store, 
  CheckCircle, CheckCircle2, Clock, ArrowLeft, X, Plus
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { formatDateAR } from '@/lib/dateUtils';
import GlassCard from '@/components/ui/GlassCard';

const MessagesPage = () => {
  const { user, tenant } = useAuth();
  const { t, locale } = useLanguage();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [showNewConversationDialog, setShowNewConversationDialog] = useState(false);
  const [selectedUserForNewChat, setSelectedUserForNewChat] = useState(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  useEffect(() => {
    if (user?.tenant_id) {
      loadConversations();
      loadAvailableUsers();
      // حذف الرسائل القديمة تلقائياً
      neonService.deleteOldMessages().catch(console.error);
    }
  }, [user]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages();
      markAsRead();
    }
  }, [selectedConversation]);

  useEffect(() => {
    // التمرير للأسفل عند إضافة رسائل جديدة
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    try {
      setLoading(true);
      const data = await neonService.getUserConversations(user.id, user.tenant_id);
      setConversations(data || []);
    } catch (error) {
      console.error('Load conversations error:', error);
      toast({
        title: 'خطأ',
        description: 'فشل تحميل المحادثات',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableUsers = async () => {
    try {
      const data = await neonService.getTenantUsersForMessaging(user.tenant_id, user.id);
      setAvailableUsers(data || []);
    } catch (error) {
      console.error('Load available users error:', error);
    }
  };

  const handleStartNewConversation = (selectedUser) => {
    // البحث عن محادثة موجودة
    const existingConv = conversations.find(
      conv => conv.other_user_id === selectedUser.user_id
    );
    
    if (existingConv) {
      setSelectedConversation(existingConv);
    } else {
      // إنشاء محادثة جديدة
      const newConv = {
        other_user_id: selectedUser.user_id,
        other_user_name: selectedUser.user_name,
        other_user_email: selectedUser.user_email,
        is_store_owner: selectedUser.is_store_owner,
        last_message_text: null,
        last_message_time: null,
        unread_count: 0
      };
      setSelectedConversation(newConv);
      setConversations([newConv, ...conversations]);
    }
    
    setShowNewConversationDialog(false);
    setSelectedUserForNewChat(null);
  };

  const loadMessages = async () => {
    if (!selectedConversation) return;
    
    try {
      const data = await neonService.getConversationMessages(
        user.id,
        selectedConversation.other_user_id,
        user.tenant_id,
        100
      );
      setMessages(data || []);
    } catch (error) {
      console.error('Load messages error:', error);
      toast({
        title: 'خطأ',
        description: 'فشل تحميل الرسائل',
        variant: 'destructive'
      });
    }
  };

  const markAsRead = async () => {
    if (!selectedConversation) return;
    
    try {
      await neonService.markMessagesAsRead(
        user.id,
        selectedConversation.other_user_id,
        user.tenant_id
      );
      // تحديث المحادثات لإزالة العدد غير المقروء
      loadConversations();
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || sending) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      await neonService.sendMessage(
        user.tenant_id,
        user.id,
        selectedConversation.other_user_id,
        messageText
      );
      
      // إضافة الرسالة محلياً
      const newMsg = {
        id: `temp-${Date.now()}`,
        sender_id: user.id,
        receiver_id: selectedConversation.other_user_id,
        message_text: messageText,
        is_read: false,
        created_at: new Date().toISOString(),
        is_sender: true
      };
      setMessages([...messages, newMsg]);
      
      // تحديث المحادثات
      loadConversations();
      
      scrollToBottom();
    } catch (error) {
      console.error('Send message error:', error);
      toast({
        title: 'خطأ',
        description: 'فشل إرسال الرسالة',
        variant: 'destructive'
      });
      setNewMessage(messageText); // استعادة النص
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.other_user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.other_user_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <Helmet>
        <title>{locale === 'ar' ? 'المراسلة' : locale === 'en' ? 'Messages' : 'Mesajlar'} - {t('common.systemName')}</title>
      </Helmet>

      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <MessageCircle className="h-8 w-8 text-orange-500" />
          {locale === 'ar' ? 'المراسلة' : locale === 'en' ? 'Messages' : 'Mesajlar'}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* قائمة المحادثات */}
        <GlassCard className="p-0 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {locale === 'ar' ? 'المحادثات' : locale === 'en' ? 'Conversations' : 'Sohbetler'}
              </h2>
              <Button
                onClick={() => setShowNewConversationDialog(true)}
                className="bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:from-orange-600 hover:to-pink-600"
                size="sm"
              >
                <Plus className="h-4 w-4 ml-2 rtl:mr-2 rtl:ml-0" />
                {locale === 'ar' ? 'إضافة دردشة' : locale === 'en' ? 'New Chat' : 'Yeni Sohbet'}
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute right-3 rtl:left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder={locale === 'ar' ? 'بحث في المحادثات...' : locale === 'en' ? 'Search conversations...' : 'Sohbetleri ara...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500">جاري التحميل...</div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                {locale === 'ar' ? 'لا توجد محادثات' : locale === 'en' ? 'No conversations' : 'Sohbet yok'}
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredConversations.map((conv) => (
                  <motion.button
                    key={conv.other_user_id}
                    whileHover={{ backgroundColor: 'rgba(255, 140, 0, 0.1)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedConversation(conv)}
                    className={`w-full text-right rtl:text-left p-4 transition-colors ${
                      selectedConversation?.other_user_id === conv.other_user_id
                        ? 'bg-orange-50 dark:bg-orange-900/20 border-r-4 rtl:border-l-4 rtl:border-r-0 border-orange-500'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${conv.is_store_owner ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                        {conv.is_store_owner ? (
                          <Store className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        ) : (
                          <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                            {conv.other_user_name}
                          </h3>
                          {conv.unread_count > 0 && (
                            <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                              {conv.unread_count}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {conv.last_message_text}
                        </p>
                        {conv.last_message_time && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {formatDateAR(conv.last_message_time)}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        </GlassCard>

        {/* نافذة المحادثة */}
        <div className="lg:col-span-2 flex flex-col">
          {selectedConversation ? (
            <GlassCard className="flex-1 flex flex-col p-0 overflow-hidden">
              {/* رأس المحادثة */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedConversation(null)}
                    className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <div className={`p-2 rounded-full ${selectedConversation.is_store_owner ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                    {selectedConversation.is_store_owner ? (
                      <Store className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                    ) : (
                      <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {selectedConversation.other_user_name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {selectedConversation.other_user_email}
                    </p>
                  </div>
                </div>
              </div>

              {/* الرسائل */}
              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-4"
              >
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    {locale === 'ar' ? 'لا توجد رسائل بعد' : locale === 'en' ? 'No messages yet' : 'Henüz mesaj yok'}
                  </div>
                ) : (
                  messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.is_sender ? 'justify-end rtl:justify-start' : 'justify-start rtl:justify-end'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                          msg.is_sender
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.message_text}</p>
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className={`text-xs ${msg.is_sender ? 'text-orange-100' : 'text-gray-500'}`}>
                            {formatDateAR(msg.created_at)}
                          </span>
                          {msg.is_sender && (
                            <span>
                              {msg.is_read ? (
                                <CheckCircle2 className="h-3 w-3 text-orange-100" />
                              ) : (
                                <CheckCircle className="h-3 w-3 text-orange-100" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* نموذج الإرسال */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={locale === 'ar' ? 'اكتب رسالة...' : locale === 'en' ? 'Type a message...' : 'Mesaj yazın...'}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 focus:ring-2 focus:ring-orange-500"
                    disabled={sending}
                  />
                  <Button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                  {locale === 'ar' 
                    ? 'الرسائل تُحذف تلقائياً بعد 15 يوم' 
                    : locale === 'en' 
                    ? 'Messages are automatically deleted after 15 days'
                    : 'Mesajlar 15 gün sonra otomatik olarak silinir'}
                </p>
              </form>
            </GlassCard>
          ) : (
            <GlassCard className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <p className="text-lg">
                  {locale === 'ar' 
                    ? 'اختر محادثة للبدء' 
                    : locale === 'en' 
                    ? 'Select a conversation to start'
                    : 'Başlamak için bir sohbet seçin'}
                </p>
              </div>
            </GlassCard>
          )}
        </div>
      </div>

      {/* Dialog لاختيار مستخدم جديد للمحادثة */}
      {showNewConversationDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/70 backdrop-blur-md">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-[95vw] max-w-md max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {locale === 'ar' ? 'اختر مستخدم للمحادثة' : locale === 'en' ? 'Select User to Chat' : 'Sohbet için Kullanıcı Seç'}
              </h2>
              <button
                onClick={() => setShowNewConversationDialog(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {availableUsers.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  {locale === 'ar' ? 'لا يوجد مستخدمون متاحون' : locale === 'en' ? 'No users available' : 'Kullanıcı yok'}
                </div>
              ) : (
                <div className="space-y-2">
                  {availableUsers.map((usr) => (
                    <motion.button
                      key={usr.user_id}
                      whileHover={{ backgroundColor: 'rgba(255, 140, 0, 0.1)' }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleStartNewConversation(usr)}
                      className="w-full text-right rtl:text-left p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${usr.is_store_owner ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                          {usr.is_store_owner ? (
                            <Store className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                          ) : (
                            <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {usr.user_name}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {usr.user_email} • {usr.user_role}
                          </p>
                          {usr.has_conversation && (
                            <p className="text-xs text-orange-500 mt-1">
                              {locale === 'ar' ? 'محادثة موجودة' : locale === 'en' ? 'Existing conversation' : 'Mevcut sohbet'}
                            </p>
                          )}
                        </div>
                        {usr.unread_count > 0 && (
                          <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                            {usr.unread_count}
                          </span>
                        )}
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagesPage;

