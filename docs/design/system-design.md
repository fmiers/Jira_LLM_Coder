# Jira LLM Coder - System Design Document

## Overview

The Jira LLM Coder is an Atlassian Forge app that integrates Claude AI assistance directly into Jira workflows. It provides a "Code this issue" action on Jira backlog items, enabling developers to get LLM-powered development assistance for their tickets.

## Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Jira Cloud    │    │  Firebase RTDB  │    │  Claude Client  │
│                 │    │                 │    │                 │
│  ┌───────────┐  │    │  ┌───────────┐  │    │  ┌───────────┐  │
│  │   Forge   │  │◄──►│  │ Messages  │  │◄──►│  │  External │  │
│  │    App    │  │    │  │   Queue   │  │    │  │  Process  │  │
│  └───────────┘  │    │  └───────────┘  │    │  └───────────┘  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Component Architecture

#### Frontend Layer (`src/frontend/index.jsx`)
- **Technology**: React 18 with Forge UI Kit
- **Responsibilities**:
  - Display issue description editor
  - Handle user interactions for "Code this issue" action
  - Manage loading states during Claude processing
  - Communicate with backend via Forge `invoke()` calls

#### Backend Layer (`src/resolvers/index.js`)
- **Technology**: Node.js 22.x with Forge Runtime
- **Responsibilities**:
  - Fetch Jira issue data via Forge API
  - Convert ADF (Atlassian Document Format) to plain text
  - Interface with Firebase Realtime Database
  - Handle message queuing and response polling

#### Message Broker (Firebase Realtime Database)
- **Database**: `skipperrelay-default-rtdb.europe-west1.firebasedatabase.app`
- **Responsibilities**:
  - Queue requests from Jira to Claude
  - Store responses from Claude to Jira
  - Enable real-time communication between systems
  - Automatic cleanup of processed messages

## Data Flow

### Request Flow
1. User clicks "Code this issue" action in Jira
2. Frontend invokes `sendToClaude` resolver
3. Backend fetches issue description via Forge API
4. ADF content converted to plain text
5. Message posted to Firebase path: `/messages/{userId}/{commandId}`
6. Backend polls Firebase for response with 10-second timeout
7. Response retrieved from Firebase path: `/responses/{userId}/{commandId}`
8. Firebase entries cleaned up after successful retrieval
9. Response returned to frontend for display

### Message Structure

#### Request Message
```json
{
  "messages": {
    "{userId}": {
      "{commandId}": {
        "content": "Issue description in plain text",
        "timestamp": "ISO 8601 timestamp",
        "source": "jira-forge-app"
      }
    }
  }
}
```

#### Response Message
```json
{
  "responses": {
    "{userId}": {
      "{commandId}": {
        "content": "Claude's response",
        "timestamp": "ISO 8601 timestamp",
        "status": "completed"
      }
    }
  }
}
```

## Key Design Decisions

### 1. Firebase as Message Broker
- **Rationale**: Enables loose coupling between Jira and external Claude processes
- **Benefits**: 
  - Real-time communication
  - Scalable message queuing
  - Built-in persistence and reliability
- **Trade-offs**: External dependency, requires service account management

### 2. ADF to Plain Text Conversion
- **Rationale**: Claude works better with plain text than structured ADF
- **Implementation**: Custom conversion logic in backend resolvers
- **Benefits**: Cleaner input for LLM processing

### 3. Polling Response Pattern
- **Rationale**: Firebase real-time listeners not well-suited for Forge runtime
- **Implementation**: 10-second timeout with exponential backoff
- **Benefits**: Reliable message retrieval, timeout handling

### 4. User-Scoped Message Paths
- **Rationale**: Isolate messages per user for security and organization
- **Implementation**: Firebase paths include `{userId}` segment
- **Benefits**: Data isolation, easier cleanup, scalability

## Security Considerations

### Authentication & Authorization
- Firebase service account credentials stored in `src/resolvers/firebase-key.json`
- Jira API access via Forge's built-in authentication
- User-scoped data access prevents cross-user data leakage

### Data Privacy
- Issue descriptions temporarily stored in Firebase
- Automatic cleanup after successful processing
- No persistent storage of Jira content in external systems

### Network Security
- HTTPS communication between all components
- Firebase security rules enforce user-scoped access
- Forge platform provides sandboxed execution environment

## Scalability Considerations

### Performance
- Firebase RTDB handles real-time messaging efficiently
- Message cleanup prevents database bloat
- Forge platform provides auto-scaling

### Limitations
- 10-second timeout for Claude responses
- Firebase RTDB concurrent connection limits
- Forge platform execution time limits

## Monitoring & Observability

### Logging
- Forge console logs for development
- Firebase console for message flow monitoring
- Error handling for timeout and communication failures

### Metrics
- Message processing times
- Success/failure rates
- User adoption metrics via Jira analytics

## Development Workflow

### Local Development
```bash
forge tunnel  # Start local development environment
```

### Deployment
```bash
forge deploy  # Deploy to Atlassian Cloud
forge install  # Install to development site
```

### Code Quality
```bash
npm run lint  # ESLint validation
```

## Configuration Management

### Forge Configuration (`manifest.yml`)
- App permissions and scopes
- Module definitions for UI actions
- Resource declarations

### Firebase Configuration
- Service account credentials
- Database security rules
- Regional deployment settings

## Future Enhancements

### Potential Improvements
1. **Webhook-based Communication**: Replace polling with Firebase webhooks
2. **Enhanced Error Handling**: Retry mechanisms and fallback strategies
3. **Response Caching**: Cache common responses to improve performance
4. **Multi-LLM Support**: Support for different AI providers
5. **Customizable Prompts**: User-configurable prompt templates
6. **Response History**: Persistent storage of previous interactions

### Technical Debt
1. **Test Coverage**: No automated testing currently implemented
2. **Error Monitoring**: Limited error tracking and alerting
3. **Documentation**: API documentation for external integrations
4. **Performance Monitoring**: Response time and throughput metrics

## Dependencies

### Core Dependencies
- `@forge/api`: Jira API integration
- `@forge/ui`: React components for Forge
- `firebase-admin`: Firebase SDK for backend operations
- `react`: Frontend framework

### Development Dependencies
- `eslint`: Code quality enforcement
- `@babel/core`: JavaScript compilation
- `@babel/preset-react`: React JSX support

## Deployment Architecture

### Atlassian Forge Platform
- Serverless execution environment
- Automatic scaling and load balancing
- Built-in security and compliance features
- Regional data residency support

### Firebase Infrastructure
- Google Cloud Platform hosting
- Europe-West1 region deployment
- Real-time database with persistent connections
- Automatic backup and disaster recovery