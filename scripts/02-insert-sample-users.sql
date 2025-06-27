-- Limpiar usuarios existentes
DELETE FROM users;

-- Insertar usuarios del sistema
INSERT INTO users (name, role) VALUES 
  ('Vale', 'vale'),
  ('Lucho', 'armador'),
  ('Franco', 'armador'),
  ('Negro', 'armador');
