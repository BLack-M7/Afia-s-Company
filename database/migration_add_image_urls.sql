-- Migration: Add image_urls column to products table
-- This migration adds support for multiple product images

-- Add image_urls column as JSONB array
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS image_urls JSONB DEFAULT '[]'::jsonb;

-- Migrate existing image_url data to image_urls array
-- If image_url exists and image_urls is empty, populate it
UPDATE public.products 
SET image_urls = CASE 
    WHEN image_url IS NOT NULL AND image_url != '' THEN 
        jsonb_build_array(image_url)
    ELSE 
        '[]'::jsonb
END
WHERE image_urls = '[]'::jsonb OR image_urls IS NULL;

-- Create index for better query performance on image_urls
CREATE INDEX IF NOT EXISTS idx_products_image_urls ON public.products USING GIN (image_urls);

