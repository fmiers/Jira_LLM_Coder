# Forge Getting Started Guide

Source: https://developer.atlassian.com/platform/forge/getting-started/

## Prerequisites

- **JavaScript knowledge**: Essential for Forge development
- **React familiarity**: Helpful for UI development
- **Node.js LTS**: Versions 20.x or 22.x supported

## Setup Steps

### 1. Install Node.js

**macOS (using Node Version Manager):**
```shell
nvm install --lts
nvm use --lts
```

**Linux:**
Similar nvm approach as macOS

**Windows:**
Download LTS installer from nodejs.org

### 2. Install Forge CLI

```shell
npm install -g @forge/cli
forge --version  # Verify installation
```

### 3. Create Atlassian API Token

1. Go to https://id.atlassian.com/manage/api-tokens
2. Click "Create API token"
3. Label token (e.g., "forge-api-token")
4. Copy the generated token

### 4. Login to Forge CLI

```shell
forge login
```

When prompted:
- Enter email associated with your Atlassian account
- Enter the API token you created

## Development Workflow

1. **Choose a product**: Bitbucket, Confluence, Jira, or Jira Service Management
2. **Follow product-specific hello world tutorial**
3. **Use `forge` CLI commands** for development lifecycle

## Key Considerations

- **Do not use `root` or `sudo` privileges**: Can cause permission issues
- **CLI credential storage**: Uses your OS keychain to store credentials securely
- **CI/CD integration**: Environment variables can be used for automated scenarios

## Security Notes

- API tokens provide full access to your Atlassian account
- Store tokens securely and never commit them to version control
- CLI handles authentication automatically after login

## Next Steps

1. **Build a hello world app** in your chosen Atlassian product
2. **Explore product-specific tutorials** and documentation
3. **Join the developer community** for support and resources

## Common Commands

```shell
forge create          # Create new app
forge install         # Install app to site
forge deploy          # Deploy app to environment
forge tunnel          # Local development with live reload
forge logs            # View app logs
```

## Development Best Practices

- Start with simple templates to understand core concepts
- Use `forge tunnel` for rapid development and testing
- Follow the principle of least privilege for permissions
- Test thoroughly before deploying to production environments