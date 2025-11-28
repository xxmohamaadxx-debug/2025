-- ============================================
-- سكربت موحّد لتحديث القاعدة إلى أحدث التغييرات
-- يشمل: دعم الإشعارات وتذاكر الدعم + روابط تطبيق الجوال + دعم أنواع المتاجر
-- التشغيل الموصى به: عبر psql باستخدام single-transaction و ON_ERROR_STOP=1
-- ============================================

BEGIN;

\set ON_ERROR_STOP 1

-- تضمين ملفات التحديث الموجودة في المشروع
\i 'update_database_for_notifications_support.sql'
\i 'update_database_landing_mobile_links.sql'
\i 'update_database_multi_store_types.sql'

COMMIT;

-- في حال التشغيل عبر محرر Neon بدون psql، نفّذ الملفات كلٌ على حِدة.
-- تأكد من وجود الامتدادات اللازمة في بيئتك مثل uuid-ossp.

