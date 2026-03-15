# Railway Deployment - Monorepo

## Setup

Railway detecta UN servicio por defecto. Para el monorepo necesitás crear 2 servicios manualmente:

### 1. Backend Service

1. En Railway: **New → GitHub Repo** → Selecciona este repo
2. Railway crea el servicio automáticamente
3. **Settings → Build:**
   - Builder: `Dockerfile`
   - Dockerfile Path: `Dockerfile`
   - Root Directory: `/` (raíz del proyecto)

4. **Variables de entorno:**
   ```bash
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   NODE_ENV=production
   PORT=8080
   JWT_SECRET=<openssl rand -base64 64>
   JWT_REFRESH_SECRET=<openssl rand -base64 64>
   JWT_EXPIRES_IN=15m
   JWT_REFRESH_EXPIRES_IN=7d
   DEFAULT_ADMIN_EMAIL=admin@company.com
   DEFAULT_ADMIN_PASSWORD=<secure-password>
   FRONTEND_URL=${{web.RAILWAY_PUBLIC_DOMAIN}}
   ```

5. **Health Check:** `/api/v1/health`

### 2. Web Service (Frontend)

1. En Railway: **New → GitHub Repo** → Selecciona el MISMO repo
2. Railway crea otro servicio
3. **Settings → Build:**
   - Builder: `Dockerfile`
   - Dockerfile Path: `Dockerfile.web`
   - Root Directory: `/` (raíz del proyecto)

4. **Variables de entorno:**
   ```bash
   NEXT_PUBLIC_API_URL=${{backend.RAILWAY_PUBLIC_DOMAIN}}/api/v1
   NODE_ENV=production
   ```

5. **Health Check:** `/`

### 3. PostgreSQL

**New → Database → PostgreSQL**

Se auto-inyecta en backend como `${{Postgres.DATABASE_URL}}`

### 4. Migraciones

```bash
railway run --service backend npx prisma migrate deploy
```

## Estructura

```
Raíz del proyecto/
├── Dockerfile          → Backend (NestJS)
├── Dockerfile.web      → Frontend (Next.js)
├── apps/
│   ├── backend/        → Código backend
│   └── web/            → Código frontend
└── packages/           → Shared code
```

Ambos Dockerfiles construyen desde la raíz y tienen acceso a `apps/` y `packages/`.

## Variables de entorno completas

Ver `railway.env.example` para lista completa con descripciones.
