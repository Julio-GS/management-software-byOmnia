# Mobile Design System
**Project**: Omnia Management Software Mobile Adaptation  
**Version**: 1.0.0  
**Date**: March 14, 2026  
**Status**: Implementation-Ready Design Specifications

---

## 📋 Table of Contents
1. [Design Tokens](#design-tokens)
2. [Bottom Navigation Design](#bottom-navigation-design)
3. [Mobile Header Design](#mobile-header-design)
4. [Touch-Optimized Components](#touch-optimized-components)
5. [Layout Patterns](#layout-patterns)
6. [POS Module Design Preview](#pos-module-design-preview)
7. [Micro-Interactions](#micro-interactions)
8. [Dark Mode](#dark-mode)
9. [Accessibility](#accessibility)
10. [Visual Examples](#visual-examples)

---

## 🎨 Design Tokens

### Colors
Based on existing palette in `globals.css` with mobile-specific states:

```css
/* Light Mode */
--background: oklch(0.98 0.002 250);           /* #FAFAFA */
--foreground: oklch(0.18 0.04 250);            /* #1F1F23 */
--card: oklch(1 0 0);                          /* #FFFFFF */
--primary: oklch(0.22 0.06 250);               /* #22223B */
--secondary: oklch(0.95 0.005 250);            /* #F5F5F6 */
--muted: oklch(0.95 0.005 250);                /* #F5F5F6 */
--border: oklch(0.91 0.005 250);               /* #E8E8EA */
--ring: oklch(0.40 0.08 250);                  /* Focus ring */

/* Semantic Colors */
--success: oklch(0.72 0.15 160);               /* #22C55E */
--success-foreground: oklch(0.25 0.08 160);    /* #14532D */
--warning: oklch(0.80 0.15 80);                /* #F59E0B */
--warning-foreground: oklch(0.35 0.10 60);     /* #92400E */
--destructive: oklch(0.577 0.245 27.325);      /* #EF4444 */
--destructive-foreground: oklch(0.577 0.245 27.325);

/* Mobile-Specific States */
--touch-active: oklch(0.88 0.005 250);         /* Button pressed */
--nav-active: oklch(0.22 0.06 250);            /* Active nav item */
--nav-inactive: oklch(0.50 0.02 250);          /* Inactive nav item */
--badge-bg: oklch(0.577 0.245 27.325);         /* Notification badge */
--badge-text: oklch(1 0 0);                    /* White */
```

**Tailwind CSS Variables:**
```css
colors: {
  'touch-active': 'hsl(var(--touch-active))',
  'nav-active': 'hsl(var(--nav-active))',
  'nav-inactive': 'hsl(var(--nav-inactive))',
}
```

---

### Typography Scale (Mobile-Optimized)

```typescript
// Font Families
--font-sans: 'Inter', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', monospace;

// Mobile Typography Scale
Mobile Sizes (< 640px):
├─ text-xs:    12px / 16px line-height  → Small labels, badges
├─ text-sm:    14px / 20px              → Body text, descriptions
├─ text-base:  16px / 24px              → Primary body, inputs (prevents zoom)
├─ text-lg:    18px / 28px              → Section headers
├─ text-xl:    20px / 28px              → Page titles
├─ text-2xl:   24px / 32px              → Hero text, emphasized titles
└─ text-3xl:   30px / 36px              → Large display (rare on mobile)

Tablet Sizes (640-1023px):
├─ sm:text-sm:   14px / 20px
├─ sm:text-base: 16px / 24px
├─ sm:text-lg:   18px / 28px
├─ sm:text-xl:   20px / 28px
└─ sm:text-2xl:  24px / 32px

Desktop Sizes (≥ 1024px):
├─ lg:text-sm:   14px / 20px
├─ lg:text-base: 16px / 24px
├─ lg:text-lg:   18px / 28px
└─ lg:text-xl:   20px / 28px
```

**Font Weights:**
```css
font-normal:    400  → Body text
font-medium:    500  → Emphasized text, labels
font-semibold:  600  → Headers, buttons
font-bold:      700  → Strong emphasis
```

**Mobile Usage Examples:**
```tsx
<h1 className="text-xl font-semibold sm:text-2xl lg:text-3xl">
  Page Title
</h1>

<p className="text-base text-muted-foreground sm:text-sm lg:text-base">
  Body text that prevents iOS zoom
</p>

<span className="text-xs text-muted-foreground">
  Small label or badge
</span>
```

---

### Spacing System (8px Base Grid)

```css
/* Touch-Optimized Spacing */
0:     0px      → No spacing
0.5:   2px      → Micro adjustments
1:     4px      → Tight spacing
2:     8px      ⭐ Base unit
3:     12px     → Component padding
4:     16px     ⭐ Standard padding
5:     20px     → Section spacing
6:     24px     ⭐ Large padding
8:     32px     → Major sections
10:    40px     → Extra large spacing
12:    48px     ⭐ Touch target comfortable
14:    56px     ⭐ Header height
16:    64px     → Large UI elements
20:    80px     → Hero sections
```

**Touch Targets:**
```css
/* Minimum Touch Sizes */
--touch-min:         44px  → iOS guideline
--touch-comfortable: 48px  → Android guideline
--touch-large:       56px  → Large buttons

/* Component Heights */
--header-mobile:     56px  (14)
--bottom-nav:        56px  (14)
--button-touch:      44px  (11)
--button-comfortable:48px  (12)
--input-mobile:      48px  (12)
```

**Safe Area Handling:**
```css
/* iOS Notch/Home Indicator */
padding-top: env(safe-area-inset-top);
padding-bottom: env(safe-area-inset-bottom);
padding-left: env(safe-area-inset-left);
padding-right: env(safe-area-inset-right);
```

---

### Shadows & Elevation

```css
/* Mobile Shadow Scale (lighter for performance) */
shadow-sm:   0 1px 2px 0 rgb(0 0 0 / 0.05);
shadow:      0 1px 3px 0 rgb(0 0 0 / 0.1);
shadow-md:   0 4px 6px -1px rgb(0 0 0 / 0.1);
shadow-lg:   0 10px 15px -3px rgb(0 0 0 / 0.1);

/* Component Shadows */
--shadow-card:        shadow-sm
--shadow-button:      shadow-sm
--shadow-floating:    shadow-md      → Bottom sheets, modals
--shadow-nav:         shadow-lg      → Fixed navigation
```

**Usage:**
```tsx
<div className="shadow-sm active:shadow-none">
  Touch feedback - shadow disappears on press
</div>

<div className="shadow-lg">
  Bottom navigation with prominent elevation
</div>
```

---

### Border Radius

```css
/* Radius Scale */
--radius-sm:  4px   (calc(var(--radius) - 4px))
--radius-md:  6px   (calc(var(--radius) - 2px))
--radius-lg:  8px   (var(--radius))  ⭐ Default
--radius-xl:  12px  (calc(var(--radius) + 4px))
--radius-2xl: 16px  → Large cards
--radius-full: 9999px → Pills, badges

/* Component Radii */
--radius-button:  6px  (rounded-md)
--radius-card:    8px  (rounded-lg)
--radius-input:   6px  (rounded-md)
--radius-badge:   9999px (rounded-full)
--radius-modal:   16px (rounded-2xl)
```

**Mobile Considerations:**
- Larger radius (8px+) for better visual hierarchy
- Full radius for badges and pills
- Top corners only for bottom sheets: `rounded-t-2xl`

---

### Animation Timings

```css
/* Durations */
--duration-fast:    150ms  → Instant feedback (hover, press)
--duration-base:    200ms  → Standard transitions
--duration-slow:    300ms  → Sheet slides, page transitions
--duration-slower:  500ms  → Complex animations

/* Easing Functions */
--ease-in:      cubic-bezier(0.4, 0, 1, 1);
--ease-out:     cubic-bezier(0, 0, 0.2, 1);       ⭐ Most common
--ease-in-out:  cubic-bezier(0.4, 0, 0.2, 1);
--ease-spring:  cubic-bezier(0.34, 1.56, 0.64, 1); → Bouncy feel

/* Common Transitions */
transition-colors:    color, background-color, border-color (200ms ease-out)
transition-transform: transform (200ms ease-out)
transition-all:       all properties (200ms ease-out)
```

**Usage:**
```tsx
<button className="transition-colors duration-150 active:scale-95">
  Fast color change + press scale
</button>

<div className="transition-transform duration-300 ease-out">
  Smooth sheet slide-up
</div>
```

---

## 🗺️ Bottom Navigation Design

### Visual Specifications

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│                     Main Content Area                      │
│                                                            │
├────────────────────────────────────────────────────────────┤
│                                                            │ ↑
│  [🏠]    [💰]    [📦]    [💵]    [📊]                     │ 56px
│  Home    POS     Inv     Price   Report                    │ ↓
│   •                (8)                                     │ ← Active dot + Badge
│                                                            │
└────────────────────────────────────────────────────────────┘
  └────────────────────────────────────────────────────────┘
          env(safe-area-inset-bottom)
```

### Dimensions

```css
/* Container */
Height:         56px (h-14)
Width:          100% (w-full)
Position:       fixed bottom-0
Background:     bg-card (white)
Border Top:     border-t border-border
Shadow:         shadow-lg
Z-Index:        z-50

/* Safe Area Padding */
padding-bottom: calc(0.5rem + env(safe-area-inset-bottom))
                → 8px + iOS home indicator clearance
```

### Navigation Item

```css
/* Container */
Width:          48px (w-12)
Height:         48px (h-12)
Display:        flex flex-col items-center justify-center
Gap:            2px (gap-0.5)
Touch Target:   min 44x44px (iOS guideline met)

/* Icon */
Size:           20px (w-5 h-5)
Stroke Width:   2px
Active Color:   text-nav-active (oklch(0.22 0.06 250))
Inactive Color: text-nav-inactive (oklch(0.50 0.02 250))

/* Label */
Font Size:      10px (text-[10px])
Font Weight:    500 (font-medium)
Line Height:    12px
Text Transform: none (preserve case)
Active Color:   text-nav-active
Inactive Color: text-nav-inactive

/* Active Indicator Dot */
Size:           4px (w-1 h-1)
Shape:          rounded-full
Color:          bg-nav-active
Position:       Below label, centered
```

### Badge Design

```css
/* Badge (notification count) */
Position:       absolute top-0 right-0
Size:           16px min-width, 16px height (min-h-4 min-w-4)
Background:     bg-destructive (red)
Text Color:     text-white
Font Size:      10px (text-[10px])
Font Weight:    600 (font-semibold)
Padding:        0 4px (px-1)
Border Radius:  full (rounded-full)
Border:         2px solid bg-card (white ring)

/* Badge with 2+ digits */
Min Width:      20px (auto-expand)
Padding:        0 5px (px-1.5)
```

### Icon Library (Lucide React)

```typescript
import {
  LayoutDashboard,  // Dashboard
  ShoppingCart,     // POS
  Package,          // Inventory
  DollarSign,       // Pricing
  BarChart3,        // Reports
} from 'lucide-react';

// Icon Props
<LayoutDashboard
  className="w-5 h-5"
  strokeWidth={2}
  aria-hidden="true"
/>
```

### States

#### Default (Inactive)
```tsx
<button className="flex flex-col items-center justify-center w-12 h-12 gap-0.5 text-nav-inactive transition-colors">
  <Package className="w-5 h-5" />
  <span className="text-[10px] font-medium">Inventory</span>
</button>
```

#### Active
```tsx
<button className="flex flex-col items-center justify-center w-12 h-12 gap-0.5 text-nav-active transition-colors">
  <Package className="w-5 h-5" />
  <span className="text-[10px] font-medium">Inventory</span>
  <span className="w-1 h-1 rounded-full bg-nav-active" />
</button>
```

#### With Badge
```tsx
<button className="relative flex flex-col items-center justify-center w-12 h-12 gap-0.5 text-nav-inactive">
  <Package className="w-5 h-5" />
  <span className="absolute top-0 right-0 flex items-center justify-center min-w-4 min-h-4 text-[10px] font-semibold text-white bg-destructive rounded-full px-1 ring-2 ring-card">
    8
  </span>
  <span className="text-[10px] font-medium">Inventory</span>
</button>
```

#### Pressed (Touch Feedback)
```tsx
<button className="... active:bg-secondary active:scale-95 transition-all duration-150">
  <!-- Instant visual feedback -->
</button>
```

### Tailwind Classes (Complete)

```tsx
// Container
className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around h-14 bg-card border-t border-border shadow-lg pb-[calc(0.5rem+env(safe-area-inset-bottom))]"

// Nav Item Button
className="relative flex flex-col items-center justify-center w-12 h-12 gap-0.5 transition-all duration-150 active:scale-95 active:bg-secondary"

// Icon (Active)
className="w-5 h-5 text-nav-active"

// Icon (Inactive)
className="w-5 h-5 text-nav-inactive"

// Label (Active)
className="text-[10px] font-medium text-nav-active"

// Label (Inactive)
className="text-[10px] font-medium text-nav-inactive"

// Active Indicator Dot
className="w-1 h-1 rounded-full bg-nav-active"

// Badge
className="absolute top-0 right-0 flex items-center justify-center min-w-4 min-h-4 text-[10px] font-semibold text-white bg-destructive rounded-full px-1 ring-2 ring-card"
```

### Accessibility

```tsx
<nav aria-label="Main navigation" role="navigation">
  <button
    type="button"
    aria-label="Dashboard"
    aria-current={isActive ? 'page' : undefined}
    className="..."
  >
    <LayoutDashboard aria-hidden="true" />
    <span>Dashboard</span>
  </button>
</nav>
```

---

## 📱 Mobile Header Design

### Visual Specifications

```
┌────────────────────────────────────────────────────────────┐
│                                                            │ ↑
│  [←]         Punto de Venta               [🔄]  [☰]       │ 56px
│                                                            │ ↓
└────────────────────────────────────────────────────────────┘
```

### Dimensions

```css
/* Container */
Height:         56px (h-14)
Width:          100% (w-full)
Position:       sticky top-0 (or fixed)
Background:     bg-card (white)
Border Bottom:  border-b border-border
Shadow:         shadow-sm
Z-Index:        z-40
Padding Top:    env(safe-area-inset-top) → iOS notch clearance
```

### Layout Structure

```css
/* Flex Container */
display:        flex
align-items:    items-center
justify-content:justify-between
padding-x:      16px (px-4)
gap:            12px (gap-3)
```

### Back Button

```css
/* Button Container */
Width:          40px (w-10)
Height:         40px (h-10)
Display:        flex items-center justify-center
Border Radius:  6px (rounded-md)
Background:     transparent
Hover/Active:   hover:bg-secondary active:bg-muted

/* Icon */
Icon:           ChevronLeft (lucide-react)
Size:           24px (w-6 h-6)
Color:          text-foreground
Stroke Width:   2px

/* Visibility */
Conditional:    Hidden on dashboard (isHome && 'invisible')
```

### Title

```css
/* Text */
Font Size:      18px (text-lg)
Font Weight:    600 (font-semibold)
Color:          text-foreground
Truncate:       truncate (single line with ellipsis)
Flex:           flex-1 text-center

/* Alignment */
Text Align:     center (when back button present)
Text Align:     left (when no back button)
```

### Action Buttons

```css
/* Button Container */
Width:          40px (w-10)
Height:         40px (h-10)
Display:        flex items-center justify-center
Border Radius:  6px (rounded-md)
Background:     transparent
Hover/Active:   hover:bg-secondary active:bg-muted

/* Icons */
Sync Icon:      RefreshCw
Menu Icon:      Menu
Size:           20px (w-5 h-5)
Color:          text-foreground
Stroke Width:   2px

/* Sync Animation */
Syncing State:  animate-spin
Duration:       2s
```

### Tailwind Classes (Complete)

```tsx
// Container
className="sticky top-0 z-40 flex items-center justify-between h-14 px-4 bg-card border-b border-border shadow-sm pt-[env(safe-area-inset-top)]"

// Back Button
className="flex items-center justify-center w-10 h-10 transition-colors rounded-md hover:bg-secondary active:bg-muted"

// Back Icon
className="w-6 h-6"

// Title (with back button)
className="flex-1 text-lg font-semibold text-center truncate"

// Title (without back button)
className="flex-1 text-lg font-semibold truncate"

// Actions Container
className="flex items-center gap-2"

// Action Button
className="flex items-center justify-center w-10 h-10 transition-colors rounded-md hover:bg-secondary active:bg-muted"

// Action Icon
className="w-5 h-5"

// Sync Icon (syncing)
className="w-5 h-5 animate-spin"
```

### Responsive Behavior

```tsx
// Show on mobile/tablet, hide on desktop
<div className="lg:hidden">
  <MobileHeader />
</div>

// Show on desktop, hide on mobile/tablet
<div className="hidden lg:block">
  <DesktopHeader />
</div>
```

### Accessibility

```tsx
<header className="...">
  <button
    type="button"
    onClick={onBack}
    aria-label="Go back"
    className="..."
  >
    <ChevronLeft aria-hidden="true" />
  </button>

  <h1 className="...">
    {title}
  </h1>

  <div className="...">
    <button
      type="button"
      onClick={onSync}
      aria-label={isSyncing ? 'Syncing...' : 'Sync data'}
      disabled={isSyncing}
      className="..."
    >
      <RefreshCw
        className={cn("w-5 h-5", isSyncing && "animate-spin")}
        aria-hidden="true"
      />
    </button>

    <button
      type="button"
      onClick={onMenuOpen}
      aria-label="Open menu"
      className="..."
    >
      <Menu aria-hidden="true" />
    </button>
  </div>
</header>
```

---

## 🖐️ Touch-Optimized Components

### Button Sizes

#### Size Variants

```typescript
// Button size config (shadcn/ui button.tsx)
const buttonVariants = cva(
  "...",
  {
    variants: {
      size: {
        default: "h-10 px-4 py-2",              // 40px - Desktop
        sm: "h-9 px-3 rounded-md",              // 36px - Small
        lg: "h-11 px-8 rounded-md",             // 44px - Large
        touch: "h-11 px-6 text-base",           // ⭐ 44px - Mobile minimum
        "touch-comfortable": "h-12 px-6 text-base", // ⭐ 48px - Comfortable
        "icon-touch": "h-11 w-11",              // ⭐ 44x44 - Icon
        icon: "h-10 w-10",                      // 40x40 - Desktop icon
      },
    },
  }
);
```

#### Visual Examples

```
┌─────────────────────────────────────────┐
│          Touch Button (44px)            │  ← h-11
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│     Touch Comfortable (48px)            │  ← h-12
└─────────────────────────────────────────┘

┌───────┐
│  [✓]  │  ← Icon Touch (44x44)
└───────┘
```

#### Usage

```tsx
// Mobile: Touch-optimized
<Button size="touch" className="lg:size-default">
  Submit Order
</Button>

// Mobile: Comfortable
<Button size="touch-comfortable">
  Continue to Payment
</Button>

// Mobile: Icon button
<Button size="icon-touch" variant="ghost">
  <X className="w-5 h-5" />
</Button>

// Responsive sizing
<Button className="h-11 sm:h-10 lg:h-9">
  Scales down on larger screens
</Button>
```

#### Touch Feedback States

```tsx
// Active state (pressed)
<Button className="active:scale-95 active:shadow-none transition-all duration-150">
  Instant feedback
</Button>

// With haptic feedback
const { trigger } = useHapticFeedback();

<Button
  onClick={() => {
    trigger('light');
    handleSubmit();
  }}
>
  Submit with haptic
</Button>
```

---

### Input Fields (Mobile Optimization)

#### Specifications

```css
/* Input Container */
Height:         48px (h-12) → Prevents iOS zoom
Font Size:      16px (text-base) → Critical for iOS
Border Radius:  6px (rounded-md)
Padding:        12px 16px (px-4 py-3)
Border:         1px solid border
Background:     bg-background

/* States */
Focus:          ring-2 ring-ring ring-offset-2
Error:          border-destructive ring-destructive
Disabled:       opacity-50 cursor-not-allowed
```

#### Visual Design

```
┌─────────────────────────────────────────┐
│  Enter product name                     │  ← 48px height
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Price         │  [🔢]  │  [$]          │  ← With icons
└─────────────────────────────────────────┘
```

#### Tailwind Classes

```tsx
// Base input
className="flex h-12 w-full rounded-md border border-input bg-background px-4 py-3 text-base ring-offset-background file:border-0 file:bg-transparent file:text-base file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

// Input with icon
<div className="relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
  <Input className="pl-10" placeholder="Search products..." />
</div>
```

#### iOS Keyboard Considerations

```css
/* Prevent zoom on focus (iOS) */
font-size: 16px; /* Must be 16px or larger */

/* Handle keyboard appearing */
.ios-keyboard-open {
  padding-bottom: 0; /* Remove bottom padding when keyboard shows */
}
```

---

### Card Component Design

#### Specifications

```css
/* Card Container */
Border Radius:  8px (rounded-lg)
Background:     bg-card
Border:         1px solid border
Shadow:         shadow-sm
Padding:        16px (p-4)
Gap:            12px (gap-3)

/* Touch Area */
Min Height:     72px (for clickable cards)
Active State:   active:bg-secondary active:scale-[0.98]
Transition:     200ms ease-out
```

#### Visual Hierarchy

```
┌───────────────────────────────────────────┐
│  [Icon]  Product Name              $99.99 │  ← 72px min
│          SKU: 12345         [→]            │
└───────────────────────────────────────────┘

┌───────────────────────────────────────────┐
│  ┌─────────────────┐                      │
│  │  [Image]        │  Product Title       │  ← With image
│  │   240x160       │  Short description   │
│  └─────────────────┘  $129.99    [Cart]   │
└───────────────────────────────────────────┘
```

#### Tailwind Classes

```tsx
// Basic card
className="rounded-lg border border-border bg-card p-4 shadow-sm"

// Clickable card
className="rounded-lg border border-border bg-card p-4 shadow-sm transition-all active:scale-[0.98] active:bg-secondary"

// Card with image
<div className="flex gap-4 rounded-lg border border-border bg-card p-4 shadow-sm">
  <div className="shrink-0 w-20 h-20 rounded-md overflow-hidden bg-muted">
    <img src="..." alt="..." className="w-full h-full object-cover" />
  </div>
  <div className="flex-1 min-w-0">
    <h3 className="font-semibold truncate">{title}</h3>
    <p className="text-sm text-muted-foreground truncate">{description}</p>
  </div>
</div>
```

---

### Bottom Sheet Design

#### Specifications

```css
/* Sheet Container */
Position:       fixed bottom-0 left-0 right-0
Border Radius:  16px (rounded-t-2xl) → Top corners only
Background:     bg-card
Shadow:         shadow-2xl
Z-Index:        z-50
Max Height:     90vh
Transform:      translateY(100%) → Hidden
                translateY(0%) → Visible

/* Backdrop */
Background:     bg-black/50
Backdrop Blur:  backdrop-blur-sm
Z-Index:        z-40
```

#### Visual Design

```
┌────────────────────────────────────────┐
│ //////////////////////////////// ← Backdrop (blurred)
│ ////////////////////////////////
│ ////////////////////////////////
│ ┌────────────────────────────┐ ← 16px radius
│ │  ────  ← Handle (drag)     │
│ │                            │
│ │  Sheet Title               │
│ │                            │
│ │  Content goes here...      │
│ │                            │
│ │  [Cancel]    [Confirm]     │
│ └────────────────────────────┘
└────────────────────────────────────────┘
```

#### Handle Bar

```css
/* Drag Handle */
Width:          40px (w-10)
Height:         4px (h-1)
Border Radius:  full (rounded-full)
Background:     bg-muted
Margin:         12px auto (mx-auto my-3)
```

#### Animation

```tsx
// Slide up animation
<div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
  <div className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-300">
    <div className="w-10 h-1 mx-auto my-3 rounded-full bg-muted" />
    <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      {children}
    </div>
  </div>
</div>

// Slide down (exit)
className="animate-out slide-out-to-bottom duration-200"
```

#### Touch Gestures

```tsx
const sheetRef = useTouchGestures({
  onSwipeDown: () => closeSheet(),
  threshold: 100,
});

<div ref={sheetRef}>
  Sheet content
</div>
```

---

## 📐 Layout Patterns

### Mobile App Shell Structure

```
┌────────────────────────────────────────────┐ ← env(safe-area-inset-top)
│  [←]      Page Title       [🔄]  [☰]       │ ← Mobile Header (56px)
├────────────────────────────────────────────┤
│                                            │
│                                            │
│            Main Content                    │
│         (Scrollable Area)                  │
│                                            │
│                                            │
│                                            │
├────────────────────────────────────────────┤
│  [🏠]  [💰]  [📦]  [💵]  [📊]              │ ← Bottom Nav (56px)
└────────────────────────────────────────────┘ ← env(safe-area-inset-bottom)
```

#### Layout Code

```tsx
<div className="flex flex-col h-screen">
  {/* Mobile Header */}
  <header className="sticky top-0 z-40 h-14 border-b bg-card pt-[env(safe-area-inset-top)]">
    <MobileHeader />
  </header>

  {/* Main Content (Scrollable) */}
  <main className="flex-1 overflow-y-auto pb-[calc(3.5rem+env(safe-area-inset-bottom))]">
    {children}
  </main>

  {/* Bottom Navigation */}
  <nav className="fixed bottom-0 left-0 right-0 z-50 h-14 border-t bg-card pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
    <BottomNavigation />
  </nav>
</div>
```

---

### Content Padding and Margins

```css
/* Mobile Content Padding */
Horizontal:     16px (px-4)
Vertical:       16px (py-4)
Section Gap:    24px (space-y-6)

/* Tablet Content Padding */
Horizontal:     24px (sm:px-6)
Vertical:       24px (sm:py-6)
Section Gap:    32px (sm:space-y-8)

/* Desktop Content Padding */
Horizontal:     32px (lg:px-8)
Vertical:       32px (lg:py-8)
Section Gap:    40px (lg:space-y-10)

/* Max Width Constraints */
Mobile:         100% (no constraint)
Tablet:         100% (no constraint)
Desktop:        1280px (max-w-6xl mx-auto)
```

#### Responsive Padding Pattern

```tsx
<div className="p-4 sm:p-6 lg:p-8">
  <div className="space-y-6 sm:space-y-8 lg:space-y-10">
    <section>Content 1</section>
    <section>Content 2</section>
  </div>
</div>
```

---

### Safe Area Handling (iOS Notches)

```css
/* Top Safe Area (notch) */
padding-top: env(safe-area-inset-top);
padding-top: max(16px, env(safe-area-inset-top));  /* Minimum 16px */

/* Bottom Safe Area (home indicator) */
padding-bottom: env(safe-area-inset-bottom);
padding-bottom: calc(16px + env(safe-area-inset-bottom));  /* Add to existing padding */

/* Full Safe Area */
padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
```

#### Usage Examples

```tsx
// Header with notch clearance
<header className="pt-[env(safe-area-inset-top)] px-4 h-14">
  ...
</header>

// Content with bottom nav clearance
<main className="pb-[calc(3.5rem+env(safe-area-inset-bottom))]">
  ...
</main>

// Bottom nav with home indicator clearance
<nav className="pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
  ...
</nav>

// Full-screen modal
<div className="p-[env(safe-area-inset-top)_env(safe-area-inset-right)_env(safe-area-inset-bottom)_env(safe-area-inset-left)]">
  ...
</div>
```

---

### Scroll Behavior

```css
/* Smooth Scrolling */
scroll-behavior: smooth;

/* Scroll Snap (for carousels) */
scroll-snap-type: x mandatory;
scroll-snap-align: start;

/* Hide Scrollbar (optional) */
scrollbar-width: none;  /* Firefox */
-ms-overflow-style: none;  /* IE/Edge */
&::-webkit-scrollbar {
  display: none;  /* Chrome/Safari */
}

/* Pull-to-Refresh Prevention */
overscroll-behavior-y: contain;

/* Momentum Scrolling (iOS) */
-webkit-overflow-scrolling: touch;
```

#### Implementation

```tsx
// Smooth scroll container
<div className="overflow-y-auto scroll-smooth">
  {content}
</div>

// Horizontal carousel
<div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide">
  <div className="shrink-0 w-72 snap-start">Card 1</div>
  <div className="shrink-0 w-72 snap-start">Card 2</div>
  <div className="shrink-0 w-72 snap-start">Card 3</div>
</div>

// Fixed header with scrolling content
<div className="flex flex-col h-screen">
  <header className="sticky top-0 z-40">Header</header>
  <main className="flex-1 overflow-y-auto overscroll-contain">
    Scrollable content
  </main>
</div>
```

---

## 💳 POS Module Design Preview

### 3-Tab Interface Visual Mockup

```
┌────────────────────────────────────────────────────────────┐
│  [←]         Punto de Venta               [🔄]  [☰]       │ ← Header
├────────────────────────────────────────────────────────────┤
│  [Buscar] │ [Carrito (3)] │ [Pagar]                        │ ← Tabs
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  [🔍]  Buscar producto o escanear...                  │ │ ← Search
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌────────────────────────────┐  ┌──────────────────────┐ │
│  │ [📷]                       │  │ [📷]                 │ │
│  │  Coca Cola 600ml           │  │  Pan Blanco         │ │
│  │  $2.50          [+ Añadir] │  │  $1.20   [+ Añadir] │ │
│  └────────────────────────────┘  └──────────────────────┘ │
│                                                            │
│  ┌────────────────────────────┐  ┌──────────────────────┐ │
│  │ [📷]                       │  │ [📷]                 │ │
│  │  Arroz 1kg                 │  │  Aceite Vegetal     │ │
│  │  $3.75          [+ Añadir] │  │  $4.50   [+ Añadir] │ │
│  └────────────────────────────┘  └──────────────────────┘ │
│                                                            │
├────────────────────────────────────────────────────────────┤
│  [🏠]    [💰]    [📦]    [💵]    [📊]                     │ ← Bottom Nav
└────────────────────────────────────────────────────────────┘
```

### Product Card Design

```
┌───────────────────────────────────────┐
│  ┌─────────────┐                      │ ← 140px width
│  │             │  Coca Cola 600ml     │   (2 columns on mobile)
│  │   [Image]   │  SKU: CC600          │
│  │  120x80     │  Stock: 45 units     │
│  └─────────────┘                      │
│                                       │
│  $2.50                    [+ Añadir]  │ ← Touch button
└───────────────────────────────────────┘
```

#### Product Card Specifications

```css
/* Card Container */
Width:          calc(50% - 8px) → 2 columns with gap
Min Height:     160px
Border Radius:  8px (rounded-lg)
Padding:        12px (p-3)
Background:     bg-card
Border:         1px solid border
Shadow:         shadow-sm

/* Product Image */
Width:          100%
Height:         80px
Object Fit:     cover
Border Radius:  6px (rounded-md)
Background:     bg-muted (placeholder)

/* Product Name */
Font Size:      14px (text-sm)
Font Weight:    600 (font-semibold)
Lines:          2 (line-clamp-2)
Color:          text-foreground

/* Price */
Font Size:      18px (text-lg)
Font Weight:    700 (font-bold)
Color:          text-foreground

/* Add Button */
Height:         36px (h-9)
Width:          100%
Font Size:      14px (text-sm)
```

#### Tailwind Implementation

```tsx
<div className="grid grid-cols-2 gap-3 p-4">
  {products.map((product) => (
    <div key={product.id} className="flex flex-col gap-2 p-3 rounded-lg border border-border bg-card shadow-sm">
      <div className="w-full h-20 rounded-md bg-muted overflow-hidden">
        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 min-h-0">
        <h3 className="text-sm font-semibold line-clamp-2">{product.name}</h3>
        <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
      </div>
      <div className="flex items-center justify-between mt-auto">
        <span className="text-lg font-bold">${product.price}</span>
      </div>
      <Button size="sm" className="w-full">
        <Plus className="w-4 h-4 mr-1" />
        Añadir
      </Button>
    </div>
  ))}
</div>
```

---

### Cart Item Layout

```
┌────────────────────────────────────────────────┐
│  [x]  Coca Cola 600ml       x2      [−] [+]   │ ← Cart item
│       $2.50 c/u                      $5.00     │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│  [x]  Pan Blanco            x1      [−] [+]   │
│       $1.20 c/u                      $1.20     │
└────────────────────────────────────────────────┘
```

#### Cart Item Specifications

```css
/* Cart Item Container */
Display:        flex
Align Items:    center
Padding:        12px 16px (px-4 py-3)
Gap:            12px (gap-3)
Border Bottom:  1px solid border
Background:     bg-card

/* Remove Button */
Size:           32px (w-8 h-8)
Icon:           X (16px)
Color:          text-destructive

/* Product Info */
Flex:           flex-1
Font Size:      14px (text-sm)
Font Weight:    500 (font-medium)

/* Quantity Controls */
Display:        flex items-center
Gap:            8px (gap-2)
Button Size:    32px (w-8 h-8)
Icon Size:      16px (w-4 h-4)

/* Price */
Font Size:      16px (text-base)
Font Weight:    700 (font-bold)
Min Width:      70px
Text Align:     right
```

#### Implementation

```tsx
<div className="divide-y">
  {cartItems.map((item) => (
    <div key={item.id} className="flex items-center gap-3 px-4 py-3">
      <Button
        size="icon"
        variant="ghost"
        className="w-8 h-8 text-destructive"
        onClick={() => removeItem(item.id)}
      >
        <X className="w-4 h-4" />
      </Button>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.name}</p>
        <p className="text-xs text-muted-foreground">
          ${item.price} c/u
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="icon"
          variant="outline"
          className="w-8 h-8"
          onClick={() => decreaseQuantity(item.id)}
        >
          <Minus className="w-4 h-4" />
        </Button>
        <span className="w-8 text-center text-sm font-medium">
          {item.quantity}
        </span>
        <Button
          size="icon"
          variant="outline"
          className="w-8 h-8"
          onClick={() => increaseQuantity(item.id)}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <div className="w-20 text-right">
        <p className="text-base font-bold">
          ${(item.price * item.quantity).toFixed(2)}
        </p>
      </div>
    </div>
  ))}
</div>
```

---

### Numeric Keypad Design

```
┌────────────────────────────────────────┐
│                                        │
│           $0.00                        │ ← Display
│                                        │
├────────────────────────────────────────┤
│   [1]      [2]      [3]                │ ← 56px height
│   [4]      [5]      [6]                │
│   [7]      [8]      [9]                │
│   [.]      [0]      [⌫]                │
├────────────────────────────────────────┤
│   [Cancelar]       [Confirmar]         │ ← Actions
└────────────────────────────────────────┘
```

#### Keypad Specifications

```css
/* Keypad Button */
Width:          calc(33.333% - 8px)
Height:         56px (h-14)
Font Size:      20px (text-xl)
Font Weight:    600 (font-semibold)
Border Radius:  8px (rounded-lg)
Background:     bg-secondary
Border:         1px solid border
Active:         active:bg-muted active:scale-95

/* Display */
Height:         80px (h-20)
Font Size:      32px (text-3xl)
Font Weight:    700 (font-bold)
Text Align:     right
Padding:        24px (p-6)
Background:     bg-muted
```

#### Implementation

```tsx
<div className="flex flex-col h-full">
  {/* Display */}
  <div className="flex items-center justify-end h-20 px-6 bg-muted">
    <span className="text-3xl font-bold">${amount.toFixed(2)}</span>
  </div>

  {/* Keypad */}
  <div className="flex-1 grid grid-cols-3 gap-2 p-4">
    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'].map((key) => (
      <button
        key={key}
        onClick={() => handleKeyPress(key)}
        className="h-14 text-xl font-semibold transition-all rounded-lg border border-border bg-secondary active:scale-95 active:bg-muted"
      >
        {key}
      </button>
    ))}
    <button
      onClick={handleBackspace}
      className="h-14 text-xl font-semibold transition-all rounded-lg border border-border bg-secondary active:scale-95 active:bg-muted"
    >
      <Delete className="w-6 h-6 mx-auto" />
    </button>
  </div>

  {/* Actions */}
  <div className="grid grid-cols-2 gap-3 p-4 border-t">
    <Button variant="outline" size="touch-comfortable" onClick={onCancel}>
      Cancelar
    </Button>
    <Button size="touch-comfortable" onClick={onConfirm}>
      Confirmar
    </Button>
  </div>
</div>
```

---

### Barcode Scanner Overlay

```
┌────────────────────────────────────────┐
│ ████████████████████████████████████  │ ← Dark overlay
│ ████████████████████████████████████  │
│ ████████████████████████████████████  │
│ ████┌────────────────────────┐████  │
│ ████│                        │████  │ ← Scanning area
│ ████│     [Camera View]      │████  │   (transparent)
│ ████│                        │████  │
│ ████│    ─────────────       │████  │ ← Scan line
│ ████│                        │████  │
│ ████└────────────────────────┘████  │
│ ████████████████████████████████████  │
│ ████████████████████████████████████  │
│        Escanear código de barras      │ ← Instruction
│                                        │
│            [X] Cancelar                │ ← Close button
└────────────────────────────────────────┘
```

#### Scanner Specifications

```css
/* Overlay */
Background:     bg-black/80
Z-Index:        z-50
Position:       fixed inset-0

/* Scanning Frame */
Width:          280px (w-70)
Height:         200px (h-50)
Border:         2px solid white
Border Radius:  8px (rounded-lg)
Box Shadow:     0 0 0 9999px rgba(0, 0, 0, 0.8)

/* Scan Line */
Width:          100%
Height:         2px
Background:     bg-primary
Animation:      scan 2s linear infinite
```

#### Animation

```css
@keyframes scan {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(200px);
  }
}
```

#### Implementation

```tsx
<div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80">
  {/* Camera View */}
  <div className="relative w-70 h-50">
    <video
      ref={videoRef}
      className="w-full h-full rounded-lg"
      autoPlay
      playsInline
    />
    
    {/* Scanning Frame */}
    <div className="absolute inset-0 border-2 border-white rounded-lg" />
    
    {/* Scan Line */}
    <div className="absolute left-0 right-0 h-0.5 bg-primary animate-[scan_2s_linear_infinite]" />
  </div>

  {/* Instruction */}
  <p className="mt-6 text-lg font-medium text-white">
    Escanear código de barras
  </p>

  {/* Close Button */}
  <Button
    variant="secondary"
    size="touch-comfortable"
    onClick={onClose}
    className="mt-6"
  >
    <X className="w-5 h-5 mr-2" />
    Cancelar
  </Button>
</div>
```

---

## ✨ Micro-Interactions

### Button Press Animation

```css
/* Scale Down (Press) */
transform: scale(0.95);
transition: transform 150ms ease-out;

/* Shadow Removal (Press) */
box-shadow: none;
transition: box-shadow 150ms ease-out;

/* Background Change (Press) */
background-color: hsl(var(--secondary));
transition: background-color 150ms ease-out;
```

#### Implementation

```tsx
// Tailwind classes
<Button className="transition-all duration-150 active:scale-95 active:shadow-none">
  Press Me
</Button>

// With background change
<Button className="transition-all duration-150 active:scale-95 active:bg-secondary">
  Press Me
</Button>

// With haptic feedback
const { trigger } = useHapticFeedback();

<Button
  onClick={() => {
    trigger('light');
    handleClick();
  }}
  className="transition-all duration-150 active:scale-95"
>
  Press Me
</Button>
```

---

### Tab Switch Transition

```css
/* Fade In/Out */
opacity: 0;
transition: opacity 200ms ease-out;

/* Active State */
opacity: 1;

/* Slide Animation */
transform: translateX(100%);
transition: transform 300ms ease-out;

/* Active State */
transform: translateX(0);
```

#### Implementation

```tsx
// Fade transition
<div className={cn(
  "transition-opacity duration-200",
  isActive ? "opacity-100" : "opacity-0 pointer-events-none"
)}>
  Tab Content
</div>

// Slide transition
<div className={cn(
  "transition-transform duration-300 ease-out",
  isActive ? "translate-x-0" : "translate-x-full"
)}>
  Tab Content
</div>

// With Framer Motion
<motion.div
  initial={{ opacity: 0, x: 20 }}
  animate={{ opacity: 1, x: 0 }}
  exit={{ opacity: 0, x: -20 }}
  transition={{ duration: 0.2 }}
>
  Tab Content
</motion.div>
```

---

### Sheet Slide-Up Animation

```css
/* Initial State (Hidden) */
transform: translateY(100%);
opacity: 0;

/* Visible State */
transform: translateY(0);
opacity: 1;
transition: transform 300ms ease-out, opacity 200ms ease-out;

/* Backdrop Fade */
opacity: 0;
transition: opacity 200ms ease-out;

/* Visible Backdrop */
opacity: 1;
```

#### Implementation

```tsx
// Using Tailwind animate utilities
<div className="fixed inset-0 z-40 bg-black/50 animate-in fade-in duration-200">
  <div className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-300">
    Sheet Content
  </div>
</div>

// Exit animation
<div className="animate-out fade-out duration-200">
  <div className="animate-out slide-out-to-bottom duration-200">
    Sheet Content
  </div>
</div>

// With Framer Motion
<AnimatePresence>
  {isOpen && (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/50"
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 bg-card rounded-t-2xl"
      >
        Sheet Content
      </motion.div>
    </>
  )}
</AnimatePresence>
```

---

### Ripple Effect

```css
/* Ripple Circle */
position: absolute;
border-radius: 50%;
background-color: currentColor;
opacity: 0.3;
transform: scale(0);
animation: ripple 600ms ease-out;

@keyframes ripple {
  to {
    transform: scale(4);
    opacity: 0;
  }
}
```

#### Implementation

```tsx
import { useState } from 'react';

function RippleButton({ children, onClick, ...props }) {
  const [ripples, setRipples] = useState([]);

  const handleClick = (e) => {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    const newRipple = { x, y, size, id: Date.now() };
    setRipples([...ripples, newRipple]);

    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 600);

    onClick?.(e);
  };

  return (
    <button
      onClick={handleClick}
      className="relative overflow-hidden"
      {...props}
    >
      {children}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="absolute rounded-full bg-current opacity-30 animate-[ripple_600ms_ease-out]"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: ripple.size,
            height: ripple.size,
          }}
        />
      ))}
    </button>
  );
}
```

---

### Loading States

#### Spinner

```tsx
<div className="flex items-center justify-center p-8">
  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
</div>
```

#### Skeleton

```tsx
<div className="space-y-3">
  <div className="h-4 bg-muted rounded animate-pulse" />
  <div className="h-4 bg-muted rounded animate-pulse w-5/6" />
  <div className="h-4 bg-muted rounded animate-pulse w-4/6" />
</div>
```

#### Shimmer Effect

```css
@keyframes shimmer {
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
}

.shimmer {
  background: linear-gradient(
    90deg,
    hsl(var(--muted)) 0%,
    hsl(var(--muted-foreground) / 0.1) 50%,
    hsl(var(--muted)) 100%
  );
  background-size: 1000px 100%;
  animation: shimmer 2s infinite linear;
}
```

#### Button Loading

```tsx
<Button disabled={isLoading}>
  {isLoading ? (
    <>
      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      Loading...
    </>
  ) : (
    'Submit'
  )}
</Button>
```

---

## 🌙 Dark Mode

### Color Adjustments

```css
/* Dark Mode Palette */
.dark {
  --background: oklch(0.16 0.03 250);           /* #1A1A1F */
  --foreground: oklch(0.92 0.005 250);          /* #ECECED */
  --card: oklch(0.20 0.04 250);                 /* #242429 */
  --border: oklch(0.30 0.04 250);               /* #3A3A3F */
  --muted: oklch(0.26 0.04 250);                /* #2F2F34 */
  --muted-foreground: oklch(0.65 0.02 250);     /* #9D9DA3 */
  
  /* Semantic Colors (Dark) */
  --success: oklch(0.65 0.12 160);              /* #10B981 */
  --warning: oklch(0.75 0.12 80);               /* #F59E0B */
  --destructive: oklch(0.396 0.141 25.723);     /* #DC2626 */
  
  /* Mobile States (Dark) */
  --touch-active: oklch(0.28 0.04 250);         /* Slightly lighter */
  --nav-active: oklch(0.92 0.005 250);          /* White */
  --nav-inactive: oklch(0.50 0.02 250);         /* Gray */
}
```

### Contrast Requirements

```css
/* WCAG 2.1 AA Standards */
Normal Text (< 18px):     4.5:1 minimum contrast ratio
Large Text (≥ 18px):      3:1 minimum contrast ratio
Interactive Elements:     3:1 minimum contrast ratio
Focus Indicators:         3:1 minimum contrast ratio
```

### Dark Mode Toggle

```tsx
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon-touch"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label="Toggle theme"
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
}
```

### Component Dark Mode Examples

```tsx
// Card with proper dark mode
<div className="rounded-lg border border-border bg-card text-card-foreground shadow-sm">
  Content adapts to light/dark
</div>

// Button with dark mode
<Button className="bg-primary text-primary-foreground hover:bg-primary/90">
  Works in both modes
</Button>

// Input with dark mode
<input className="bg-background border-input text-foreground placeholder:text-muted-foreground" />
```

---

## ♿ Accessibility

### Focus Indicators

```css
/* Focus Visible (Keyboard Navigation) */
:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}

/* Focus Within (Container has focused child) */
:focus-within {
  border-color: hsl(var(--ring));
  box-shadow: 0 0 0 2px hsl(var(--ring) / 0.2);
}
```

#### Tailwind Implementation

```tsx
// Button focus
<Button className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
  Keyboard accessible
</Button>

// Input focus
<input className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />

// Card focus (clickable)
<div className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" tabIndex={0}>
  Focusable card
</div>
```

---

### Color Contrast Ratios

```css
/* Minimum Contrast Requirements */

✅ PASS Examples (WCAG AA):
- Foreground #1F1F23 on Background #FAFAFA: 11.8:1
- Primary #22223B on White #FFFFFF: 13.2:1
- Success #22C55E on White #FFFFFF: 3.1:1 (large text only)

❌ FAIL Examples:
- Muted Text #9D9DA3 on Background #FAFAFA: 2.8:1 (too low for small text)
  → Use for large text (≥18px) or decorative only

/* Testing Tools */
- Chrome DevTools: Inspect > Accessibility
- Contrast Checker: https://webaim.org/resources/contrastchecker/
```

---

### Text Sizing

```css
/* Minimum Font Sizes */
Mobile:     16px base (prevents iOS zoom)
Tablet:     14px base
Desktop:    14px base

/* Body Text */
Min Size:   14px (text-sm)
Ideal:      16px (text-base)
Max Size:   18px (text-lg)

/* Labels & Secondary Text */
Min Size:   12px (text-xs)
Ideal:      14px (text-sm)

/* Buttons */
Min Size:   14px (text-sm)
Ideal:      16px (text-base)

/* Headings */
H1:         20-30px (text-xl to text-3xl)
H2:         18-24px (text-lg to text-2xl)
H3:         16-20px (text-base to text-xl)
```

#### Responsive Text Sizing

```tsx
// Scales up on larger screens
<h1 className="text-xl sm:text-2xl lg:text-3xl">
  Responsive Heading
</h1>

// Prevents iOS zoom on inputs
<input className="text-base sm:text-sm" placeholder="Search..." />

// Small text (minimum 12px)
<span className="text-xs text-muted-foreground">
  Secondary label
</span>
```

---

### ARIA Labels and Roles

```tsx
// Navigation
<nav aria-label="Main navigation" role="navigation">
  <button aria-label="Dashboard" aria-current="page">
    <LayoutDashboard aria-hidden="true" />
    <span>Dashboard</span>
  </button>
</nav>

// Icon-only buttons
<Button
  variant="ghost"
  size="icon-touch"
  aria-label="Close dialog"
>
  <X aria-hidden="true" className="w-5 h-5" />
</Button>

// Form inputs
<label htmlFor="product-name" className="text-sm font-medium">
  Product Name
</label>
<input
  id="product-name"
  type="text"
  aria-required="true"
  aria-invalid={errors.name ? 'true' : 'false'}
  aria-describedby={errors.name ? 'name-error' : undefined}
/>
{errors.name && (
  <p id="name-error" role="alert" className="text-sm text-destructive">
    {errors.name}
  </p>
)}

// Loading states
<Button disabled aria-busy="true" aria-label="Loading...">
  <Loader2 className="animate-spin" aria-hidden="true" />
  <span className="sr-only">Loading...</span>
</Button>

// Expandable sections
<button
  aria-expanded={isOpen}
  aria-controls="content-section"
  onClick={toggle}
>
  Toggle Details
</button>
<div id="content-section" hidden={!isOpen}>
  Content
</div>
```

---

### Screen Reader Support

```tsx
// Skip to main content
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground"
>
  Skip to main content
</a>

<main id="main-content">
  {/* Page content */}
</main>

// Screen reader only text
<span className="sr-only">Additional context for screen readers</span>

// Announce dynamic changes
<div role="status" aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>

// Alert for errors
<div role="alert" aria-live="assertive">
  {errorMessage}
</div>
```

---

## 📱 Visual Examples

### Screen State Comparisons

#### Mobile POS - Search Tab

```
┌────────────────────────────────────────┐
│  [←]     Punto de Venta    [🔄] [☰]    │ ← 56px header
├────────────────────────────────────────┤
│  [Buscar] • [Carrito (3)] [Pagar]      │ ← Tabs (active dot)
├────────────────────────────────────────┤
│                                        │
│  ┌──────────────────────────────────┐ │
│  │  [🔍]  Buscar o escanear...      │ │ ← 48px input
│  └──────────────────────────────────┘ │
│                                        │
│  ┌────────────┐  ┌────────────┐      │
│  │  [Image]   │  │  [Image]   │      │ ← Product cards
│  │  Coca Cola │  │  Pan Blanco│      │   2 columns
│  │  $2.50     │  │  $1.20     │      │
│  │  [+Añadir] │  │  [+Añadir] │      │
│  └────────────┘  └────────────┘      │
│                                        │
│  ┌────────────┐  ┌────────────┐      │
│  │  [Image]   │  │  [Image]   │      │
│  │  Arroz 1kg │  │  Aceite    │      │
│  │  $3.75     │  │  $4.50     │      │
│  │  [+Añadir] │  │  [+Añadir] │      │
│  └────────────┘  └────────────┘      │
│                                        │
├────────────────────────────────────────┤
│  [🏠] [💰] [📦] [💵] [📊]              │ ← 56px bottom nav
└────────────────────────────────────────┘
```

#### Mobile POS - Cart Tab

```
┌────────────────────────────────────────┐
│  [←]     Punto de Venta    [🔄] [☰]    │
├────────────────────────────────────────┤
│  [Buscar] [Carrito (3)] • [Pagar]      │
├────────────────────────────────────────┤
│                                        │
│  ┌──────────────────────────────────┐ │
│  │  [x] Coca Cola 600ml             │ │ ← Cart items
│  │      $2.50 c/u                   │ │
│  │                  x2  [−] 2 [+]   │ │
│  │                         $5.00    │ │
│  └──────────────────────────────────┘ │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │  [x] Pan Blanco                  │ │
│  │      $1.20 c/u                   │ │
│  │                  x1  [−] 1 [+]   │ │
│  │                         $1.20    │ │
│  └──────────────────────────────────┘ │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │  [x] Arroz 1kg                   │ │
│  │      $3.75 c/u                   │ │
│  │                  x3  [−] 3 [+]   │ │
│  │                        $11.25    │ │
│  └──────────────────────────────────┘ │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │  Subtotal:               $17.45  │ │ ← Summary
│  │  IVA (12%):               $2.09  │ │
│  │  Total:                  $19.54  │ │
│  └──────────────────────────────────┘ │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │     [Proceder al Pago →]         │ │ ← 48px button
│  └──────────────────────────────────┘ │
│                                        │
├────────────────────────────────────────┤
│  [🏠] [💰] [📦] [💵] [📊]              │
└────────────────────────────────────────┘
```

#### Mobile POS - Payment Tab

```
┌────────────────────────────────────────┐
│  [←]     Punto de Venta    [🔄] [☰]    │
├────────────────────────────────────────┤
│  [Buscar] [Carrito (3)] [Pagar] •      │
├────────────────────────────────────────┤
│                                        │
│  ┌──────────────────────────────────┐ │
│  │  Total a Pagar                   │ │
│  │                                  │ │
│  │         $19.54                   │ │ ← Large display
│  │                                  │ │
│  └──────────────────────────────────┘ │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │  Método de Pago                  │ │
│  │                                  │ │
│  │  [💵 Efectivo] [💳 Tarjeta]      │ │ ← Payment methods
│  │  [📱 Transferencia] [🏦 Otro]    │ │
│  └──────────────────────────────────┘ │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │  Monto Recibido                  │ │
│  │                                  │ │
│  │  ┌────────────────────────────┐ │ │
│  │  │         $20.00             │ │ │ ← Input
│  │  └────────────────────────────┘ │ │
│  │                                  │ │
│  │  Cambio:           $0.46         │ │
│  └──────────────────────────────────┘ │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │     [Completar Venta]            │ │ ← Primary action
│  └──────────────────────────────────┘ │
│                                        │
├────────────────────────────────────────┤
│  [🏠] [💰] [📦] [💵] [📊]              │
└────────────────────────────────────────┘
```

---

### Component State Matrix

#### Button States

```
┌──────────────────────────────────────────────────────────┐
│ State          │ Visual                                  │
├────────────────┼─────────────────────────────────────────┤
│ Default        │  [    Submit Order    ]                 │
│                │  bg-primary text-white                  │
├────────────────┼─────────────────────────────────────────┤
│ Hover          │  [    Submit Order    ]                 │
│                │  bg-primary/90 (10% darker)             │
├────────────────┼─────────────────────────────────────────┤
│ Active/Press   │  [   Submit Order   ]  ← Scale 0.95     │
│                │  bg-primary shadow-none                 │
├────────────────┼─────────────────────────────────────────┤
│ Focus          │  [    Submit Order    ]                 │
│                │  ring-2 ring-ring ring-offset-2         │
├────────────────┼─────────────────────────────────────────┤
│ Loading        │  [  ⟳  Loading...    ]                 │
│                │  opacity-50 cursor-wait                 │
├────────────────┼─────────────────────────────────────────┤
│ Disabled       │  [    Submit Order    ]                 │
│                │  opacity-50 cursor-not-allowed          │
└────────────────┴─────────────────────────────────────────┘
```

#### Navigation Item States

```
┌──────────────────────────────────────────────────────────┐
│ State          │ Visual                                  │
├────────────────┼─────────────────────────────────────────┤
│ Inactive       │     [📦]                                │
│                │   Inventory  (gray #7A7A80)             │
├────────────────┼─────────────────────────────────────────┤
│ Active         │     [📦]                                │
│                │   Inventory  (dark #22223B)             │
│                │      •       (dot indicator)            │
├────────────────┼─────────────────────────────────────────┤
│ With Badge     │     [📦] (8)                            │
│                │   Inventory  (red badge)                │
├────────────────┼─────────────────────────────────────────┤
│ Pressed        │     [📦]                                │
│                │   Inventory  (scale 0.95)               │
│                │              (bg-secondary)             │
└────────────────┴─────────────────────────────────────────┘
```

---

### Before/After Comparisons

#### Desktop vs Mobile Layout

```
DESKTOP (≥1024px):
┌───┬─────────────────────────────────────────┐
│   │  Omnia Management › Dashboard   [🔄][👤]│
│ S ├─────────────────────────────────────────┤
│ i │                                         │
│ d │  ┌───────────────┐  ┌───────────────┐  │
│ e │  │ Metric Card 1 │  │ Metric Card 2 │  │
│ b │  └───────────────┘  └───────────────┘  │
│ a │                                         │
│ r │  ┌─────────────────────────────────┐   │
│   │  │  Data Table (wide columns)      │   │
│   │  │  [Edit] [Delete] [View]         │   │
│   │  └─────────────────────────────────┘   │
└───┴─────────────────────────────────────────┘

MOBILE (<640px):
┌─────────────────────────────────────┐
│  [←]    Dashboard      [🔄]  [☰]    │ ← Mobile header
├─────────────────────────────────────┤
│                                     │
│  ┌───────────────────────────────┐ │
│  │  Metric Card 1                │ │ ← Full width
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  Metric Card 2                │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  Product Item                 │ │ ← Card-based list
│  │  Stock: 45                    │ │
│  │  [View Details →]             │ │
│  └───────────────────────────────┘ │
│                                     │
├─────────────────────────────────────┤
│  [🏠]  [💰]  [📦]  [💵]  [📊]       │ ← Bottom nav
└─────────────────────────────────────┘
```

---

## 🎯 Implementation Checklist

### Phase 1: Foundation ✅
- [ ] Create `lib/breakpoints.config.ts`
- [ ] Implement `hooks/use-responsive.ts`
- [ ] Build `bottom-navigation.tsx` component
- [ ] Build `mobile-header.tsx` component
- [ ] Refactor `app/(app)/layout.tsx`
- [ ] Add touch button variants to `button.tsx`
- [ ] Optimize `input.tsx` for mobile
- [ ] Update `card.tsx` with touch states
- [ ] Create `use-haptic-feedback.ts` hook
- [ ] Create `use-touch-gestures.ts` hook
- [ ] Write unit tests (>95% coverage)
- [ ] Test on real devices
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Performance audit (Lighthouse >90)

### Design System Documentation ✅
- [x] Design tokens defined
- [x] Component specifications complete
- [x] Visual examples provided
- [x] Accessibility guidelines documented
- [x] Dark mode specifications included
- [x] Animation guidelines defined
- [x] Implementation examples ready

---

## 📚 Quick Reference

### Common Tailwind Classes

```css
/* Touch Targets */
h-11 w-11        → 44x44px (iOS minimum)
h-12 w-12        → 48x48px (Android comfortable)
h-14             → 56px (header/nav height)

/* Spacing */
p-4              → 16px padding
gap-3            → 12px gap
space-y-6        → 24px vertical spacing

/* Typography */
text-base        → 16px (prevents iOS zoom)
text-sm          → 14px
text-xs          → 12px

/* Borders & Radius */
rounded-lg       → 8px
rounded-md       → 6px
rounded-full     → 9999px

/* Shadows */
shadow-sm        → Light shadow
shadow-lg        → Navigation shadow

/* Transitions */
transition-all duration-150     → Button press
transition-colors duration-200  → Color changes
transition-transform duration-300 → Sheet slides

/* States */
active:scale-95           → Press feedback
active:bg-secondary       → Background change
hover:bg-secondary        → Hover state
focus-visible:ring-2      → Keyboard focus
```

### Color Variables

```tsx
bg-background          // Page background
bg-card                // Card background
text-foreground        // Primary text
text-muted-foreground  // Secondary text
border-border          // Borders
bg-primary             // Primary button
text-primary-foreground // Button text
bg-secondary           // Secondary button
bg-destructive         // Error/delete
bg-success             // Success
bg-warning             // Warning
```

---

## ✅ Completion Checklist

- [x] Design tokens documented
- [x] Bottom navigation specified
- [x] Mobile header specified
- [x] Touch components detailed
- [x] Layout patterns defined
- [x] POS module previewed
- [x] Micro-interactions documented
- [x] Dark mode specified
- [x] Accessibility guidelines provided
- [x] Visual examples created

---

**Status**: ✅ COMPLETE - Ready for Phase 1 Implementation  
**Next Step**: Review specifications → Create feature branch → Begin implementation  
**Questions**: Reference MOBILE_ADAPTATION_SDD.md for technical details
