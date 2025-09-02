# Vertical Spacing in Forge UI Kit - Creating Gaps Between Components

> **⚠️ IMPORTANT NOTE**: This document specifically applies to **Forge UI Kit** components only. These findings and solutions do NOT apply to:
> - Custom UI (which supports standard HTML/CSS)
> - Other platforms or frameworks
> - Regular React applications
> 
> The limitations and solutions described here are specific to Forge UI Kit's component system and its restricted styling capabilities.

## Problem
How to create vertical white space between the Technical Design Document section and the "Convert to Epics & Stories" button in Forge UI Kit.

## Key Solution: Using the Stack Component

The solution required replacing the non-working Box component with a **Stack component** that properly manages vertical spacing between elements.

### Implementation
```javascript
<Stack space="space.400">
  <Text></Text>  // Empty spacer element
  <Box>
    <Button appearance="primary" ...>
      {isProcessing ? 'Converting...' : 'Convert to Epics & Stories'}
    </Button>
  </Box>
</Stack>
```

## What Didn't Work

### Box with PaddingTop - Failed Approach
```javascript
// This showed NO gap at all, despite space.300
<Box paddingTop="space.300">
  <Button ...>Convert to Epics & Stories</Button>
</Box>
```

**Finding**: Box padding is ignored or overridden in Forge UI Kit contexts. Even with `paddingTop="space.300"`, there was no visible gap between components.

## What Did Work

### Stack Component Structure
```javascript
<Stack space="space.400">
  <Text></Text>  // Empty spacer element - creates separation
  <Box>           // Wrapper to prevent button stretching
    <Button appearance="primary" 
            onClick={handleConvertToEpics}
            disabled={isProcessing || !technicalDesignDoc || !technicalDesignDoc.startsWith('http')}>
      {isProcessing ? 'Converting...' : 'Convert to Epics & Stories'}
    </Button>
  </Box>
  {showCheckAgain && (
    <Box>
      <Button appearance="subtle" ...>
        Check Again for Results
      </Button>
    </Box>
  )}
</Stack>
```

## Critical Elements Explained

### 1. Stack Component
- **Purpose**: Specifically designed for vertical layout management
- **Key Feature**: Reliably creates spacing between child elements
- **Advantage**: Unlike Box, Stack's spacing mechanism actually works

### 2. space Prop
- **Usage**: `space="space.400"` 
- **Effect**: Controls vertical gap between ALL child elements
- **Design Tokens**: Uses Atlassian spacing tokens for consistency
- **Values Available**:
  - `space.200` - Large spacing
  - `space.300` - Extra large spacing  
  - `space.400` - XXL spacing (used here)
  - `space.500` - XXXL spacing

### 3. Empty Text Element
```javascript
<Text></Text>  // Acts as spacer
```
- **Purpose**: Creates separation between previous content and button
- **Why Needed**: Stack only adds space between elements, so empty element acts as spacer

### 4. Box Wrapper for Buttons
```javascript
<Box>
  <Button .../>
</Box>
```
- **Purpose**: Prevents button from stretching to full container width
- **Why Needed**: Stack makes children full width by default
- **Effect**: Button maintains its natural width

## Why Stack Works When Box Doesn't

### Stack Component
- **Purpose-built for spacing**: Designed specifically for vertical layouts
- **Reliable spacing mechanism**: The `space` prop consistently works
- **Flexbox-based**: Uses flexbox gap property internally
- **Predictable behavior**: Spacing between children is guaranteed

### Box Component
- **General container**: Not specifically for layout spacing
- **Padding issues**: `paddingTop`, `paddingBottom` often ignored
- **Inconsistent behavior**: Padding may be overridden by parent components
- **Not layout-focused**: Better for grouping than spacing

## Key Learnings

1. **Always use Stack for vertical spacing**
   - Don't rely on Box padding for creating gaps
   - Stack's `space` prop is the reliable solution

2. **Box padding is unreliable in Forge UI Kit**
   - Even large padding values (`space.300`) may show no effect
   - This appears to be a limitation of the platform

3. **Empty elements can be spacers**
   - `<Text></Text>` works as an invisible spacer
   - Useful when you need space before the first real element

4. **Wrap buttons in Box within Stack**
   - Prevents unwanted full-width stretching
   - Maintains proper button sizing

## Complete Pattern for Vertical Spacing

```javascript
// Previous content (Technical Design Document section)
<Inline alignBlock="baseline" space="space.200">
  <Text>Technical Design Document:</Text>
  <InlineEdit ... />
</Inline>

// Vertical spacing and button section
<Stack space="space.400">
  <Text></Text>  // Spacer for gap after previous content
  <Box>
    <Button appearance="primary">
      Convert to Epics & Stories
    </Button>
  </Box>
  // Additional elements with automatic spacing between them
</Stack>
```

## Recommendations

1. **For vertical spacing**: Always use Stack, never rely on Box padding
2. **For horizontal spacing**: Use Inline component
3. **Test spacing changes**: Deploy and verify, as behavior isn't always intuitive
4. **Use design tokens**: Stick to `space.XXX` values for consistency
5. **Document findings**: Forge UI Kit behavior can be surprising

## Alternative Approaches to Avoid

1. ❌ Box with paddingTop/paddingBottom
2. ❌ Multiple empty Box components as spacers
3. ❌ Trying to use margin properties (not supported)
4. ❌ Custom CSS attempts (very limited support)

## Note for Custom UI Users

If you're using Custom UI instead of UI Kit, you have full control over HTML/CSS and can use standard web development techniques for spacing:
- Regular CSS padding and margin work normally
- Flexbox and CSS Grid are fully supported
- No need for Stack/Inline components (though you can use them if desired)
- Standard `div` elements with styles work as expected