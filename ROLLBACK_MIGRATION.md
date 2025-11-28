دليل التراجع عن الهجرات (Rollback)

هدف هذا الدليل: توفير خطوات عملية وسريعة للتراجع عن التغييرات التي يتم تطبيقها عبر ملفات SQL الموحدة.

قبل البدء:
- خذ نسخة احتياطية كاملة من قاعدة البيانات (dump) قبل أي تحديث.
- دوّن رقم النسخة أو معرف النسخة في نظام النسخ الاحتياطي لديك.

استراتيجيات التراجع:

1) استعادة النسخ الاحتياطية
- إذا كانت التغييرات كبيرة أو مترابطة، يُفضل استعادة نسخة الاحتياطي المأخوذة قبل التحديث.

2) التراجع اليدوي عن الكيانات الجديدة
- الجداول: حذف الجداول التي أُنشئت حديثًا فقط إذا لم تكن تضم بيانات مطلوبة.
  مثال:
  ```sql
  DROP TABLE IF EXISTS notifications CASCADE;
  DROP TABLE IF EXISTS support_messages CASCADE;
  DROP TABLE IF EXISTS support_tickets CASCADE;
  DROP TABLE IF EXISTS mobile_app_url_history CASCADE;
  ```
- المشاهد (Views): حذف المشاهد التي تمت إضافتها إن لزم.
  ```sql
  DROP VIEW IF EXISTS mobile_app_settings;
  DROP VIEW IF EXISTS system_settings_categorized;
  DROP VIEW IF EXISTS unread_notifications_count;
  ```
- الدوال (Functions): حذف الدوال التي تمت إضافتها.
  ```sql
  DROP FUNCTION IF EXISTS notify_new_support_ticket() CASCADE;
  DROP FUNCTION IF EXISTS notify_new_support_message() CASCADE;
  DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
  DROP FUNCTION IF EXISTS validate_app_url(TEXT) CASCADE;
  DROP FUNCTION IF EXISTS check_app_urls() CASCADE;
  DROP FUNCTION IF EXISTS log_mobile_app_url_changes() CASCADE;
  DROP FUNCTION IF EXISTS get_mobile_app_settings() CASCADE;
  DROP FUNCTION IF EXISTS update_mobile_app_url(TEXT, TEXT, UUID) CASCADE;
  ```
- التريغرز (Triggers): إزالة التريغرز المرتبطة.
  ```sql
  DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON support_tickets;
  DROP TRIGGER IF EXISTS trigger_notify_new_support_ticket ON support_tickets;
  DROP TRIGGER IF EXISTS trigger_notify_new_support_message ON support_messages;
  DROP TRIGGER IF EXISTS trigger_check_app_urls ON system_settings;
  DROP TRIGGER IF EXISTS trigger_log_mobile_app_url_changes ON system_settings;
  ```

3) التراجع عن تعديلات الجداول القائمة
- استخدام ALTER TABLE لإزالة الأعمدة التي تمت إضافتها حديثًا فقط إذا لم تعتمد عليها وظائف حالية.
  مثال:
  ```sql
  ALTER TABLE users DROP COLUMN IF EXISTS can_be_edited_by_store_owner;
  ALTER TABLE users DROP COLUMN IF EXISTS notification_preferences;
  ```

ملاحظات مهمة:
- التراجع الجزئي قد يتطلب تنظيف بيانات أو تحديثات في التطبيق.
- راجع السجلات والوظائف المتأثرة قبل إزالة أي كيان.
- في البيئات الإنتاجية، نفّذ التراجع ضمن نافذة صيانة.

إن أردت، يمكنني توليد سكربت Rollback تلقائيًا بناءً على ما تم تطبيقه في بيئتك الفعلية.

