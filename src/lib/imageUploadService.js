
// خدمة رفع الصور للمستخدمين والمتاجر
// يمكن دمجها مع Supabase Storage أو أي خدمة تخزين أخرى

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// محاكاة رفع الصور (في الإنتاج، استخدم خدمة تخزين حقيقية)
export const uploadImage = async (file, type = 'user_avatar', tenantId = null, userId = null) => {
  // التحقق من حجم الملف
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('حجم الملف كبير جداً. الحد الأقصى 5MB');
  }

  // التحقق من نوع الملف
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('نوع الملف غير مدعوم. استخدم JPEG, PNG, WebP, أو GIF');
  }

  try {
    // في الإنتاج، استخدم خدمة تخزين حقيقية مثل:
    // - Supabase Storage
    // - AWS S3
    // - Cloudinary
    // - Firebase Storage
    
    // محاكاة: إنشاء URL محلي
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onload = (e) => {
        // في الإنتاج، قم برفع الملف إلى الخادم
        // const formData = new FormData();
        // formData.append('file', file);
        // const response = await fetch('/api/upload', { method: 'POST', body: formData });
        // const { url } = await response.json();
        
        // محاكاة: استخدام Data URL مؤقت
        const dataUrl = e.target.result;
        resolve({
          url: dataUrl,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  } catch (error) {
    console.error('Upload image error:', error);
    throw error;
  }
};

// حفظ رابط الصورة في قاعدة البيانات
export const saveImageUrl = async (imageUrl, type, tenantId, userId, neonService) => {
  try {
    if (type === 'user_avatar' && userId) {
      await neonService.updateUser(userId, { avatar_url: imageUrl }, tenantId);
    } else if (type === 'tenant_logo' && tenantId) {
      await neonService.updateTenant(tenantId, { logo_url: imageUrl });
    }
    return true;
  } catch (error) {
    console.error('Save image URL error:', error);
    throw error;
  }
};

// حذف الصورة
export const deleteImage = async (imageUrl, type, tenantId, userId) => {
  try {
    // في الإنتاج، احذف الملف من خدمة التخزين
    // await fetch(`/api/delete-image?url=${encodeURIComponent(imageUrl)}`, { method: 'DELETE' });
    
    // حذف الرابط من قاعدة البيانات
    if (type === 'user_avatar' && userId) {
      // await neonService.updateUser(userId, { avatar_url: null }, tenantId);
    } else if (type === 'tenant_logo' && tenantId) {
      // await neonService.updateTenant(tenantId, { logo_url: null });
    }
    return true;
  } catch (error) {
    console.error('Delete image error:', error);
    throw error;
  }
};

// التحقق من صحة الملف
export const validateImageFile = (file) => {
  if (!file) {
    return { valid: false, error: 'لم يتم اختيار ملف' };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'حجم الملف كبير جداً. الحد الأقصى 5MB' };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'نوع الملف غير مدعوم. استخدم JPEG, PNG, WebP, أو GIF' };
  }

  return { valid: true };
};

export default {
  uploadImage,
  saveImageUrl,
  deleteImage,
  validateImageFile,
  MAX_FILE_SIZE,
  ALLOWED_TYPES
};

