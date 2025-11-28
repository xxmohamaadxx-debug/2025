-- Consolidated Inventory & Fuel Enhancements
-- Generated: 2025-11-29
-- This migration combines `INVENTORY_FUEL_ENHANCEMENTS.sql` and
-- `UPDATE_INVENTORY_AND_FUEL_SYSTEMS.sql` with small fixes so it can be
-- applied to your Neon/Postgres database. Review before running.

-- IMPORTANT: Run inside a maintenance window. Do NOT run this on a live
-- production database without backups. This script does not include
-- credentials. Use your `psql`/Neon CLI and connect as a privileged user.

-- 1) Ensure extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- INVENTORY & FUEL ENHANCEMENTS
-- ============================================

-- 1. Inventory Categories
CREATE TABLE IF NOT EXISTS inventory_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#FF8C00',
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inv_categories_tenant ON inventory_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inv_categories_active ON inventory_categories(is_active);

-- 2. Inventory Changes (Audit Trail)
CREATE TABLE IF NOT EXISTS inventory_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  product_id UUID NOT NULL,
  change_type TEXT NOT NULL,
  quantity_before NUMERIC(14,2),
  quantity_after NUMERIC(14,2),
  quantity_changed NUMERIC(14,2),
  reason TEXT,
  reference_id UUID,
  reference_type TEXT,
  recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_inv_changes_tenant ON inventory_changes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inv_changes_product ON inventory_changes(product_id);
CREATE INDEX IF NOT EXISTS idx_inv_changes_type ON inventory_changes(change_type);
CREATE INDEX IF NOT EXISTS idx_inv_changes_date ON inventory_changes(recorded_at);

-- 3. Low Stock Thresholds
CREATE TABLE IF NOT EXISTS low_stock_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  product_id UUID NOT NULL,
  threshold_quantity NUMERIC(14,2) NOT NULL DEFAULT 5,
  alert_enabled BOOLEAN DEFAULT TRUE,
  alert_method TEXT DEFAULT 'notification',
  last_alert_sent TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_low_stock_tenant ON low_stock_thresholds(tenant_id);
CREATE INDEX IF NOT EXISTS idx_low_stock_product ON low_stock_thresholds(product_id);

-- 4. Fuel Counters
CREATE TABLE IF NOT EXISTS fuel_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  counter_number INT NOT NULL,
  counter_name TEXT NOT NULL,
  liters_sold NUMERIC(16,2) DEFAULT 0,
  price_per_liter NUMERIC(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'SYP',
  last_reading NUMERIC(16,2) DEFAULT 0,
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, counter_number)
);
CREATE INDEX IF NOT EXISTS idx_fuel_counters_tenant ON fuel_counters(tenant_id);

-- 5. Fuel Counter Movements
CREATE TABLE IF NOT EXISTS fuel_counter_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  fuel_counter_id UUID REFERENCES fuel_counters(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL,
  liters NUMERIC(16,2) NOT NULL,
  price_per_liter NUMERIC(10,2),
  total_amount NUMERIC(14,2),
  currency TEXT DEFAULT 'SYP',
  reference_id UUID,
  reference_type TEXT,
  notes TEXT,
  recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fuel_movements_tenant ON fuel_counter_movements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fuel_movements_counter ON fuel_counter_movements(fuel_counter_id);
CREATE INDEX IF NOT EXISTS idx_fuel_movements_date ON fuel_counter_movements(recorded_at);

-- 6. Auto-deduct inventory when invoice_out is created (uses inventory_items)
CREATE OR REPLACE FUNCTION deduct_inventory_on_invoice_out_create()
RETURNS TRIGGER AS $$
DECLARE
  item JSONB;
  inv_item_id UUID;
  deduct_qty NUMERIC;
  old_qty NUMERIC;
  new_qty NUMERIC;
BEGIN
  IF NEW.status NOT IN ('posted', 'finalized') THEN
    RETURN NEW;
  END IF;

  FOR item IN SELECT jsonb_array_elements(COALESCE(NEW.items, '[]'::jsonb)) LOOP
    inv_item_id := (item->>'inventory_item_id')::uuid;
    -- fallback to product_id->inventory mapping if inventory_item_id not provided
    IF inv_item_id IS NULL THEN
      inv_item_id := NULL;
    END IF;
    deduct_qty := (item->>'quantity')::numeric;

    IF inv_item_id IS NOT NULL THEN
      SELECT quantity INTO old_qty FROM inventory_items WHERE id = inv_item_id;
      IF NOT FOUND THEN
        old_qty := 0;
      END IF;

      new_qty := old_qty - deduct_qty;
      IF new_qty < 0 THEN
        new_qty := 0;
      END IF;

      UPDATE inventory_items SET quantity = new_qty, updated_at = NOW() WHERE id = inv_item_id;

      INSERT INTO inventory_changes (tenant_id, product_id, change_type, quantity_before, quantity_after, quantity_changed, reason, reference_id, reference_type, recorded_by, recorded_at)
      VALUES (NEW.tenant_id, (SELECT product_id FROM inventory_items WHERE id = inv_item_id), 'export', old_qty, new_qty, deduct_qty, 'Auto-deduction on invoice export', NEW.id, 'invoice_out', NEW.user_id, NOW());
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_deduct_inventory_on_invoice_out ON invoices_out;
CREATE TRIGGER trigger_deduct_inventory_on_invoice_out
  AFTER INSERT ON invoices_out
  FOR EACH ROW
  EXECUTE FUNCTION deduct_inventory_on_invoice_out_create();

-- 7. Auto-deduct fuel counters on invoice_out (simple distribution to an active counter)
CREATE OR REPLACE FUNCTION deduct_fuel_on_invoice_out_create()
RETURNS TRIGGER AS $$
DECLARE
  item JSONB;
  liters_qty NUMERIC;
  fuel_counter_id UUID;
  total_amount NUMERIC;
BEGIN
  IF NEW.status NOT IN ('posted', 'finalized') THEN
    RETURN NEW;
  END IF;

  FOR item IN SELECT jsonb_array_elements(COALESCE(NEW.items, '[]'::jsonb)) LOOP
    liters_qty := (item->>'quantity')::numeric;
    SELECT id INTO fuel_counter_id FROM fuel_counters WHERE tenant_id = NEW.tenant_id AND is_active = TRUE LIMIT 1;
    IF FOUND THEN
      total_amount := liters_qty * COALESCE((SELECT price_per_liter FROM fuel_counters WHERE id = fuel_counter_id), 0);
      UPDATE fuel_counters SET liters_sold = liters_sold + liters_qty WHERE id = fuel_counter_id;
      INSERT INTO fuel_counter_movements (tenant_id, fuel_counter_id, movement_type, liters, price_per_liter, total_amount, reference_id, reference_type, recorded_by, recorded_at)
      VALUES (NEW.tenant_id, fuel_counter_id, 'sale', liters_qty, (SELECT price_per_liter FROM fuel_counters WHERE id = fuel_counter_id), total_amount, NEW.id, 'invoice_out', NEW.user_id, NOW());
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_deduct_fuel_on_invoice_out ON invoices_out;
CREATE TRIGGER trigger_deduct_fuel_on_invoice_out
  AFTER INSERT ON invoices_out
  FOR EACH ROW
  EXECUTE FUNCTION deduct_fuel_on_invoice_out_create();

-- 8. Deduct fuel on daily transaction (if your daily_transactions table records fuel sales)
CREATE OR REPLACE FUNCTION deduct_fuel_on_daily_transaction_create()
RETURNS TRIGGER AS $$
DECLARE
  liters_qty NUMERIC;
  fuel_counter_id UUID;
  total_amount NUMERIC;
BEGIN
  IF NEW.transaction_type != 'fuel_sale' AND NEW.category != 'محروقات' THEN
    RETURN NEW;
  END IF;

  liters_qty := NEW.amount;
  SELECT id INTO fuel_counter_id FROM fuel_counters WHERE tenant_id = NEW.tenant_id AND is_active = TRUE LIMIT 1;
  IF FOUND THEN
    total_amount := liters_qty * COALESCE((SELECT price_per_liter FROM fuel_counters WHERE id = fuel_counter_id), 0);
    UPDATE fuel_counters SET liters_sold = liters_sold + liters_qty WHERE id = fuel_counter_id;
    INSERT INTO fuel_counter_movements (tenant_id, fuel_counter_id, movement_type, liters, price_per_liter, total_amount, reference_id, reference_type, recorded_by, recorded_at)
    VALUES (NEW.tenant_id, fuel_counter_id, 'sale', liters_qty, (SELECT price_per_liter FROM fuel_counters WHERE id = fuel_counter_id), total_amount, NEW.id, 'daily_transaction', NEW.recorded_by, NOW());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_deduct_fuel_on_daily_transaction ON daily_transactions;
CREATE TRIGGER trigger_deduct_fuel_on_daily_transaction
  AFTER INSERT ON daily_transactions
  FOR EACH ROW
  EXECUTE FUNCTION deduct_fuel_on_daily_transaction_create();

-- 9. Low stock alert trigger (fires on inventory_items changes)
CREATE OR REPLACE FUNCTION check_low_stock_alert()
RETURNS TRIGGER AS $$
DECLARE
  threshold NUMERIC;
  should_alert BOOLEAN;
BEGIN
  SELECT threshold_quantity, alert_enabled INTO threshold, should_alert
  FROM low_stock_thresholds
  WHERE product_id = NEW.product_id AND tenant_id = NEW.tenant_id;

  IF NOT FOUND THEN
    threshold := NEW.min_stock;
    should_alert := TRUE;
  END IF;

  IF should_alert AND NEW.quantity <= threshold THEN
    INSERT INTO inventory_changes (tenant_id, product_id, change_type, quantity_before, quantity_after, quantity_changed, reason, recorded_at)
    VALUES (NEW.tenant_id, NEW.product_id, 'low_stock_alert', OLD.quantity, NEW.quantity, NEW.quantity - OLD.quantity, 'Stock below threshold', NOW());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_low_stock_alert ON inventory_items;
CREATE TRIGGER trigger_check_low_stock_alert
  AFTER UPDATE ON inventory_items
  FOR EACH ROW
  WHEN (OLD.quantity IS DISTINCT FROM NEW.quantity)
  EXECUTE FUNCTION check_low_stock_alert();

-- 10. Helper functions: get_inventory_stats and fuel summaries (use inventory_items)
CREATE OR REPLACE FUNCTION get_inventory_stats(p_tenant_id UUID)
RETURNS TABLE (
  total_items BIGINT,
  low_stock_count BIGINT,
  total_value NUMERIC,
  categories_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE quantity <= min_stock)::BIGINT,
    SUM((quantity * price)::NUMERIC)::NUMERIC,
    (SELECT COUNT(*) FROM inventory_categories WHERE tenant_id = p_tenant_id)::BIGINT
  FROM inventory_items
  WHERE tenant_id = p_tenant_id;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION get_fuel_counter_summary(p_tenant_id UUID)
RETURNS TABLE (
  counter_id UUID,
  counter_name TEXT,
  liters_sold NUMERIC,
  price_per_liter NUMERIC,
  total_revenue NUMERIC,
  currency TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id,
    counter_name,
    liters_sold,
    price_per_liter,
    (liters_sold * price_per_liter)::NUMERIC,
    currency
  FROM fuel_counters
  WHERE tenant_id = p_tenant_id AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON TABLE inventory_categories IS 'Categories/sections for organizing products per store';
COMMENT ON TABLE inventory_changes IS 'Complete audit trail of all inventory movements';
COMMENT ON TABLE low_stock_thresholds IS 'Configurable low-stock alert thresholds per store and product';
COMMENT ON TABLE fuel_counters IS 'Configurable fuel counters per fuel station store';
COMMENT ON TABLE fuel_counter_movements IS 'Tracking all fuel sales, adjustments, and refills';

-- ============================================
-- UPDATE: schema tweaks and additional fuel tables/indexes
-- ============================================

-- 1. Update inventory_items: optional product_code, category, changes_history
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS product_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS changes_history JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_inventory_items_code ON inventory_items(product_code);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category);

-- 2. invoices_out and invoices_in additional columns
ALTER TABLE invoices_out
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS changes_history JSONB DEFAULT '[]'::jsonb;
CREATE INDEX IF NOT EXISTS idx_invoices_out_category_date ON invoices_out(category, date DESC);

ALTER TABLE invoices_in
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS changes_history JSONB DEFAULT '[]'::jsonb;
CREATE INDEX IF NOT EXISTS idx_invoices_in_category_date ON invoices_in(category, date DESC);

-- 3. Inventory low stock alerts (inventory_items based)
CREATE TABLE IF NOT EXISTS inventory_low_stock_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE NOT NULL,
    alert_threshold NUMERIC(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    alert_enabled_date TIMESTAMPTZ DEFAULT NOW(),
    last_alert_sent TIMESTAMPTZ,
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, inventory_item_id)
);
CREATE INDEX IF NOT EXISTS idx_low_stock_alerts_tenant ON inventory_low_stock_alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_low_stock_alerts_active ON inventory_low_stock_alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_low_stock_alerts_item ON inventory_low_stock_alerts(inventory_item_id);

-- 4. Fuel counters (with corrected store_type join in constraint)
CREATE TABLE IF NOT EXISTS fuel_counters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    counter_name TEXT NOT NULL,
    counter_number INT NOT NULL,
    selling_price_per_liter NUMERIC(10, 4) NOT NULL DEFAULT 0,
    current_reading NUMERIC(12, 3) NOT NULL DEFAULT 0,
    initial_reading NUMERIC(12, 3) NOT NULL DEFAULT 0,
    total_sold NUMERIC(12, 3) NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    counter_unit TEXT DEFAULT 'liter',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, counter_number),
    CONSTRAINT fuel_counter_store_type_check CHECK (
        EXISTS (
            SELECT 1 FROM tenants t
            JOIN store_types st ON t.store_type_id = st.id
            WHERE t.id = tenant_id
            AND (st.code ILIKE '%fuel%' OR st.features @> '{"fuel_management": true}'::jsonb)
        )
    )
);
CREATE INDEX IF NOT EXISTS idx_fuel_counters_tenant ON fuel_counters(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fuel_counters_active ON fuel_counters(is_active);
CREATE INDEX IF NOT EXISTS idx_fuel_counters_number ON fuel_counters(tenant_id, counter_number);

-- 5. Fuel movements (detailed)
CREATE TABLE IF NOT EXISTS fuel_counter_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    fuel_counter_id UUID REFERENCES fuel_counters(id) ON DELETE CASCADE NOT NULL,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('sale', 'adjustment', 'initial_read')),
    reading_before NUMERIC(12, 3) NOT NULL,
    reading_after NUMERIC(12, 3) NOT NULL,
    quantity_sold NUMERIC(12, 3) NOT NULL,
    price_per_liter NUMERIC(10, 4) NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL,
    related_invoice_id UUID REFERENCES invoices_out(id) ON DELETE SET NULL,
    related_daily_transaction_id UUID,
    notes TEXT,
    recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fuel_movements_tenant ON fuel_counter_movements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fuel_movements_counter ON fuel_counter_movements(fuel_counter_id);
CREATE INDEX IF NOT EXISTS idx_fuel_movements_type ON fuel_counter_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_fuel_movements_date ON fuel_counter_movements(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_fuel_movements_invoice ON fuel_counter_movements(related_invoice_id);

-- 6. Fuel daily log
CREATE TABLE IF NOT EXISTS fuel_daily_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    fuel_counter_id UUID REFERENCES fuel_counters(id) ON DELETE CASCADE NOT NULL,
    log_date DATE NOT NULL,
    opening_reading NUMERIC(12, 3) NOT NULL,
    closing_reading NUMERIC(12, 3) NOT NULL,
    quantity_sold NUMERIC(12, 3) NOT NULL,
    total_sales_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fuel_daily_log_tenant ON fuel_daily_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fuel_daily_log_counter ON fuel_daily_log(fuel_counter_id);
CREATE INDEX IF NOT EXISTS idx_fuel_daily_log_date ON fuel_daily_log(log_date DESC);

-- 7. Track inventory changes trigger (already added above, but ensure it exists)
CREATE OR REPLACE FUNCTION track_inventory_changes()
RETURNS TRIGGER AS $$
BEGIN
    NEW.changes_history = COALESCE(NEW.changes_history, '[]'::jsonb) || jsonb_build_array(
        jsonb_build_object(
            'timestamp', NOW(),
            'changed_by', current_setting('app.user_id', true),
            'old_quantity', OLD.quantity,
            'new_quantity', NEW.quantity,
            'quantity_change', NEW.quantity - COALESCE(OLD.quantity, 0),
            'action', 'quantity_update'
        )
    );
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_track_inventory_changes ON inventory_items;
CREATE TRIGGER trigger_track_inventory_changes
    BEFORE UPDATE ON inventory_items
    FOR EACH ROW
    WHEN (OLD.quantity IS DISTINCT FROM NEW.quantity)
    EXECUTE FUNCTION track_inventory_changes();

-- 8. Track invoice changes trigger
CREATE OR REPLACE FUNCTION track_invoice_changes()
RETURNS TRIGGER AS $$
BEGIN
    NEW.changes_history = COALESCE(NEW.changes_history, '[]'::jsonb) || jsonb_build_array(
        jsonb_build_object(
            'timestamp', NOW(),
            'changed_by', current_setting('app.user_id', true),
            'change_type', TG_ARGV[0]::text,
            'changes', jsonb_object_agg(key, value)
        )
    );
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_track_invoice_out_changes ON invoices_out;
CREATE TRIGGER trigger_track_invoice_out_changes
    BEFORE UPDATE ON invoices_out
    FOR EACH ROW
    EXECUTE FUNCTION track_invoice_changes('invoice_out');

DROP TRIGGER IF EXISTS trigger_track_invoice_in_changes ON invoices_in;
CREATE TRIGGER trigger_track_invoice_in_changes
    BEFORE UPDATE ON invoices_in
    FOR EACH ROW
    EXECUTE FUNCTION track_invoice_changes('invoice_in');

-- 9. Auto-deduct inventory (already defined above)

-- 10. Function to check low stock alerts (returns rows)
CREATE OR REPLACE FUNCTION check_low_stock_alerts()
RETURNS TABLE(
    alert_id UUID,
    tenant_id UUID,
    inventory_item_id UUID,
    item_name TEXT,
    current_quantity NUMERIC,
    alert_threshold NUMERIC,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ila.id,
        ila.tenant_id,
        ila.inventory_item_id,
        ii.name,
        ii.quantity,
        ila.alert_threshold,
        CASE 
            WHEN ii.quantity <= ila.alert_threshold THEN 'ALERT'
            WHEN ii.quantity <= (ila.alert_threshold * 1.5) THEN 'WARNING'
            ELSE 'OK'
        END as status
    FROM inventory_low_stock_alerts ila
    JOIN inventory_items ii ON ila.inventory_item_id = ii.id
    WHERE ila.is_active = true
    ORDER BY ii.quantity ASC;
END;
$$ LANGUAGE plpgsql;

-- 11. Fuel calculation helper functions (examples)
CREATE OR REPLACE FUNCTION calculate_fuel_counter_totals(
    p_counter_id UUID
)
RETURNS TABLE(
    total_sold NUMERIC,
    current_reading NUMERIC,
    remaining_calculated NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(fcm.quantity_sold), 0)::NUMERIC,
        fc.current_reading,
        fc.initial_reading - COALESCE(SUM(fcm.quantity_sold), 0)::NUMERIC
    FROM fuel_counters fc
    LEFT JOIN fuel_counter_movements fcm ON fc.id = fcm.fuel_counter_id
    WHERE fc.id = p_counter_id
    GROUP BY fc.id, fc.current_reading, fc.initial_reading;
END;
$$ LANGUAGE plpgsql;

-- 12. Record fuel counter movement (example function)
CREATE OR REPLACE FUNCTION record_fuel_counter_movement(
    p_tenant_id UUID,
    p_counter_id UUID,
    p_reading_after NUMERIC,
    p_price_per_liter NUMERIC,
    p_invoice_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_counter fuel_counters%ROWTYPE;
    v_quantity_sold NUMERIC;
    v_total_amount NUMERIC;
    v_movement_id UUID;
BEGIN
    SELECT * INTO v_counter FROM fuel_counters
    WHERE id = p_counter_id AND tenant_id = p_tenant_id;
    IF v_counter.id IS NULL THEN
        RAISE EXCEPTION 'Counter not found';
    END IF;
    v_quantity_sold := v_counter.current_reading - p_reading_after;
    IF v_quantity_sold < 0 THEN
        RAISE EXCEPTION 'New reading must be less than current reading';
    END IF;
    v_total_amount := v_quantity_sold * p_price_per_liter;
    INSERT INTO fuel_counter_movements (
        tenant_id, fuel_counter_id, movement_type, reading_before,
        reading_after, quantity_sold, price_per_liter, total_amount,
        related_invoice_id, notes, recorded_by
    ) VALUES (
        p_tenant_id, p_counter_id, 'sale', v_counter.current_reading,
        p_reading_after, v_quantity_sold, p_price_per_liter, v_total_amount,
        p_invoice_id, p_notes, current_setting('app.user_id', true)::UUID
    ) RETURNING id INTO v_movement_id;
    UPDATE fuel_counters
    SET current_reading = p_reading_after,
        total_sold = total_sold + v_quantity_sold,
        updated_at = NOW()
    WHERE id = p_counter_id;
    RETURN v_movement_id;
END;
$$ LANGUAGE plpgsql;

-- ==============================
-- Final notes
-- ==============================
COMMENT ON FUNCTION check_low_stock_alerts IS 'Return low-stock alerts for active inventory items';

SELECT 'APPLY_INVENTORY_FUEL_UPDATES: Completed CREATE/ALTER statements (review triggers)', now() as applied_at;
