# Forge Bridge API Reference

Source: https://developer.atlassian.com/platform/forge/custom-ui-bridge/bridge/

## Purpose

The Forge Bridge enables UI Kit and Custom UI apps to **securely integrate with Atlassian products**. It provides the communication layer between your frontend application and the Atlassian host environment.

## Installation and Setup

### 1. Install Bridge Package
```bash
npm install @forge/bridge
```

### 2. Import in Your Application
```javascript
import { invoke, view, router } from '@forge/bridge';
```

### 3. Configure Manifest
```yaml
resources:
  - key: main
    path: build/  # Generated build directory
```

## Core Methods

### `invoke()` - Backend Function Calls
Primary method for calling backend resolver functions.

```javascript
// Basic usage
invoke('getText', { example: 'my-invoke-variable' }).then(setData);

// With error handling
try {
  const result = await invoke('myFunction', { param: 'value' });
  console.log(result);
} catch (error) {
  console.error('Function call failed:', error);
}
```

## Additional Bridge APIs

### Events API
Handle communication between different parts of your app.

### i18n (Internationalization)
Support multiple languages in your application.

### Modal Management
Control modal windows and dialogs.

### Product-Specific Requests
Make authenticated requests to Atlassian product APIs:
- **Jira API requests**
- **Confluence API requests** 
- **Bitbucket API requests**

### Router API
Navigate between different views in your application.

### View Manipulation
Control the current view context and behavior.

## Development Workflow

### Recommended Setup Process
1. **Create app from UI template**
   ```bash
   forge create --template custom-ui
   ```

2. **Install and build dependencies**
   ```bash
   npm install && npm run build
   ```

3. **Configure resource path**
   Point manifest.yml to generated build directory

4. **Use bundler integration**
   Recommended to use Webpack or similar bundler

## Security Considerations

### Sandboxed Environment
- Custom UI runs in isolated iframe
- No direct access to host page DOM
- Bridge API is the **only secure communication channel**

### Authentication
- Bridge handles authentication automatically
- All API calls are authenticated with user context
- No need to manage tokens manually

## Communication Patterns

### Frontend ↔ Backend
```javascript
// Frontend calls backend function
const data = await invoke('getProjectData', { projectKey: 'TEST' });

// Backend function (in resolver)
resolver.define('getProjectData', async (req) => {
  const { projectKey } = req.payload;
  // Process and return data
  return processedData;
});
```

### Error Handling
```javascript
try {
  const result = await invoke('riskyOperation');
} catch (error) {
  if (error.code === 'PERMISSION_DENIED') {
    // Handle permission error
  } else if (error.code === 'INVALID_INPUT') {
    // Handle validation error
  }
}
```

## Best Practices

### Performance Optimization
1. **Minimize bridge calls**: Bundle multiple operations when possible
2. **Cache results**: Store frequently accessed data locally
3. **Handle loading states**: Provide user feedback during async operations

### Error Handling
1. **Always use try-catch**: With async invoke calls
2. **Provide fallbacks**: For failed operations
3. **User feedback**: Show meaningful error messages

### Security
1. **Validate inputs**: On both frontend and backend
2. **Use least privilege**: Only request necessary permissions
3. **Handle sensitive data**: Carefully in bridge communications

## Limitations

### Custom UI Constraints
- Must use bundler for production applications
- Limited to bridge API for host communication
- Cannot directly manipulate Atlassian UI elements

### Performance Considerations
- Bridge calls have network overhead
- Iframe sandbox affects some browser APIs
- Static resource size limits apply

## Example Implementation

### Frontend (Custom UI)
```javascript
import { invoke } from '@forge/bridge';

const MyComponent = () => {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    invoke('loadInitialData')
      .then(setData)
      .catch(console.error);
  }, []);
  
  const handleAction = async () => {
    try {
      await invoke('performAction', { data });
      // Handle success
    } catch (error) {
      // Handle error
    }
  };
  
  return (
    <div>
      {data ? <DataDisplay data={data} /> : <Loading />}
      <button onClick={handleAction}>Perform Action</button>
    </div>
  );
};
```

### Backend (Resolver)
```javascript
import { storage } from '@forge/api';

resolver.define('loadInitialData', async (req) => {
  const data = await storage.get('initial-data');
  return data || {};
});

resolver.define('performAction', async (req) => {
  const { data } = req.payload;
  // Process data and store result
  await storage.set('action-result', data);
  return { success: true };
});
```