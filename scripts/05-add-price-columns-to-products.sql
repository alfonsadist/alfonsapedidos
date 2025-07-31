-- Añadir columnas de precios a la tabla de productos
ALTER TABLE products
ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10, 2);

-- Añadir columna de total a la tabla de pedidos
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10, 2);
