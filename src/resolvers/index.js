import Resolver from '@forge/resolver';
import api, { route } from '@forge/api';
import admin from 'firebase-admin';
import serviceAccount from './firebase-key.json';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  console.log('Initializing Firebase Admin SDK...');
  console.log('Service account project_id:', serviceAccount.project_id);
  console.log('Service account client_email:', serviceAccount.client_email);
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://skipperrelay-default-rtdb.europe-west1.firebasedatabase.app'
  });
  
  console.log('Firebase Admin SDK initialized successfully');
}

const db = admin.database();
const resolver = new Resolver();

resolver.define('getText', (req) => {
  console.log(req);
  return 'Code this item';
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
    
    // Send command to Firebase using REST API instead of Admin SDK
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
    
    const firebaseUrl = `https://skipperrelay-default-rtdb.europe-west1.firebasedatabase.app/messages/${userId}/${commandId}.json`;
    
    console.log('Firebase URL:', firebaseUrl);
    console.log('Command data:', JSON.stringify(commandData, null, 2));
    
    // Use Forge fetch API instead of Firebase Admin SDK
    const response = await fetch(firebaseUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commandData)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('✓ Successfully wrote to Firebase via REST API');
    console.log('Firebase response:', result);
    
    // Now poll for response from Claude
    console.log('Polling for response...');
    console.log('Looking for response with messageId:', userId);
    console.log('Looking for response with commandId:', commandId);
    const responseUrl = `https://skipperrelay-default-rtdb.europe-west1.firebasedatabase.app/responses.json`;
    
    let attempts = 0;
    const maxAttempts = 20; // 20 seconds timeout (under Forge's 25s limit)
    const pollInterval = 1000; // 1 second intervals
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      attempts++;
      
      console.log(`Checking for response (attempt ${attempts}/${maxAttempts})...`);
      
      try {
        console.log(`Fetching: ${responseUrl}`);
        const responseCheck = await fetch(responseUrl, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
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
              
              // Clean up Firebase entries
              try {
                const deleteMessage = fetch(`https://skipperrelay-default-rtdb.europe-west1.firebasedatabase.app/messages/${userId}/${commandId}.json`, { method: 'DELETE' });
                const deleteResponseEntry = fetch(`https://skipperrelay-default-rtdb.europe-west1.firebasedatabase.app/responses/${bestMatch.key}.json`, { method: 'DELETE' });
                
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
        console.error('Error during response polling:', pollError);
        console.error('Poll error stack:', pollError.stack);
      }
    }
    
    // Timeout reached - clean up message but don't delete response in case it arrives late
    console.log('Timeout reached, cleaning up message...');
    try {
      await fetch(`https://skipperrelay-default-rtdb.europe-west1.firebasedatabase.app/messages/${userId}/${commandId}.json`, { method: 'DELETE' });
    } catch (cleanupError) {
      console.error('Error cleaning up message on timeout:', cleanupError);
    }
    
    return `TIMEOUT: Message sent successfully but no response received after 20 seconds. Check Firebase at /responses/${userId}/${commandId}`;
    
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

export const handler = resolver.getDefinitions();
