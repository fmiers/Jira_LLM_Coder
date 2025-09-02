# Forge UI Kit

Source: https://developer.atlassian.com/platform/forge/ui-kit/

## UI Kit Component Requirements

- Must be on "@forge/react" major version 10 or higher
- Runs in a React runtime with native browser rendering

## Supported React Hooks

- useState
- useEffect
- useContext
- useReducer
- useCallback
- useMemo
- useRef
- useDebugValue
- useDeferredValue
- useId

## Component Restrictions

- **Cannot use arbitrary HTML**: No raw HTML elements like `<div>`, `<span>`, `<a>`, etc.
- **Limited to components exported from @forge/react**: Only official Forge components allowed
- **No access to underlying DOM**: Cannot manipulate DOM directly
- **Cannot use portals or forward refs**: React portals not supported

## Available Components (Partial List)

- ADF Renderer
- Badge
- Box
- Button
- Calendar
- Charts (Bar, Donut, Line, Pie)
- Checkbox
- Code
- Date Picker
- Dynamic Table
- Form
- Frame
- Heading
- Icon
- Modal
- Progress Bar
- Select
- Tabs
- Text Field
- User Picker

## Special Notes

- Supports JSX syntax
- Supports React Context
- Provides product-specific hooks like useProductContext, useConfig
- All components must be imported from `@forge/react`

## Key Takeaway

Forge UI Kit provides a controlled environment with specific components - no arbitrary HTML elements are allowed, only the officially supported Forge components.