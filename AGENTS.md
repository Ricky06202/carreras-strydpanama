# Proyecto: Carreras STRYD Panama

## Descripción
Plataforma de gestión de carreras pedestres para STRYD Panama. Permite a usuarios registrase en carreras y a administradores gestionar inscripciones, categorías, distancias y más.

## Stack Tecnológico
- **Framework**: Astro (modo server)
- **Adapter**: Cloudflare Pages/Workers
- **Frontend**: React + Material UI + Tailwind CSS
- **Backend**: SonicJS (Hono.js + D1)
- **Runtime**: Node.js

## Estructura del Proyecto
```
carreras-strydpanama/
├── backend/              # SonicJS API + Base de datos
│   ├── src/
│   │   ├── collections/  # Colecciones de SonicJS
│   │   │   ├── races.collection.ts
│   │   │   ├── categories.collection.ts
│   │   │   ├── distances.collection.ts
│   │   │   ├── participants.collection.ts
│   │   │   ├── registration-codes.collection.ts
│   │   │   ├── transactions.collection.ts
│   │   │   └── running-teams.collection.ts
│   │   └── index.ts      # Entry point
│   └── wrangler.jsonc    # Config Cloudflare
│
└── frontend/             # Astro Frontend (solo visual)
    ├── src/
    │   ├── components/   # Componentes React
    │   ├── layouts/      # Layouts Astro
    │   ├── lib/api.ts    # Cliente API SonicJS
    │   └── pages/        # Páginas Astro
    └── astro.config.mjs
```

---

## REGLAS DE DISEÑO - OBLIGATORIAS

### Sistema de Colores - PATRÓN ESTRYD PANAMA

**COLORES PRINCIPALES (USAR SIEMPRE):**
- **Naranja STRYD**: `#FF6B00` (color de acento principal)
- **Naranja Claro**: `#FF8533` (hover, variaciones)
- **Negro**: `#000000` o `#0f0f0f` (fondos oscuros)
- **Blanco**: `#FFFFFF` (texto sobre fondos oscuros, fondos claros)
- **Gris Oscuro**: `#1a1a1a`, `#2d2d2d` (superficies en modo oscuro)
- **Gris Claro**: `#f5f5f5`, `#e0e0e0` (superficies en modo claro)



### Patrones de Color

**PATRÓN 1 - Oscuro (Recomendado para Hero, Header, Footer):**
```
Fondo: Negro (#000000 o #0f0f0f)
Texto: Blanco (#FFFFFF)
Acento: Naranja (#FF6B00)
```

**PATRÓN 2 - Claro (Para contenido, cards):**
```
Fondo: Blanco (#FFFFFF)
Texto: Negro (#000000)
Acento: Naranja (#FF6B00)
```

### Botones - REGLAS ESTRICTAS

**BOTÓN PRIMARIO (Llamada a acción):**
```tsx
<Button sx={{
  bgcolor: '#FF6B00',        // Naranja
  color: '#FFFFFF',          // Blanco
  '&:hover': { bgcolor: '#E55A00' }  // Naranja más oscuro
}}>
  TEXTO DEL BOTÓN
</Button>
```

**BOTÓN SECUNDARIO:**
```tsx
<Button sx={{
  bgcolor: 'transparent',
  color: '#FF6B00',          // Naranja
  border: '2px solid #FF6B00',
  '&:hover': { bgcolor: 'rgba(255, 107, 0, 0.1)' }
}}>
  TEXTO DEL BOTÓN
</Button>
```



### Variables de Color en Código

```typescript
// SIEMPRE usar estas variables:
const STRYD_ORANGE = '#FF6B00';
const STRYD_ORANGE_HOVER = '#E55A00';
const BLACK = '#000000';
const DARK_BG = '#0f0f0f';
const WHITE = '#FFFFFF';
const LIGHT_BG = '#f5f5f5';

```

### Ejemplo Hero Section Correcto

```tsx
<Box sx={{
  background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)',  // Negro
  color: '#FFFFFF',  // Blanco
}}>
  <Typography sx={{ color: '#FF6B00' }}>  // Naranja para énfasis
    TÍTULO DESTACADO
  </Typography>
  <Button sx={{
    bgcolor: '#FF6B00',  // Naranja
    color: '#FFFFFF'     // Blanco
  }}>
    ACCIÓN
  </Button>
</Box>
```

---

## Reglas de Desarrollo

### Despliegue a Producción
**IMPORTANTE**: Para que los cambios se reflejen en producción, **se deben subir a GitHub**.

Pasos para desplegar:
1. Hacer cambios en código
2. `git add .`
3. `git commit -m "mensaje"`
4. `git push`
5. Cloudflare detectará el push y desplegará automáticamente

### Backend SonicJS
- **Admin Panel**: `https://carreras-strydpanama-cms-api.your-subdomain.workers.dev/admin`
- **Credenciales Admin**: `admin@strydpanama.com` / `StrydPanama2026!`
- **API Pública**: `/api/collections/{collection}/content`
- **Coleciones**: races, categories, distances, participants, registration_codes, transactions, running_teams

### Frontend Astro
- **Variable de entorno**: `SONICJS_API_URL` apunta al backend SonicJS
- **Cliente API**: `src/lib/api.ts` contiene las funciones para consumir SonicJS
- **NO usar base de datos directamente** - todo pasa por SonicJS API

### Build y Testing
```bash
# Backend
cd backend && npm run dev

# Frontend  
cd frontend && npm run dev

# Build
npm run build
```

### Errores Comunes
- "Cannot read properties of undefined" - Usar verificaciones defensivas al acceder a propiedades de respuestas API
- CORS errors - Asegurar que SonicJS tenga configurado el origen del frontend
- Colors - USAR SIEMPRE NARANJA (#FF6B00) como color principal de marca.

---

## SonicJS - Reglas de Colecciones

### ⚠️ IMPORTANTE: Campo Title Obligatorio
Las colecciones en SonicJS SIEMPRE deben tener un campo `title` con `required: true`. Sin esto, fallará al guardar contenido.

```typescript
// ✅ CORRECTO - con title obligatorio
export default {
  name: 'races',
  displayName: 'Carreras',
  schema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        title: 'Nombre de la Carrera',
        required: true,  // ← OBLIGATORIO
      },
      description: {
        type: 'textarea',
        title: 'Descripción',
      },
    },
    required: ['title'],  // ← OBLIGATORIO
  },
  managed: true,
  isActive: true,
} satisfies CollectionConfig
```

### Tipos de Campos Soportados
- `string` - Texto corto
- `textarea` - Texto largo
- `number` - Números
- `boolean` - true/false
- `date` - Fechas
- `select` - Opciones (con enum)
- `email` - Email (validado)

### Referencia de Colecciones
- **races** - Carreras
- **categories** - Categorías
- **distances** - Distancias
- **participants** - Participantes
- **registration_codes** - Códigos de registro
- **transactions** - Transacciones
- **running_teams** - Equipos

### URLs de Producción
- **Backend (SonicJS)**: `https://api.carreras.strydpanama.com`
- **Admin Panel**: `https://carreras.strydpanama.com/admin`
- **Frontend (Astro)**: `https://carreras.strydpanama.com`

---

## API de SonicJS

### Endpoints Principales

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/collections` | Listar todas las colecciones |
| GET | `/api/collections/{collection}/content` | Obtener contenido de una colección |
| GET | `/api/content/{id}` | Obtener contenido por ID |
| POST | `/api/content` | Crear contenido (requiere auth) |
| PUT | `/api/content/{id}` | Actualizar contenido (requiere auth) |
| DELETE | `/api/content/{id}` | Eliminar contenido (requiere auth) |
| POST | `/auth/login` | Iniciar sesión |

### Estructura de Respuesta

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Título",
      "status": "published",
      "collectionId": "col-...",
      "data": {
        "title": "Título",
        "description": "...",
        "date": "2026-01-01"
      },
      "created_at": 1774506332395,
      "updated_at": 1774507418597
    }
  ],
  "meta": { ... }
}
```

**IMPORTANTE**: Los datos del contenido están en `data.data` (respuesta.data[0].data)

### Autenticación

1. **Login** - Obtener token:
```bash
curl -X POST https://api.carreras.strydpanama.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"correo@ejemplo.com","password":"contraseña"}'
```

2. **Usar token** en headers:
```
Authorization: Bearer {token}
```

### Variables de Entorno para el Frontend

En **Cloudflare Pages** agregar:
- `SONICJS_API_URL` = `https://api.carreras.strydpanama.com`
- `SONICJS_API_EMAIL` = `admin@strydpanama.com` (usuario con permisos)
- `SONICJS_API_PASSWORD` = `contraseña`

### Ejemplo de Crear Contenido

```bash
TOKEN="eyJhbGci..."

curl -X POST https://api.carreras.strydpanama.com/api/content \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "collectionId": "col-participants-xxx",
    "title": "Juan Pérez",
    "status": "published",
    "data": {
      "title": "Juan Pérez",
      "firstName": "Juan",
      "lastName": "Pérez",
      "email": "juan@test.com"
    }
  }'
```

### Colecciones y sus IDs (Producción)

- **races**: `col-races-fa0146f5`
- **categories**: `col-categories-26d3d058`
- **distances**: `col-distances-93815733`
- **participants**: `col-participants-93d1ac21`
- **registration_codes**: `col-registration_codes-469bc379`
- **transactions**: `col-transactions-e06da228`
- **running_teams**: `col-running_teams-5c6748a6`
- **pages**: `pages-collection`
- **news**: `news-collection`

### Cómo obtener el ID de una colección

```bash
curl -s https://api.carreras.strydpanama.com/api/collections | jq '.data[] | select(.name == "races") | .id'
```

---

## Astro v6 + Cloudflare Pages - Variables de Entorno

### ⚠️ IMPORTANTE: No usar import.meta.env

En **Astro v6 con Cloudflare**, las variables de entorno NO se acceden con `import.meta.env`. En su lugar, se debe usar el módulo `cloudflare:workers`.

### Pattern Correcto (Stateless)

```typescript
// src/lib/api.ts
// Las funciones reciben env como parámetro
export async function apiFetch(endpoint: string, env: any, options?: RequestInit) {
  const baseUrl = env.SONICJS_API_URL;
  // ... resto del código
}

export const api = {
  getPublicRaces: (env: any) => apiFetch('/api/collections/races/content', env),
  getRace: (env: any, id: string) => apiFetch(`/api/content/${id}`, env),
  // ...
};
```

### En las páginas Astro

```typescript
---
// src/pages/index.astro
import { api } from '../lib/api';
import { env } from 'cloudflare:workers';

const response = await api.getPublicRaces(env);
const races = response.data || [];
---

<HomePage client:load initialRaces={races} />
```

### Por qué este patrón funciona

- `cloudflare:workers` es el módulo nativo de Cloudflare que da acceso a las variables de entorno en runtime
- Cada request tiene su propio `env` - no se guarda en variables globales (stateless)
- Las variables deben estar configuradas en **Cloudflare Pages → Settings → Environment Variables → Production**

| `SONICJS_API_PASSWORD` | contraseña |

---

## 🤖 REGLAS ESTRICTAS PARA AGENTES IA (CONOCIMIENTO ACUMULADO)

**¡ATENCIÓN AGENTES!** Antes de escribir cualquier código en este repositorio, DEBES leer, entender y acatar absolutamente las siguientes reglas o de lo contrario el sistema EN PRÓDUCCIÓN SE ROMPERÁ:

### 1. El Peligro del Caché de Cloudflare (GET Requests)
- **El Problema**: Cloudflare Pages / Workers cachea *agresivamente* las peticiones GET (como el cronómetro, registros nuevos, estado de la carrera).
- **La Regla de Oro**: Toda la comunicación SSR de Astro o llamadas cliente a SonicJS sobre data que cambia (GET `/api/collections/...`) **DEBE** incluir un **Cache Buster** en la URL (ej. `_t=Date.now()`) y los headers estructurados:
  ```typescript
  // ¡NUNCA OLVIDAR ESTO EN LECTURAS GET O SE VERÁ DATA VIEJA!
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  ```

### 2. Bugs del Core de SonicJS (Peticiones POST y PUT)
- **El Problema de OpenAPI**: La documentación Swagger de SonicJS dice que el campo para especificar una colección es `collection_id` (snake_case). **¡ESTO ES MENTIRA!** Si haces un POST a `/api/content` pasándole `collection_id`, SonicJS tirará un error interno de servidor 500 diciendo `Error: collectionId is required`.
- **La Regla de Oro**: Cuando actualices o crees registros, manda **AMBAS VARIABLES** en tu payload por seguridad. Es la única manera de evitar rechazos de esquema o caídas silenciosas:
  ```json
  {
    "collectionId": "col-participants-xxx",
    "collection_id": "col-participants-xxx",
    "title": "Nuevo Registro",
    ...
  }
  ```
- **El Doble Anidamiento**: Al hacer GET de un contenido (`/api/content/{id}`), la estructura que el CMS devuelve tiene los datos reales dentro de `response.data.data`. Un error muy común es tratar de acceder directamente a `response.data.timerStart` (será undefined). Siempre mapea bien la diferencia entre los campos core de DB (id, status, title) y los campos personalizados del modelo (que van dentro de `.data`).

### 3. Reglas de Diseño UI Inquebrantables
- Somos **STRYD Panama**. Nuestra paleta y estética son cruciales para el cliente.
- **Tu misión es hacer UI's que se vean "Caras y Premium", no proyectos de universidad.**
- 🧡 **NARANJA (`#FF6B00`) ES EL PRINCIPAL**: Usarás naranja para botones estelares, bordes de elementos activos y de confirmación.
- 🖤 **Fondos**: El sistema abraza el **Dark Mode** de alta gama (fondos `#0f0f0f` con tarjetas `#1a1a1a`).
- ⛔ **PROHIBIDO CÓDIGO PLACEHOLDER**: NADA de botones genéricos `<button>Click</button>` sin estilos. Debes proveer un componente funcional de UI (`@mui/material` o `Tailwind CSS`) totalmente responsivo en el primer intento. El operador humano evaluará tu trabajo buscando excelencia al primer impacto.

### 4. Sistema de Tiempos y Cronómetros
- **Cómo funcionan**: Los cronómetros en las carreras **no son setIntervals independientes** en el front-end que guarden "1 segundo transcurrido, 2 segundos transcurridos".
- Es una arquitectura sin estado. El backend almacena un timestamp UNIX de cuándo empezó (`timerStart`). El front-end hace la resta matemática en vivo: `Date.now() / 1000 - timerStart`.
- **Para la Meta**: Los tiempos finales (`finishTime` de los participantes) se calculan en Segundos (Elapsed Time) usando la misma fórmula desde el servidor (no configures el tiempo basándote en un input del cliente, calcúlalo dinámicamente vs el inicio de la carrera para evitar fraude o desincronización).
