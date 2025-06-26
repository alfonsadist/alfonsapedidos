-- Habilitar Row Level Security en todas las tablas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE missing_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE returned_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_history ENABLE ROW LEVEL SECURITY;

-- Crear políticas para permitir acceso completo (para desarrollo)
-- En producción, estas políticas deberían ser más restrictivas

-- Políticas para usuarios
DROP POLICY IF EXISTS "Allow all operations on users" ON users;
CREATE POLICY "Allow all operations on users" ON users FOR ALL USING (true);

-- Políticas para pedidos
DROP POLICY IF EXISTS "Allow all operations on orders" ON orders;
CREATE POLICY "Allow all operations on orders" ON orders FOR ALL USING (true);

-- Políticas para productos
DROP POLICY IF EXISTS "Allow all operations on products" ON products;
CREATE POLICY "Allow all operations on products" ON products FOR ALL USING (true);

-- Políticas para productos faltantes
DROP POLICY IF EXISTS "Allow all operations on missing_products" ON missing_products;
CREATE POLICY "Allow all operations on missing_products" ON missing_products FOR ALL USING (true);

-- Políticas para productos devueltos
DROP POLICY IF EXISTS "Allow all operations on returned_products" ON returned_products;
CREATE POLICY "Allow all operations on returned_products" ON returned_products FOR ALL USING (true);

-- Políticas para historial
DROP POLICY IF EXISTS "Allow all operations on order_history" ON order_history;
CREATE POLICY "Allow all operations on order_history" ON order_history FOR ALL USING (true);
