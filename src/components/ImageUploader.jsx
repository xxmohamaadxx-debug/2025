import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

const ImageUploader = ({ 
  currentImage, 
  onImageChange, 
  maxSizeMB = 2, 
  aspectRatio = null,
  label = 'رفع صورة',
  className = ''
}) => {
  const [preview, setPreview] = useState(currentImage || null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'خطأ',
        description: 'يجب اختيار ملف صورة',
        variant: 'destructive'
      });
      return;
    }

    // Validate file size
    const sizeInMB = file.size / (1024 * 1024);
    if (sizeInMB > maxSizeMB) {
      toast({
        title: 'خطأ',
        description: `حجم الصورة يجب أن يكون أقل من ${maxSizeMB} ميجابايت`,
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);
    try {
      // Convert to base64 for storage
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setPreview(base64String);
        if (onImageChange) {
          onImageChange(base64String, file);
        }
        setUploading(false);
      };
      reader.onerror = () => {
        toast({
          title: 'خطأ',
          description: 'فشل قراءة الملف',
          variant: 'destructive'
        });
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: 'خطأ',
        description: 'فشل رفع الصورة',
        variant: 'destructive'
      });
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onImageChange) {
      onImageChange(null, null);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      
      {preview ? (
        <div className="relative inline-block">
          <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            <button
              onClick={handleRemove}
              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center w-32 h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-orange-500 transition-colors cursor-pointer"
             onClick={() => fileInputRef.current?.click()}>
          <div className="text-center">
            <ImageIcon className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p className="text-xs text-gray-500">اضغط للرفع</p>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="w-full sm:w-auto"
      >
        <Upload className="h-4 w-4 ml-2 rtl:mr-2 rtl:ml-0" />
        {uploading ? 'جاري الرفع...' : preview ? 'تغيير الصورة' : 'اختر صورة'}
      </Button>
      
      <p className="text-xs text-gray-500">
        الحد الأقصى: {maxSizeMB} ميجابايت (JPG, PNG, GIF)
      </p>
    </div>
  );
};

export default ImageUploader;

