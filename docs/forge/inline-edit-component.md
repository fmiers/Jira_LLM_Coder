# Forge UI Kit - InlineEdit Component

Source: https://developer.atlassian.com/platform/forge/ui-kit/components/inline-edit/

## Overview

The InlineEdit component allows users to switch between reading and editing views on the same page. It displays a custom input component that can be toggled between read-only and editable states, with built-in confirm and cancel functionality.

**Note:** This component is marked as Preview and may be subject to changes.

## Import

```javascript
import { InlineEdit } from "@forge/react";
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `defaultValue` | `any` | Yes | The initial value and the value shown during edit mode |
| `onConfirm` | `(value: any) => void` | Yes | Function called when user confirms the edit. Saves the entered value |
| `readView` | `() => React.ReactNode` | Yes | Function that returns the custom read-only view component |
| `editView` | `(props) => React.ReactNode` | Yes | Function that returns the custom edit input component |
| `label` | `string` | No | Label text for the field |
| `onCancel` | `() => void` | No | Function called when user cancels editing. Exits edit mode and returns to read view |
| `isEditing` | `boolean` | No | Controls whether component shows read or edit view |
| `startWithEditViewOpen` | `boolean` | No | If true, component starts in edit mode |
| `hideActionButtons` | `boolean` | No | If true, hides the confirm (✓) and cancel (✗) buttons |
| `validate` | `(value: any) => string \| void \| Promise` | No | Validation function. Returns error message string if invalid |

## Usage Examples

### Basic Text Field Example

```javascript
import { InlineEdit, Textfield, Box } from '@forge/react';
import { useState } from 'react';

const InlineEditTextfieldExample = () => {
  const [editValue, setEditValue] = useState("");
  
  return (
    <InlineEdit
      defaultValue={editValue}
      label="Team name"
      editView={({ errorMessage, ...fieldProps }) => (
        <Textfield {...fieldProps} autoFocus />
      )}
      readView={() => (
        <Box>
          {editValue || "Enter your team name"}
        </Box>
      )}
      onConfirm={(value) => setEditValue(value)}
    />
  );
};
```

### URL Field with Placeholder

```javascript
const InlineEditUrlExample = () => {
  const [url, setUrl] = useState("");
  
  return (
    <InlineEdit
      defaultValue={url}
      label="Technical Design Document"
      editView={({ errorMessage, ...fieldProps }) => (
        <Textfield 
          {...fieldProps} 
          placeholder="Click to edit"
          autoFocus 
        />
      )}
      readView={() => (
        <Box>
          {url ? (
            <Link href={url} target="_blank">{url}</Link>
          ) : (
            <Text>Click to edit</Text>
          )}
        </Box>
      )}
      onConfirm={(value) => setUrl(value)}
    />
  );
};
```

### With Validation

```javascript
const InlineEditWithValidation = () => {
  const [value, setValue] = useState("");
  
  const validate = (input) => {
    if (!input || input.length < 3) {
      return "Value must be at least 3 characters";
    }
  };
  
  return (
    <InlineEdit
      defaultValue={value}
      label="Project name"
      validate={validate}
      editView={({ errorMessage, ...fieldProps }) => (
        <>
          <Textfield {...fieldProps} autoFocus />
          {errorMessage && <Text>{errorMessage}</Text>}
        </>
      )}
      readView={() => (
        <Box>{value || "Set project name"}</Box>
      )}
      onConfirm={(value) => setValue(value)}
    />
  );
};
```

### Controlled Edit State

```javascript
const ControlledInlineEdit = () => {
  const [value, setValue] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  
  return (
    <InlineEdit
      defaultValue={value}
      isEditing={isEditing}
      label="Description"
      editView={({ errorMessage, ...fieldProps }) => (
        <TextArea {...fieldProps} rows={3} autoFocus />
      )}
      readView={() => (
        <Box onClick={() => setIsEditing(true)}>
          {value || "Click to add description"}
        </Box>
      )}
      onConfirm={(value) => {
        setValue(value);
        setIsEditing(false);
      }}
      onCancel={() => setIsEditing(false)}
    />
  );
};
```

## Key Behaviors

1. **Mode Switching**: Automatically switches between read and edit modes
2. **Built-in Buttons**: Provides confirm (✓) and cancel (✗) buttons by default
3. **Click to Edit**: Read view becomes clickable to enter edit mode
4. **Escape to Cancel**: ESC key cancels editing
5. **Enter to Confirm**: Enter key confirms the edit (for single-line inputs)

## Best Practices

1. **Clear Placeholder Text**: Use placeholder text like "Click to edit" to indicate editability
2. **Auto Focus**: Add `autoFocus` to the edit view input for better UX
3. **Visual Indicators**: Make the read view clearly indicate it's clickable (cursor change, hover effects)
4. **Validation**: Implement validation for required fields or format checking
5. **Error Messages**: Display validation errors clearly in the edit view

## Accessibility Considerations

- Avoid using InlineEdit within a Form component
- Provide clear visual indicators that the field is editable
- Keep action buttons visible when possible for better accessibility
- Ensure keyboard navigation works properly (Tab, Enter, Escape)

## Common Use Cases

- Editing configuration values
- Updating user profile fields
- Modifying project settings
- Quick edits in tables or lists
- Inline form fields that don't require a full form submission

## Limitations

- This is a Preview component and may change
- Cannot be used within Form components
- Custom styling options may be limited
- Action buttons (✓ and ✗) styling cannot be customized