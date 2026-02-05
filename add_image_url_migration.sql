-- Add image_url column to activity_logs table
-- This column stores the URL of attached images (e.g., generated 3D images from Supabase Storage)

ALTER TABLE activity_logs 
ADD COLUMN IF NOT EXISTS image_url TEXT NULL;

COMMENT ON COLUMN activity_logs.image_url IS '3D 이미지 등의 첨부 이미지 URL (Supabase Storage)';

-- Create index for faster queries when filtering by logs with images
CREATE INDEX IF NOT EXISTS idx_activity_logs_with_images 
    ON activity_logs(agent_id, timestamp DESC) 
    WHERE image_url IS NOT NULL;
