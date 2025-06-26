-- Habilitar Row Level Security (RLS) para todas las tablas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE missing_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE returned_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_history ENABLE ROW LEVEL SECURITY;

-- Crear políticas para permitir acceso a todos los usuarios autenticados
-- (En un entorno de producción, podrías querer políticas más restrictivas)

CREATE POLICY "Allow all operations for authenticated users" ON users
  FOR ALL USING (true);

CREATE POLICY "Allow all operations for authenticated users" ON orders
  FOR ALL USING (true);

CREATE POLICY "Allow all operations for authenticated users" ON products
  FOR ALL USING (true);

CREATE POLICY "Allow all operations for authenticated users" ON missing_products
  FOR ALL USING (true);

CREATE POLICY "Allow all operations for authenticated users" ON returned_products
  FOR ALL USING (true);

CREATE POLICY "Allow all operations for authenticated users" ON order_history
  FOR ALL USING (true);
