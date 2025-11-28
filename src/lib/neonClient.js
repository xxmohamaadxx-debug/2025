// عميل Neon للاتصال بقاعدة البيانات مباشرة من المتصفح
import { neon } from '@neondatabase/serverless';

// الحصول على رابط الاتصال من متغيرات البيئة
const NEON_DATABASE_URL = import.meta.env.VITE_NEON_DATABASE_URL;

// التحقق من وجود رابط الاتصال
if (!NEON_DATABASE_URL) {
  const isProduction = import.meta.env.MODE === 'production' || import.meta.env.PROD;
  const envGuide = isProduction 
    ? 'في Netlify Dashboard:\n' +
      '1. Site settings > Environment variables\n' +
      '2. Add variable: VITE_NEON_DATABASE_URL\n' +
      '3. Value: رابط الاتصال من Neon Console\n' +
      '4. Scope: All scopes\n' +
      '5. Save ثم Trigger deploy جديد'
    : 'في ملف .env:\n' +
      'VITE_NEON_DATABASE_URL=postgresql://user:password@host/database?sslmode=require';
  
  console.error('❌ خطأ: متغير البيئة VITE_NEON_DATABASE_URL غير موجود');
  console.error(`\n📋 ${isProduction ? 'إضافة المتغير في Netlify:' : 'إضافة المتغير محلياً:'}`);
  console.error(envGuide);
  console.error('\n🔗 للحصول على رابط الاتصال من Neon:');
  console.error('1. اذهب إلى https://console.neon.tech/');
  console.error('2. اختر مشروعك > Dashboard > Connection Details');
  console.error('3. اختر "Connection pooling" (يجب أن يحتوي على -pooler)');
  console.error('4. انسخ الرابط الكامل');
  console.error('\n📖 راجع ملف NETLIFY_ENV_QUICK_FIX.md للتعليمات التفصيلية');
}

// إنشاء عميل Neon
export const getNeonClient = () => {
  if (!NEON_DATABASE_URL) {
    const errorMsg = 'رابط اتصال قاعدة البيانات غير موجود. يرجى:\n' +
      '1. إنشاء ملف .env في جذر المشروع\n' +
      '2. إضافة VITE_NEON_DATABASE_URL برابط الاتصال من Neon Console\n' +
      '3. إعادة تشغيل الخادم\n' +
      'راجع ملف NEON_CONNECTION_SETUP.md للمزيد من التفاصيل';
    throw new Error(errorMsg);
  }
  
  // التحقق من تنسيق رابط الاتصال
  if (!NEON_DATABASE_URL.startsWith('postgresql://')) {
    console.warn('⚠️ تحذير: رابط الاتصال قد يكون غير صحيح. يجب أن يبدأ بـ postgresql://');
  }
  
  try {
    return neon(NEON_DATABASE_URL);
  } catch (error) {
    console.error('❌ خطأ في إنشاء عميل Neon:', error);
    throw new Error('فشل الاتصال بقاعدة البيانات. يرجى التحقق من رابط الاتصال.');
  }
};

// Helper للاستعلامات
let sqlClient = null;

try {
  if (NEON_DATABASE_URL) {
    sqlClient = getNeonClient();
  }
} catch (error) {
  console.error('❌ خطأ في تهيئة عميل Neon:', error);
}

// Export a safe sql wrapper. The Neon client is expected to be used as a
// tagged template or as a regular function. If the environment variable is
// missing or the client failed to initialize, throw a clear error instead
// of letting the runtime produce a cryptic "is not a function" error.
export const sql = (...args) => {
  if (!sqlClient) {
    const errMsg = 'VITE_NEON_DATABASE_URL is not configured or Neon client failed to initialize.\n' +
      'Please set VITE_NEON_DATABASE_URL in your environment (Netlify Site settings or local .env)\n' +
      'and redeploy. See NETLIFY_ENV_SETUP.md for details.';
    console.error(errMsg);
    throw new Error(errMsg);
  }

  // Forward call to the actual client. This supports both tagged template
  // usage (sql`SELECT ...`) and direct function calls (sql(query, params)).
  return sqlClient(...args);
};

export default sql;
