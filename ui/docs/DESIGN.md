---
name: Neutral Monochrome Technical System
colors:
  surface: '#0c160a'
  surface-dim: '#0c160a'
  surface-bright: '#313c2e'
  surface-container-lowest: '#071106'
  surface-container-low: '#141e12'
  surface-container: '#182216'
  surface-container-high: '#222d20'
  surface-container-highest: '#2d382a'
  on-surface: '#dae6d2'
  on-surface-variant: '#b9ccb2'
  inverse-surface: '#dae6d2'
  inverse-on-surface: '#283326'
  outline: '#84967e'
  outline-variant: '#3b4b37'
  surface-tint: '#00e639'
  primary: '#ebffe2'
  on-primary: '#003907'
  primary-container: '#00ff41'
  on-primary-container: '#007117'
  inverse-primary: '#006e16'
  secondary: '#c6c6c7'
  on-secondary: '#2f3131'
  secondary-container: '#454747'
  on-secondary-container: '#b4b5b5'
  tertiary: '#fff8f4'
  on-tertiary: '#442b10'
  tertiary-container: '#ffd5ae'
  on-tertiary-container: '#7a5b3c'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#72ff70'
  primary-fixed-dim: '#00e639'
  on-primary-fixed: '#002203'
  on-primary-fixed-variant: '#00530e'
  secondary-fixed: '#e2e2e2'
  secondary-fixed-dim: '#c6c6c7'
  on-secondary-fixed: '#1a1c1c'
  on-secondary-fixed-variant: '#454747'
  tertiary-fixed: '#ffdcbd'
  tertiary-fixed-dim: '#e7bf99'
  on-tertiary-fixed: '#2c1701'
  on-tertiary-fixed-variant: '#5d4124'
  background: '#0c160a'
  on-background: '#dae6d2'
  surface-variant: '#2d382a'
typography:
  headline-xl:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
  body-md:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.0'
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
  max-width: 1440px
---

## Brand & Style

The design system is engineered for high-performance environments where technical precision and long-term visual comfort are paramount. It targets developers, data analysts, and power users who require a focused interface that minimizes ocular strain and cognitive load. 

The aesthetic is rooted in **Minimalism** with a **Technical** edge. It avoids the trend of "blue-tinted" dark modes in favor of a true neutral palette. This creates a grounded, sophisticated atmosphere that feels less like a consumer app and more like a high-end tool. Hierarchy is established through rigorous grayscale steps rather than vibrant decorative elements, ensuring that user data and primary actions remain the focal point.

## Colors

This design system utilizes a strictly neutral gray scale to ensure zero color pollution in professional workflows. The primary background is set to a deep, true gray (`#121212`), providing a stable foundation for layered interfaces.

Departmental colors (Success, Warning, Error, Info) should be used sparingly against this neutral backdrop to maintain their functional significance. The primary accent is a high-visibility green to denote "active" states and primary calls to action, cutting through the monochrome base with clinical efficiency. Surfaces are defined by increasing luminance rather than shifting hue, creating a "stacking" effect that feels physical and structured.

## Typography

The typographic system balances the geometric character of **Space Grotesk** for headlines with the technical clarity of **Geist** for body copy. To emphasize the "tool-first" nature of the design system, **JetBrains Mono** is utilized for labels, metadata, and data-heavy tables.

Scale is used to denote hierarchy clearly; large headlines use tight letter-spacing to feel impactful and modern, while body text maintains a generous line height to ensure readability against the dark background. All labels are set in monospaced fonts to ensure that numerical data aligns perfectly across different rows and states.

## Layout & Spacing

This design system employs a **Fixed Grid** model for desktop and a **Fluid** model for mobile. On desktop, content is centered within a 1440px container, utilizing a 12-column grid. The spacing rhythm is based on a 4px baseline, ensuring that all elements—from icons to margins—are mathematically related.

Layouts should favor high information density. Gutters are kept tight (`16px`) to maximize screen real estate, while external margins are more generous to provide visual breathing room. Mobile transitions collapse the grid to 4 columns, increasing the touch target areas while maintaining the 4px vertical rhythm.

## Elevation & Depth

In this design system, depth is communicated through **Tonal Layers** rather than traditional drop shadows. As an element "rises" toward the user, its surface color becomes lighter. This creates a logical hierarchy that feels intrinsic to the UI.

- **Level 0 (Base):** #121212 - The foundational canvas.
- **Level 1 (Cards/Containers):** #1C1C1C - Used for standard content groupings.
- **Level 2 (Modals/Popovers):** #242424 - Used for elements that interrupt the flow.
- **Overlays:** Semi-transparent black (#000000 at 60% opacity) is used to dim the background when high-level modals are active.

Borders act as the primary separator. A subtle border (`#282828`) is applied to all surface containers to maintain edge definition in the absence of shadows.

## Shapes

The shape language is **Soft**, utilizing a 0.25rem (4px) base radius. This creates a UI that feels modern and approachable without losing the professional, "engineered" aesthetic of sharp corners. Larger components like cards and modals may use `rounded-lg` (8px) to soften the overall layout, but interactive elements like buttons and inputs remain strictly at the base 4px to maintain a compact, precise appearance.

## Components

### Buttons
Primary buttons use the primary accent color with black text for maximum contrast. Secondary buttons utilize a ghost style with a `#3F3F3F` border and white text. Hover states are indicated by a subtle increase in surface luminance.

### Input Fields
Inputs are styled with the `#161616` background and a `#282828` border. Upon focus, the border transitions to the primary accent color. Labels are always placed above the field using the `label-caps` typography style.

### Cards
Cards are the primary container unit. They utilize the Level 1 surface (`#1C1C1C`) and a `1px` border. Inside cards, internal padding should strictly follow the `md` (16px) or `lg` (24px) spacing tokens.

### Chips & Badges
Chips use a darker background (`#242424`) than their parent surface to create a "recessed" look. Text within chips is always set in the monospaced label font.

### Lists
List items are separated by a `1px` solid line (`#282828`). Hover states on list items should shift the background to `#242424` to provide immediate tactile feedback.