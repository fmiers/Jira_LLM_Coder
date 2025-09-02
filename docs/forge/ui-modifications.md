# Forge UI Modifications (UIM)

Source: https://developer.atlassian.com/platform/forge/understanding-ui-modifications/

## Key Characteristics

- Currently supports modifications for:
  - Global issue create
  - Issue view  
  - Issue transition

## Restrictions and Limitations

- **Only one app can run in a given context**: Single app per context restriction
- **Modifications are context-specific**: Limited to project and issue type combinations
- **Limited to supported Jira views**: Cannot modify arbitrary Jira pages
- **App developers must define specific contexts**: Context targeting required

## Performance and Security Considerations

- Designed to be performant by loading only relevant modifications
- Runs as an "invisible Custom UI app"
- Allows storing up to 50,000 characters of context-specific data
- Requires using the "@forge/jira-bridge" package

## Antipatterns to Avoid

1. **Hard-coding project or tenant IDs**: Makes apps non-portable
2. **Executing dynamic code from modification entities**: Security risk
3. **Proxying the entire UIM API through entity data**: Performance impact

## Purpose

The goal is to provide a flexible but controlled way to customize Jira's user interface while maintaining performance and security.

## Use Cases

UI Modifications are best for:
- Adding custom fields or buttons to existing Jira views
- Modifying issue creation flows
- Customizing issue transition screens
- Context-specific UI changes based on project/issue type

## Technical Notes

- Uses Custom UI technology under the hood
- Requires bridge communication for data exchange
- Context data storage limits apply
- Must target specific Jira contexts for modifications to load