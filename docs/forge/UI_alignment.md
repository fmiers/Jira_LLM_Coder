# UI Alignment in Forge UI Kit - Horizontal Layout Solution

> **⚠️ IMPORTANT NOTE**: This document specifically applies to **Forge UI Kit** components only. These findings and solutions do NOT apply to:
> - Custom UI (which supports standard HTML/CSS)
> - Other platforms or frameworks
> - Regular React applications
> 
> The limitations and solutions described here are specific to Forge UI Kit's component system and its restricted styling capabilities.

## Problem
How to position an editable field (Technical Design Document) to the right of its label in Forge UI Kit, creating a horizontal layout instead of the default vertical stacking.

## Key Solution: Using the Inline Component

The solution required discovering and using the `Inline` component from Forge UI Kit, which manages horizontal layout using flexbox.

### Implementation
```javascript
<Inline alignBlock="baseline" space="space.200">
  <Text>Technical Design Document:</Text>
  <InlineEdit ... />
</Inline>
```

## Critical Findings

### 1. Box Padding Limitations
- **Issue**: Wrapping elements in a Box with `paddingTop` had no effect on positioning
- **Cause**: The parent Inline's `alignBlock="center"` overrides internal Box padding
- **Learning**: Box padding doesn't work as expected within Inline components for alignment

### 2. Baseline Alignment Solution
- **Change**: Switched from `alignBlock="center"` to `alignBlock="baseline"`
- **Result**: Properly aligned text baselines of all elements (label, field, buttons)
- **Key Insight**: Baseline alignment is crucial for text elements at different heights

### 3. InlineEdit Component Benefits
Replaced TextArea with InlineEdit component, which provides:
- Built-in edit mode with confirm (✓) and cancel (✗) buttons
- Controlled editing state management
- Inline Edit button positioned next to the field
- Cleaner user experience without separate edit modes

## Final Layout Structure

```javascript
<Inline alignBlock="baseline" space="space.200">
  <Text>Technical Design Document:</Text>
  <InlineEdit
    defaultValue={technicalDesignDoc}
    isEditing={isEditingTechDoc}
    editView={({ ...fieldProps }) => (
      <Box xcss={{ width: '600px' }}>
        <Textfield {...fieldProps} placeholder="" autoFocus />
      </Box>
    )}
    readView={() => (
      <Inline space="space.075" alignBlock="center">
        <Button appearance="link" onClick={() => setIsEditingTechDoc(true)}>
          Edit
        </Button>
        {technicalDesignDoc && technicalDesignDoc.startsWith('http') ? (
          <Link href={technicalDesignDoc} target="_blank">
            {technicalDesignDoc}
          </Link>
        ) : (
          <Text>{technicalDesignDoc || ""}</Text>
        )}
      </Inline>
    )}
    onConfirm={handleConfirmTechDoc}
    onCancel={() => setIsEditingTechDoc(false)}
  />
</Inline>
```

## Key Components Used

### Inline Component
- **Purpose**: Manages horizontal layout of direct children using flexbox
- **Key Props**:
  - `alignBlock`: Controls vertical alignment (use "baseline" for text alignment)
  - `space`: Controls horizontal spacing between children

### InlineEdit Component
- **Purpose**: Provides in-place editing functionality
- **Key Features**:
  - Switches between read and edit views
  - Built-in action buttons
  - Controlled or uncontrolled editing state

## Important Lessons Learned

1. **Forge UI Kit Layout Limitations**
   - Cannot use standard CSS flexbox properties on Box components
   - Must use specific layout components (Inline, Stack) for positioning
   - Box component doesn't support `display: flex` or similar CSS properties

2. **Component Discovery**
   - Not all Forge UI Kit components are well-documented initially
   - The Inline and Stack components are essential for layout management
   - These components are part of the "Primitives" section in Forge UI Kit

3. **Alignment Strategies**
   - Use `alignBlock="baseline"` for text alignment across different component heights
   - Use `space` prop for consistent horizontal spacing
   - Nest Inline components when needed for complex layouts

4. **Spacing Tokens**
   - Use design tokens like `space.200`, `space.075` for consistent spacing
   - These tokens ensure alignment with Atlassian Design System

## Alternative Approaches That Didn't Work

1. **Box with Flexbox Properties**: `display: "flex"` not supported
2. **Box with Padding Adjustments**: Padding overridden by parent alignment
3. **Manual CSS Styling**: Limited CSS support in UI Kit components

## Recommendations for Similar Tasks

1. Always check for specialized layout components (Inline, Stack) first
2. Use baseline alignment for text elements in horizontal layouts
3. Leverage InlineEdit for editable fields instead of building custom edit modes
4. Test alignment changes incrementally as Forge UI Kit behavior can be non-intuitive
5. Document component discoveries as not all features are immediately obvious