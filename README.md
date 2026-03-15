# Omnia Management System

> Sistema integral de gestión para supermercado con aplicación de escritorio (Electron), interfaz web (Next.js) y API backend (NestJS)

[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![pnpm Version](https://img.shields.io/badge/pnpm-%3E%3D8.0.0-orange)](https://pnpm.io/)
[![License](https://img.shields.io/badge/license-Private-blue)]()

## Overview

Sistema POS (Point of Sale) completo desarrollado como monorepo usando Turborepo, con capacidades offline, sincronización con la nube, y soporte futuro para hardware (escáner de códigos de barras, impresora térmica).

**Estado Actual:** Fase 1 completada - Arquitectura de aplicación de escritorio Electron implementada

## Architecture

Monorepo basado en **Turborepo** con tres aplicaciones principales y un paquete compartido de tipos TypeScript:

```
omnia-management-system/
├── apps/
│   ├── desktop/          # Electron wrapper (Windows/macOS/Linux)
│   ├── web/              # Next.js 16 App Router frontend
│   └── backend/          # NestJS 10 REST API
└── packages/
    └── shared-types/     # TypeScript types compartidos
```

### Desktop App (Electron 28)
- Aplicación de escritorio nativa para Windows
- Integración segura con IPC (Inter-Process Communication)
- Context isolation habilitado
- Hot reload con `electronmon`
- Empaquetado con `electron-builder`

### Web App (Next.js 16)
- React 19 con App Router
- UI Components: shadcn/ui + Radix UI
- Styling: Tailwind CSS v4
- Modo dual: standalone web + embedded en Electron
- Autenticación con contexto React

### Backend API (NestJS 10)
- REST API con Swagger documentation
- PostgreSQL con Prisma ORM
- Autenticación JWT
- Passport.js strategies (Local, JWT)

### Shared Types Package
- Tipos TypeScript compartidos entre frontend y backend
- Tipos de autenticación y usuario
- Versionado con workspace protocol

## Tech Stack

| Category | Technology | Version |
|----------|-----------|---------|
| **Desktop** | Electron | 28.0.0 |
| **Frontend** | Next.js | 16.1.6 |
| **Frontend** | React | 19.2.4 |
| **Backend** | NestJS | 10.x |
| **Database** | PostgreSQL | - |
| **ORM** | Prisma | 6.x |
| **UI Library** | shadcn/ui + Radix UI | Latest |
| **Styling** | Tailwind CSS | 4.2.0 |
| **Auth** | JWT + Passport.js | Latest |
| **Build** | Turborepo | 2.3.3 |
| **Bundler** | esbuild | 0.27.3 |
| **Package Manager** | pnpm | 10.26.2 |

## Prerequisites

Asegúrate de tener instalado lo siguiente:

- **Node.js** >= 18.0.0 ([Download](https://nodejs.org/))
- **pnpm** >= 8.0.0 (Install: `npm install -g pnpm`)
- **PostgreSQL** >= 14.0 ([Download](https://www.postgresql.org/download/))
- **Git** ([Download](https://git-scm.com/))

## Installation

### 1. Clone el repositorio

```bash
git clone https://github.com/Julio-GS/management-software-byOmnia.git
cd management-software-byOmnia
```

### 2. Instalar dependencias

```bash
pnpm install
```

Este comando instalará todas las dependencias para todos los workspaces (apps/web, apps/backend, apps/desktop, packages/shared-types).

### 3. Configurar variables de entorno

#### Backend (apps/backend/.env)

```bash
cp apps/backend/.env.example apps/backend/.env
```

Edita `apps/backend/.env` con tus credenciales de PostgreSQL:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/omnia_db"
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="1d"
PORT=8080
```

#### Web App (apps/web/.env.local)

```bash
cp apps/web/.env.example apps/web/.env.local
```

Edita `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
```

### 4. Configurar base de datos

```bash
cd apps/backend
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed  # (Opcional) Seed con datos de ejemplo
```

## Development

### Iniciar la aplicación de escritorio (Desktop App)

Este comando inicia tanto la web app como Electron en modo desarrollo:

```bash
pnpm dev:desktop
```

Esto ejecuta:
1. Next.js dev server en `http://localhost:3000`
2. Electron app que carga el servidor Next.js
3. Hot reload habilitado para ambos

### Iniciar solo la Web App

```bash
pnpm --filter @omnia/web dev
```

Visita: `http://localhost:3000`

### Iniciar solo el Backend

```bash
pnpm --filter @omnia/backend dev
```

API disponible en: `http://localhost:8080`  
Swagger docs: `http://localhost:8080/api`

### Iniciar todos los servicios en paralelo

```bash
pnpm dev
```

Esto inicia web, backend y cualquier otro servicio configurado en `turbo.json`.

## Build & Deploy

### Build para producción (Desktop App)

#### 1. Build Next.js para Electron

```bash
pnpm build:desktop
```

Este comando:
1. Compila Next.js en modo `electron` (static export)
2. Bundlea código Electron con esbuild
3. Genera el instalador de Windows (`.exe`) con electron-builder

**Output:**
- `apps/desktop/release/Omnia Management-Setup-1.0.0.exe`

#### 2. Build solo para directorio (testing)

```bash
pnpm --filter @omnia/desktop build:dir
```

Genera una carpeta desempaquetada en lugar de instalador.

### Build Web App standalone

```bash
pnpm --filter @omnia/web build
```

### Build Backend API

```bash
pnpm --filter @omnia/backend build
```

Output: `apps/backend/dist/`

### Build todos los workspaces

```bash
pnpm build
```

## Project Structure

```
management-software-byOmnia/
├── apps/
│   ├── desktop/                    # Electron Desktop App
│   │   ├── electron/
│   │   │   ├── main.ts            # Electron main process
│   │   │   ├── window-manager.ts  # Window management
│   │   │   └── ipc-handlers.ts    # IPC communication
│   │   ├── resources/             # App icons & assets
│   │   ├── types/
│   │   │   └── electron.d.ts      # Electron type definitions
│   │   ├── esbuild.config.js      # Electron bundler config
│   │   └── package.json
│   │
│   ├── web/                        # Next.js 16 App Router Frontend
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   └── login/         # Login page
│   │   │   ├── (dashboard)/
│   │   │   │   ├── dashboard/     # Main dashboard
│   │   │   │   ├── inventory/     # Inventory management
│   │   │   │   ├── pos/           # Point of Sale
│   │   │   │   ├── products/      # Product catalog
│   │   │   │   ├── reports/       # Reports & analytics
│   │   │   │   └── sales/         # Sales history
│   │   │   ├── layout.tsx         # Root layout
│   │   │   ├── page.tsx           # Home page
│   │   │   └── globals.css        # Global styles
│   │   ├── components/            # React components (shadcn/ui)
│   │   ├── hooks/                 # Custom React hooks
│   │   ├── lib/
│   │   │   ├── electron.ts        # Electron IPC bridge
│   │   │   └── utils.ts           # Utility functions
│   │   ├── src/
│   │   │   ├── contexts/          # React contexts (Auth, etc.)
│   │   │   ├── core/              # Core business logic
│   │   │   ├── features/          # Feature modules
│   │   │   ├── infrastructure/    # External services
│   │   │   └── shared/            # Shared utilities
│   │   ├── middleware.ts          # Next.js middleware (auth)
│   │   ├── next.config.mjs        # Next.js configuration
│   │   └── package.json
│   │
│   └── backend/                    # NestJS 10 REST API
│       ├── src/
│       │   ├── auth/              # Authentication module
│       │   ├── users/             # Users module
│       │   ├── products/          # Products module
│       │   ├── sales/             # Sales module
│       │   ├── inventory/         # Inventory module
│       │   └── main.ts            # NestJS entry point
│       ├── prisma/
│       │   ├── schema.prisma      # Database schema
│       │   └── migrations/        # Database migrations
│       └── package.json
│
├── packages/
│   └── shared-types/              # Shared TypeScript types
│       ├── src/
│       │   ├── auth.types.ts      # Auth types
│       │   ├── user.types.ts      # User types
│       │   └── index.ts           # Export barrel
│       └── package.json
│
├── scripts/                        # Build & migration scripts
│   ├── migrate-imports.ts
│   └── validate-imports.ts
│
├── turbo.json                      # Turborepo configuration
├── pnpm-workspace.yaml             # pnpm workspace config
└── package.json                    # Root package.json
```

## Features Implemented (Phase 1)

### Authentication & Authorization
- JWT-based authentication
- Login page with form validation
- Protected routes with middleware
- Auth context provider
- Session management with cookies

### Dashboard
- Analytics overview
- Sales metrics
- Inventory status
- Quick actions

### Point of Sale (POS)
- Product search
- Cart management
- Transaction processing
- Receipt generation

### Inventory Management
- Stock level tracking
- Low stock alerts
- Product CRUD operations
- Inventory adjustments

### Product Catalog
- Product listing
- Product details
- Category management
- Price management

### Sales Tracking
- Sales history
- Transaction details
- Revenue analytics

### Reports
- Sales reports
- Inventory reports
- Custom date ranges

### Desktop Integration
- Secure IPC communication
- Context isolation
- Auto-updates ready (electron-updater)
- Native window management

## Development Commands Reference

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all dependencies |
| `pnpm dev` | Start all apps in dev mode (Turborepo) |
| `pnpm dev:desktop` | Start desktop app (Next.js + Electron) |
| `pnpm build` | Build all workspaces |
| `pnpm build:desktop` | Build desktop installer (.exe) |
| `pnpm lint` | Lint all workspaces |
| `pnpm clean` | Remove all build artifacts & node_modules |
| `pnpm format` | Format code with Prettier |

### Workspace-specific commands

```bash
# Web app
pnpm --filter @omnia/web dev
pnpm --filter @omnia/web build
pnpm --filter @omnia/web build:electron

# Desktop app
pnpm --filter @omnia/desktop dev
pnpm --filter @omnia/desktop build
pnpm --filter @omnia/desktop build:dir

# Backend app
pnpm --filter @omnia/backend dev
pnpm --filter @omnia/backend build
pnpm --filter @omnia/backend prisma:studio
pnpm --filter @omnia/backend prisma:migrate
```

## Environment Variables

### Backend (apps/backend/.env)

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/omnia_db"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="1d"

# Server
PORT=8080
NODE_ENV="development"
```

### Web App (apps/web/.env.local)

```env
# Backend API
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1

# Optional: Analytics
# NEXT_PUBLIC_VERCEL_ANALYTICS_ID=""
```

## Security

### Electron Security Features
- **Context Isolation:** Enabled
- **Node Integration:** Disabled in renderer
- **Sandbox:** Enabled
- **IPC Bridge:** Type-safe preload script
- **CSP:** Content Security Policy configured

### API Security
- JWT authentication with bcrypt password hashing
- Passport.js strategies (Local, JWT)
- Request validation with class-validator
- CORS configured
- Environment variables for sensitive data

### Best Practices
- No hardcoded secrets
- TypeScript strict mode enabled
- Input validation on both client and server
- Prepared statements with Prisma (SQL injection protection)

## Roadmap

### Phase 2: Offline Capabilities (Planned)
- SQLite local database integration
- Background sync worker
- Conflict resolution strategy
- Offline-first architecture

### Phase 3: Hardware Integration (Planned)
- Barcode scanner integration
- Thermal printer support
- Cash drawer control
- Customer display support

### Phase 4: Advanced Features (Planned)
- Multi-store support
- Employee management
- Advanced analytics
- Custom reporting builder

## Troubleshooting

### Desktop app won't start

**Error:** `ERR_CONNECTION_REFUSED` or blank screen

**Solution:**
1. Ensure Next.js dev server is running first
2. Check `http://localhost:3000` in browser
3. Try `pnpm dev:desktop` again

### Hot reload not working

**Solution:**
1. Stop all processes
2. Clear `.next` cache: `rm -rf apps/web/.next`
3. Restart: `pnpm dev:desktop`

### Database connection errors

**Solution:**
1. Verify PostgreSQL is running
2. Check `DATABASE_URL` in `apps/backend/.env`
3. Run migrations: `pnpm --filter @omnia/backend prisma:migrate`

### pnpm install fails

**Solution:**
1. Delete `node_modules` and `pnpm-lock.yaml`
2. Clear pnpm cache: `pnpm store prune`
3. Reinstall: `pnpm install`

## Contributing

Este es un proyecto privado. Para contribuir:

1. Crea una rama desde `main`: `git checkout -b feature/your-feature`
2. Implementa tus cambios
3. Ejecuta linting: `pnpm lint`
4. Ejecuta format: `pnpm format`
5. Commit con mensaje descriptivo: `git commit -m "feat: add new feature"`
6. Push a GitHub: `git push origin feature/your-feature`
7. Crea un Pull Request

### Commit Message Convention

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` Nueva funcionalidad
- `fix:` Bug fix
- `docs:` Cambios en documentación
- `style:` Formateo, missing semicolons, etc.
- `refactor:` Refactorización de código
- `test:` Añadir o modificar tests
- `chore:` Cambios en build process, dependencies, etc.

## Team

- **Project Lead:** Omnia Team
- **Repository:** [github.com/Julio-GS/management-software-byOmnia](https://github.com/Julio-GS/management-software-byOmnia)

## License

Proprietary - All rights reserved © 2026 Omnia

---

**Built with** Next.js 16 · React 19 · NestJS 10 · Electron 28 · Turborepo · Prisma · PostgreSQL · Tailwind CSS

**Status:** Phase 1 Complete ✓
