ALTER TABLE contacts ADD COLUMN IF NOT EXISTS tipo text DEFAULT 'cliente';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS vehicle_type text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS supplier_type text;

UPDATE contacts SET tipo = 'cliente' WHERE tipo IS NULL;
