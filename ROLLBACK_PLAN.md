# Surgical UI Rollback Plan

## Objective
Restore the elegant Phase 1 single-page app UI while maintaining all backend integration from Phases 2-4.

## Files to Restore from Commit 6542034

### 1. Main Layout
- [x] `apps/web/app/page.tsx` - SPA layout with sidebar navigation

### 2. Sidebar Component
- [x] `apps/web/src/shared/components/layout/app-sidebar.tsx`

### 3. View Components
- [x] `apps/web/src/features/dashboard/components/dashboard-view.tsx`
- [x] `apps/web/src/features/pos/components/pos-view.tsx`
- [x] `apps/web/src/features/inventory/components/inventory-view.tsx`
- [ ] `apps/web/src/features/promotions/components/promociones-view.tsx`
- [ ] `apps/web/src/features/reports/components/reportes-view.tsx`
- [ ] `apps/web/src/features/settings/components/ajustes-view.tsx`

### 4. Chart Component
- [x] `apps/web/src/shared/components/common/daily-sales-chart.tsx`

## Backend Integration Tasks

### DashboardView
- [ ] Import `useDashboardMetrics` hook
- [ ] Replace mock data with real metrics
- [ ] Update stats cards with real data
- [ ] Update chart with real sales trends

### InventoryView
- [ ] Import `useInventoryAPI` hook
- [ ] Connect to real inventory endpoints
- [ ] Integrate with backend stock data

### PosView
- [ ] Import `useBarcodeScanner` hook
- [ ] Connect to real sales endpoints

### ReportesView
- [ ] Use reports endpoints from backend

## Files to Delete
- [ ] `apps/web/app/dashboard/page.tsx`
- [ ] `apps/web/app/pos/page.tsx`
- [ ] `apps/web/app/inventory/page.tsx`
- [ ] `apps/web/app/pricing/page.tsx`
- [ ] `apps/web/app/features-demo/page.tsx`

## Files to Keep (DO NOT TOUCH)
- All backend code in `apps/backend/`
- All hooks in `apps/web/hooks/`
- All existing feature components (BarcodeInput, InventoryMovementForm, etc.)
- Login page: `apps/web/app/login/page.tsx`
