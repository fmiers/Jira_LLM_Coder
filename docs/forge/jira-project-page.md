# Jira Project Page Module Reference

Source: https://developer.atlassian.com/platform/forge/manifest-reference/modules/jira-project-page/

## Module Purpose

- **Adds an app to the horizontal tab navigation in Jira projects**
- **Works in both Jira and Jira Service Management**
- **Can be used as a top-level component**

## Key Properties

### Required Properties
1. **`key`**: Unique identifier for the module (required)
2. **`title`**: Page title displayed in navigation (required)
3. **`resource`**: Static resource for Custom UI or UI Kit

### Optional Properties
4. **`icon`**: Optional icon next to the title
5. **`layout`**: Defines page rendering style (default: 'native')
   - Options: `'native'`, `'basic'`, `'blank'`
6. **`resolver`**: Backend function resolver
7. **`render`**: Rendering method (`'native'` for UI Kit)

## Subpage Configuration

- **Multiple pages**: Can register using `pages` or `sections`
- **Route handling**: Requires handling routes inside the Custom UI app
- **Custom UI only**: Subpages only work with Custom UI approach

## Manifest Example

```yaml
modules:
  jira:projectPage:
    - key: hello-world-project-page
      resource: main
      resolver:
        function: resolver
      render: native
      title: Hello World!
```

## Extension Context

The module provides access to:
- **Project details**: ID, key, and type information
- **Board information**: Available for Jira Software projects
- **User context**: Current user permissions and details

## Layout Options

### `native` (default)
- Standard Jira styling and layout
- Integrates seamlessly with Jira UI
- Recommended for most use cases

### `basic`
- Minimal Jira styling
- More control over appearance
- Good for custom layouts

### `blank`
- No Jira styling applied
- Complete control over UI
- Best for fully custom experiences

## Limitations

- **Subpage routing**: Must be managed manually in Custom UI
- **Custom UI requirement**: Advanced features require Custom UI instead of UI Kit
- **Navigation constraints**: Limited to project-level navigation
- **Permission inheritance**: Inherits project-level permissions

## Usage Considerations

### When to Use UI Kit
- Simple configuration or information pages
- Standard Atlassian look and feel desired
- Limited interaction requirements

### When to Use Custom UI
- Complex interactions or layouts needed
- Subpage navigation required
- Custom styling beyond Atlassian Design System

## Context Data Available

```javascript
// Available in extension context
{
  extension: {
    project: {
      id: "10000",
      key: "TEST", 
      type: "software"
    },
    board: {
      id: "1",
      type: "scrum"
    }
  }
}
```

## Best Practices

1. **Use descriptive titles**: Clear navigation for users
2. **Choose appropriate layout**: Match your app's complexity needs
3. **Handle permissions**: Respect project-level access controls
4. **Optimize loading**: Project pages should load quickly
5. **Maintain consistency**: Follow Atlassian Design System guidelines