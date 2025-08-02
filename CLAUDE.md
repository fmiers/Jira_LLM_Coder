# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Jira Forge app that provides an "Code this issue" action in Jira backlog items. The app extracts issue descriptions and sends them to Claude via Firebase for LLM-powered development assistance.

## Architecture

- **Frontend**: React app using Forge UI Kit (`src/frontend/index.jsx`)
- **Backend**: Forge resolvers with Firebase integration (`src/resolvers/index.js`)
- **Communication**: Firebase Realtime Database acts as message broker between Jira and Claude
- **Platform**: Atlassian Forge with Node.js 22.x runtime

## Key Components

### Frontend (`src/frontend/index.jsx`)
- React app with TextArea for issue description editing
- Communicates with backend via `invoke()` calls
- Handles loading states and user interactions

### Backend Resolvers (`src/resolvers/index.js`)
- `getIssueDescription`: Fetches Jira issue description via Forge API
- `sendToClaude`: Sends description to Firebase for Claude processing
- Handles ADF (Atlassian Document Format) to plain text conversion
- Firebase Admin SDK integration for real-time messaging

### Firebase Integration
- Real-time database at `skipperrelay-default-rtdb.europe-west1.firebasedatabase.app`
- Message structure: `/messages/{userId}/{commandId}` for requests
- Response structure: `/responses/{userId}/{commandId}` for Claude responses
- Automatic cleanup of processed messages

## Common Commands

### Development
```bash
# Start local development tunnel
forge tunnel

# Deploy changes to Forge
forge deploy

# Install app to Atlassian site
forge install

# Lint code
npm run lint
```

### Building and Testing
- No test framework currently configured
- Use `forge deploy` to test changes in Atlassian environment
- Monitor logs via Forge console during tunnel development

## Configuration Files

- `manifest.yml`: Forge app configuration defining permissions, modules, and resources
- `package.json`: Dependencies including Forge SDK, React, and Firebase Admin
- Firebase service account keys stored in `src/resolvers/firebase-key.json`

## External Dependencies

- Firebase Admin SDK for real-time communication
- Forge API for Jira integration
- React 18 with Forge UI components
- ESLint for code quality

## Development Notes

- App requires Firebase service account credentials to function
- Issue descriptions are automatically extracted from Jira API in ADF format
- Firebase serves as the communication bridge between Jira and external Claude instances
- The app polls Firebase for responses with 10-second timeout
- All Firebase entries are cleaned up after successful communication