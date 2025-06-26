-- Insertar usuarios del sistema (solo una vez cada uno)
INSERT INTO users (name, role) VALUES 
  ('Vale', 'vale'),
  ('Lucho', 'armador'),
  ('Franco', 'armador'),
  ('Negro', 'armador')
ON CONFLICT (name) DO NOTHING;

-- Verificar que se insertaron correctamente
SELECT name, role FROM users ORDER BY name;
