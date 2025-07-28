-- Eliminar función existente si existe
DROP FUNCTION IF EXISTS public.update_updated_at_column();

-- Crear función segura para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- Crear tabla de usuarios
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('vale', 'armador')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de pedidos
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    client_name TEXT NOT NULL,
    client_address TEXT,
    status TEXT NOT NULL DEFAULT 'en_armado' CHECK (status IN (
        'en_armado', 'armado', 'armado_controlado', 'facturado', 
        'factura_controlada', 'en_transito', 'entregado', 'pagado'
    )),
    payment_method TEXT CHECK (payment_method IN ('efectivo', 'transferencia')),
    is_paid BOOLEAN DEFAULT FALSE,
    armed_by TEXT,
    controlled_by TEXT,
    awaiting_payment_verification BOOLEAN DEFAULT FALSE,
    initial_notes TEXT,
    currently_working_by TEXT,
    working_start_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de productos
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    code TEXT,
    name TEXT NOT NULL,
    quantity DECIMAL NOT NULL,
    original_quantity DECIMAL,
    is_checked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de productos faltantes
CREATE TABLE IF NOT EXISTS public.missing_products (
    id SERIAL PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    code TEXT,
    quantity DECIMAL NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de productos devueltos
CREATE TABLE IF NOT EXISTS public.returned_products (
    id SERIAL PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    code TEXT,
    quantity DECIMAL NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de historial de pedidos
CREATE TABLE IF NOT EXISTS public.order_history (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    user_name TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crear triggers para updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);
CREATE INDEX IF NOT EXISTS idx_products_order_id ON public.products(order_id);
CREATE INDEX IF NOT EXISTS idx_missing_products_order_id ON public.missing_products(order_id);
CREATE INDEX IF NOT EXISTS idx_returned_products_order_id ON public.returned_products(order_id);
CREATE INDEX IF NOT EXISTS idx_order_history_order_id ON public.order_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_history_created_at ON public.order_history(created_at);

-- Agregar constraint único para evitar usuarios duplicados
ALTER TABLE public.users ADD CONSTRAINT unique_user_name UNIQUE (name);
