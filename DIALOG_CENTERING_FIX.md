# إصلاح مشكلة تمركز الحوارات (Dialogs)

## المشكلة
الحوارات (نماذج الإدخال) لم تكن تظهر في وسط الشاشة بشكل صحيح.

## الحل المطبق

### 1. تحديث `src/components/ui/dialog.jsx`:
- إضافة `container` prop للـ `DialogPortal` لضمان التموضع الصحيح
- استخدام `style` inline مع `position: fixed`, `left: 50%`, `top: 50%`, `transform: translate(-50%, -50%)`
- إضافة classes Tailwind للتمركز: `left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2`

### 2. تحديث `src/index.css`:
- إضافة CSS قوي مع `!important` لضمان التمركز
- إضافة قواعد لـ `[data-radix-dialog-content]` و `[data-radix-portal]`
- ضمان أن الحوارات تظهر دائماً في الوسط

## الكود المطبق

### dialog.jsx
```jsx
<DialogPortal container={typeof document !== 'undefined' ? document.body : null}>
  <DialogOverlay />
  <DialogPrimitive.Content
    style={{
      position: 'fixed',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
      margin: 0,
    }}
    className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ..."
  >
```

### index.css
```css
[data-radix-dialog-content],
[data-radix-dialog-content][data-state] {
  position: fixed !important;
  left: 50% !important;
  top: 50% !important;
  transform: translate(-50%, -50%) !important;
  margin: 0 !important;
  right: auto !important;
  bottom: auto !important;
}
```

## النتيجة
جميع الحوارات (نماذج الإدخال) تظهر الآن في وسط الشاشة على جميع الأجهزة (الجوال والحاسوب).

