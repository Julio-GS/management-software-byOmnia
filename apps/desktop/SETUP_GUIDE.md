# 🔐 Sistema de Autenticación Automática - Resumen Ejecutivo

## 🎯 Problema Resuelto

**Antes**: La cajera tenía que loguearse cada vez que abría la app
**Ahora**: La app se abre directamente, sin pantalla de login

## 🏗️ Arquitectura Completa

```
┌─────────────────────────────────────────────────────────────────┐
│                     ELECTRON APP STARTUP                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  1. CARGAR CONFIGURACIÓN                                        │
│     • Lee .env → DESKTOP_USER_EMAIL, DESKTOP_USER_PASSWORD      │
│     • Genera/lee DEVICE_ID único                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  2. INICIALIZAR AUTENTICACIÓN (authService.initialize)         │
│                                                                 │
│     ┌──────────────────────────────────────────┐               │
│     │ ¿Existe token guardado?                  │               │
│     └──────────────────────────────────────────┘               │
│              ↓ SÍ                    ↓ NO                       │
│     ┌─────────────────┐      ┌──────────────┐                  │
│     │ Validar token   │      │  Auto-login  │                  │
│     │ GET /api/auth/  │      │ POST /api/   │                  │
│     │ validate        │      │ auth/login   │                  │
│     └─────────────────┘      └──────────────┘                  │
│              ↓                       ↓                          │
│     ┌─────────────────┐      ┌──────────────┐                  │
│     │ ✓ Token válido  │      │  Guardar el  │                  │
│     │   Usar este     │      │  nuevo token │                  │
│     └─────────────────┘      └──────────────┘                  │
│              ↓                       ↓                          │
│              └───────────┬───────────┘                          │
│                          ↓                                      │
│              ✅ APP AUTENTICADA                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  3. INICIALIZAR BASE DE DATOS LOCAL (SQLite)                   │
│     • Productos, categorías, ventas                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  4. INICIAR SINCRONIZACIÓN EN BACKGROUND                       │
│     • Cada 30 segundos                                          │
│     • Envía cambios locales al backend                          │
│     • Recibe actualizaciones del backend                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  5. ABRIR VENTANA PRINCIPAL                                     │
│     ✅ Cajera puede trabajar inmediatamente                     │
└─────────────────────────────────────────────────────────────────┘
```

## 🔄 Flujo de Sincronización con Manejo de 401

```
SINCRONIZACIÓN CADA 30 SEGUNDOS
         │
         ↓
┌─────────────────────────────────────────┐
│  syncService.sync()                     │
│  • Obtiene cambios locales (is_dirty=1) │
│  • Llama a httpClient.post('/api/sync') │
└─────────────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────┐
│  httpClient agrega Authorization header │
│  • Obtiene token actual                 │
│  • Authorization: Bearer <token>        │
└─────────────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────┐
│  Hace request al backend                │
└─────────────────────────────────────────┘
         │
         ↓
   ¿Respuesta?
         │
    ┌────┴────┐
    ↓         ↓
┌────────┐  ┌──────────────────────────────────┐
│ 200 OK │  │ 401 UNAUTHORIZED                 │
└────────┘  │  • Token expirado/inválido       │
    ↓       └──────────────────────────────────┘
┌────────┐              ↓
│  DONE  │  ┌──────────────────────────────────┐
└────────┘  │  httpClient detecta 401          │
            │  1. Llama authService.            │
            │     handleUnauthorized()          │
            │  2. Borra token inválido          │
            │  3. Hace login() de nuevo         │
            │  4. Guarda nuevo token            │
            └──────────────────────────────────┘
                        ↓
            ┌──────────────────────────────────┐
            │  REINTENTA el request original   │
            │  • Usa el nuevo token             │
            │  • skipRetry = true (evita loop)  │
            └──────────────────────────────────┘
                        ↓
                   ┌────────┐
                   │ 200 OK │
                   └────────┘
                        ↓
                   ✅ SINCRONIZADO
                   
    🎯 LA CAJERA NUNCA VE NADA - TODO ES AUTOMÁTICO
```

## 📁 Estructura de Archivos Creados

```
apps/desktop/electron/
├── config/
│   └── credentials.ts          → Configuración de credenciales
├── auth/
│   ├── token-store.ts          → Almacenamiento seguro del token
│   └── auth-service.ts         → Lógica de auto-login
├── api/
│   └── http-client.ts          → Cliente HTTP con interceptor 401
├── sync/
│   └── sync-service.ts         → Sincronización en background
└── main.ts                     → Inicializa todo al arrancar
```

## 🔑 Variables de Entorno (.env)

```bash
BACKEND_URL=http://localhost:3000
DESKTOP_USER_EMAIL=caja1@supermercado.com
DESKTOP_USER_PASSWORD=CajaSegura2024!
DESKTOP_DEVICE_ID=caja-001
DESKTOP_STORE_ID=tienda-central
```

## 💾 Almacenamiento del Token

### Windows (DPAPI - Data Protection API)
```
%APPDATA%/omnia-desktop/auth-token.enc
```

### macOS (Keychain)
```
~/Library/Application Support/omnia-desktop/auth-token.enc
```

### Linux (libsecret)
```
~/.config/omnia-desktop/auth-token.enc
```

## ✅ Beneficios

1. **Sin fricción para la cajera**
   - No hay pantalla de login
   - Se abre y está lista para trabajar

2. **Sincronización transparente**
   - Se sincroniza en background cada 30s
   - Si el token expira, se re-loguea automáticamente
   - La cajera nunca ve errores de autenticación

3. **Modo offline automático**
   - Si no hay internet al arrancar, abre igual
   - Trabaja con datos locales
   - Se sincroniza cuando vuelva la conexión

4. **Seguridad**
   - Token encriptado con APIs nativas del OS
   - Credenciales nunca se guardan en logs
   - Token se renueva automáticamente

## 🛠️ Cómo Usar

### Para Desarrollo

1. Crear `.env` basado en `.env.example`
2. Configurar `BACKEND_URL` apuntando a tu backend local
3. Ejecutar `pnpm dev`

### Para Producción

1. Durante la instalación, configurar credenciales únicas por terminal
2. Cada caja tiene su propio `DESKTOP_DEVICE_ID`
3. El token se guarda encriptado automáticamente

## 🚨 Qué Pasa Si...

### ❌ El backend está caído
- App abre en modo offline
- Cajera puede trabajar con datos locales
- Se sincroniza cuando vuelva el backend

### ❌ Las credenciales son incorrectas
- Error en los logs
- App abre igual (modo offline)
- Requiere intervención manual para corregir

### ❌ El token expira durante el día
- **NO PASA NADA** - Se re-loguea automáticamente
- La cajera no se entera
- La sincronización continúa normal

## 📊 Logs para Debugging

```
[INFO] Initializing authentication...
[INFO] Found stored token, validating...
[INFO] ✓ Stored token is valid
[INFO] ✓ Authentication initialized
[INFO] Starting background sync...
[INFO] Syncing 3 products, 0 categories
[WARN] Received 401 on /api/sync, attempting re-authentication...
[INFO] Retrying /api/sync with new token...
[INFO] Sync successful
```

## 🎯 Próximos Pasos

- [ ] Implementar el endpoint `/api/auth/validate` en el backend
- [ ] Implementar el endpoint `/api/auth/login` en el backend
- [ ] Implementar el endpoint `/api/sync` en el backend
- [ ] Configurar las credenciales en `.env`
- [ ] Probar el flujo completo

---

**¿Dudas?** Lee `AUTH_README.md` para más detalles técnicos.
