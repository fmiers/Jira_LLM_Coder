# Forge UI Kit - Inline Component

Source: https://developer.atlassian.com/platform/forge/ui-kit/components/inline/

## Overview

The Inline component manages horizontal layout of direct children using flexbox. It provides a way to arrange UI elements in a row with control over spacing and alignment.

## Props

### Spacing Props

#### `space`
Controls the spacing between child elements.
- Type: String
- Values: `"space.0"` to `"space.1000"`
- Example: `<Inline space="space.200">`
- Common values:
  - `"space.025"` - Very small spacing
  - `"space.050"` - Small spacing
  - `"space.100"` - Default spacing
  - `"space.150"` - Medium spacing
  - `"space.200"` - Large spacing
  - `"space.300"` - Extra large spacing
  - `"space.400"` - XXL spacing

#### `rowSpace`
Controls spacing between rows when content wraps to multiple lines.
- Type: String
- Values: Same as `space` prop
- Example: `<Inline space="space.100" rowSpace="space.300" shouldWrap>`
- Useful when `shouldWrap` is true

### Alignment Props

#### `alignBlock`
Controls vertical axis alignment of children.
- Type: String
- Values:
  - `"start"` - Align to top
  - `"center"` - Center vertically
  - `"end"` - Align to bottom
  - `"baseline"` - Align to text baseline
  - `"stretch"` - Stretch to fill height

#### `alignInline`
Controls horizontal axis alignment of children.
- Type: String
- Values:
  - `"start"` - Align to left
  - `"center"` - Center horizontally
  - `"end"` - Align to right
  - `"stretch"` - Stretch to fill width

### Layout Props

#### `shouldWrap`
Determines if children should wrap to multiple lines when they exceed container width.
- Type: Boolean
- Default: `false`
- Example: `<Inline shouldWrap>`

#### `spread`
Distributes children along the main axis.
- Type: String
- Values: Similar to CSS flexbox justify-content
  - `"space-between"` - Equal space between items
  - Other standard flexbox distribution values

#### `grow`
Controls how the container uses available space.
- Type: String
- Values:
  - `"hug"` (default) - Uses only the space required by children
  - `"fill"` - Takes all available space in parent container

## Usage Examples

### Basic Horizontal Layout with Spacing
```javascript
import { Inline, Text, Button } from '@forge/react';

<Inline space="space.200" alignBlock="center">
  <Text>Label:</Text>
  <Text>Value</Text>
  <Button>Action</Button>
</Inline>
```

### Wrapping Layout with Different Row Spacing
```javascript
<Inline space="space.100" rowSpace="space.300" shouldWrap>
  <Tag>Tag 1</Tag>
  <Tag>Tag 2</Tag>
  <Tag>Tag 3</Tag>
  <Tag>Tag 4</Tag>
</Inline>
```

### Full Width with Space Between
```javascript
<Inline grow="fill" spread="space-between">
  <Text>Left aligned</Text>
  <Button>Right aligned</Button>
</Inline>
```

### Center Aligned Content
```javascript
<Inline alignBlock="center" alignInline="center" space="space.150">
  <Icon />
  <Text>Centered content with icon</Text>
</Inline>
```

## Best Practices

1. Use `space` prop for consistent spacing between elements
2. Add `alignBlock="center"` to vertically center items of different heights
3. Use `shouldWrap` for responsive layouts that adapt to container width
4. Combine with Stack component for complex nested layouts
5. Prefer design token values (e.g., `"space.200"`) over custom values for consistency

## Common Use Cases

- Form fields with labels
- Button groups
- Navigation items
- Icon with text combinations
- Tag or chip collections
- Toolbar layouts
- Inline form controls