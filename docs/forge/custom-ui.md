# Forge Custom UI Options

Source: https://developer.atlassian.com/platform/forge/extend-ui-with-custom-options/

## Custom UI Capabilities

- Can render static content using HTML, CSS, and JavaScript
- Runs within an isolated iframe environment
- Supports static resources like images and scripts from the same resource directory

## Security Restrictions

- **All scripts and assets must come from the same resource directory**: No external resources allowed
- **Cannot use external scripts**: No Google Analytics, Sentry, etc.
- **Cannot fetch external APIs directly**: Static assets cannot make external API calls
- **Must use Forge's `invoke` method**: Backend functions required for external API calls

## Resource Limitations

- Static resources count against Forge quotas
- **Weekly file capacity limits**:
  - Paid apps: 150 MB
  - Free/Distributed apps: 75 MB
- **Maximum files per week**:
  - Paid apps: 500 files
  - Free/Distributed apps: 250 files

## Styling Constraints

- **Inline styles require custom content security policies**
- **Must use relative paths** for accessing assets (e.g., `"./assets/image.png"`)

## Communication

- Supports bidirectional communication between UI Kit and Frame components using the Events API

## Key Recommendation

Use the `invoke` method from the Custom UI bridge to run an Atlassian-hosted backend FaaS function for external data fetching.

## When to Use Custom UI

Custom UI is useful when you need:
- Full HTML/CSS/JavaScript control
- External libraries or frameworks
- Complex layouts not possible with UI Kit components
- Custom styling beyond design tokens

## Trade-offs

**Pros**:
- Full control over HTML/CSS/JavaScript
- Can use any front-end framework
- More flexible styling options

**Cons**:
- Runs in isolated iframe (security restrictions)
- Resource limits and quotas
- More complex communication with backend
- Must handle all security considerations manually