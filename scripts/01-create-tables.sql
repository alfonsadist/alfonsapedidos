-- Eliminar tablas existentes para evitar conflictos
DROP TABLE IF EXISTS order_history CASCADE;
DROP TABLE IF EXISTS returned_products CASCADE;
DROP TABLE IF EXISTS missing_products CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Crear tabla de usuarios con constraint UNIQUE
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('vale', 'armador')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de pedidos
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  client_name TEXT NOT NULL,
  client_address TEXT,
  status TEXT NOT NULL DEFAULT 'en_armado' CHECK (status IN ('en_armado', 'armado', 'armado_controlado', 'facturado', 'factura_controlada', 'en_transito', 'entregado', 'pagado')),
  payment_method TEXT CHECK (payment_method IN ('efectivo', 'transferencia')),
  is_paid BOOLEAN DEFAULT FALSE,
  armed_by TEXT,
  controlled_by TEXT,
  awaiting_payment_verification BOOLEAN DEFAULT FALSE,
  initial_notes TEXT,
  currently_working_by TEXT,
  working_start_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de productos
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  code TEXT,
  name TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  original_quantity DECIMAL(10,2),
  is_checked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de productos faltantes
CREATE TABLE IF NOT EXISTS missing_products (
  id SERIAL PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  code TEXT,
  quantity DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de productos devueltos
CREATE TABLE IF NOT EXISTS returned_products (
  id SERIAL PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  code TEXT,
  quantity DECIMAL(10,2) NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de historial
CREATE TABLE IF NOT EXISTS order_history (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  user_name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_currently_working ON orders(currently_working_by);
CREATE INDEX IF NOT EXISTS idx_products_order_id ON products(order_id);
CREATE INDEX IF NOT EXISTS idx_missing_products_order_id ON missing_products(order_id);
CREATE INDEX IF NOT EXISTS idx_returned_products_order_id ON returned_products(order_id);
CREATE INDEX IF NOT EXISTS idx_order_history_order_id ON order_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_history_created_at ON order_history(created_at);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar updated_at en orders
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
