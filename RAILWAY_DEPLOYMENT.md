# Railway Deployment Guide

Complete guide for deploying the Omnia Management Software to Railway.app

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Initial Setup](#initial-setup)
4. [Environment Variables](#environment-variables)
5. [Database Setup](#database-setup)
6. [Deployment](#deployment)
7. [Post-Deployment](#post-deployment)
8. [Monitoring](#monitoring)
9. [Troubleshooting](#troubleshooting)

---

## 🎯 Prerequisites

- Railway account (https://railway.app)
- Git repository connected to Railway
- Railway CLI installed (optional but recommended)

```bash
npm i -g @railway/cli
railway login
```

---

## 🏗️ Architecture Overview

**Stack:**
- **Backend**: NestJS API (Port 3001)
- **Frontend**: Next.js (Port 3000)
- **Database**: PostgreSQL
- **Deployment**: Single Docker container running both services

**Services Structure:**
```
┌─────────────────────────────────────┐
│   Railway Project                   │
├─────────────────────────────────────┤
│  ┌──────────────────────────────┐   │
│  │  PostgreSQL Service          │   │
│  │  (Managed Database)          │   │
│  └──────────────────────────────┘   │
│              │                       │
│              ▼                       │
│  ┌──────────────────────────────┐   │
│  │  Application Service         │   │
│  │  - Backend (3001)            │   │
│  │  - Frontend (3000)           │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

---

## 🚀 Initial Setup

### Step 1: Create Railway Project

1. Go to https://railway.app/new
2. Click "Deploy from GitHub repo"
3. Select your repository
4. Railway will detect the `railway.json` configuration

### Step 2: Add PostgreSQL Database

1. In your Railway project, click "+ New"
2. Select "Database" → "PostgreSQL"
3. Railway will automatically provision and configure the database
4. The `DATABASE_URL` will be automatically injected into your app

---

## 🔐 Environment Variables

### Required Variables

Set these in Railway Project Settings → Variables:

#### Backend Variables

```bash
# Application
NODE_ENV=production
PORT=3001

# JWT Authentication (Generate secure secrets!)
JWT_SECRET=<generate-secure-random-string>
JWT_EXPIRES_IN=7d

# Admin User (Initial Setup)
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=<secure-password>

# CORS (Set to your Railway domain)
CORS_ORIGIN=https://${{RAILWAY_PUBLIC_DOMAIN}}
```

#### Frontend Variables

```bash
# API URL (Use Railway internal URL or public URL)
NEXT_PUBLIC_API_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}/api

# Alternative: Use internal networking (faster)
# NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### Generate Secure Secrets

```bash
# JWT Secret
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Railway Variable Reference

Railway provides these automatically:
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Port to bind to (use 3000 for frontend)
- `RAILWAY_PUBLIC_DOMAIN` - Your app's public domain

---

## 💾 Database Setup

### Automatic Migrations

The `start.sh` script automatically runs migrations on startup:

```bash
npx prisma migrate deploy
```

### Manual Migration (if needed)

Using Railway CLI:

```bash
railway run npx prisma migrate deploy
```

### Database Seeding

To seed initial data:

```bash
railway run npm run prisma:seed --workspace=@omnia/backend
```

### Access Database

**Via Railway Dashboard:**
1. Click on PostgreSQL service
2. Click "Data" tab
3. Browse tables

**Via Railway CLI:**
```bash
railway connect postgres
```

**Via Prisma Studio:**
```bash
railway run npx prisma studio --workspace=@omnia/backend
```

---

## 📦 Deployment

### Automatic Deployment

Railway automatically deploys when you push to your connected branch:

```bash
git add .
git commit -m "feat(deploy): add Railway configuration"
git push origin feature/phase2-frontend-migration
```

### Manual Deployment

Using Railway CLI:

```bash
railway up
```

### Deployment Process

1. **Build Phase** (~5-10 minutes)
   - Installs dependencies
   - Generates Prisma client
   - Builds all packages
   - Creates Docker image

2. **Deploy Phase** (~1-2 minutes)
   - Runs database migrations
   - Starts backend service (port 3001)
   - Starts frontend service (port 3000)
   - Health checks pass

---

## ✅ Post-Deployment

### 1. Verify Deployment

**Check Services:**
```bash
# Health check endpoint
curl https://your-app.railway.app/health

# API endpoint
curl https://your-app.railway.app/api/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "memory": { "status": "up" }
  }
}
```

### 2. Access Application

- **Frontend**: `https://your-app.railway.app`
- **Backend API**: `https://your-app.railway.app/api`
- **API Docs**: `https://your-app.railway.app/api/docs` (if enabled)

### 3. Initial Login

Use the admin credentials you set in environment variables:

```
Email: admin@yourdomain.com
Password: <your-admin-password>
```

### 4. Configure Domain (Optional)

1. Go to Railway Project Settings → Domains
2. Add custom domain
3. Update DNS records as instructed
4. Update `NEXT_PUBLIC_API_URL` if needed

---

## 📊 Monitoring

### Railway Dashboard

Monitor your deployment in real-time:

1. **Deployments Tab**: View build logs and deployment history
2. **Metrics Tab**: CPU, memory, network usage
3. **Logs Tab**: Real-time application logs

### Application Logs

**View logs via CLI:**
```bash
railway logs
```

**View specific service:**
```bash
railway logs --service=backend
```

### Health Checks

The Dockerfile includes a health check:

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3
```

Railway uses this to ensure your app is healthy.

---

## 🔧 Troubleshooting

### Build Fails

**Issue: "Cannot find module @omnia/shared-types"**

**Solution:** Ensure all workspace dependencies are built:
```bash
pnpm turbo build
```

**Issue: "Prisma Client not generated"**

**Solution:** The `prebuild` script should handle this. Verify:
```bash
cd apps/backend
npx prisma generate
```

### Runtime Errors

**Issue: "Database connection failed"**

**Check:**
1. PostgreSQL service is running
2. `DATABASE_URL` is set correctly
3. Migrations have run

```bash
railway run npx prisma migrate deploy
```

**Issue: "CORS errors in browser"**

**Check:**
1. `CORS_ORIGIN` is set to your Railway domain
2. `NEXT_PUBLIC_API_URL` matches your backend URL

**Fix in Railway Variables:**
```bash
CORS_ORIGIN=https://${{RAILWAY_PUBLIC_DOMAIN}}
```

**Issue: "Port already in use"**

**Solution:** Railway should handle port binding. Ensure:
- Backend uses port 3001
- Frontend uses port 3000
- No port conflicts in code

### Memory Issues

**Issue: "Out of memory" errors**

**Solutions:**
1. Increase Railway plan memory
2. Optimize Docker image size
3. Review memory leaks

**Monitor memory:**
```bash
railway logs | grep "memory"
```

### API Connection Issues

**Issue: Frontend can't reach backend**

**Check:**
1. Both services are running (check logs)
2. `NEXT_PUBLIC_API_URL` is correct
3. Backend health endpoint responds

**Test backend directly:**
```bash
railway run curl http://localhost:3001/health
```

### Database Migration Issues

**Issue: "Migration failed"**

**Manual reset (⚠️ destructive):**
```bash
railway run npx prisma migrate reset --force
```

**View migration status:**
```bash
railway run npx prisma migrate status
```

---

## 📚 Additional Resources

### Railway Documentation
- [Railway Docs](https://docs.railway.app)
- [Environment Variables](https://docs.railway.app/develop/variables)
- [Dockerfile Deployment](https://docs.railway.app/deploy/dockerfiles)

### Application Documentation
- [NestJS Documentation](https://docs.nestjs.com)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)

### Useful Commands

```bash
# Railway CLI
railway login                    # Login to Railway
railway status                   # Check deployment status
railway logs                     # View logs
railway run <command>            # Run command in Railway environment
railway open                     # Open project in browser
railway variables                # List environment variables
railway link                     # Link local directory to Railway project

# Local Testing
docker build -t omnia-app .      # Build Docker image locally
docker run -p 3000:3000 -p 3001:3001 --env-file .env omnia-app

# Database
railway run npx prisma studio    # Open Prisma Studio
railway connect postgres         # Connect to PostgreSQL
```

---

## 🆘 Support

If you encounter issues:

1. Check Railway logs: `railway logs`
2. Review this troubleshooting guide
3. Check Railway status page: https://status.railway.app
4. Contact Railway support: https://help.railway.app

---

## 📝 Deployment Checklist

Before deploying:

- [ ] All environment variables set
- [ ] Database service added
- [ ] Secure JWT_SECRET generated
- [ ] Admin credentials configured
- [ ] CORS_ORIGIN set correctly
- [ ] NEXT_PUBLIC_API_URL configured
- [ ] Git repository connected
- [ ] All code committed and pushed

After deployment:

- [ ] Build completed successfully
- [ ] Both services running (backend + frontend)
- [ ] Database migrations applied
- [ ] Health check passing
- [ ] Can access frontend URL
- [ ] Can login with admin credentials
- [ ] API endpoints responding
- [ ] No errors in logs

---

**Last Updated:** March 2026
**Version:** 1.0.0
