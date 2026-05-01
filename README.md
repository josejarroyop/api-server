# Middleware de Catálogo y Precios

Microservicio en **Node.js + Express** que consume el catálogo público de [DummyJSON](https://dummyjson.com/), aplica reglas de negocio (impuesto y bandera de bajo stock) y expone un endpoint propio con los productos transformados y ordenados por precio descendente.

## Tabla de contenidos

- [Características](#características)
- [Stack](#stack)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Requisitos previos](#requisitos-previos)
- [Configuración](#configuración)
- [Ejecución local](#ejecución-local)
- [Ejecución con Docker](#ejecución-con-docker)
- [Endpoints](#endpoints)
- [Reglas de negocio](#reglas-de-negocio)
- [Manejo de errores](#manejo-de-errores)
- [Variables de entorno](#variables-de-entorno)

## Características

- Consume `https://dummyjson.com/products/search?q=phone`.
- Extrae únicamente los campos: `id`, `title`, `price`, `stock`, `brand`, `category`.
- Calcula el precio final aplicando un impuesto configurable (16% por defecto).
- Genera el campo booleano `isLowStock` cuando `stock` es menor al umbral configurado.
- Devuelve los productos ordenados por `price` de mayor a menor.
- Manejo de errores ante fallos o respuestas incompletas de la API externa.
- Configuración por variables de entorno.
- Listo para correr en Docker.

## Stack

- Node.js 20
- Express 5
- Axios
- dotenv
- cors
- Docker / Docker Compose

## Estructura del proyecto

```
.
├── src/
│   ├── app.js                      # Punto de entrada y rutas
│   └── services/
│       └── productService.js       # Consumo y transformación del catálogo
├── .dockerignore
├── .env.example
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── package.json
└── README.md
```

## Requisitos previos

- Node.js 20 o superior
- npm 10 o superior
- (Opcional) Docker 24+ y Docker Compose

## Configuración

Copia el archivo de ejemplo y ajusta los valores si es necesario:

```bash
cp .env.example .env
```

## Ejecución local

```bash
# Instalar dependencias
npm install

# Modo producción
npm start

# Modo desarrollo (con recarga automática)
npm run dev
```

El servicio quedará disponible en `http://localhost:3000`.

## Ejecución con Docker

```bash
# Construir y levantar el contenedor
docker compose up --build

# En segundo plano
docker compose up -d --build

# Detener
docker compose down
```

## Endpoints

### `GET /api/products`

Devuelve el catálogo transformado y ordenado por `price` descendente.

**Respuesta exitosa (200):**

```json
{
  "count": 4,
  "data": [
    {
      "id": 2,
      "title": "iPhone X",
      "price": 1042.84,
      "stock": 5,
      "brand": "Apple",
      "category": "smartphones",
      "isLowStock": true
    }
  ]
}
```

**Ejemplo de uso:**

```bash
curl http://localhost:3000/api/products
```

### `GET /health`

Healthcheck simple.

```bash
curl http://localhost:3000/health
# { "status": "ok" }
```

## Reglas de negocio

| Campo         | Regla                                                              |
| ------------- | ------------------------------------------------------------------ |
| `price`       | `price_original * (1 + TAX_RATE)` redondeado a 2 decimales         |
| `isLowStock`  | `true` si `stock < LOW_STOCK_THRESHOLD`, de lo contrario `false`   |
| `brand`       | `'NA'` cuando la API externa no devuelve marca                     |
| Orden         | Productos ordenados por `price` final, de mayor a menor            |

## Manejo de errores

Cuando la API externa falla, devuelve datos incompletos o se agota el timeout, el endpoint responde:

```json
{
  "error": "External API Error",
  "message": "No se pudo obtener o procesar el catálogo.",
  "detail": "Mensaje específico del error"
}
```

Estado HTTP: `502 Bad Gateway`.

Casos contemplados:

- La API externa no responde o tarda más de 8 segundos (timeout).
- La respuesta no contiene la propiedad `products` esperada.
- Error de red o DNS.
- Productos con campos faltantes (se aplican valores por defecto).

## Variables de entorno

| Variable              | Descripción                                  | Default                                                |
| --------------------- | -------------------------------------------- | ------------------------------------------------------ |
| `PORT`                | Puerto donde corre el servicio               | `3000`                                                 |
| `EXTERNAL_API_URL`    | URL del catálogo externo                     | `https://dummyjson.com/products/search?q=phone`        |
| `TAX_RATE`            | Impuesto aplicado al precio (0.16 = 16%)     | `0.16`                                                 |
| `LOW_STOCK_THRESHOLD` | Umbral para marcar `isLowStock`              | `10`                                                   |
