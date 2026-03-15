# Mobile Adaptation - Software Design Document (SDD)

**Project**: Management Software Mobile Adaptation  
**Version**: 1.0.0  
**Date**: March 14, 2026  
**Status**: Specifications Complete - Ready for Implementation

---

## 📋 Executive Summary

This document contains complete technical specifications for adapting the Omnia Management Software frontend for mobile devices. The implementation follows a 4-phase approach over 10 weeks, with Phase 1 (Foundation) being the immediate priority.

### Key Deliverables
- ✅ Responsive breakpoint system (mobile/tablet/desktop)
- ✅ Bottom navigation component for mobile
- ✅ Touch-optimized UI components
- ✅ Enhanced mobile hooks and utilities
- ✅ Refactored layout system
- ✅ Complete test specifications
- ✅ Device testing matrix
- ✅ Performance benchmarks

---

## 🎯 Phase 1 Overview - Foundation (2 Weeks)

### Week 1: Core Infrastructure
**Days 1-2**: Breakpoint system + responsive hook  
**Days 3-5**: Navigation components (bottom nav, mobile header)  
**Days 6-7**: Layout integration and testing

### Week 2: Touch Optimization
**Days 8-10**: Touch hooks + component enhancements  
**Days 11-12**: Utility hooks (orientation, viewport, capabilities)  
**Days 13-14**: Testing, accessibility audit, performance optimization

---

## 📁 File Structure

```
apps/web/
├── lib/
│   ├── breakpoints.config.ts          ⭐ NEW - Breakpoint constants
│   └── features.ts                     ⭐ NEW - Feature flags
├── hooks/
│   ├── use-responsive.ts               ⭐ NEW - Enhanced breakpoint detection
│   ├── use-touch-gestures.ts           ⭐ NEW - Swipe/long-press detection
│   ├── use-haptic-feedback.ts          ⭐ NEW - Vibration API wrapper
│   ├── use-orientation.ts              ⭐ NEW - Portrait/landscape detection
│   ├── use-viewport-height.ts          ⭐ NEW - iOS Safari vh fix
│   ├── use-device-capabilities.ts      ⭐ NEW - Device feature detection
│   └── use-mobile.ts                   🔄 DEPRECATE - Use use-responsive instead
├── src/shared/components/
│   ├── layout/
│   │   ├── bottom-navigation.tsx       ⭐ NEW - Mobile bottom nav
│   │   ├── mobile-header.tsx           ⭐ NEW - Simplified mobile header
│   │   ├── desktop-header.tsx          ⭐ NEW - Extract from layout
│   │   └── app-navigation.tsx          ✅ EXISTING - Sidebar
│   └── ui/
│       ├── button.tsx                  🔄 MODIFY - Add touch variants
│       ├── input.tsx                   🔄 MODIFY - Mobile optimization
│       └── card.tsx                    🔄 MODIFY - Touch-friendly spacing
└── app/
    └── (app)/
        └── layout.tsx                  🔄 MODIFY - Responsive rendering

⭐ NEW = Create new file
🔄 MODIFY = Update existing file
✅ EXISTING = No changes needed
```

---

## 🔑 Key Components Specifications

### 1. Bottom Navigation
**File**: `apps/web/src/shared/components/layout/bottom-navigation.tsx`

**Features**:
- Fixed position at viewport bottom
- 5 navigation items (Dashboard, POS, Inventory, Pricing, Reports)
- Badge support for notifications
- Active state with indicator bar
- Touch-optimized (48px height)
- Haptic feedback on tap
- iOS safe area handling

**Props**:
```typescript
interface BottomNavigationProps {
  className?: string;
}
```

**Visual Design**:
```
┌─────────────────────────────────────────┐
│  Dashboard   POS   Inventory   $   📊   │ ← Icons
│    (8)                                   │ ← Badge on Inventory
│  ▔▔▔▔▔▔▔                                │ ← Active indicator
└─────────────────────────────────────────┘
```

---

### 2. Mobile Header
**File**: `apps/web/src/shared/components/layout/mobile-header.tsx`

**Features**:
- Back button (conditional - not on dashboard)
- Page title (center)
- Sync status indicator
- Menu button
- Compact height (56px)

**Visual Design**:
```
┌─────────────────────────────────────────┐
│ ← Back    Punto de Venta    🔄 ☰        │
└─────────────────────────────────────────┘
```

---

### 3. Responsive Hook
**File**: `apps/web/hooks/use-responsive.ts`

**Returns**:
```typescript
interface ResponsiveState {
  isMobile: boolean;      // < 640px
  isTablet: boolean;      // 640-1023px
  isDesktop: boolean;     // >= 1024px
  currentBreakpoint: 'mobile' | 'tablet' | 'desktop';
  width: number;          // Current viewport width
}
```

**Usage**:
```typescript
const { isMobile, isTablet, isDesktop } = useResponsive();

return isMobile ? <MobileView /> : <DesktopView />;
```

---

## 🎨 Breakpoint System

### Configuration
```typescript
// lib/breakpoints.config.ts
export const BREAKPOINTS = {
  mobile: { min: 0, max: 639 },      // Phones
  tablet: { min: 640, max: 1023 },   // Tablets
  desktop: { min: 1024, max: Infinity }, // Desktop
};
```

### Tailwind Usage
```typescript
// Mobile-first approach
<div className="p-4 sm:p-6 lg:p-8">         // Padding scales up
<h1 className="text-xl sm:text-2xl lg:text-3xl">  // Font size scales up
<Button size="touch" className="lg:size-default">  // Touch size on mobile
```

---

## 🖐️ Touch Optimization

### Touch Target Sizes
- Minimum: **44x44 pixels** (iOS guideline)
- Comfortable: **48x48 pixels** (Android guideline)
- Apply to: Buttons, nav items, interactive elements

### Button Variants
```typescript
<Button size="touch">Submit</Button>              // 44px height
<Button size="touch-comfortable">Submit</Button>  // 48px height
<Button size="icon-touch">✓</Button>              // 44x44 icon
```

### Haptic Feedback
```typescript
const { trigger } = useHapticFeedback();

// Light tap
trigger('light');

// Success confirmation
trigger('success');

// Error alert
trigger('error');
```

### Touch Gestures
```typescript
const ref = useTouchGestures({
  onSwipeLeft: () => console.log('Next'),
  onSwipeRight: () => console.log('Previous'),
  onLongPress: () => console.log('Context menu'),
  threshold: 50,
  longPressDelay: 500,
});

<div ref={ref}>Swipeable content</div>
```

---

## 🔄 Navigation Hierarchy

### Mobile (< 640px)
```
┌─────────────────────┐
│  ← Back  Title  ☰   │ ← Mobile Header
├─────────────────────┤
│                     │
│   Main Content      │
│   (Full Width)      │
│                     │
├─────────────────────┤
│  [Icon] [Icon] ...  │ ← Bottom Navigation
└─────────────────────┘
```

### Tablet (640-1023px)
```
┌─────────────────────┐
│  Omnia › Page  🔄👤 │ ← Desktop Header
├─────────────────────┤
│                     │
│   Main Content      │
│   (Padded)          │
│                     │
├─────────────────────┤
│  [Icon] [Icon] ...  │ ← Bottom Navigation
└─────────────────────┘
```

### Desktop (≥ 1024px)
```
┌───┬─────────────────┐
│   │ Omnia › Page 🔄 │ ← Desktop Header
│ S ├─────────────────┤
│ i │                 │
│ d │  Main Content   │
│ e │  (Full Height)  │
│ b │                 │
│ a │                 │
│ r │                 │
└───┴─────────────────┘
```

---

## 🧪 Testing Strategy

### Unit Tests
```bash
# Test hooks
apps/web/hooks/__tests__/use-responsive.test.ts
apps/web/hooks/__tests__/use-touch-gestures.test.ts

# Run tests
pnpm test
```

### Device Testing Matrix

| Device | Viewport | Browser | Priority |
|--------|----------|---------|----------|
| iPhone 13 | 390x844 | Safari | ⭐ High |
| Pixel 7 | 412x915 | Chrome | ⭐ High |
| iPad Air | 820x1180 | Safari | ⭐ High |
| Galaxy S21 | 360x800 | Chrome | Medium |
| Desktop | 1920x1080 | Chrome | ⭐ High |

### Performance Benchmarks
- First Contentful Paint: **< 1.5s**
- Time to Interactive: **< 3s**
- Cumulative Layout Shift: **< 0.1**
- Touch Response Time: **< 100ms**
- Lighthouse Mobile Score: **> 90**

### Accessibility Checklist
- [x] 44x44px minimum touch targets
- [x] 4.5:1 color contrast ratio
- [x] ARIA labels on icon buttons
- [x] Keyboard navigation support
- [x] Screen reader announcements
- [x] Focus visible indicators

---

## 🚀 Implementation Roadmap

### ✅ Completed
- [x] Technical specifications written
- [x] Architecture designed
- [x] Component APIs defined
- [x] Test strategy created
- [x] Device matrix established

### 🔄 Phase 1 (Weeks 1-2) - Foundation
- [ ] Create breakpoint system
- [ ] Implement responsive hook
- [ ] Build bottom navigation
- [ ] Build mobile header
- [ ] Refactor app layout
- [ ] Add touch optimizations
- [ ] Write unit tests
- [ ] Device testing
- [ ] Accessibility audit

### ⏳ Phase 2 (Weeks 3-5) - POS Adaptation
- [ ] Design POS mobile interface
- [ ] Implement 3-tab layout
- [ ] Camera barcode scanner
- [ ] Touch-optimized cart
- [ ] Mobile payment flow

### ⏳ Phase 3 (Weeks 6-7) - Data Modules
- [ ] Table-to-card conversion
- [ ] Inventory mobile view
- [ ] Pricing mobile view
- [ ] Reports mobile view

### ⏳ Phase 4 (Weeks 8-10) - PWA & Offline
- [ ] PWA manifest and icons
- [ ] Service worker setup
- [ ] IndexedDB queue
- [ ] Offline sync logic
- [ ] Background sync

---

## 🎓 Quick Reference

### Most Common Patterns

**1. Responsive Component**
```typescript
const { isMobile } = useResponsive();
return isMobile ? <MobileView /> : <DesktopView />;
```

**2. Mobile-First Styling**
```typescript
<div className="p-4 sm:p-6 lg:p-8">
```

**3. Touch Feedback**
```typescript
const { trigger } = useHapticFeedback();
onClick={() => { trigger('light'); handleClick(); }}
```

**4. Safe Area Handling**
```typescript
className="pb-[env(safe-area-inset-bottom)]"
```

---

## 📚 Documentation References

All detailed specifications have been saved to memory:

1. **Main Technical Specification** - Complete SDD with all component specs
2. **Implementation Priority Guide** - Step-by-step timeline and checklist
3. **Code Templates & Snippets** - Copy-paste ready code for all components

Access via engram memory search:
```
Mobile Adaptation Technical Specifications
Phase 1 Implementation Priority Guide
Code Templates Quick Reference
```

---

## 🆘 Support & Troubleshooting

### Common Issues

**Issue**: iOS Safari 100vh problem  
**Solution**: Use `useViewportHeight()` hook and `calc(var(--vh, 1vh) * 100)`

**Issue**: Input zoom on focus (iOS)  
**Solution**: Use `text-base` (16px) on mobile, `lg:text-sm` on desktop

**Issue**: Bottom nav overlapping content  
**Solution**: Add `pb-[calc(3.5rem+env(safe-area-inset-bottom))]` to main content

**Issue**: Double-tap zoom on buttons  
**Solution**: Add `touch-action: manipulation` CSS

---

## ✅ Phase 1 Acceptance Criteria

Phase 1 is complete when:
- [ ] Bottom navigation visible and functional on mobile
- [ ] Sidebar hidden on mobile, visible on desktop
- [ ] Mobile header replaces desktop header on small screens
- [ ] All touch targets meet 44x44px minimum
- [ ] Haptic feedback works on supported devices
- [ ] All unit tests passing (>95% coverage)
- [ ] Tested on iPhone, Android, tablet, desktop
- [ ] WCAG 2.1 AA compliant
- [ ] Lighthouse mobile score > 90
- [ ] No layout shift (CLS < 0.1)
- [ ] Code review approved

---

## 📞 Next Steps

1. Review this specification document
2. Create development branch: `feature/mobile-phase-1-foundation`
3. Start with breakpoints and responsive hook (Day 1-2)
4. Follow implementation priority guide
5. Use code templates for quick scaffolding
6. Test frequently on real devices
7. Create PR when Phase 1 acceptance criteria met

---

**Document Status**: ✅ Ready for Implementation  
**Last Updated**: March 14, 2026  
**Prepared by**: SDD SPEC Agent  
**For**: Omnia Management Software Team
