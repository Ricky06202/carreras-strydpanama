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

**PROHIBIDO - NO USAR:**
- ❌ **AZUL** - No existe azul en este diseño. Nada de `#1e3a8a`, `#3b82f6`, `blue.*`
- ❌ **AMARILLO** - No usar amarillo como color principal. El color es NARANJA.
- ❌ **CYAN** - No usar `#22d3ee`, `cyan.*`

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

**PROHIBIDO - BOTONES NO USAR:**
- ❌ Fondo blanco con texto amarillo/naranja
- ❌ Fondo azul con cualquier cosa
- ❌ Cualquier combinación que no sea naranja/blanco o blanco/naranja

### Variables de Color en Código

```typescript
// SIEMPRE usar estas variables:
const STRYD_ORANGE = '#FF6B00';
const STRYD_ORANGE_HOVER = '#E55A00';
const BLACK = '#000000';
const DARK_BG = '#0f0f0f';
const WHITE = '#FFFFFF';
const LIGHT_BG = '#f5f5f5';

// PROHIBIDO - NO USAR:
// const ACCENT = '#facc15'  // AMARILLO - PROHIBIDO
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
- Colors - USAR SIEMPRE NARANJA (#FF6B00), NUNCA AZUL NI AMARILLO

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
- **Backend (SonicJS)**: `https://api.carreras2.strydpanama.com`
- **Admin Panel**: `https://carreras2.strydpanama.com/admin`
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
curl -X POST https://api.carreras2.strydpanama.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"correo@ejemplo.com","password":"contraseña"}'
```

2. **Usar token** en headers:
```
Authorization: Bearer {token}
```

### Variables de Entorno para el Frontend

En **Cloudflare Pages** agregar:
- `SONICJS_API_URL` = `https://api.carreras2.strydpanama.com`
- `SONICJS_API_EMAIL` = `admin@strydpanama.com` (usuario con permisos)
- `SONICJS_API_PASSWORD` = `contraseña`

### Ejemplo de Crear Contenido

```bash
TOKEN="eyJhbGci..."

curl -X POST https://api.carreras2.strydpanama.com/api/content \
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
curl -s https://api.carreras2.strydpanama.com/api/collections | jq '.data[] | select(.name == "races") | .id'
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

### Variables requeridas en Cloudflare Pages (Production)

| Variable | Valor |
|----------|-------|
| `SONICJS_API_URL` | `https://api.carreras2.strydpanama.com` |
| `SONICJS_API_EMAIL` | usuario con permisos |
| `SONICJS_API_PASSWORD` | contraseña |
