// Business logic functions for the AI Coder Configuration page
// Pure JavaScript functions with no React dependencies

// Count epics and stories in the data
export const countEpicsAndStories = (epicsData) => {
  if (!epicsData || !epicsData.epics) return { epics: 0, stories: 0 };
  
  const epics = epicsData.epics.length;
  const stories = epicsData.epics.reduce((total, epic) => {
    return total + (epic.stories ? epic.stories.length : 0);
  }, 0);
  
  return { epics, stories };
};

// Transform epics data into DynamicTable format
export const transformEpicsDataForTable = (epicsData) => {
  if (!epicsData || !epicsData.epics) return { head: null, rows: [] };
  
  const head = {
    cells: [
      {
        key: 'epic',
        content: 'Epic',
        isSortable: true,
        width: 20
      },
      {
        key: 'story',
        content: 'Story Title',
        isSortable: true,
        width: 30
      },
      {
        key: 'description',
        content: 'Description',
        isSortable: false,
        width: 35
      },
      {
        key: 'criteria',
        content: 'Acceptance Criteria',
        isSortable: false,
        width: 15
      }
    ]
  };

  const rows = [];
  let rowIndex = 0;

  epicsData.epics.forEach((epic) => {
    if (epic.stories && epic.stories.length > 0) {
      epic.stories.forEach((story, storyIndex) => {
        const criteriaText = story.acceptanceCriteria && story.acceptanceCriteria.length > 0
          ? story.acceptanceCriteria.join('; ')
          : 'None specified';

        rows.push({
          key: `row-${rowIndex}`,
          cells: [
            {
              key: `epic-${rowIndex}`,
              content: storyIndex === 0 ? epic.title : '' // Only show epic name on first story
            },
            {
              key: `story-${rowIndex}`,
              content: story.title
            },
            {
              key: `desc-${rowIndex}`,
              content: story.description || 'No description'
            },
            {
              key: `criteria-${rowIndex}`,
              content: criteriaText
            }
          ]
        });
        rowIndex++;
      });
    } else {
      // Epic with no stories
      rows.push({
        key: `row-${rowIndex}`,
        cells: [
          {
            key: `epic-${rowIndex}`,
            content: epic.title
          },
          {
            key: `story-${rowIndex}`,
            content: '(No stories defined)'
          },
          {
            key: `desc-${rowIndex}`,
            content: epic.description || 'No description'
          },
          {
            key: `criteria-${rowIndex}`,
            content: 'N/A'
          }
        ]
      });
      rowIndex++;
    }
  });

  return { head, rows };
};

// Load configuration from the backend
export const loadConfiguration = async (invoke) => {
  try {
    // Get current project name
    const currentProjectName = await invoke('getCurrentProjectName');
    
    // Load existing configuration
    const config = await invoke('getConfiguration');
    
    return {
      success: true,
      projectName: currentProjectName || '',
      config: config || {
        technicalDesignDoc: '',
        projectTechnology: 'Jira app / VSCode extension'
      }
    };
  } catch (error) {
    console.error('Error loading configuration:', error);
    return {
      success: false,
      error: 'Error loading configuration'
    };
  }
};

// Save technical design document
export const saveTechnicalDesignDoc = async (invoke, technicalDesignDoc) => {
  try {
    await invoke('saveTechnicalDesignDoc', { technicalDesignDoc });
    return { success: true };
  } catch (error) {
    console.error('Error saving technical design document:', error);
    return { success: false, error: 'Error saving technical design document' };
  }
};

// Convert to epics and stories
export const convertToEpics = async (invoke, technicalDesignDoc) => {
  try {
    const response = await invoke('convertToEpicsAndStories', { 
      confluenceUrl: technicalDesignDoc 
    });
    
    return {
      success: true,
      commandId: response.commandId,
      userId: response.userId,
      initialStatus: response.initialStatus
    };
  } catch (error) {
    console.error('Error starting conversion:', error);
    return {
      success: false,
      error: error.message || 'Failed to start conversion'
    };
  }
};

// Check for conversion results
export const checkForResults = async (invoke, commandId, userId) => {
  try {
    const result = await invoke('checkProgressAndResults', { 
      commandId,
      userId
    });
    
    return result;
  } catch (error) {
    console.error('Error checking for results:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Create work items in Jira
export const createWorkItems = async (invoke, epicsData) => {
  try {
    const response = await invoke('createJiraWorkItems', { 
      epicsData 
    });
    
    if (response.success) {
      return {
        success: true,
        createdItems: response.createdItems
      };
    } else {
      return {
        success: false,
        error: response.error || 'Failed to create work items'
      };
    }
  } catch (error) {
    console.error('Error creating work items:', error);
    return {
      success: false,
      error: error.message || 'Failed to create work items'
    };
  }
};

// Polling logic for checking conversion progress
export const startPolling = (invoke, commandId, userId, callbacks) => {
  console.log('=== FRONTEND POLLING DEBUG ===');
  console.log('Starting polling with:', { commandId, userId });
  
  const interval = setInterval(async () => {
    console.log('=== POLLING ITERATION ===');
    console.log('Calling checkProgressAndResults...', { commandId, userId });
    
    try {
      const result = await checkForResults(invoke, commandId, userId);
      
      console.log('Polling result received:', JSON.stringify(result, null, 2));
      
      if (result.success) {
        if (result.completed && result.data) {
          // Final results received!
          console.log('✓ CONVERSION COMPLETED!');
          callbacks.onComplete(result.data);
          clearInterval(interval);
        } else if (result.processing) {
          // Still processing
          console.log('Still processing...');
          callbacks.onProgress(result.progress);
        }
      } else {
        // Error occurred
        console.log('✗ POLLING ERROR:', result.error);
        callbacks.onError(result.error || 'Polling failed');
        clearInterval(interval);
      }
    } catch (error) {
      console.error('✗ POLLING EXCEPTION:', error);
      callbacks.onError(error.message);
      clearInterval(interval);
    }
  }, 3000); // Poll every 3 seconds
  
  console.log('Polling interval created:', interval);
  return interval;
};