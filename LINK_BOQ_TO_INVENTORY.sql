-- ربط BOQ بالمستودع مع خصم تلقائي
-- عندما يتم استخدام مواد من المشروع، يتم خصمها تلقائياً من المخزون

-- ============================================
-- 1. إضافة حقل inventory_item_id إلى project_items
-- ============================================
ALTER TABLE project_items
ADD COLUMN IF NOT EXISTS inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL;

-- ============================================
-- 2. إضافة حقل used_quantity لتتبع الكمية المستخدمة
-- ============================================
ALTER TABLE project_items
ADD COLUMN IF NOT EXISTS used_quantity NUMERIC(10, 2) DEFAULT 0;

-- ============================================
-- 3. دالة لخصم المواد من المخزون عند استخدامها في المشروع
-- ============================================
CREATE OR REPLACE FUNCTION deduct_inventory_from_boq(
    p_project_item_id UUID,
    p_quantity NUMERIC(10, 2),
    p_tenant_id UUID,
    p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_project_item RECORD;
    v_inventory_item RECORD;
    v_quantity_before NUMERIC(10, 2);
    v_quantity_after NUMERIC(10, 2);
    v_result JSONB;
BEGIN
    -- الحصول على بيانات عنصر المشروع
    SELECT * INTO v_project_item
    FROM project_items
    WHERE id = p_project_item_id AND tenant_id = p_tenant_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'عنصر المشروع غير موجود'
        );
    END IF;
    
    -- التحقق من وجود ربط مع المخزون
    IF v_project_item.inventory_item_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'عنصر المشروع غير مربوط بالمخزون'
        );
    END IF;
    
    -- الحصول على بيانات المخزون
    SELECT * INTO v_inventory_item
    FROM inventory_items
    WHERE id = v_project_item.inventory_item_id AND tenant_id = p_tenant_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'عنصر المخزون غير موجود'
        );
    END IF;
    
    -- التحقق من توفر الكمية
    v_quantity_before := v_inventory_item.quantity;
    IF v_quantity_before < p_quantity THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', format('الكمية غير كافية. المتوفر: %s', v_quantity_before),
            'available_quantity', v_quantity_before
        );
    END IF;
    
    -- خصم الكمية من المخزون
    v_quantity_after := v_quantity_before - p_quantity;
    
    UPDATE inventory_items
    SET quantity = v_quantity_after,
        updated_at = NOW()
    WHERE id = v_inventory_item.id;
    
    -- تحديث الكمية المستخدمة في عنصر المشروع
    UPDATE project_items
    SET used_quantity = COALESCE(used_quantity, 0) + p_quantity,
        updated_at = NOW()
    WHERE id = p_project_item_id;
    
    -- تسجيل معاملة المخزون
    INSERT INTO inventory_transactions (
        tenant_id,
        inventory_item_id,
        transaction_type,
        reference_type,
        reference_id,
        quantity_change,
        quantity_before,
        quantity_after,
        unit_price,
        currency,
        description,
        created_by
    ) VALUES (
        p_tenant_id,
        v_inventory_item.id,
        'outbound',
        'project',
        p_project_item_id,
        -p_quantity,
        v_quantity_before,
        v_quantity_after,
        v_inventory_item.price,
        v_inventory_item.currency,
        format('استخدام من مشروع - %s', v_project_item.name_ar),
        p_user_id
    );
    
    -- إرجاع النتيجة
    RETURN jsonb_build_object(
        'success', true,
        'quantity_before', v_quantity_before,
        'quantity_after', v_quantity_after,
        'deducted_quantity', p_quantity
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. دالة لإرجاع المواد إلى المخزون (عند إلغاء استخدام)
-- ============================================
CREATE OR REPLACE FUNCTION return_inventory_from_boq(
    p_project_item_id UUID,
    p_quantity NUMERIC(10, 2),
    p_tenant_id UUID,
    p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_project_item RECORD;
    v_inventory_item RECORD;
    v_quantity_before NUMERIC(10, 2);
    v_quantity_after NUMERIC(10, 2);
BEGIN
    -- الحصول على بيانات عنصر المشروع
    SELECT * INTO v_project_item
    FROM project_items
    WHERE id = p_project_item_id AND tenant_id = p_tenant_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'عنصر المشروع غير موجود');
    END IF;
    
    -- التحقق من وجود ربط مع المخزون
    IF v_project_item.inventory_item_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'عنصر المشروع غير مربوط بالمخزون');
    END IF;
    
    -- التحقق من أن الكمية المستخدمة كافية
    IF COALESCE(v_project_item.used_quantity, 0) < p_quantity THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', format('الكمية المستخدمة غير كافية. المستخدم: %s', v_project_item.used_quantity)
        );
    END IF;
    
    -- الحصول على بيانات المخزون
    SELECT * INTO v_inventory_item
    FROM inventory_items
    WHERE id = v_project_item.inventory_item_id AND tenant_id = p_tenant_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'عنصر المخزون غير موجود');
    END IF;
    
    -- إرجاع الكمية إلى المخزون
    v_quantity_before := v_inventory_item.quantity;
    v_quantity_after := v_quantity_before + p_quantity;
    
    UPDATE inventory_items
    SET quantity = v_quantity_after,
        updated_at = NOW()
    WHERE id = v_inventory_item.id;
    
    -- تحديث الكمية المستخدمة في عنصر المشروع
    UPDATE project_items
    SET used_quantity = GREATEST(0, COALESCE(used_quantity, 0) - p_quantity),
        updated_at = NOW()
    WHERE id = p_project_item_id;
    
    -- تسجيل معاملة المخزون
    INSERT INTO inventory_transactions (
        tenant_id,
        inventory_item_id,
        transaction_type,
        reference_type,
        reference_id,
        quantity_change,
        quantity_before,
        quantity_after,
        unit_price,
        currency,
        description,
        created_by
    ) VALUES (
        p_tenant_id,
        v_inventory_item.id,
        'return',
        'project',
        p_project_item_id,
        p_quantity,
        v_quantity_before,
        v_quantity_after,
        v_inventory_item.price,
        v_inventory_item.currency,
        format('إرجاع من مشروع - %s', v_project_item.name_ar),
        p_user_id
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'quantity_before', v_quantity_before,
        'quantity_after', v_quantity_after,
        'returned_quantity', p_quantity
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. دالة لربط عنصر مشروع بعنصر مخزون
-- ============================================
CREATE OR REPLACE FUNCTION link_project_item_to_inventory(
    p_project_item_id UUID,
    p_inventory_item_id UUID,
    p_tenant_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    -- التحقق من أن كلا العنصرين موجودان وينتميان لنفس المتجر
    IF NOT EXISTS (
        SELECT 1 FROM project_items 
        WHERE id = p_project_item_id AND tenant_id = p_tenant_id
    ) THEN
        RAISE EXCEPTION 'عنصر المشروع غير موجود';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM inventory_items 
        WHERE id = p_inventory_item_id AND tenant_id = p_tenant_id
    ) THEN
        RAISE EXCEPTION 'عنصر المخزون غير موجود';
    END IF;
    
    -- ربط العنصرين
    UPDATE project_items
    SET inventory_item_id = p_inventory_item_id,
        updated_at = NOW()
    WHERE id = p_project_item_id AND tenant_id = p_tenant_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. إنشاء فهرس لتحسين الأداء
-- ============================================
CREATE INDEX IF NOT EXISTS idx_project_items_inventory_id ON project_items(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_project_items_used_quantity ON project_items(used_quantity);

-- تعليقات
COMMENT ON FUNCTION deduct_inventory_from_boq(UUID, NUMERIC, UUID, UUID) IS 'خصم المواد من المخزون عند استخدامها في المشروع';
COMMENT ON FUNCTION return_inventory_from_boq(UUID, NUMERIC, UUID, UUID) IS 'إرجاع المواد إلى المخزون عند إلغاء استخدامها من المشروع';
COMMENT ON FUNCTION link_project_item_to_inventory(UUID, UUID, UUID) IS 'ربط عنصر مشروع بعنصر مخزون';

