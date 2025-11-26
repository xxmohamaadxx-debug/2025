# دليل النشر على Netlify

## المتطلبات
- حساب على Netlify
- قاعدة بيانات Neon جاهزة
- متغيرات البيئة

## خطوات النشر

### 1. إعداد قاعدة البيانات Neon

قم بتشغيل ملف `setup_neon_complete.sql` في Neon SQL Editor.

### 2. إنشاء حساب المدير

قم بتشغيل السكربت التالي لإنشاء hash كلمة المرور:

```javascript
// في console المتصفح أو Node.js
const hashPassword = async (password) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const hash = await hashPassword('Admin@123456');
console.log('Hash:', hash);
```

ثم قم بتحديث `password_hash` في جدول `users` للمستخدم `admin@ibrahim.com`.

### 3. إعداد متغيرات البيئة في Netlify

**راجع الملف [NETLIFY_ENV_SETUP.md](./NETLIFY_ENV_SETUP.md) للتعليمات التفصيلية خطوة بخطوة.**

باختصار، في Netlify Dashboard:
1. اذهب إلى **Site settings** > **Environment variables**
2. اضغط على **Add a variable**
3. أضف المتغير التالي:
   - **Key**: `VITE_NEON_DATABASE_URL`
   - **Value**: رابط الاتصال من Neon (مثال: `postgresql://user:password@host/database?sslmode=require`)
   - **Scope**: All scopes (أو اختر البيئة المناسبة)
4. احفظ وأعد نشر الموقع

**مثال على رابط الاتصال:**
```
postgresql://neondb_owner:npg_TYtfnOlr2oW7@ep-holy-frog-ahulw0nk-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

⚠️ **تحذير**: تأكد من استخدام رابط **Connection pooling** من Neon (يحتوي على `-pooler` في الرابط).

### 4. رفع المشروع إلى GitHub

```bash
git add .
git commit -m "Migrate to Neon, remove Supabase"
git push origin main
```

### 5. ربط Netlify مع GitHub

1. اذهب إلى Netlify Dashboard
2. اضغط على "Add new site" > "Import an existing project"
3. اختر GitHub واختر المستودع
4. إعدادات البناء:
   - Build command: `npm run build`
   - Publish directory: `dist`

### 6. التحقق من النشر

بعد النشر، تحقق من:
- تسجيل الدخول بحساب المدير: `admin@ibrahim.com` / `Admin@123456`
- التحقق من إعدادات المدير
- التحقق من فصل المتاجر

## ملاحظات مهمة

1. **الأمان**: تأكد من عدم كشف `VITE_NEON_DATABASE_URL` في الكود العام
2. **CORS**: تأكد من إعداد CORS في Neon للسماح لـ Netlify
3. **الصلاحيات**: تأكد من أن مدير المتجر يمكنه فقط إدارة موظفيه

## استكشاف الأخطاء

- إذا فشل البناء: تحقق من متغيرات البيئة
- إذا فشل الاتصال بقاعدة البيانات: تحقق من `VITE_NEON_DATABASE_URL`
- إذا فشل تسجيل الدخول: تحقق من hash كلمة المرور في قاعدة البيانات

