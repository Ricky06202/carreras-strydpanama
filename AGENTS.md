# Proyecto: Carreras STRYD Panama

## Descripción
Plataforma de gestión de carreras pedestres para STRYD Panama. Permite a usuarios registrase en carreras y a administradores gestionar inscripciones, categorías, distancias y más.

## Stack Tecnológico
- **Framework**: Astro (modo server)
- **Adapter**: Cloudflare Pages/Workers
- **Frontend**: React + Material UI + Tailwind CSS
- **Base de datos**: Drizzle ORM + D1 (SQLite en Cloudflare)
- **Runtime**: Bun

## Estructura del Proyecto
```
src/
├── components/          # Componentes React
│   ├── AdminDashboard.tsx    # Panel de administración principal
│   ├── AdminLayout.tsx       # Layout del admin
│   ├── AdminContent.tsx      # Contenido del panel admin
│   └── RegistrationForm.tsx  # Formulario de inscripción
├── layouts/            # Layouts Astro
├── lib/db/             # Configuración de base de datos
│   ├── schema.ts       # Esquema de tablas
│   └── actions.ts      # Funciones de base de datos
├── pages/
│   ├── api/            # Endpoints de API
│   │   ├── admin/      # APIs administrativas
│   │   ├── race/[id].ts
│   │   └── register.ts
│   ├── admin.astro     # Página de admin
│   ├── register.astro  # Página de registro
│   └── index.astro     # Página principal
└── styles/             # Estilos globales
```

## Reglas de Desarrollo

### Despliegue a Producción
**IMPORTANTE**: Para que los cambios se reflejen en producción, **se deben subir a GitHub**. El proyecto está configurado con Cloudflare que automáticamente hace deploy desde el repositorio de GitHub.

Pasos para desplegar:
1. Hacer cambios en código
2. `git add .`
3. `git commit -m "mensaje"`
4. `git push`
5. Cloudflare detectará el push y desplegará automáticamente

### APIs Existentes

#### Carreras (públicas)
- `GET /api/races` - Lista carreras con status "accepting" (públicas)

#### Carrera específica
- `GET /api/race/[id]` - Devuelve carrera + distancias + categorías

#### Registro
- `POST /api/register` - Registra participante

#### Admin
- `GET /api/admin/races` - Lista todas las carreras
- `GET /api/admin/race/[id]` - Detalle de carrera (participantes, códigos, distancias, categorías)
- `POST /api/admin/race` - Crear carrera
- `PUT /api/admin/race/[id]` - Actualizar carrera
- `DELETE /api/admin/race/[id]` - Eliminar carrera
- `POST /api/admin/categories` - Crear categoría
- `PUT /api/admin/categories/[id]` - Actualizar categoría
- `DELETE /api/admin/categories/[id]` - Eliminar categoría
- `GET /api/admin/distances?raceId=X` - Lista distancias
- `POST /api/admin/distances` - Crear distancia
- `PUT /api/admin/distances/[id]` - Actualizar distancia
- `DELETE /api/admin/distances/[id]` - Eliminar distancia

### Esquema de Base de Datos (schema.ts)

#### Tabla races
- id, name, description, date, location, routeGpxUrl, **imageUrl**, **technicalInfo**, **termsAndConditions**, price, maxParticipants, status, timerStart, timerStop, createdAt, updatedAt

#### Tabla categories (por carrera)
- id, raceId, name, createdAt

#### Tabla distances (por carrera)
- id, raceId, name, createdAt

#### Tabla participants
- id, raceId, firstName, lastName, email, phone, birthDate, gender, categoryId, **distanceId**, team, size, codeId, paymentMethod, paymentStatus, **termsAccepted**, registeredAt

#### Tablas adicionales
- registrationCodes, transactions

### Estados de Carrera
- `upcoming` - Próximamente
- `accepting` - Inscripciones abiertas (público)
- `active` - Carrera en vivo
- `finished` - Finalizada

### Build y Testing
```bash
npm run build  # Compila para producción
```

### Errores Comunes
- "Cannot read properties of undefined" - Usar verificaciones defensivas al acceder a propiedades de respuestas API
- La API `/api/races` solo retorna carreras "accepting" (públicas), usar `/api/admin/races` para admin