-- Eliminar tablas existentes si existen (para evitar duplicados)
DROP TABLE IF EXISTS order_history CASCADE;
DROP TABLE IF EXISTS returned_products CASCADE;
DROP TABLE IF EXISTS missing_products CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Crear tabla de usuarios
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('vale', 'armador')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de pedidos
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  client_name TEXT NOT NULL,
  client_address TEXT,
  status TEXT NOT NULL CHECK (status IN ('en_armado', 'armado', 'armado_controlado', 'facturado', 'factura_controlada', 'en_transito', 'entregado', 'pagado')),
  payment_method TEXT CHECK (payment_method IN ('efectivo', 'transferencia')),
  is_paid BOOLEAN DEFAULT FALSE,
  armed_by TEXT,
  controlled_by TEXT,
  awaiting_payment_verification BOOLEAN DEFAULT FALSE,
  initial_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de productos
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  code TEXT,
  name TEXT NOT NULL,
  quantity DECIMAL NOT NULL,
  original_quantity DECIMAL,
  is_checked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de productos faltantes
CREATE TABLE missing_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  code TEXT,
  quantity DECIMAL NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de productos devueltos
CREATE TABLE returned_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  code TEXT,
  quantity DECIMAL NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de historial
CREATE TABLE order_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  user_name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejor rendimiento
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_products_order_id ON products(order_id);
CREATE INDEX idx_missing_products_order_id ON missing_products(order_id);
CREATE INDEX idx_returned_products_order_id ON returned_products(order_id);
CREATE INDEX idx_order_history_order_id ON order_history(order_id);
