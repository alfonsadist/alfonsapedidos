-- Insertar usuarios del sistema (solo si no existen)
INSERT INTO users (name, role) VALUES 
  ('Vale', 'vale'),
  ('Lucho', 'armador'),
  ('Franco', 'armador'),
  ('Negro', 'armador')
ON CONFLICT (name) DO NOTHING;
