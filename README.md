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
- [Endpoints](#endpoints)
- [Reglas de negocio](#reglas-de-negocio)
- [Manejo de errores](#manejo-de-errores)
- [Variables de entorno](#variables-de-entorno)

## Caracteristicas

- Consume `https://dummyjson.com/products/search?q=phone`.
- Extrae unicamente los campos: `id`, `title`, `price`, `stock`, `brand`, `category`.
- Calcula el precio final aplicando un impuesto configurable (16% por defecto).
- Genera el campo booleano `isLowStock` cuando `stock` es menor al umbral configurado.
- Devuelve los productos ordenados por `price` de mayor a menor.
- Manejo centralizado de errores con clase `AppError` y codigos semanticos (`EXTERNAL_API_TIMEOUT`, `INVALID_API_RESPONSE`, etc.).
- Configuracion por variables de entorno con validacion al arranque.
- Listo para correr en Docker.

## Stack

- Node.js 20
- Express 5
- Axios
- dotenv
- cors
- Docker / Docker Compose

## Arquitectura

El proyecto esta estructurado en capas con responsabilidades claras:

| Capa            | Responsabilidad                                                             |
| --------------- | --------------------------------------------------------------------------- |
| **routes**      | Mapean URL + metodo HTTP a un metodo del controller                         |
| **controllers** | Reciben req/res, llaman al service y formatean la respuesta HTTP            |
| **services**    | Logica de negocio: consumo de la API externa y aplicacion de reglas         |
| **dtos**        | Definen el shape de salida y aislan el modelo interno del de la API externa |
| **utils**       | Errores tipados (`AppError`, `errors.js`) y middlewares (`errorHandler`)    |

Flujo de una request:

```
HTTP --> routes --> controller --> service --> DTO --> response
                                       ^
                                       v
                                  API externa
```

## Estructura del proyecto

```
.
|-- src/
|   |-- app.js                       # Punto de entrada y middlewares globales
|   |-- controllers/
|   |   `-- productController.js     # Orquesta req/res del recurso products
|   |-- dtos/
|   |   `-- productDTO.js            # Shape de salida + reglas por producto
|   |-- routes/
|   |   `-- productRoutes.js         # Declaracion de endpoints
|   |-- services/
|   |   `-- productService.js        # Consumo y procesamiento del catalogo
|   `-- utils/
|       |-- AppError.js              # Clase base de error operacional
|       |-- errorHandler.js          # Middlewares: errorHandler, asyncHandler, notFoundHandler
|       `-- errors.js                # NotFoundError, ValidationError, etc.
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
| Filtrado      | Productos sin `id` o `price` se descartan silenciosamente          |

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
| 504  | `EXTERNAL_API_TIMEOUT`     | La API externa tardo mas de 8 segundos en responder    |
| 500  | `PRODUCT_SERVICE_ERROR`    | Error inesperado durante el procesamiento              |
| 500  | `INTERNAL_ERROR`           | Error inesperado fuera del service                     |

Toda la cadena de errores se canaliza vias `asyncHandler` -> `errorHandler` (middleware central) y nunca crashea el proceso.

## Variables de entorno

| Variable              | Descripcion                                  | Default                                                |
| --------------------- | -------------------------------------------- | ------------------------------------------------------ |
| `PORT`                | Puerto donde corre el servicio               | `3000`                                                 |
| `EXTERNAL_API_URL`    | URL del catalogo externo                     | `https://dummyjson.com/products/search?q=phone`        |
| `TAX_RATE`            | Impuesto aplicado al precio (0.16 = 16%)     | `0.16`                                                 |
| `LOW_STOCK_THRESHOLD` | Umbral para marcar `isLowStock`              | `10`                                                   |

`EXTERNAL_API_URL` y `TAX_RATE` se validan al arranque: si faltan o son invalidos, el proceso falla rapido con un mensaje claro.
