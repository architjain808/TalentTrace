# UI Redesign Reference — Master Design System

> **Purpose**: This document is a hard instruction set for redesigning every screen of the application. It captures the exact design language, color system, typography, iconography, spacing, animation, and interaction patterns derived from the reference UI. Every screen must comply with these rules. No deviation unless explicitly overridden per-screen below.

---

## 1. Design Philosophy

The design follows a **Premium Nature-Fintech** aesthetic — a blend of deep forest greens, organic gradients, and clean modern interfaces. It communicates trust, growth, and sophistication. The overall feel is **modern, premium, and effortlessly clean** with generous white space, soft shadows, and rounded organic shapes.

**Core Principles:**
- **Clarity over cleverness** — every element serves a purpose
- **Depth through layering** — cards float above gradient backgrounds using elevation and blur
- **Organic premium** — rounded corners, fluid gradients, nature-inspired palette
- **Motion as meaning** — animations reinforce hierarchy and spatial relationships, never decorative-only
- **Mobile-first** — every design decision optimized for thumb-zone and one-handed use

---

## 2. Color System

### 2.1 Core Palette

| Token Name | Hex Code | Usage |
|---|---|---|
| `--color-primary-dark` | `#144516` | Primary brand, headers, dark backgrounds, nav bars |
| `--color-primary` | `#416943` | Secondary surfaces, card backgrounds, icons |
| `--color-accent` | `#B0EC70` | CTAs, active states, highlights, badges, chart accents |
| `--color-surface-light` | `#D7E2D6` | Light card backgrounds, input fields, muted surfaces |
| `--color-background` | `#FFFFFF` | Page background, card surfaces |
| `--color-background-dark` | `#0D2E10` | Deep background for onboarding/splash, gradients |
| `--color-text-primary` | `#1A1A1A` | Primary body text on light surfaces |
| `--color-text-secondary` | `#6B7B6E` | Secondary/muted text, timestamps, labels |
| `--color-text-on-dark` | `#FFFFFF` | Text on dark/primary backgrounds |
| `--color-success` | `#4CAF50` | Positive amounts, deposit indicators |
| `--color-danger` | `#E53935` | Negative amounts, errors, warnings |
| `--color-danger-light` | `#FFEBEE` | Danger background tint |

### 2.2 Gradient Definitions

| Gradient Name | Definition | Usage |
|---|---|---|
| `gradient-hero` | `linear-gradient(160deg, #144516 0%, #0D2E10 50%, #1A5C1F 100%)` | Onboarding/landing hero backgrounds |
| `gradient-balance-card` | `linear-gradient(135deg, #144516 0%, #2D5A30 40%, #416943 100%)` | Balance display cards, report header cards |
| `gradient-bottom-fade` | `linear-gradient(180deg, transparent 0%, #144516 100%)` | Bottom fade on screens with dark lower section |
| `gradient-accent-glow` | `radial-gradient(circle, #B0EC70 0%, transparent 70%)` | Subtle glow behind accent elements |
| `gradient-surface` | `linear-gradient(180deg, #FFFFFF 0%, #D7E2D6 100%)` | Subtle surface gradient for depth on white cards |

### 2.3 Color Usage Rules

- **Never use raw hex values in components.** Always reference semantic tokens.
- **Dark backgrounds** (`--color-primary-dark`, `--color-background-dark`) are reserved for: onboarding screens, balance cards, bottom navigation bars, and report header cards.
- **Accent color** (`#B0EC70` lime-green) is used sparingly — only for: primary CTAs, active navigation indicators, chart highlight points, toggle/switch active states, and badges. Never as a background fill for large areas.
- **Positive monetary values** use `--color-success`. **Negative monetary values** use `--color-danger`. Always prefix with `+` or `-` sign.
- **All text on dark backgrounds** must meet WCAG AA contrast ratio of 4.5:1 minimum. The accent lime `#B0EC70` on `#144516` passes at 5.2:1 — approved for labels and small highlights.
- **Surface layering order**: Page background (`#FFFFFF`) → Card surface (`#FFFFFF` with shadow) → Inner element surface (`#D7E2D6`) → Balance card (`gradient-balance-card`).

---

## 3. Typography

### 3.1 Font Family

| Role | Font | Weight | Fallback |
|---|---|---|---|
| **Primary / UI** | `Instrument Sans` | 400 (Regular), 500 (Medium), 600 (SemiBold), 700 (Bold) | `SF Pro Display`, `-apple-system`, `system-ui`, `sans-serif` |
| **Display / Hero** | `Instrument Sans` | 700 (Bold) | Same fallback chain |
| **Monospace / Numbers** | `Instrument Sans` with `font-variant-numeric: tabular-nums` | 600–700 | `SF Mono`, `monospace` |

> **Import**: Load from Google Fonts — `https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&display=swap`

### 3.2 Type Scale

| Token | Size | Weight | Line Height | Letter Spacing | Usage |
|---|---|---|---|---|---|
| `--type-display` | 40px / 2.5rem | 700 | 1.1 | -0.02em | Hero headlines on landing/onboarding |
| `--type-h1` | 32px / 2rem | 700 | 1.2 | -0.01em | Balance amounts (e.g., "$87,890") |
| `--type-h2` | 24px / 1.5rem | 600 | 1.3 | -0.005em | Section titles ("Recent Transaction", "Report") |
| `--type-h3` | 20px / 1.25rem | 600 | 1.35 | 0 | Card titles, sub-section headers |
| `--type-body` | 16px / 1rem | 400 | 1.5 | 0 | Body text, descriptions, list items |
| `--type-body-medium` | 16px / 1rem | 500 | 1.5 | 0 | Emphasized body text, names in lists |
| `--type-label` | 14px / 0.875rem | 500 | 1.4 | 0.01em | Labels, button text, navigation labels |
| `--type-caption` | 12px / 0.75rem | 400 | 1.4 | 0.02em | Timestamps, secondary info, helper text |
| `--type-overline` | 11px / 0.6875rem | 600 | 1.5 | 0.08em | Overline labels (e.g., "Total Balance"), uppercase |

### 3.3 Typography Rules

- **Monetary amounts** always use `--type-h1` or larger with `font-variant-numeric: tabular-nums` to prevent layout shift when digits change.
- **Dollar sign** in large balance displays is rendered at ~60% of the main amount size and vertically aligned to the top (superscript positioning).
- **Never go below 12px** for any text. Minimum touch-target associated text is 14px.
- **Italic styling** is not used anywhere in this design system. Use weight variation instead for emphasis.
- **Text truncation**: Use ellipsis (`...`) with a tooltip/expand for names and account numbers. Account numbers are masked: show first 3 and last 2 digits (e.g., `565*********89`).
- **"Effortlessly"** — hero display text uses italic styling ONLY on the landing/onboarding screen for the tagline word. This is the single exception.

---

## 4. Iconography

### 4.1 Icon Library

**Primary**: Use `Lucide Icons` (lucide-react / lucide-react-native) as the sole icon library. Consistent 24px base size, 1.5px stroke weight.

**Fallback**: If Lucide does not have a needed icon, use `Phosphor Icons` with matching stroke weight.

### 4.2 Icon Specifications

| Context | Size | Stroke | Color |
|---|---|---|---|
| Navigation bar icons | 24px | 1.5px | `--color-text-secondary` (inactive), `--color-accent` (active) |
| Action buttons (Send, Receive, Withdraw) | 24px inside 48px container | 1.5px | `--color-primary-dark` |
| Transaction list icons | 40px avatar or 24px icon | — | Contextual |
| Header utility icons (notification, settings) | 20px | 1.5px | `--color-text-primary` or `--color-text-on-dark` |
| Inline text icons | 16px | 1.5px | Inherit text color |

### 4.3 Icon Rules

- **Never use emojis as icons.** All icons must be vector-based SVGs from the approved library.
- **Filled vs Outline**: Use **outline** style for all navigation and action icons. Use **filled** style only for the currently active navigation tab icon.
- **Icon containers**: Action icons (Send, Receive, Withdraw, More) sit inside a 48×48px rounded container with `background: --color-surface-light` and `border-radius: 12px`.
- **Notification badge**: Small 8px filled circle in `--color-danger` positioned top-right of the bell icon, offset by -2px.
- **Icon + Label pattern**: Navigation and action icons always have a label below them. Label uses `--type-caption` at 12px, centered beneath the icon with 4px gap.

---

## 5. Spacing & Layout System

### 5.1 Base Grid

All spacing follows an **8dp base grid**. The permitted spacing values are:

| Token | Value | Usage |
|---|---|---|
| `--space-2xs` | 2px | Micro adjustments only (badge offset) |
| `--space-xs` | 4px | Icon-to-label gap, tight inline spacing |
| `--space-sm` | 8px | Inner padding of compact elements, gap between list items |
| `--space-md` | 12px | Card inner padding (compact), between icon and text |
| `--space-base` | 16px | Standard content padding, section gap |
| `--space-lg` | 20px | Screen horizontal padding (safe area) |
| `--space-xl` | 24px | Section separator spacing |
| `--space-2xl` | 32px | Major section breaks |
| `--space-3xl` | 40px | Top/bottom page padding |
| `--space-4xl` | 48px | Hero section vertical spacing |

### 5.2 Screen Layout Rules

- **Screen horizontal padding**: 20px on both sides (consistent across all screens).
- **Safe area compliance**: All content respects top safe area (status bar) and bottom safe area (home indicator/gesture bar). Fixed bottom navigation adds padding below the bar for the gesture indicator.
- **Card border radius**: 16px for primary cards (balance card, report card), 12px for secondary cards and containers, 8px for inputs and small elements, and fully rounded (9999px) for pills, tags, and avatars.
- **Card elevation**: Primary cards use `box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08)`. Secondary cards use `box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05)`.
- **Section structure**: Each section has a header row (title left-aligned + "See More >" link right-aligned) followed by 8px gap to content.
- **List item height**: Minimum 64px per transaction row (avatar 40px + padding), with 8px vertical gap between items.

### 5.3 Avatar System

| Context | Size | Shape |
|---|---|---|
| Quick Send contacts | 48px | Circle |
| Transaction list | 40px | Circle |
| Send Money recipient header row | 48px | Circle |
| Send Money top contact strip | 36px | Circle |

- Avatars use a 2px border in `--color-surface-light` when on white backgrounds.
- The "Add" contact button in Quick Send uses a 48px circle with dashed 2px border in `--color-text-secondary` and a `+` icon centered.

---

## 6. Component Specifications

### 6.1 Buttons

#### Primary CTA Button
```
Background: --color-accent (#B0EC70)
Text: --color-primary-dark (#144516)
Font: --type-label (14px, 500 weight)
Height: 48px
Border Radius: 24px (pill shape)
Padding: 0 24px
Shadow: 0 4px 16px rgba(176, 236, 112, 0.3)
```
- **Press state**: Scale to 0.97, shadow reduces to `0 2px 8px rgba(176, 236, 112, 0.2)`, duration 150ms
- **Disabled state**: Opacity 0.4, no shadow, no press animation

#### Secondary Button
```
Background: transparent
Border: 1.5px solid --color-primary (#416943)
Text: --color-primary (#416943)
Font: --type-label
Height: 44px
Border Radius: 22px
```

#### Ghost/Text Button (e.g., "See More >")
```
Background: none
Text: --color-primary (#416943)
Font: --type-caption (12px, 500 weight)
Padding: 4px 0
```
- Includes a small 12px chevron-right icon inline after text.

#### Icon Action Button (Send, Receive, Withdraw, More)
```
Container: 48x48px
Background: --color-surface-light (#D7E2D6)
Border Radius: 12px
Icon: 24px, --color-primary-dark
Label below: --type-caption, --color-text-primary, 4px gap
```
- **Press state**: Background darkens to `#C5D4C4`, scale 0.95, spring animation 200ms

#### Segmented Control (Today / This week / This Month)
```
Container Background: --color-surface-light (#D7E2D6), border-radius 20px, height 32px
Active Segment: background --color-accent (#B0EC70), text --color-primary-dark, border-radius 16px
Inactive Segment: background transparent, text --color-text-secondary
Font: --type-caption (12px, 500)
Transition: background 200ms ease-out, color 150ms ease-out
```

#### Deposit / Payment Toggle (Report Screen)
```
Container: full-width row, two equal segments
Active: background --color-accent, text --color-primary-dark, border-radius 12px
Inactive: background --color-surface-light, text --color-text-secondary
Height: 44px
Font: --type-label (14px, 500)
Transition: 250ms ease-out with sliding background indicator
```

### 6.2 Balance Card

```
Width: 100% (screen width - 40px horizontal padding)
Height: auto (~140px)
Background: gradient-balance-card
Border Radius: 16px
Padding: 20px
Shadow: 0 8px 32px rgba(20, 69, 22, 0.25)
```

**Internal layout:**
- Top-right: QR/scan icon button, 32×32px, semi-transparent white background (rgba 255,255,255,0.15), border-radius 8px
- "Total Balance" label: `--type-overline`, uppercase, color `rgba(255,255,255,0.7)`
- Balance amount: `--type-h1` (32px, Bold), color `#FFFFFF`, `$` sign at ~60% size superscript
- Bottom row: action buttons evenly distributed in a flex row

### 6.3 Transaction List Item

```
Height: 64px
Layout: Row — [Avatar 40px] [12px gap] [Name + Timestamp column, flex-grow] [Amount, right-aligned]
Background: transparent (no card wrapping individual items)
Separator: none (rely on spacing, not divider lines)
```

- **Name**: `--type-body-medium` (16px, 500), `--color-text-primary`
- **Timestamp**: `--type-caption` (12px, 400), `--color-text-secondary`
- **Positive amount**: `--type-body-medium`, `--color-success`, prefixed `+$`
- **Negative amount**: `--type-body-medium`, `--color-danger`, prefixed `-$`
- **Transaction type label** (Pay, Deposit): `--type-caption`, `--color-text-secondary`, right-aligned below amount

### 6.4 Number Pad (Send Money Screen)

```
Grid: 4 rows × 3 columns
Button Size: 64×64px
Border Radius: 32px (circle)
Background: rgba(255, 255, 255, 0.6) — frosted/translucent
Text: --type-h2 (24px, 600), --color-text-primary
Gap: 12px between buttons
```

- **Press state**: background changes to `rgba(176, 236, 112, 0.3)`, scale 0.92, spring animation 120ms
- **Delete button (×)**: Same dimensions, icon 20px, same press behavior
- **Decimal button (.)**: Same dimensions and styling as number buttons
- **Continue button**: Full-width below the pad, primary CTA style (accent green pill), with a small arrow-right icon

### 6.5 Bottom Navigation Bar

```
Height: 64px + safe area bottom inset
Background: --color-primary-dark (#144516)
Border Radius: 24px 24px 0 0 (top corners only)
Shadow: 0 -4px 20px rgba(0, 0, 0, 0.15)
Items: 4 tabs, evenly spaced
```

- **Active tab**: Icon uses filled variant, color `--color-accent` (#B0EC70), label `--color-accent`
- **Inactive tab**: Icon uses outline variant, color `rgba(255, 255, 255, 0.5)`, label same
- **Label font**: `--type-caption` (11px, 500)
- **Icon-to-label gap**: 4px
- **Active indicator**: Small 4px dot below the active icon, color `--color-accent`, with a subtle glow (`box-shadow: 0 0 8px rgba(176, 236, 112, 0.5)`)

### 6.6 Charts (Report Screen)

```
Type: Area line chart (filled below the line)
Line Color: --color-accent (#B0EC70)
Fill: linear-gradient(180deg, rgba(176, 236, 112, 0.4) 0%, rgba(176, 236, 112, 0) 100%)
Line Width: 2px
Data Point Highlight: 8px circle, fill --color-accent, border 3px solid white, shadow 0 2px 8px rgba(0,0,0,0.15)
Tooltip: Pill-shaped, background --color-accent, text --color-primary-dark, font --type-caption bold
X-Axis Labels: --type-caption, --color-text-secondary
Y-Axis: Hidden (no visible Y-axis to keep it clean)
Grid Lines: Horizontal only, color rgba(0,0,0,0.05), dashed
```

- **Weekly dropdown**: Small pill selector, border 1px `--color-text-secondary`, border-radius 16px, with a small chevron-down icon.
- **"-2% vs Last Month"**: Displayed in `--color-danger`, `--type-caption`, positioned below the dollar amount.

### 6.7 Input Fields

```
Height: 48px
Background: --color-surface-light (#D7E2D6)
Border: none (no visible border in default state)
Border Radius: 12px
Padding: 0 16px
Font: --type-body (16px, 400)
Text Color: --color-text-primary
Placeholder Color: --color-text-secondary
```

- **Focus state**: Border `2px solid --color-accent`, background shifts to `#FFFFFF`, shadow `0 0 0 4px rgba(176, 236, 112, 0.15)`
- **Error state**: Border `2px solid --color-danger`, helper text in `--color-danger` below at 12px
- **Transition**: All state changes animate at 200ms ease-out

---

## 7. Animation & Motion System

### 7.1 Core Principles

Every animation in this app must convey spatial meaning. Forward navigation moves content left/up. Backward navigation moves content right/down. Elements enter from below and exit upward. Modals/sheets rise from their trigger point.

### 7.2 Timing Tokens

| Token | Duration | Easing | Usage |
|---|---|---|---|
| `--motion-instant` | 100ms | `ease-out` | Button press feedback, toggle switches |
| `--motion-fast` | 150ms | `ease-out` | Micro-interactions: hover, focus, press states |
| `--motion-normal` | 250ms | `cubic-bezier(0.33, 1, 0.68, 1)` | Card transitions, tab switches, list reveals |
| `--motion-slow` | 400ms | `cubic-bezier(0.16, 1, 0.3, 1)` | Page transitions, modal enter, hero animations |
| `--motion-spring` | 500ms | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Bouncy elements: FAB, tooltips, chart points |
| `--motion-exit` | 180ms | `ease-in` | All exit animations (60–70% of enter duration) |

### 7.3 Required Animations (Per Screen)

#### Landing / Onboarding Screen
- **Hero image**: Fades in and scales from 0.9 → 1.0 over 600ms with `cubic-bezier(0.16, 1, 0.3, 1)`, starts 200ms after screen mount.
- **Floating coins/elements**: Gentle continuous floating animation — `translateY` oscillation of ±8px over 3s with `ease-in-out`, infinite loop. Stagger each element by 400ms.
- **Headline text**: Slides up from 30px below + fades in, 500ms, staggered by word (each word delays 80ms).
- **CTA button**: Slides up from 20px below + fades in, 400ms, starts after headline completes.
- **Background gradient**: Slow animated gradient shift — hue rotation or position movement over 8–10s, very subtle, looping.

#### Home Screen
- **Balance card**: Slides down from -20px + fades in, 350ms, `--motion-normal` easing.
- **Balance number**: Counter animation — numbers roll/count up from $0 to actual value over 800ms with deceleration easing.
- **Action buttons row**: Stagger entrance from left, each button delays 50ms, slides up 15px + fade, 250ms each.
- **Quick Send avatars**: Stagger entrance, each delays 40ms, scale from 0.8 → 1.0 + fade, 200ms each.
- **Transaction list items**: Stagger entrance from bottom, each delays 30ms, slides up 10px + fade, 200ms each. Load up to 4 visible items initially.
- **Pull-to-refresh**: Balance card scales to 0.98, a circular loader spins at the top, then content slides back with spring physics.

#### Send Money Screen
- **Screen entry**: Slides in from right (forward navigation), 350ms.
- **Recipient row**: Fade in + slide down, 200ms.
- **Amount display**: Numbers animate on keypress — each digit slides in from below with 100ms spring animation. Delete causes digit to slide out upward.
- **Number pad**: Grid fades in as a unit, 250ms, with a very subtle scale from 0.98.
- **Continue button**: When amount > 0, button slides up from below bottom edge, 300ms spring. When amount = 0, button is hidden or dimmed.

#### Report Screen
- **Balance card**: Same as Home screen entrance.
- **Deposit/Payment toggle**: Indicator slides between segments with spring physics, 250ms.
- **Chart**: Line draws in from left to right over 800ms with easing. Fill area fades in 200ms after line completes. Data point dots pop in (scale 0 → 1) sequentially with 50ms stagger after line draw.
- **Tooltip**: Appears on data point interaction — scale from 0.8 + fade, 150ms, anchored to the point with a small triangle connector.
- **History list below**: Same stagger pattern as transaction list on Home.

#### Screen Transitions (Global)
- **Forward navigation** (e.g., Home → Send Money): New screen slides in from right, current screen slides out left + subtle opacity reduction to 0.9. Duration 350ms.
- **Back navigation**: Reverse — current screen slides out right, previous screen slides in from left. Duration 280ms (exit-faster-than-enter rule).
- **Tab switch** (bottom nav): Crossfade with 200ms duration. No directional slide for tab switches.
- **Modal/Sheet entry**: Slides up from bottom, background dims to `rgba(0,0,0,0.4)` over 300ms. Sheet has slight spring overshoot.
- **Modal/Sheet exit**: Slides down, background clears, 200ms (faster exit).

### 7.4 Animation Rules

- **Always use `transform` and `opacity`** for animations. Never animate `width`, `height`, `top`, `left`, `margin`, or `padding`.
- **Respect `prefers-reduced-motion`**: When enabled, replace all motion with instant opacity crossfades (150ms). Disable floating/looping animations entirely.
- **Maximum 2 simultaneous moving elements** per viewport at any time (excluding staggered lists where items enter sequentially).
- **All animations must be interruptible** — if the user taps during an animation, it must cancel gracefully and respond to the tap.
- **No animation should block user input.** The UI must remain interactive at all times.
- **Spring physics preferred** for interactive elements (drag, press, bounce-back). Use `react-native-reanimated` or `framer-motion` (web) for spring curves.

### 7.5 Recommended Animation Libraries

| Platform | Library | Purpose |
|---|---|---|
| React Native | `react-native-reanimated` v3+ | All animations, spring physics, gesture-driven |
| React Native | `react-native-gesture-handler` | Swipe, pan, drag interactions |
| React Native | `moti` (built on Reanimated) | Declarative animation components |
| React Web | `framer-motion` | Page transitions, layout animations, springs |
| React Web | `@react-spring/web` | Spring physics, interactive animations |
| CSS (Web) | Native CSS transitions/animations | Simple state changes, hover effects |
| Charts | `react-native-skia` or `victory-native` | Animated chart drawing |

---

## 8. Screen-by-Screen Redesign Instructions

### 8.1 Landing / Onboarding Screen

**Layout Structure:**
1. Full-screen dark background using `gradient-hero` (deep green to near-black)
2. Large 3D-style hero image/illustration occupying top ~55% of screen — depicting the app's core value proposition. Use a high-quality rendered illustration, not flat icons. The reference uses a 3D wallet with floating coins. Adapt this to your use case with an equally bold, dimensional hero image.
3. Decorative curved accent lines in `--color-accent` sweeping across the background behind the hero image, creating depth and movement.
4. Bottom ~45% contains:
   - Headline in `--type-display` (40px Bold, white): Two-line tagline. Second line's key word in italic `--color-accent` color.
   - 32px gap
   - Primary CTA button: Full width (screen - 40px padding), white background, dark text, pill shaped, with a circular arrow-right icon on the right edge.
   - 16px gap
   - Secondary text link: "Already Have Account? Log In" in `--type-label`, white, centered.

**Critical Design Notes:**
- The hero image must be LARGE and BOLD. It should feel immersive — not a small centered icon. Think full-bleed, edge-to-edge visual impact.
- The accent curves/lines behind the hero are NOT just decoration — they guide the eye downward toward the CTA.
- Background has a very subtle grain/noise texture overlay at 3–5% opacity for organic depth.
- Status bar text is white (light content mode) on this screen.

**Animations (see Section 7.3 for details):**
- Hero image entrance with scale + fade
- Floating elements with continuous gentle oscillation
- Staggered headline word reveal
- CTA slide-up entrance

### 8.2 Home Screen

**Layout Structure (top to bottom):**
1. **Header row** (top safe area + 16px):
   - Left: Greeting text — "Hello, [Name]" in `--type-h3` (20px, 600) + "Welcome back" in `--type-caption` below, both `--color-text-primary`
   - Right: Notification bell icon (20px) with optional badge + Profile avatar (36px circle)
2. **Balance Card** (16px below header):
   - Full-width, gradient background, 16px border-radius
   - Contains: "Total Balance" overline, large dollar amount, and a row of 4 action icon buttons (Send, Receive, Withdraw, More) at the bottom of the card
3. **Quick Send Section** (24px below card):
   - Section header: "Quick Send" left + "See More >" right
   - Horizontal scrollable row of contact avatars (48px circles) with names below (12px), 12px gap between each. Last item is a "+" add button with dashed circle border.
4. **Recent Transactions Section** (24px below):
   - Section header: "Recent Transaction" left + "See More >" right
   - Segmented control filter: "Today | This week | This Month"
   - Vertical list of transaction items (see Component 6.3)
5. **Bottom Navigation Bar** (fixed at bottom):
   - 4 tabs: Home, Wallet/Cards, History/Clock, Profile
   - Dark background, rounded top corners

**Scroll Behavior:**
- Balance card and Quick Send are fixed above the fold. Transaction list scrolls beneath them.
- On scroll, balance card can optionally compress (parallax) — reducing height by ~30% with the balance amount remaining visible. This is optional but adds polish.

### 8.3 Send Money Screen

**Layout Structure:**
1. **Top bar**: Back arrow (left) + "Send Money" title (center) + settings/options icon (right). Below the bar, a horizontal scrollable strip of recent contact avatars (36px, 8px gap).
2. **Recipient card** (16px below):
   - "Send to" label in `--type-caption`
   - Row: Avatar (48px) + Name (`--type-body-medium`) and masked account number (`--type-caption`) + "Change" text button (right)
   - Background: `--color-surface-light`, border-radius 12px, padding 16px
3. **Amount display** (centered, 32px below):
   - Large amount in `--type-h1` or larger (36px+), `--color-text-primary`
   - "Balance $X,XXX.X" label below in `--type-caption`, `--color-text-secondary`
   - The amount field should have a blinking cursor indicator
4. **Number pad** (see Component 6.4):
   - Centered grid, generous padding around it
   - Background of this area can have a subtle `gradient-bottom-fade` wash
5. **Continue button** (full width, bottom-anchored above safe area):
   - Primary CTA style: accent green pill with arrow-right icon

**Key Interactions:**
- Tapping a contact in the top strip auto-fills recipient
- Number pad keys provide haptic feedback + visual press state
- Amount updates in real-time with smooth digit animation
- "Change" button opens a bottom sheet with contact search

### 8.4 Report Screen

**Layout Structure:**
1. **Top bar**: "Report" title (left, `--type-h2`) + download icon + calendar/date-filter icon (right)
2. **Balance summary card** (same as Home balance card, full gradient, showing total balance)
3. **Deposit / Payment toggle** (16px below):
   - Full-width two-segment toggle
   - Active segment uses accent green background with sliding indicator animation
4. **Amount + Trend** (16px below):
   - Dollar amount (`--type-h2`, bold) on the left
   - "-2% vs Last Month" trend indicator in red below the amount
   - "Weekly" dropdown pill on the right
5. **Chart area** (16px below):
   - Area line chart showing weekly spending/income trend
   - X-axis: Mon–Sun labels
   - Interactive data points with tooltip on tap
   - See Component 6.6 for exact chart specs
6. **History section** (24px below chart):
   - "History" section header
   - Transaction list items (same pattern as Home screen)
7. **Bottom Navigation Bar** (fixed, "Report" tab active)

---

## 9. Responsive & Adaptive Rules

- **All designs are mobile-first.** The primary target is 375px–428px width (iPhone SE to iPhone Pro Max).
- **Tablet (768px+):** Increase horizontal padding to 32px. Balance card max-width 600px, centered. Transaction list can use a two-column layout.
- **Large phones (428px+):** Same layout as standard mobile, but increase card internal padding by 4px and allow chart to expand.
- **Orientation**: Lock to portrait for all financial screens (Send Money, Report). Home may support landscape with a two-column layout (balance card left, transactions right).

---

## 10. Dark Mode Considerations

While the reference design is light-mode dominant with dark accent areas, if implementing a full dark mode:

| Light Mode Token | Dark Mode Override |
|---|---|
| `--color-background` (#FFFFFF) | `#0D1F0F` (very dark green-black) |
| `--color-surface-light` (#D7E2D6) | `#1A3A1D` (dark muted green) |
| Card backgrounds (white) | `#142816` (dark green surface) |
| `--color-text-primary` (#1A1A1A) | `#E8F0E8` (soft white-green) |
| `--color-text-secondary` (#6B7B6E) | `#8FA893` (muted sage) |
| `--color-accent` (#B0EC70) | `#B0EC70` (unchanged — it's the brand accent) |
| Shadows | Reduce opacity by 50% or replace with border glow |

- **Never invert the balance card or bottom nav** — these are already dark and remain unchanged in dark mode.
- **Charts**: Line and fill colors remain the same. Grid lines become `rgba(255,255,255,0.05)`.

---

## 11. Accessibility Checklist

Every screen must pass these checks before shipping:

- [ ] All text meets WCAG AA contrast (4.5:1 body, 3:1 large text)
- [ ] All interactive elements have minimum 44×44px touch targets
- [ ] Touch targets have minimum 8px spacing between them
- [ ] All icons have `aria-label` / `accessibilityLabel` descriptions
- [ ] Screen reader focus order matches visual top-to-bottom, left-to-right order
- [ ] Form fields have visible labels (not placeholder-only)
- [ ] Error states include both color AND text/icon indicators
- [ ] `prefers-reduced-motion` disables all motion except essential state changes
- [ ] Dynamic Type / system font scaling is supported without layout breakage
- [ ] Monetary amounts use `tabular-nums` to prevent layout shift
- [ ] Color is never the sole indicator of information (positive/negative amounts also have +/- prefix)

---

## 12. Asset & Image Guidelines

### 12.1 Hero / Onboarding Images
- Use high-quality 3D rendered illustrations or premium stock imagery
- Minimum resolution: 2x (750px wide for 375px screen)
- Format: WebP with PNG fallback
- Style: Dimensional, with depth — not flat illustrations. Match the organic-premium aesthetic with green tones.

### 12.2 Avatars
- Use real photographs for user avatars (or high-quality generated faces for demos)
- Circular crop with 2px white border
- Lazy-load avatars below the fold
- Provide a fallback: circle with user initials in `--color-primary` background, white text

### 12.3 Background Textures
- Subtle noise grain overlay: 3–5% opacity, blended as `multiply` or `overlay`
- Optional: Abstract 3D green shapes (translucent, blurred) floating in backgrounds of marketing/onboarding screens for depth. These should be heavily blurred (`blur(40px)`) and low opacity (20–30%).

---

## 13. External Libraries & Dependencies

### Required

| Library | Version | Purpose |
|---|---|---|
| `Instrument Sans` (Google Fonts) | Latest | Primary typeface |
| `lucide-react` / `lucide-react-native` | Latest | Icon system |
| `framer-motion` (Web) or `react-native-reanimated` (Native) | v11+ / v3+ | Animation engine |
| `react-native-gesture-handler` (Native) | Latest | Gesture interactions |

### Recommended

| Library | Purpose |
|---|---|
| `moti` | Declarative animations for React Native |
| `react-native-skia` | High-performance charts and custom drawing |
| `victory-native` or `recharts` (web) | Charting library |
| `react-native-safe-area-context` | Safe area handling |
| `react-native-haptics` / `expo-haptics` | Haptic feedback on key presses |
| `lottie-react-native` | Complex animated illustrations (onboarding) |

---

## 14. Quick Reference Cheat Sheet

```
COLORS:    Dark Green #144516  |  Mid Green #416943  |  Lime #B0EC70  |  Light #D7E2D6  |  White #FFFFFF
FONT:      Instrument Sans (400, 500, 600, 700)
RADIUS:    16px cards  |  12px containers  |  8px inputs  |  9999px pills
SPACING:   8dp grid  |  20px screen padding  |  24px section gaps
SHADOWS:   Primary: 0 4px 24px rgba(0,0,0,0.08)  |  Elevated: 0 8px 32px rgba(20,69,22,0.25)
ANIMATION: 150ms micro  |  250ms normal  |  400ms page  |  always ease-out enter, ease-in exit
ICONS:     Lucide, 24px, 1.5px stroke, outline default, filled for active state
NAV:       Dark green bar, 64px + safe area, 4 tabs max, lime accent for active
```

---

> **Usage**: Reference this document before and during every screen redesign. Paste relevant sections into your AI/design prompts. When asking for a screen redesign, specify: "Follow the UI Redesign Reference document. Apply Section [X] for [component]. Use the exact color tokens, spacing, typography, and animation specifications defined."
