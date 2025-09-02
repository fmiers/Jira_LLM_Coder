# Forge Runtime Reference

Source: https://developer.atlassian.com/platform/forge/runtime-reference/

## Supported Runtime Environments

Forge currently supports two runtime execution environments:

### 1. Node.js Runtime (Recommended)

**Available Versions:**
- `nodejs18.x`
- `nodejs20.x` 
- `nodejs22.x`
- `sandbox` (special Node.js environment)

### 2. Legacy Runtime (Deprecated)
- **Not recommended** for new development
- Being phased out in favor of Node.js runtime

## Runtime Configuration

Runtime is specified in the app manifest using the `runtime.name` field:

```yaml
app:
  id: <app-id>
  runtime:
    name: nodejs18.x | nodejs20.x | nodejs22.x | sandbox
```

### Example Configuration
```yaml
app:
  id: ari:cloud:ecosystem::app/12345678-1234-5678-9abc-123456789abc
  runtime:
    name: nodejs22.x
```

## Important Configuration Notes

> "Adding the `runtime.name` property to the manifest file will not trigger a major version upgrade."

- Deploying runtime changes **automatically installs** across all sites in the same environment
- No manual intervention required for existing installations
- Changes apply immediately upon deployment

## Runtime Selection Guidelines

### Choose nodejs22.x when:
- Starting a new Forge application
- You need the latest Node.js features and performance improvements
- Building modern JavaScript applications

### Choose nodejs20.x when:
- You need LTS (Long Term Support) stability
- Working with existing applications that depend on Node.js 20 features
- Transitioning from older Node.js versions

### Choose nodejs18.x when:
- Maintaining legacy applications
- You have specific dependencies that require Node.js 18
- Gradual migration strategy from older versions

### Sandbox Runtime
- Special Node.js environment with additional restrictions
- Use only when specifically required for security or isolation needs

## Migration Considerations

### From Legacy Runtime
1. **Update manifest**: Add `runtime.name` property
2. **Test thoroughly**: Ensure all functionality works in Node.js environment
3. **Update dependencies**: Verify all npm packages are compatible
4. **Deploy gradually**: Test in development before production

### Between Node.js Versions
1. **Review Node.js changelog**: Check for breaking changes
2. **Update dependencies**: Ensure compatibility with target version
3. **Test locally**: Use `forge tunnel` for development testing
4. **Monitor performance**: Check for any performance regressions

## Best Practices

1. **Use latest stable version**: Choose nodejs22.x for new projects
2. **Plan migrations**: Keep runtime versions up to date
3. **Test thoroughly**: Always test in development environment first
4. **Monitor deployments**: Watch logs after runtime changes
5. **Document choices**: Record why specific runtime versions were chosen

## Runtime Limitations

- **No access to file system**: Serverless environment restrictions
- **Memory limits**: Function execution memory constraints
- **Execution time limits**: Maximum function execution duration
- **Cold starts**: Initial invocation latency considerations

## Performance Characteristics

- **Serverless execution**: Functions run on-demand
- **Automatic scaling**: Handles load automatically
- **Resource management**: Memory and CPU allocated per invocation
- **Stateless execution**: No persistent state between invocations