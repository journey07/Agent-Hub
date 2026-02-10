-- Add product_type column to activity_logs table
-- This column stores the product type: electronic, refrigerator, steel

ALTER TABLE activity_logs
ADD COLUMN IF NOT EXISTS product_type TEXT NULL;

COMMENT ON COLUMN activity_logs.product_type IS '제품 타입: electronic(전자식), refrigerator(냉장), steel(철제)';

-- Create index for faster queries when filtering by product type
CREATE INDEX IF NOT EXISTS idx_activity_logs_product_type
    ON activity_logs(agent_id, product_type, timestamp DESC)
    WHERE product_type IS NOT NULL;
