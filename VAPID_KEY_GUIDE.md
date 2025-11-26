# دليل الحصول على VAPID Public Key لإشعارات Push

## ما هو VAPID Key؟

VAPID (Voluntary Application Server Identification) هو نظام لتحديد هوية خادم التطبيق عند إرسال إشعارات Push. يتطلب مفتاحين:
- **Public Key (المفتاح العام)**: يستخدم في المتصفح
- **Private Key (المفتاح الخاص)**: يستخدم في الخادم (للإرسال)

## طريقة 1: استخدام أداة web-push (موصى بها)

### الخطوات:

1. **تثبيت أداة web-push:**
   ```bash
   npm install -g web-push
   ```

2. **إنشاء المفاتيح:**
   ```bash
   web-push generate-vapid-keys
   ```

3. **ستحصل على مخرجات مثل:**
   ```
   ========================================
   
   Public Key:
   BEl62iUYgUivxIkv69yViEuiBIa40HIWzC6E5rGdOMXKb1VnY5Fq3F5GJ1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6A7B8C9D0E1F2G3
   
   Private Key:
   xK7YqP9R2S5T8U1V4W6X9Y0Z3A5B7C9D1E3F5G7H9I1J3K5L7M9N1O3P5Q7R9S1T3U5V7W9X1Y3Z5A7B9C1D3E5F7G9H1I3J5
   
   ========================================
   ```

## طريقة 2: استخدام موقع على الإنترنت

1. **افتح أحد المواقع التالية:**
   - https://web-push-codelab.glitch.me/
   - https://tools.reactpwa.com/vapid
   - https://vapidkeys.com/

2. **انسخ Public Key و Private Key**

## طريقة 3: استخدام Node.js مباشرة

### إنشاء ملف `generate-vapid-keys.js`:

```javascript
const webpush = require('web-push');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('Public Key:');
console.log(vapidKeys.publicKey);
console.log('\nPrivate Key:');
console.log(vapidKeys.privateKey);
```

### تشغيل الملف:

```bash
node generate-vapid-keys.js
```

## كيفية إضافة المفاتيح إلى التطبيق

### 1. تحديث Service Worker (`public/sw.js`)

في ملف `public/sw.js`، قم بتحديث المفتاح العام:

```javascript
// في دالة handleEnablePush أو في مكان التسجيل
const subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: urlBase64ToUint8Array(
    'PUT_YOUR_PUBLIC_KEY_HERE' // استبدل هذا بالمفتاح العام الذي حصلت عليه
  )
});
```

### 2. إضافة المفاتيح إلى إعدادات النظام

#### الطريقة الموصى بها: إضافة إلى قاعدة البيانات

في ملف SQL أو من خلال صفحة إعدادات الأدمن، أضف:

```sql
-- إضافة VAPID Public Key
INSERT INTO system_settings (key, value, description, updated_by)
VALUES (
    'vapid_public_key',
    'PUT_YOUR_PUBLIC_KEY_HERE', -- استبدل بالمفتاح العام
    'VAPID Public Key للإشعارات الخارجية',
    NULL
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- إضافة VAPID Private Key (للخادم فقط - لا يعرض في Frontend)
INSERT INTO system_settings (key, value, description, updated_by)
VALUES (
    'vapid_private_key',
    'PUT_YOUR_PRIVATE_KEY_HERE', -- استبدل بالمفتاح الخاص
    'VAPID Private Key للإشعارات الخارجية (للخادم فقط)',
    NULL
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

### 3. تحديث `NotificationSettingsPage.jsx`

في ملف `src/pages/NotificationSettingsPage.jsx`، قم بتحديث دالة `handleEnablePush`:

```javascript
const handleEnablePush = async () => {
  // ... الكود الحالي ...
  
  try {
    // الحصول على VAPID Public Key من إعدادات النظام
    const settings = await neonService.getSystemSettings();
    const vapidPublicKey = settings.vapid_public_key;
    
    if (!vapidPublicKey) {
      toast({
        title: 'خطأ',
        description: 'لم يتم تكوين VAPID Public Key. يرجى التواصل مع الأدمن.',
        variant: 'destructive'
      });
      return;
    }
    
    // ... باقي الكود ...
    
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    });
    
    // ... باقي الكود ...
  }
};
```

### 4. إضافة VAPID Key في صفحة إعدادات الأدمن

يمكنك إضافة حقول في `AdminSettingsPage.jsx` لإدارة VAPID Keys:

```jsx
// في قسم جديد في AdminSettingsPage
<div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
      إعدادات VAPID للإشعارات الخارجية
    </h2>
  </div>
  <div className="p-6 space-y-4">
    <div>
      <label className="block text-sm font-medium mb-2">
        VAPID Public Key *
      </label>
      <input
        type="text"
        value={vapidPublicKey}
        onChange={(e) => setVapidPublicKey(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
        placeholder="BEl62iUYgUivxIkv69yViEuiBIa40HIWz..."
      />
      <p className="text-xs text-gray-500 mt-1">
        المفتاح العام المستخدم في المتصفح
      </p>
    </div>
    
    <div>
      <label className="block text-sm font-medium mb-2">
        VAPID Private Key *
      </label>
      <input
        type="password"
        value={vapidPrivateKey}
        onChange={(e) => setVapidPrivateKey(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
        placeholder="xK7YqP9R2S5T8U1V4W6X9Y0Z3..."
      />
      <p className="text-xs text-gray-500 mt-1">
        المفتاح الخاص (يستخدم في الخادم فقط - لا يشارك)
      </p>
    </div>
  </div>
</div>
```

## ملاحظات أمنية مهمة

⚠️ **تحذير:**
- **Private Key**: لا تعرضه أبداً في Frontend أو في الكود المكشوف
- **Public Key**: يمكن عرضه في Frontend بأمان
- احفظ Private Key في مكان آمن (Environment Variables أو قاعدة بيانات محمية)

## اختبار الإشعارات

بعد إضافة المفاتيح:

1. افتح التطبيق في المتصفح
2. اذهب إلى إعدادات الإشعارات
3. اضغط "تفعيل الإشعارات الخارجية"
4. وافق على الإذن
5. تأكد من ظهور رسالة نجاح

## استكشاف الأخطاء

### خطأ: "Failed to register service worker"
- تأكد من أن `public/sw.js` موجود
- تأكد من أن الموقع يعمل على HTTPS (أو localhost للاختبار)

### خطأ: "Invalid VAPID key"
- تأكد من نسخ المفتاح بشكل صحيح
- تأكد من أن المفتاح هو Public Key وليس Private Key

### الإشعارات لا تظهر
- تحقق من إذن الإشعارات في المتصفح
- تأكد من تفعيل "إشعار خارجي" في إعدادات نوع الإشعار

## روابط مفيدة

- [Web Push Protocol](https://web.dev/push-notifications/)
- [VAPID Specification](https://tools.ietf.org/html/rfc8292)
- [web-push library](https://github.com/web-push-libs/web-push)

