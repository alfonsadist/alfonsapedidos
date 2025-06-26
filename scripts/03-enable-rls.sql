-- Habilitar Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE missing_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE returned_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_history ENABLE ROW LEVEL SECURITY;

-- Crear políticas para permitir acceso público (para desarrollo)
CREATE POLICY "Allow all operations" ON users FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON orders FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON products FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON missing_products FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON returned_products FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON order_history FOR ALL USING (true);
