require('dotenv').config();

const express = require('express');
const { Pool } = require('pg');

const app = express();
const port = Number(process.env.PORT || 3000);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

app.use(express.json({ limit: '100kb' }));

const seedProducts = [
  ['Café de Chiapas 500 g', 'Café de altura, tostado medio.', 189, 35, 'Abarrotes'],
  ['Miel de abeja 350 g', 'Miel natural de producción local.', 125.5, 22, 'Abarrotes'],
  ['Taza de cerámica', 'Taza reutilizable de 350 ml.', 149, 18, 'Hogar'],
  ['Libreta kraft', 'Libreta tamaño A5 con 120 hojas.', 89, 40, 'Papelería'],
  ['Termo acero inoxidable', 'Termo de 750 ml con tapa hermética.', 329, 12, 'Hogar'],
  ['Bolsa de algodón', 'Bolsa reutilizable con asas reforzadas.', 79, 50, 'Accesorios'],
  ['Chocolate artesanal 70%', 'Barra de cacao mexicano de 100 g.', 68, 28, 'Abarrotes'],
  ['Vela aromática', 'Vela de cera vegetal con aroma a cítricos.', 159, 15, 'Hogar'],
  ['Botella deportiva', 'Botella reutilizable de 600 ml.', 199, 24, 'Accesorios'],
  ['Set de lápices', 'Paquete de 12 lápices de grafito HB.', 55, 60, 'Papelería'],
];

async function initializeDatabase() {
  await pool.query(`
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
  `);

  const count = await pool.query('SELECT COUNT(*)::int AS count FROM products');
  if (count.rows[0].count === 0) {
    for (const product of seedProducts) {
      await pool.query(
        'INSERT INTO products (name, description, price, stock, category) VALUES ($1, $2, $3, $4, $5)',
        product,
      );
    }
  }
}

function validateProduct(body, { partial = false } = {}) {
  const fields = ['name', 'description', 'price', 'stock', 'category'];
  const errors = [];
  for (const field of fields) {
    if (!partial && body[field] === undefined) errors.push(`Falta el campo ${field}.`);
  }
  if (body.name !== undefined && (typeof body.name !== 'string' || !body.name.trim())) {
    errors.push('name debe ser texto y no estar vacío.');
  }
  if (body.description !== undefined && typeof body.description !== 'string') {
    errors.push('description debe ser texto.');
  }
  if (body.category !== undefined && (typeof body.category !== 'string' || !body.category.trim())) {
    errors.push('category debe ser texto y no estar vacía.');
  }
  if (body.price !== undefined && (!Number.isFinite(Number(body.price)) || Number(body.price) < 0)) {
    errors.push('price debe ser un número mayor o igual a 0.');
  }
  if (body.stock !== undefined && (!Number.isInteger(Number(body.stock)) || Number(body.stock) < 0)) {
    errors.push('stock debe ser un entero mayor o igual a 0.');
  }
  return errors;
}

function notFound(res) {
  return res.status(404).json({ error: 'Producto no encontrado.' });
}

app.get('/', (_req, res) => {
  res.json({
    name: 'API de catálogo de productos',
    status: 'ok',
    endpoints: {
      health: '/health',
      products: '/api/products',
    },
  });
});

app.get('/favicon.ico', (_req, res) => res.status(204).end());

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch {
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

app.get('/api/products', async (req, res, next) => {
  try {
    const search = String(req.query.search || '').trim();
    const category = String(req.query.category || '').trim();
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 100, 1), 100);
    const offset = Math.max(Number.parseInt(req.query.offset, 10) || 0, 0);
    const result = await pool.query(
      `SELECT * FROM products
       WHERE ($1 = '' OR name ILIKE '%' || $1 || '%' OR description ILIKE '%' || $1 || '%')
         AND ($2 = '' OR category ILIKE $2)
       ORDER BY id LIMIT $3 OFFSET $4`,
      [search, category, limit, offset],
    );
    res.json({ data: result.rows, pagination: { limit, offset, returned: result.rowCount } });
  } catch (error) {
    next(error);
  }
});

app.get('/api/products/:id', async (req, res, next) => {
  try {
    if (!/^\d+$/.test(req.params.id)) return notFound(res);
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (!result.rowCount) return notFound(res);
    res.json({ data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

app.post('/api/products', async (req, res, next) => {
  const errors = validateProduct(req.body);
  if (errors.length) return res.status(400).json({ error: 'Datos inválidos.', details: errors });
  try {
    const { name, description = '', price, stock, category } = req.body;
    const result = await pool.query(
      `INSERT INTO products (name, description, price, stock, category)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name.trim(), description, Number(price), Number(stock), category.trim()],
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

app.put('/api/products/:id', async (req, res, next) => {
  if (!/^\d+$/.test(req.params.id)) return notFound(res);
  const errors = validateProduct(req.body, { partial: true });
  if (errors.length) return res.status(400).json({ error: 'Datos inválidos.', details: errors });
  const allowed = ['name', 'description', 'price', 'stock', 'category'];
  const entries = Object.entries(req.body).filter(([key]) => allowed.includes(key));
  if (!entries.length) return res.status(400).json({ error: 'Envía al menos un campo para actualizar.' });

  try {
    const assignments = entries.map(([key], index) => `${key} = $${index + 1}`);
    const values = entries.map(([key, value]) => {
      if (key === 'name' || key === 'category') return value.trim();
      if (key === 'price' || key === 'stock') return Number(value);
      return value;
    });
    values.push(req.params.id);
    const result = await pool.query(
      `UPDATE products SET ${assignments.join(', ')}, updated_at = NOW()
       WHERE id = $${values.length} RETURNING *`,
      values,
    );
    if (!result.rowCount) return notFound(res);
    res.json({ data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/products/:id', async (req, res, next) => {
  try {
    if (!/^\d+$/.test(req.params.id)) return notFound(res);
    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rowCount) return notFound(res);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

async function start() {
  await initializeDatabase();
  app.listen(port, '0.0.0.0', () => console.log(`API disponible en http://localhost:${port}`));
}

start().catch((error) => {
  console.error('No se pudo iniciar la API:', error);
  process.exit(1);
});

process.on('SIGTERM', async () => {
  await pool.end();
  process.exit(0);
});
