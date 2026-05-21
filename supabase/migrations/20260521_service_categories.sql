CREATE TABLE IF NOT EXISTS service_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  icon text,
  color text DEFAULT '#c9a84c',
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_only" ON service_categories
  FOR ALL TO authenticated USING (true);

INSERT INTO service_categories (name, description, color, sort_order) VALUES
('Detailing',       'Servicios completos de detailing', '#c9a84c', 1),
('Glass Polishing', 'Pulido y tratamiento de vidrios',  '#3b82f6', 2),
('Car Wash',        'Servicios de lavado',              '#22c55e', 3),
('Ceramic Coating', 'Protección cerámica',              '#8b5cf6', 4)
ON CONFLICT (name) DO NOTHING;

UPDATE services
SET category = 'Detailing'
WHERE name ILIKE '%detailing%luxury%';