# دليل نشر التطبيق على Netlify

## متغيرات البيئة المطلوبة

تأكد من إضافة متغيرات البيئة التالية في Netlify Dashboard:

### 1. متغير قاعدة البيانات
```
VITE_NEON_DATABASE_URL
```
القيمة: رابط اتصال قاعدة البيانات من Neon (باستخدام Connection Pooling)

**كيفية الحصول عليها:**
1. اذهب إلى [Neon Console](https://console.neon.tech)
2. اختر مشروعك
3. اذهب إلى **Connection Details**
4. اختر **Connection Pooling**
5. انسخ رابط الاتصال الكامل

### 2. إضافة متغيرات البيئة في Netlify

1. اذهب إلى [Netlify Dashboard](https://app.netlify.com)
2. اختر موقعك
3. اذهب إلى **Site settings**
4. اذهب إلى **Build & deploy** > **Environment**
5. اضغط **Add a variable**
6. أضف `VITE_NEON_DATABASE_URL` مع قيمة رابط الاتصال

## إعدادات البناء

تم إعداد `netlify.toml` بشكل تلقائي:
- إصدار Node.js: 18
- أمر البناء: `npm ci && npm run build`
- مجلد النشر: `dist`

## استكشاف الأخطاء

### خطأ: "Deploy logs are currently unavailable"
- هذا خطأ مؤقت من Netlify
- انتظر قليلاً ثم جرّب مرة أخرى
- يمكنك محاولة إعادة النشر من Netlify Dashboard

### خطأ: "Build failed"
- تأكد من وجود `VITE_NEON_DATABASE_URL` في متغيرات البيئة
- تأكد من أن رابط الاتصال صحيح
- افحص سجلات البناء في Netlify

### خطأ: "Module not found"
- تأكد من أن جميع الحزم موجودة في `package.json`
- قد تحتاج إلى مسح الكاش وإعادة البناء

## إعادة النشر

1. اذهب إلى Netlify Dashboard
2. اختر موقعك
3. اذهب إلى **Deploys**
4. اضغط على الثلاث نقاط (...) بجانب آخر نشر
5. اختر **Trigger deploy** > **Clear cache and deploy site**

## التحقق من النشر

بعد النشر الناجح:
1. اذهب إلى الموقع المباشر
2. جرّب تسجيل الدخول
3. تأكد من أن قاعدة البيانات تعمل
4. افحص سجلات الأخطاء في Netlify

