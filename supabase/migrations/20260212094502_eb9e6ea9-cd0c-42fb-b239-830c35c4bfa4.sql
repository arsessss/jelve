-- Add image_size column to akhbar table for choosing between small, medium, large image display
ALTER TABLE public.akhbar ADD COLUMN image_size text NOT NULL DEFAULT 'large';
