# API de catálogo de productos

API REST en Node.js y PostgreSQL. Incluye una base de datos local en Docker con volumen persistente, diez productos iniciales y un flujo importable para n8n.

## Requisitos

- Docker Desktop con Docker Compose
- Node.js 20 o posterior
- Visual Studio Code

## Ejecutar localmente con Docker

1. Abre esta carpeta en VS Code.
2. En la terminal integrada ejecuta `docker compose up -d --build`. Esto inicia PostgreSQL y la API Node.js en Docker.
3. Abre `http://localhost:3000/`, `http://localhost:3000/health` y `http://localhost:3000/api/products`.

El volumen `postgres_data` conserva los datos cuando detienes y vuelves a iniciar Docker. El SQL inicial se ejecuta la primera vez que se crea el volumen. La API también crea la tabla y carga los diez productos cuando la tabla está vacía. Al editar el código desde VS Code, aplica los cambios reconstruyendo el servicio con `docker compose up -d --build api`.

### Ejecutar la API directamente en Node.js desde VS Code

Si quieres usar `npm run dev` para desarrollo, deja PostgreSQL en Docker y ejecuta Node en tu equipo:

```powershell
docker compose stop api
docker compose up -d postgres
npm install
npm run dev
```

El archivo `.env` debe apuntar a `127.0.0.1:5433`, como en `.env.example`. Para volver al modo con la API en Docker, usa `docker compose up -d --build`.

La contraseña del Compose es solo para desarrollo local. Cámbiala antes de exponer la base de datos fuera de tu equipo. PostgreSQL se publica en el puerto local `5433` para evitar conflictos con una instalación local que use el puerto `5432`.

### Si aparece `password authentication failed`

Desde la carpeta del proyecto, sincroniza la contraseña del usuario PostgreSQL con la configuración local:

```powershell
docker compose exec -T postgres psql -U catalogo -d catalogo_productos -c "ALTER USER catalogo WITH PASSWORD 'catalogo_local_2026';"
```

Después, detén la API con `Ctrl+C` si sigue abierta y vuelve a iniciarla con `npm run dev`. Este comando conserva el volumen y los datos.

## Endpoints

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/health` | Estado de la API y conexión a PostgreSQL |
| GET | `/api/products` | Lista productos; admite `search`, `category`, `limit` y `offset` |
| GET | `/api/products/:id` | Consulta un producto |
| POST | `/api/products` | Crea un producto |
| PUT | `/api/products/:id` | Actualiza uno o más campos |
| DELETE | `/api/products/:id` | Elimina un producto |

Ejemplo para crear un producto:

```json
{
  "name": "Audífonos",
  "description": "Audífonos inalámbricos",
  "price": 599.9,
  "stock": 8,
  "category": "Electrónica"
}
```

Ejemplos de consulta: `/api/products?search=cafe`, `/api/products?category=Hogar&limit=5`.

## n8n

1. En n8n, importa `n8n/flujo-productos-correo.json`.
2. Si n8n corre en Docker y la API corre en tu equipo, la URL inicial `http://host.docker.internal:3000/api/products` permite que el contenedor de n8n alcance al host. Si n8n corre directamente en tu equipo, usa `http://localhost:3000/api/products`. Si n8n está en la nube, usa `https://TU-API.onrender.com/api/products` después del despliegue.
3. En **Enviar correo por Gmail**, selecciona o crea una credencial de Gmail. El archivo no contiene credenciales.
4. En el nodo **Send a message**, reemplaza `REEMPLAZA_CON_TU_CORREO` por la dirección destinataria y selecciona tus credenciales de Gmail. Ejecuta el flujo manualmente para consultar los productos, preparar la tabla HTML y enviar el resumen.

El nodo HTTP Request también acepta filtros de la API, por ejemplo `category=Hogar` o `search=café`.

## Git y Render

El archivo `render.yaml` define la API Node y una base de datos PostgreSQL administrada en Render. Render necesita que el repositorio esté en un proveedor Git conectado a tu cuenta. Después de subir este proyecto:

1. En Render, crea un **Blueprint** desde el repositorio.
2. Revisa el plan y la región de la base antes de aplicar el Blueprint; Render puede cobrar según el plan elegido.
3. Aplica el Blueprint. Render configura `DATABASE_URL` para la API.
4. Cuando termine el despliegue, verifica `/health` y configura esa URL en el flujo de n8n.

La base de Docker y su volumen son para desarrollo local. En Render, la API usa la base administrada definida por el Blueprint.
