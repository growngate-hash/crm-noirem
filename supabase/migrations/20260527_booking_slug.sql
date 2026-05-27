-- Agregar columna slug a business_settings para URLs de booking por tenant
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Función para generar slug desde un texto
CREATE OR REPLACE FUNCTION public.generate_slug(input_text TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(input_text, '[^a-zA-Z0-9\s-]', '', 'g'),
        '\s+', '-', 'g'
      ),
      '-+', '-', 'g'
    )
  );
$$;

-- Asignar slug a Noirem desde su business_name actual
UPDATE public.business_settings
  SET slug = public.generate_slug(business_name)
  WHERE user_id = 'afe5c9b1-d3b4-4617-80c0-73743cf92b33'
  AND slug IS NULL;

-- Asignar slug al cliente de prueba
UPDATE public.business_settings
  SET slug = public.generate_slug(business_name)
  WHERE slug IS NULL;