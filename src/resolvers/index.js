const Resolver = require('@forge/resolver');
const api = require('@forge/api');
const { route } = require('@forge/api');
const { storage } = require('@forge/api');
const admin = require('firebase-admin');
const serviceAccount = require('./firebase-key.json');

// Initialize Firebase Admin SDK with cached access token
let cachedAccessToken = null;
let tokenExpiry = null;

if (!admin.apps.length) {
  console.log('Initializing Firebase Admin SDK...');
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://skipperrelay-default-rtdb.europe-west1.firebasedatabase.app'
  });
  
  console.log('Firebase Admin SDK initialized successfully');
}

// Function to get cached or fresh access token
async function getAccessToken() {
  const now = Date.now();
  
  // If token exists and hasn't expired (with 5min buffer), use cached version
  if (cachedAccessToken && tokenExpiry && now < (tokenExpiry - 300000)) {
    return cachedAccessToken;
  }
  
  // Get fresh token
  const tokenResult = await admin.credential.cert(serviceAccount).getAccessToken();
  cachedAccessToken = tokenResult.access_token;
  tokenExpiry = now + (tokenResult.expires_in * 1000); // Convert to milliseconds
  
  return cachedAccessToken;
}

// Create resolver instance
const resolver = new Resolver.default();

resolver.define('getText', (req) => {
  console.log(req);
  return 'Code this item';
});

// Configuration management resolvers
resolver.define('getCurrentProjectName', async (req) => {
  const { context } = req;
  
  try {
    // Get project information from Jira API
    const projectKey = context.extension?.project?.key;
    
    if (projectKey) {
      const response = await api.asApp().requestJira(route`/rest/api/3/project/${projectKey}`);
      const project = await response.json();
      return project.name || projectKey;
    }
    
    return 'Unknown Project';
  } catch (error) {
    console.error('Error fetching project name:', error);
    return 'Error loading project';
  }
});

resolver.define('getCurrentProjectKey', async (req) => {
  const { context } = req;
  
  try {
    // Get project key from context
    const projectKey = context.extension?.project?.key;
    return projectKey || null;
  } catch (error) {
    console.error('Error getting project key:', error);
    return null;
  }
});

resolver.define('getBoardId', async (req) => {
  const { projectKey } = req.payload;
  
  try {
    // Get all boards for the project
    const response = await api.asApp().requestJira(route`/rest/agile/1.0/board?projectKeyOrId=${projectKey}`);
    const boardsData = await response.json();
    
    console.log('Boards response:', JSON.stringify(boardsData, null, 2));
    
    if (boardsData.values && boardsData.values.length > 0) {
      // Return the first board ID (usually the main board)
      const boardId = boardsData.values[0].id;
      console.log('Found board ID:', boardId);
      return boardId;
    } else {
      console.log('No boards found for project:', projectKey);
      return null;
    }
  } catch (error) {
    console.error('Error getting board ID:', error);
    return null;
  }
});

resolver.define('getConfiguration', async (req) => {
  const { context } = req;
  
  try {
    // Get configuration from Jira app storage
    const projectKey = context.extension?.project?.key || 'default';
    const config = await storage.get(`config_${projectKey}`);
    
    return config || {
      projectName: '',
      technicalDesignDoc: '',
      projectTechnology: 'Jira app / VSCode extension'
    };
  } catch (error) {
    console.error('Error loading configuration:', error);
    return null;
  }
});

resolver.define('saveConfiguration', async (req) => {
  const { config } = req.payload;
  const { context } = req;
  
  try {
    // Save configuration to Jira app storage
    const projectKey = context.extension?.project?.key || 'default';
    await storage.set(`config_${projectKey}`, config);
    
    console.log('Configuration saved for project:', projectKey, config);
    return { success: true };
  } catch (error) {
    console.error('Error saving configuration:', error);
    throw new Error('Failed to save configuration');
  }
});

resolver.define('saveTechnicalDesignDoc', async (req) => {
  const { technicalDesignDoc } = req.payload;
  const { context } = req;
  
  try {
    // Get current configuration
    const projectKey = context.extension?.project?.key || 'default';
    const currentConfig = await storage.get(`config_${projectKey}`) || {};
    
    // Update only the technicalDesignDoc field
    const updatedConfig = {
      ...currentConfig,
      technicalDesignDoc: technicalDesignDoc
    };
    
    // Save back to storage
    await storage.set(`config_${projectKey}`, updatedConfig);
    
    console.log('Technical Design Document saved for project:', projectKey, technicalDesignDoc);
    return { success: true };
  } catch (error) {
    console.error('Error saving technical design document:', error);
    throw new Error('Failed to save technical design document');
  }
});

resolver.define('fetchConfluenceContent', async (req) => {
  const { confluenceUrl } = req.payload;
  
  try {
    // Extract page ID from Confluence URL
    // Expected format: https://domain.atlassian.net/wiki/spaces/SPACE/pages/PAGE_ID/Page+Title
    const urlMatch = confluenceUrl.match(/\/pages\/(\d+)\//);
    if (!urlMatch) {
      throw new Error('Invalid Confluence URL format. Expected format: .../pages/PAGE_ID/...');
    }
    
    const pageId = urlMatch[1];
    console.log('Fetching Confluence page ID:', pageId);
    
    // Fetch page content from Confluence API
    const response = await api.asUser().requestConfluence(route`/wiki/api/v2/pages/${pageId}?body-format=atlas_doc_format`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Confluence page: ${response.status} ${response.statusText}`);
    }
    
    const pageData = await response.json();
    console.log('Successfully fetched Confluence page:', pageData.title);
    
    return {
      success: true,
      title: pageData.title,
      content: pageData.body?.atlas_doc_format?.value || 'No content available'
    };
    
  } catch (error) {
    console.error('Error fetching Confluence content:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

resolver.define('createJiraWorkItems', async (req) => {
  const { epicsData, projectKey } = req.payload;
  const { context } = req;
  
  try {
    console.log('=== Creating Jira Work Items ===');
    console.log('Project key:', projectKey);
    console.log('Epics to create:', epicsData.epics.length);
    
    const createdItems = [];
    
    // Get project ID from project key
    console.log(`Fetching project details for key: ${projectKey}`);
    const projectResponse = await api.asUser().requestJira(route`/rest/api/3/project/${projectKey}`);
    if (!projectResponse.ok) {
      const errorText = await projectResponse.text();
      console.error(`Project fetch failed for key "${projectKey}":`, projectResponse.status, errorText);
      throw new Error(`Failed to fetch project details: ${projectResponse.status}`);
    }
    const project = await projectResponse.json();
    const projectId = project.id;
    console.log(`✓ Found project: "${project.name}" (${project.key}) with ID: ${projectId}`);
    
    // Create each epic and its stories
    for (const epicData of epicsData.epics) {
      console.log('Creating epic:', epicData.title);
      
      // Create Epic
      const epicPayload = {
        fields: {
          project: { id: projectId },
          summary: epicData.title,
          description: {
            type: "doc",
            version: 1,
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: epicData.description || "Generated from technical design document"
                  }
                ]
              }
            ]
          },
          issuetype: { name: "Epic" }
        }
      };
      
      const epicResponse = await api.asUser().requestJira(route`/rest/api/3/issue`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(epicPayload)
      });
      
      if (!epicResponse.ok) {
        const errorText = await epicResponse.text();
        console.error('Epic creation failed:', errorText);
        throw new Error(`Failed to create epic "${epicData.title}": ${epicResponse.status}`);
      }
      
      const createdEpic = await epicResponse.json();
      console.log('✓ Created epic:', createdEpic.key);
      
      const epicItem = {
        type: 'epic',
        key: createdEpic.key,
        id: createdEpic.id,
        title: epicData.title,
        stories: []
      };
      
      // Create stories for this epic
      if (epicData.stories && epicData.stories.length > 0) {
        for (const storyData of epicData.stories) {
          console.log('Creating story:', storyData.title);
          
          // Build description with acceptance criteria
          let storyDescription = storyData.description || "Generated from technical design document";
          if (storyData.acceptanceCriteria && storyData.acceptanceCriteria.length > 0) {
            storyDescription += "\n\nAcceptance Criteria:\n" + 
              storyData.acceptanceCriteria.map(criteria => `• ${criteria}`).join('\n');
          }
          
          const storyPayload = {
            fields: {
              project: { id: projectId },
              summary: storyData.title,
              description: {
                type: "doc",
                version: 1,
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: storyDescription
                      }
                    ]
                  }
                ]
              },
              issuetype: { name: "Story" },
              parent: { key: createdEpic.key } // Link to epic
            }
          };
          
          const storyResponse = await api.asUser().requestJira(route`/rest/api/3/issue`, {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(storyPayload)
          });
          
          if (!storyResponse.ok) {
            const errorText = await storyResponse.text();
            console.error('Story creation failed:', errorText);
            // Continue with other stories rather than failing completely
            console.log(`⚠ Failed to create story "${storyData.title}": ${storyResponse.status}`);
          } else {
            const createdStory = await storyResponse.json();
            console.log('✓ Created story:', createdStory.key);
            
            epicItem.stories.push({
              key: createdStory.key,
              id: createdStory.id,
              title: storyData.title
            });
          }
        }
      }
      
      createdItems.push(epicItem);
    }
    
    console.log('=== Work Item Creation Complete ===');
    console.log('Created epics:', createdItems.length);
    console.log('Total stories:', createdItems.reduce((sum, epic) => sum + epic.stories.length, 0));
    
    return {
      success: true,
      createdItems: createdItems,
      summary: {
        epics: createdItems.length,
        stories: createdItems.reduce((sum, epic) => sum + epic.stories.length, 0)
      }
    };
    
  } catch (error) {
    console.error('Error creating Jira work items:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

resolver.define('checkForConversionResults', async (req) => {
  const { commandId, projectKey } = req.payload;
  const { context } = req;
  
  try {
    console.log('=== Checking for Delayed Conversion Results ===');
    console.log('Command ID:', commandId);
    
    const userId = context.accountId || 'anonymous';
    const accessToken = await getAccessToken();
    
    // Check Firebase responses for the specific command
    const responseUrl = `https://skipperrelay-default-rtdb.europe-west1.firebasedatabase.app/responses.json`;
    
    const responseCheck = await fetch(responseUrl, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json' 
      }
    });
    
    if (responseCheck.ok) {
      const responseData = await responseCheck.json();
      
      if (responseData && typeof responseData === 'object') {
        const keys = Object.keys(responseData);
        
        for (const key of keys) {
          const childData = responseData[key];
          
          if (childData && childData.response && childData.messageId === userId) {
            if (childData.message && childData.message.includes(commandId)) {
              console.log('Found delayed response!');
              
              try {
                const jsonMatch = childData.response.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  const epicsData = JSON.parse(jsonMatch[0]);
                  
                  // Clean up Firebase entry
                  await fetch(`https://skipperrelay-default-rtdb.europe-west1.firebasedatabase.app/responses/${key}.json`, { 
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                  });
                  
                  return {
                    success: true,
                    data: epicsData
                  };
                }
              } catch (parseError) {
                console.error('Error parsing delayed response:', parseError);
              }
            }
          }
        }
      }
    }
    
    return {
      success: false,
      message: 'No results available yet'
    };
    
  } catch (error) {
    console.error('Error checking for conversion results:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

resolver.define('checkProgressAndResults', async (req) => {
  const { commandId, userId } = req.payload;
  const { context } = req;
  
  try {
    console.log('=== Checking Progress and Results ===');
    console.log('CommandId:', commandId);
    console.log('UserId:', userId);
    
    const accessToken = await getAccessToken();
    
    // URLs for checking progress and responses
    const encodedUserId = encodeURIComponent(userId);
    const progressUrl = `https://skipperrelay-default-rtdb.europe-west1.firebasedatabase.app/progress/${encodedUserId}/${commandId}.json`;
    const responseUrl = `https://skipperrelay-default-rtdb.europe-west1.firebasedatabase.app/responses.json`;
    
    // First check for final response
    console.log('Checking for final response...');
    try {
      const responseCheck = await fetch(responseUrl, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json' 
        }
      });
      
      if (responseCheck.ok) {
        const responseData = await responseCheck.json();
        
        if (responseData && typeof responseData === 'object') {
          const keys = Object.keys(responseData);
          
          for (const key of keys) {
            const childData = responseData[key];
            
            if (childData && childData.response && childData.userId === userId) {
              if (childData.messageId === commandId) {
                console.log('✓ Found final response!');
                
                try {
                  // Extract JSON from response
                  const jsonMatch = childData.response.match(/\{[\s\S]*\}/);
                  if (jsonMatch) {
                    const epicsData = JSON.parse(jsonMatch[0]);
                    
                    // Clean up Firebase entries
                    try {
                      const deleteMessage = fetch(`https://skipperrelay-default-rtdb.europe-west1.firebasedatabase.app/messages/${userId}/${commandId}.json`, { 
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${accessToken}` }
                      });
                      const deleteResponseEntry = fetch(`https://skipperrelay-default-rtdb.europe-west1.firebasedatabase.app/responses/${key}.json`, { 
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${accessToken}` }
                      });
                      const deleteProgress = fetch(`https://skipperrelay-default-rtdb.europe-west1.firebasedatabase.app/progress/${encodedUserId}/${commandId}.json`, { 
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${accessToken}` }
                      });
                      
                      await Promise.all([deleteMessage, deleteResponseEntry, deleteProgress]);
                      console.log('✓ Firebase entries cleaned up');
                    } catch (cleanupError) {
                      console.error('Error cleaning up Firebase entries:', cleanupError);
                    }
                    
                    return {
                      success: true,
                      completed: true,
                      data: epicsData
                    };
                  }
                } catch (parseError) {
                  console.error('Error parsing Claude response:', parseError);
                  return {
                    success: false,
                    error: 'Failed to parse Claude response as JSON',
                    rawResponse: childData.response
                  };
                }
              }
            }
          }
        }
      }
    } catch (responseError) {
      console.log('Error checking responses:', responseError.message);
    }
    
    // No final response yet, check for progress
    console.log('Checking for progress updates...');
    try {
      const progressCheck = await fetch(progressUrl, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json' 
        }
      });
      
      if (progressCheck.ok) {
        const progressData = await progressCheck.json();
        
        if (progressData && progressData.status) {
          console.log('Progress found:', progressData.status);
          
          return {
            success: true,
            processing: true,
            progress: {
              status: progressData.status,
              message: progressData.message || progressData.status,
              timestamp: progressData.timestamp
            }
          };
        }
      }
    } catch (progressError) {
      console.log('Error checking progress:', progressError.message);
    }
    
    // No progress or response found
    return {
      success: true,
      processing: true,
      progress: {
        status: 'waiting',
        message: 'Waiting for Claude to start processing...',
        timestamp: new Date().toISOString()
      }
    };
    
  } catch (error) {
    console.error('Error in checkProgressAndResults:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

resolver.define('convertToEpicsAndStories', async (req) => {
  const { confluenceContent, projectKey } = req.payload;
  const { context } = req;
  
  try {
    console.log('=== Converting Confluence Content to Epics and Stories ===');
    
    // Create unique identifiers for Claude communication
    const userId = context.accountId || 'anonymous';
    const commandId = `epics-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    
    // Prepare content for Claude with specific instructions
    const claudePrompt = `Please analyze the following technical design document and convert it into Jira Epics and User Stories. 

IMPORTANT: Respond ONLY with valid JSON in this exact format:
{
  "epics": [
    {
      "title": "Epic Title",
      "description": "Epic description",
      "stories": [
        {
          "title": "Story Title", 
          "description": "As a [user], I want [functionality] so that [benefit]",
          "acceptanceCriteria": ["Criteria 1", "Criteria 2"]
        }
      ]
    }
  ]
}

Technical Design Document Content:
${confluenceContent}`;

    // Send command to Firebase using existing infrastructure
    const commandData = {
      type: 'epics-conversion',
      payload: {
        prompt: claudePrompt,
        projectKey: projectKey,
        message: 'Convert technical design to epics and stories'
      },
      timestamp: new Date().toISOString(),
      from: 'jira-forge-app'
    };
    
    // Get cached or fresh access token for authentication
    const accessToken = await getAccessToken();
    
    const firebaseUrl = `https://skipperrelay-default-rtdb.europe-west1.firebasedatabase.app/messages/${userId}/${commandId}.json`;
    
    console.log('=== Firebase Connection Test ===');
    console.log('Sending epics conversion request to Firebase:', firebaseUrl);
    console.log('Access token available:', !!accessToken);
    console.log('Command data prepared:', JSON.stringify(commandData, null, 2));
    
    // Send request to Firebase
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    let response;
    try {
      response = await fetch(firebaseUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(commandData),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Firebase write failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      console.log('✓ Firebase write successful for epics conversion');
      
      // Return immediately - don't wait for Claude response
      return {
        success: true,
        processing: true,
        commandId: commandId,
        userId: userId,
        message: 'Conversion request sent to Claude. Use checkProgressAndResults to poll for updates.'
      };
      
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
    
  } catch (error) {
    console.error('Error in convertToEpicsAndStories:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

resolver.define('getIssueDescription', async (req) => {
  const { context } = req;
  const issueId = context.extension.issue.id;
  
  try {
    const response = await api.asApp().requestJira(route`/rest/api/3/issue/${issueId}`);
    const issue = await response.json();
    
    let description = issue.fields.description;
    
    // Handle different description formats
    if (!description) {
      return 'No description available';
    }
    
    // If description is an object (ADF format), extract text content
    if (typeof description === 'object') {
      return extractTextFromADF(description);
    }
    
    // If it's already a string, return it
    return description;
  } catch (error) {
    console.error('Error fetching issue description:', error);
    return 'Error fetching description';
  }
});

// Helper function to extract plain text from ADF (Atlassian Document Format)
function extractTextFromADF(adf) {
  if (!adf || !adf.content) {
    return 'No description content';
  }
  
  let text = '';
  
  function extractText(node) {
    if (node.type === 'text') {
      text += node.text || '';
    } else if (node.content) {
      node.content.forEach(extractText);
    }
    if (node.type === 'paragraph' || node.type === 'heading') {
      text += '\n';
    }
  }
  
  adf.content.forEach(extractText);
  return text.trim() || 'No readable description content';
}

resolver.define('sendToClaude', async (req) => {
  const { description } = req.payload;
  const { context } = req;
  
  try {
    console.log('=== Firebase REST API Approach ===');
    
    // Create unique identifiers
    const userId = context.accountId || 'anonymous';
    const commandId = `cmd-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    
    // Send command to Firebase using authenticated REST API
    const commandData = {
      type: 'code-request',
      payload: {
        description: description,
        issueId: context.extension?.issue?.id,
        message: 'Request from Jira Forge app'
      },
      timestamp: new Date().toISOString(),
      from: 'jira-forge-app'
    };
    
    // Get cached or fresh access token for authentication
    const accessToken = await getAccessToken();
    
    const firebaseUrl = `https://skipperrelay-default-rtdb.europe-west1.firebasedatabase.app/messages/${userId}/${commandId}.json`;
    
    console.log('Sending to Firebase:', firebaseUrl);
    
    // Use authenticated REST API call with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout for Firebase write
    
    let response;
    try {
      response = await fetch(firebaseUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(commandData),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Firebase write failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✓ Firebase write successful');
      
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Firebase write timeout - check Firebase connection');
      }
      throw error;
    }
    
    // Now poll for response from Claude using authenticated REST API
    console.log(`Polling for response (${userId}/${commandId})...`);
    const responseUrl = `https://skipperrelay-default-rtdb.europe-west1.firebasedatabase.app/responses.json`;
    
    let attempts = 0;
    const maxAttempts = 20; // 20 seconds timeout (still under Forge's 25s limit)
    const pollInterval = 1000; // 1 second intervals
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      attempts++;
      
      console.log(`Checking for response (attempt ${attempts}/${maxAttempts})...`);
      
      try {
        console.log(`Fetching: ${responseUrl}`);
        
        // Add timeout to polling requests too
        const pollController = new AbortController();
        const pollTimeoutId = setTimeout(() => pollController.abort(), 5000); // 5 second timeout for each poll
        
        const responseCheck = await fetch(responseUrl, {
          method: 'GET',
          headers: { 
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json' 
          },
          signal: pollController.signal
        });
        
        clearTimeout(pollTimeoutId);
        console.log(`Response status: ${responseCheck.status}`);
        
        if (responseCheck.ok) {
          const responseData = await responseCheck.json();
          console.log('Raw response data from /responses/:', JSON.stringify(responseData, null, 2));
          
          // Search through all Firebase push() keys for matching response
          if (responseData && typeof responseData === 'object' && responseData !== null) {
            console.log('=== DETAILED RESPONSE PARSING DEBUG ===');
            console.log('Target userId:', userId);
            console.log('Target commandId:', commandId);
            console.log('Searching for response matching messageId or commandId...');
            const keys = Object.keys(responseData);
            console.log('Available response keys:', keys);
            console.log('Total responses found:', keys.length);
            
            // Collect all matching responses and find the best match
            const matchingResponses = [];
            
            for (const key of keys) {
              const childData = responseData[key];
              console.log(`\n--- Checking response key "${key}" ---`);
              console.log('Full childData:', JSON.stringify(childData, null, 2));
              
              // Check if response field exists
              const hasResponse = childData && childData.response;
              console.log('Has response field:', hasResponse);
              
              if (hasResponse) {
                console.log('Response field value:', childData.response);
                console.log('Response length:', childData.response ? childData.response.length : 'N/A');
                
                // Check messageId matching
                const childMessageId = childData.messageId;
                const matchesMessageId = childMessageId === userId;
                console.log(`Child messageId: "${childMessageId}"`);
                console.log(`Target userId: "${userId}"`);
                console.log(`MessageId exact match: ${matchesMessageId}`);
                
                // Check commandId matching
                const childMessage = childData.message;
                const matchesCommandId = childMessage && childMessage.includes(commandId);
                console.log(`Child message field: "${childMessage}"`);
                console.log(`Target commandId: "${commandId}"`);
                console.log(`CommandId match (message contains): ${matchesCommandId}`);
                
                // Check timestamp
                const childTimestamp = childData.timestamp;
                console.log(`Child timestamp: "${childTimestamp}"`);
                
                // More specific matching - prefer exact commandId match
                if (matchesMessageId && matchesCommandId) {
                  console.log('✓ EXACT MATCH FOUND (both messageId and commandId)');
                  matchingResponses.push({
                    key,
                    data: childData,
                    exactMatch: true,
                    timestamp: childTimestamp || '0'
                  });
                } else if (matchesMessageId) {
                  console.log('✓ MessageId match found (partial match)');
                  matchingResponses.push({
                    key,
                    data: childData,
                    exactMatch: false,
                    timestamp: childTimestamp || '0'
                  });
                } else {
                  console.log('✗ No match for this response');
                }
              } else {
                console.log('✗ No response field in this entry');
              }
            }
            
            console.log(`\n=== MATCHING SUMMARY ===`);
            console.log('Total matching responses found:', matchingResponses.length);
            
            if (matchingResponses.length > 0) {
              // Sort by exact match first, then by timestamp (most recent first)
              matchingResponses.sort((a, b) => {
                if (a.exactMatch !== b.exactMatch) {
                  return b.exactMatch - a.exactMatch; // exact matches first
                }
                return b.timestamp.localeCompare(a.timestamp); // most recent first
              });
              
              const bestMatch = matchingResponses[0];
              console.log('✓ Best matching response selected:', bestMatch.data.response);
              console.log(`Match details: exactMatch=${bestMatch.exactMatch}, timestamp=${bestMatch.timestamp}`);
              
              // Truncate response at first colon to show only natural language part
              const fullResponse = bestMatch.data.response;
              const colonIndex = fullResponse.indexOf(':');
              const truncatedResponse = colonIndex > 0 ? fullResponse.substring(0, colonIndex) : fullResponse;
              
              console.log('Full response length:', fullResponse.length);
              console.log('Truncated response:', truncatedResponse);
              
              // Add Claude's response as a comment to the Jira issue
              try {
                const issueId = context.extension?.issue?.id;
                console.log('Adding comment to issue:', issueId);
                
                const commentBody = {
                  body: {
                    type: "doc",
                    version: 1,
                    content: [
                      {
                        type: "paragraph",
                        content: [
                          {
                            type: "text",
                            text: `Claude's Analysis: ${fullResponse}`
                          }
                        ]
                      }
                    ]
                  }
                };
                
                const commentResponse = await api.asApp().requestJira(route`/rest/api/3/issue/${issueId}/comment`, {
                  method: 'POST',
                  headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(commentBody)
                });
                
                if (commentResponse.ok) {
                  console.log('✓ Comment added successfully');
                } else {
                  console.error('Failed to add comment:', await commentResponse.text());
                }
                
                // Change issue status to 'In Review'
                console.log('Changing issue status to In Review...');
                
                // First get available transitions to find the correct transition ID
                const transitionsResponse = await api.asApp().requestJira(route`/rest/api/3/issue/${issueId}/transitions`);
                
                if (transitionsResponse.ok) {
                  const transitions = await transitionsResponse.json();
                  console.log('Available transitions:', JSON.stringify(transitions, null, 2));
                  
                  // Find transition to "In Review"
                  const inReviewTransition = transitions.transitions.find(t => 
                    t.name === "In Review" || t.to.name === "In Review"
                  );
                  
                  if (inReviewTransition) {
                    console.log('Found In Review transition:', inReviewTransition.id);
                    const transitionResponse = await api.asApp().requestJira(route`/rest/api/3/issue/${issueId}/transitions`, {
                      method: 'POST',
                      headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({
                        transition: {
                          id: inReviewTransition.id
                        }
                      })
                    });
                    
                    if (transitionResponse.ok) {
                      console.log('✓ Issue status changed to In Review');
                    } else {
                      console.error('Failed to change status:', await transitionResponse.text());
                    }
                  } else {
                    console.error('In Review transition not found. Available transitions:', transitions.transitions.map(t => t.name));
                  }
                } else {
                  console.error('Failed to get transitions:', await transitionsResponse.text());
                }
                
              } catch (jiraError) {
                console.error('Error updating Jira issue:', jiraError);
              }
              
              // Clean up Firebase entries using authenticated REST API
              try {
                const deleteMessage = fetch(`https://skipperrelay-default-rtdb.europe-west1.firebasedatabase.app/messages/${userId}/${commandId}.json`, { 
                  method: 'DELETE',
                  headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                const deleteResponseEntry = fetch(`https://skipperrelay-default-rtdb.europe-west1.firebasedatabase.app/responses/${bestMatch.key}.json`, { 
                  method: 'DELETE',
                  headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                
                await Promise.all([deleteMessage, deleteResponseEntry]);
                console.log('✓ Firebase entries cleaned up');
              } catch (cleanupError) {
                console.error('Error cleaning up Firebase entries:', cleanupError);
              }
              
              return truncatedResponse;
            }
            
            console.log('No matching responses found for this request');
          } else if (responseData === null) {
            console.log('No responses exist yet');
          } else {
            console.log('Unexpected response data type:', typeof responseData, responseData);
          }
        } else {
          console.log(`Response check failed: ${responseCheck.status} - ${responseCheck.statusText}`);
          const errorText = await responseCheck.text();
          console.log('Error response body:', errorText);
        }
      } catch (pollError) {
        console.error(`Poll attempt ${attempts}/${maxAttempts} failed:`, pollError.message);
        console.error('Poll error type:', pollError.name);
        
        if (pollError.name === 'AbortError') {
          console.error('Individual poll request timed out (5 seconds), continuing to next attempt...');
        } else {
          console.error('Poll error stack:', pollError.stack);
        }
        
        // Continue polling unless it's a critical error
        if (pollError.message && pollError.message.includes('fetch')) {
          console.error('Network error detected, continuing polling...');
        }
      }
    }
    
    // Timeout reached - clean up message but don't delete response in case it arrives late
    console.log('Timeout reached, cleaning up message...');
    try {
      await fetch(`https://skipperrelay-default-rtdb.europe-west1.firebasedatabase.app/messages/${userId}/${commandId}.json`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
    } catch (cleanupError) {
      console.error('Error cleaning up message on timeout:', cleanupError);
    }
    
    return `TIMEOUT: Message sent successfully but no response received after ${maxAttempts} seconds. Check Firebase at /responses/ for responses. CommandId: ${commandId}, UserId: ${userId}`;
    
  } catch (error) {
    console.error('=== Firebase REST API Error Details ===');
    console.error('Error type:', typeof error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Return more specific error information
    if (error.message && error.message.includes('fetch')) {
      return `FAILED: Fetch error - ${error.message}`;
    } else if (error.message && error.message.includes('HTTP')) {
      return `FAILED: HTTP error - ${error.message}`;
    } else {
      return `FAILED: ${error.message || 'Unknown error'}`;
    }
  }
});

module.exports = { handler: resolver.getDefinitions() };
