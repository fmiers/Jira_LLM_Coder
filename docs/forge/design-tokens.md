# Forge Design Tokens and Theming

Source: https://developer.atlassian.com/platform/forge/design-tokens-and-theming/

## Key Points on Design Tokens

- Design tokens enable consistent theming across Atlassian products
- Colors automatically mirror and react to the parent product's active theme
- Tokens are CSS custom properties that can be used in vanilla CSS, Sass, Less, and CSS-in-JS

## Styling Approaches

### 1. Vanilla CSS
```css
.example {
 background: var(--ds-surface-raised);
 padding: var(--ds-space-100);
 font: var(--ds-font-heading-large);
}
```

### 2. CSS-in-JS (recommended)
```javascript
import { token } from "@atlaskit/tokens";

const example = {
 color: token("color.background.selected.bold"),
 margin: token("space.150"),
 font: token("font.body"),
};
```

## Spacing Tokens

Common spacing values available:
- `space.025` - Very small spacing
- `space.050` - Small spacing  
- `space.100` - Default spacing
- `space.150` - Medium spacing
- `space.200` - Large spacing
- `space.300` - Extra large spacing
- `space.400` - XXL spacing

## Custom Color Scheme Handling

- Can query `html[data-color-mode]` attribute to apply custom tokens
- Recommended to use sparingly to avoid color discrepancies

## Surface Background

- Special CSS variable `utility.elevation.surface.current` reflects the current surface's background

## Box Component Styling

Use spacing tokens with Box component props:
- `paddingBlock="space.400"` - Vertical padding
- `paddingInline="space.200"` - Horizontal padding  
- `paddingTop="space.300"` - Top padding only

## Recommendations

- Keep `@atlaskit/tokens` package up to date
- Use provided linters for token management
- Refer to Atlassian Design System for comprehensive token details
- Prefer design tokens over hardcoded CSS values for consistency