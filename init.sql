CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    category TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS products_category_idx ON products (category);

INSERT INTO products (name, description, price, stock, category) VALUES
  ('Café de Chiapas 500 g', 'Café de altura, tostado medio.', 189.00, 35, 'Abarrotes'),
  ('Miel de abeja 350 g', 'Miel natural de producción local.', 125.50, 22, 'Abarrotes'),
  ('Taza de cerámica', 'Taza reutilizable de 350 ml.', 149.00, 18, 'Hogar'),
  ('Libreta kraft', 'Libreta tamaño A5 con 120 hojas.', 89.00, 40, 'Papelería'),
  ('Termo acero inoxidable', 'Termo de 750 ml con tapa hermética.', 329.00, 12, 'Hogar'),
  ('Bolsa de algodón', 'Bolsa reutilizable con asas reforzadas.', 79.00, 50, 'Accesorios'),
  ('Chocolate artesanal 70%', 'Barra de cacao mexicano de 100 g.', 68.00, 28, 'Abarrotes'),
  ('Vela aromática', 'Vela de cera vegetal con aroma a cítricos.', 159.00, 15, 'Hogar'),
  ('Botella deportiva', 'Botella reutilizable de 600 ml.', 199.00, 24, 'Accesorios'),
  ('Set de lápices', 'Paquete de 12 lápices de grafito HB.', 55.00, 60, 'Papelería')
ON CONFLICT DO NOTHING;
