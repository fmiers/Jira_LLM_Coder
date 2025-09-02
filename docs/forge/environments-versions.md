# Forge Environments and Versions

Source: https://developer.atlassian.com/platform/forge/environments-and-versions/

## Forge Environments Overview

Forge automatically creates three environments when using `forge create`:

1. **Development**
2. **Staging** 
3. **Production**

## Environment Characteristics

### Development Environment
- **Default environment** for CLI commands
- **Full access** to all Forge CLI commands
- **App title suffix**: `(DEVELOPMENT)`
- **Best for**: Active development and testing

### Staging Environment
- **Limited access** to CLI commands
- **Cannot use**: `forge tunnel` command
- **Cannot view**: API scopes
- **Must redeploy**: Using `forge deploy` for changes
- **App title suffix**: `(STAGING)`
- **Best for**: Stable versions and pre-production testing

### Production Environment
- **Most restricted** environment
- **Cannot use**: `forge tunnel` or `forge logs`
- **Debugging**: Requires redeploying to staging/development
- **App title**: No suffix (clean production name)
- **Best for**: Ready-to-use apps for end users

## Environment Management Commands

### Switch Between Environments
```bash
forge deploy --environment staging
forge deploy --environment production
```

### View Current Environment
```bash
forge environments list
```

### Create Custom Environment
```bash
forge environments create my-custom-env
```

## Environment Variables

### Key Features
- **Separate values** for each environment
- **Encrypted variables** are protected in CLI output
- **Require redeployment** to take effect after changes

### Management Commands
```bash
forge variables set --environment staging KEY value
forge variables list --environment production
forge variables unset --environment development KEY
```

## Custom Environments

### Purpose
- **Additional development environments** beyond the default three
- **Allows multiple contributors** to work simultaneously
- **Isolated testing** for different features

### Use Cases
- Feature branch development
- Team member isolation
- Client-specific configurations
- A/B testing scenarios

## Environment Restrictions Summary

| Feature | Development | Staging | Production |
|---------|------------|---------|------------|
| `forge tunnel` | ✅ Yes | ❌ No | ❌ No |
| `forge logs` | ✅ Yes | ✅ Yes | ❌ No |
| `forge deploy` | ✅ Yes | ✅ Yes | ✅ Yes |
| API scope viewing | ✅ Yes | ❌ No | ❌ No |
| Full debugging | ✅ Yes | ✅ Yes | ❌ No |

## Best Practices

### Development Workflow
1. **Start in development**: Use `forge tunnel` for live development
2. **Deploy to staging**: Test stable versions before production
3. **Promote to production**: Only deploy thoroughly tested code

### Environment Variable Management
1. **Use descriptive names**: Make variable purposes clear
2. **Encrypt sensitive data**: Use encryption for secrets
3. **Document dependencies**: Track which variables each environment needs
4. **Test after changes**: Always redeploy and test after variable updates

### Team Collaboration
1. **Create custom environments**: For individual team members
2. **Use staging for reviews**: Share stable versions with stakeholders
3. **Coordinate production deploys**: Establish deployment schedules
4. **Maintain environment parity**: Keep configurations consistent

## Deployment Strategy

### Recommended Flow
```
Development (with tunnel) → Staging (testing) → Production (live)
```

### Environment-Specific Testing
- **Development**: Feature development and debugging
- **Staging**: Integration testing and stakeholder review
- **Production**: End-user acceptance and monitoring

## Troubleshooting

### Common Issues
- **Tunnel not working**: Check if you're in development environment
- **Logs not showing**: Verify environment permissions
- **Variables not updating**: Ensure redeployment after changes
- **Environment confusion**: Always specify environment in commands

### Debug Strategy
1. **Start in development**: Use full CLI capabilities
2. **Replicate in staging**: Test with deployment constraints
3. **Monitor production**: Use external tools for production monitoring