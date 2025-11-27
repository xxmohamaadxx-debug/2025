/**
 * BOQ Service - ربط BOQ بالمستودع
 * يدير خصم المواد من المخزون عند استخدامها في المشاريع
 */

import { neonService } from './neonService';

/**
 * ربط عنصر مشروع بعنصر مخزون
 */
export const linkProjectItemToInventory = async (projectItemId, inventoryItemId, tenantId) => {
  try {
    const result = await neonService.linkProjectItemToInventory(projectItemId, inventoryItemId, tenantId);
    return result;
  } catch (error) {
    console.error('Link project item to inventory error:', error);
    throw error;
  }
};

/**
 * خصم المواد من المخزون عند استخدامها في المشروع
 */
export const deductInventoryFromBOQ = async (projectItemId, quantity, tenantId, userId) => {
  try {
    const result = await neonService.deductInventoryFromBOQ(projectItemId, quantity, tenantId, userId);
    
    if (!result.success) {
      throw new Error(result.error || 'فشل خصم المواد من المخزون');
    }
    
    return result;
  } catch (error) {
    console.error('Deduct inventory from BOQ error:', error);
    throw error;
  }
};

/**
 * إرجاع المواد إلى المخزون (عند إلغاء استخدام)
 */
export const returnInventoryFromBOQ = async (projectItemId, quantity, tenantId, userId) => {
  try {
    const result = await neonService.returnInventoryFromBOQ(projectItemId, quantity, tenantId, userId);
    
    if (!result.success) {
      throw new Error(result.error || 'فشل إرجاع المواد إلى المخزون');
    }
    
    return result;
  } catch (error) {
    console.error('Return inventory from BOQ error:', error);
    throw error;
  }
};

/**
 * خصم تلقائي لجميع المواد المستخدمة في مشروع
 */
export const deductAllProjectMaterials = async (projectId, tenantId, userId) => {
  try {
    // الحصول على جميع عناصر المشروع المرتبطة بالمخزون
    const projectItems = await neonService.getProjectItems(tenantId, projectId);
    
    const results = [];
    for (const item of projectItems) {
      if (item.inventory_item_id && item.quantity && item.quantity > 0) {
        try {
          const result = await deductInventoryFromBOQ(
            item.id,
            parseFloat(item.quantity),
            tenantId,
            userId
          );
          results.push({
            item_id: item.id,
            item_name: item.name_ar,
            success: true,
            ...result
          });
        } catch (error) {
          results.push({
            item_id: item.id,
            item_name: item.name_ar,
            success: false,
            error: error.message
          });
        }
      }
    }
    
    return {
      success: results.every(r => r.success),
      results: results
    };
  } catch (error) {
    console.error('Deduct all project materials error:', error);
    throw error;
  }
};

export default {
  linkProjectItemToInventory,
  deductInventoryFromBOQ,
  returnInventoryFromBOQ,
  deductAllProjectMaterials,
};

