# Forge UI Kit Components

Source: https://developer.atlassian.com/platform/forge/ui-kit-components/

## Layout Primitives

### Box
A box is a generic container that provides managed access to design tokens.

### Inline
An inline manages the horizontal layout of direct children using flexbox.
- Use this component to arrange elements horizontally in a row
- Perfect for placing labels next to fields or buttons side-by-side

### Stack
A stack manages the vertical layout of direct children using flexbox.
- Use this component to arrange elements vertically in a column
- Default behavior for most UI Kit layouts

### Pressable (Preview)
A pressable is a primitive for building custom buttons.

### XCSS
A styling API that integrates with Atlassian's design tokens and primitives.

## Key Layout Insights

- **Inline component** enables horizontal layouts that weren't previously possible with just Box
- **Stack component** provides explicit vertical stacking with flexbox control
- These components are part of the "Primitives" section
- They provide flexible layout management through flexbox
- All components integrate with Atlassian's design token system

## Usage Notes

To use these components, import them from '@forge/react':

```javascript
import { Box, Inline, Stack } from '@forge/react';
```

These layout primitives solve the common UI Kit limitation of only having vertical stacking by default.