# Middleware de Catalogo y Precios

Microservicio en **Node.js + Express** que consume el catalogo publico de [DummyJSON](https://dummyjson.com/), aplica reglas de negocio (impuesto y bandera de bajo stock) y expone un endpoint propio con los productos transformados y ordenados por precio descendente.

## Tabla de contenidos

- [Caracteristicas](#caracteristicas)
- [Stack](#stack)
- [Arquitectura](#arquitectura)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Requisitos previos](#requisitos-previos)
- [Configuracion](#configuracion)
- [Ejecucion local](#ejecucion-local)
- [Ejecucion con Docker](#ejecucion-con-docker)
- [Tests](#tests)
- [Endpoints](#endpoints)
- [Reglas de negocio](#reglas-de-negocio)
- [Manejo de errores](#manejo-de-errores)
- [Variables de entorno](#variables-de-entorno)
- [Mejoras futuras](#mejoras-futuras)

## Caracteristicas

- Consume `https://dummyjson.com/products/search?q=phone`.
- Extrae unicamente los campos: `id`, `title`, `price`, `stock`, `brand`, `category`.
- Calcula el precio final aplicando un impuesto configurable (16% por defecto).
- Genera el campo booleano `isLowStock` cuando `stock` es menor al umbral configurado.
- Devuelve los productos ordenados por `price` de mayor a menor.
- Manejo centralizado de errores con clase `AppError` y codigos semanticos (`EXTERNAL_API_TIMEOUT`, `INVALID_API_RESPONSE`, etc.).
- Configuracion por variables de entorno con validacion al arranque (fail-fast).
- Logging estructurado JSON con `pino`.
- Suite de tests con `jest` + `supertest`.
- Listo para correr en Docker con healthcheck integrado.

## Stack

- Node.js 20
- Express 5
- Axios
- pino (logging estructurado)
- dotenv
- cors
- jest + supertest (testing)
- Docker / Docker Compose

## Arquitectura

El proyecto esta estructurado en capas con responsabilidades claras:

| Capa             | Responsabilidad                                                              |
| ---------------- | ---------------------------------------------------------------------------- |
| **routes**       | Mapean URL + metodo HTTP a un metodo del controller                          |
| **controllers**  | Reciben req/res, llaman al service y formatean la respuesta HTTP             |
| **services**     | Logica de negocio: aplican reglas (impuesto, isLowStock, orden)              |
| **repositories** | Acceso a la fuente de datos externa. Aisla el resto del codigo de DummyJSON  |
| **dtos**         | Definen el shape de salida y construyen modelos a partir de datos crudos     |
| **utils**        | Errores tipados (`AppError`, `errors.js`), middlewares, logger               |

Flujo de una request:

```
HTTP --> routes --> controller --> service --> repository --> API externa
                                       |
                                       v
                                      DTO --> response
```

Si manana se cambia DummyJSON por una BD propia, solo se reemplaza el repository: ni el controller ni el service ni el DTO se enteran.

## Estructura del proyecto

```
.
|-- src/
|   |-- app.js                       # Punto de entrada y middlewares globales
|   |-- controllers/
|   |   `-- productController.js     # Orquesta req/res del recurso products
|   |-- dtos/
|   |   `-- productDTO.js            # Shape de salida + factory desde API externa
|   |-- repositories/
|   |   `-- productRepository.js     # Acceso a DummyJSON (axios)
|   |-- routes/
|   |   `-- productRoutes.js         # Declaracion de endpoints
|   |-- services/
|   |   `-- productService.js        # Reglas de negocio + orden + filtrado
|   `-- utils/
|       |-- AppError.js              # Clase base de error operacional
|       |-- errorHandler.js          # Middlewares: error, async, 404
|       |-- errors.js                # NotFoundError, ValidationError, etc.
|       `-- logger.js                # Logger pino centralizado
|-- tests/
|   `-- products.test.js             # Tests de integracion con supertest
|-- .dockerignore
|-- .env.example
|-- .gitignore
|-- Dockerfile
|-- docker-compose.yml
|-- package.json
`-- README.md
```

## Requisitos previos

- Node.js 20 o superior
- npm 10 o superior
- (Opcional) Docker 24+ y Docker Compose

## Configuracion

Copia el archivo de ejemplo y ajusta los valores si es necesario:

```bash
cp .env.example .env
```

## Ejecucion local

```bash
# Instalar dependencias
npm install

# Modo produccion
npm start

# Modo desarrollo (con recarga automatica)
npm run dev
```

El servicio quedara disponible en `http://localhost:3000`.

## Ejecucion con Docker

```bash
# Construir y levantar el contenedor
docker compose up --build

# En segundo plano
docker compose up -d --build

# Detener
docker compose down
```

El compose incluye un `healthcheck` que pega contra `/health` cada 30 segundos.

## Tests

```bash
npm test
```

Cubre:

- Caso exitoso con orden por price desc, conversion de impuesto, default de `brand`/`category`, calculo de `isLowStock`.
- Respuesta sin campo `products` (502 `INVALID_API_RESPONSE`).
- Timeout del upstream (504 `EXTERNAL_API_TIMEOUT`).
- Upstream con status 500 (502 `EXTERNAL_API_ERROR`).
- Healthcheck.
- Ruta inexistente (404 `NOT_FOUND`).

## Endpoints

### `GET /api/products`

Devuelve el catalogo transformado y ordenado por `price` descendente.

**Respuesta exitosa (200):**

```json
{
  "count": 3,
  "data": [
    {
      "id": 2,
      "title": "iPhone X",
      "price": 1042.84,
      "stock": 5,
      "brand": "Apple",
      "category": "smartphones",
      "isLowStock": true
    },
    {
      "id": 3,
      "title": "Pixel 9",
      "price": 752.84,
      "stock": 0,
      "brand": "NA",
      "category": "smartphones",
      "isLowStock": true
    },
    {
      "id": 1,
      "title": "iPhone 9",
      "price": 636.84,
      "stock": 94,
      "brand": "Apple",
      "category": "smartphones",
      "isLowStock": false
    }
  ]
}
```

**Ejemplo de uso:**

```bash
curl http://localhost:3000/api/products
```

### `GET /health`

Healthcheck simple, util para Docker / Kubernetes.

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
| `category`    | `'NA'` cuando la API externa no devuelve categoria                 |
| Orden         | Productos ordenados por `price` final, de mayor a menor            |
| Filtrado      | Productos sin `id` o `price` validos se descartan silenciosamente  |

## Manejo de errores

Todas las respuestas de error siguen el mismo formato JSON:

```json
{
  "error": "AppError",
  "code": "EXTERNAL_API_TIMEOUT",
  "message": "La API externa no respondio a tiempo",
  "detail": "Timeout despues de 8000ms"
}
```

| HTTP | code                       | Cuando ocurre                                          |
| ---- | -------------------------- | ------------------------------------------------------ |
| 404  | `NOT_FOUND`                | Ruta no registrada                                     |
| 502  | `INVALID_API_RESPONSE`     | La API externa no incluye el arreglo `products`        |
| 502  | `EXTERNAL_API_ERROR`       | La API externa devolvio un status >= 400               |
| 502  | `EXTERNAL_API_UNREACHABLE` | Error de red / DNS                                     |
| 504  | `EXTERNAL_API_TIMEOUT`     | La API externa tardo mas de `REQUEST_TIMEOUT_MS` ms    |
| 500  | `PRODUCT_REPOSITORY_ERROR` | Error inesperado en el repository                      |
| 500  | `INTERNAL_ERROR`           | Error inesperado fuera del flujo controlado            |

Toda la cadena de errores se canaliza via `asyncHandler` -> `errorHandler` (middleware central) y nunca crashea el proceso.

## Variables de entorno

| Variable              | Descripcion                                          | Default                                         |
| --------------------- | ---------------------------------------------------- | ----------------------------------------------- |
| `PORT`                | Puerto donde corre el servicio                       | `3000`                                          |
| `EXTERNAL_API_URL`    | URL del catalogo externo (requerida)                 | `https://dummyjson.com/products/search?q=phone` |
| `TAX_RATE`            | Impuesto aplicado al precio (0.16 = 16%)             | `0.16`                                          |
| `LOW_STOCK_THRESHOLD` | Umbral para marcar `isLowStock`                      | `10`                                            |
| `REQUEST_TIMEOUT_MS`  | Timeout en ms para llamadas a la API externa         | `8000`                                          |
| `LOG_LEVEL`           | Nivel de log (`trace`, `debug`, `info`, `warn`, ...) | `info`                                          |

`EXTERNAL_API_URL`, `TAX_RATE` y `LOW_STOCK_THRESHOLD` se validan al arranque: si faltan o son invalidos, el proceso falla rapido con un mensaje claro.

## Mejoras futuras

Mejoras que no se incluyeron por estar fuera del scope de esta entrega, pero que serian los siguientes pasos para llevar este servicio a produccion:

- **Retry con backoff exponencial** ante errores transitorios del upstream (`axios-retry`).
- **Circuit breaker** (`opossum`) para evitar saturar la API externa cuando esta caida.
- **Rate limiting** del endpoint propio (`express-rate-limit`).
- **Cache** de la respuesta del upstream (Redis o memoria) con TTL corto.
- **Validacion de input** con Zod o Joi cuando se agreguen query params (filtros, paginacion).
- **Observabilidad**: metricas Prometheus, traces OpenTelemetry.
- **Migracion a TypeScript** para tipado estatico de DTOs y respuestas.
