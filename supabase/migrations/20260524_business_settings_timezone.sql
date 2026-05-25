-- Add configurable timezone to business_settings
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Asia/Dubai';

-- Ensure existing Noirem row is explicitly set (idempotent)
UPDATE public.business_settings
  SET timezone = 'Asia/Dubai'
  WHERE timezone IS NULL OR timezone = '';