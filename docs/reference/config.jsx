import React, { useEffect, useState } from 'react';
import ForgeReconciler, { Text, TextArea, TextField, Button, Box, DynamicTable } from '@forge/react';
import { invoke } from '@forge/bridge';

const ConfigApp = () => {
  const [projectName, setProjectName] = useState('');
  const [technicalDesignDoc, setTechnicalDesignDoc] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [tempTechDoc, setTempTechDoc] = useState('');
  const [epicsData, setEpicsData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isCreatingItems, setIsCreatingItems] = useState(false);
  const [createdItems, setCreatedItems] = useState(null);
  const [showCheckAgain, setShowCheckAgain] = useState(false);
  const [lastCommandId, setLastCommandId] = useState(null);
  const [lastUserId, setLastUserId] = useState(null);
  const [pollInterval, setPollInterval] = useState(null);

  useEffect(() => {
    // Load current project name and existing configuration
    const loadConfiguration = async () => {
      setIsLoading(true);
      try {
        // Get current project name
        const currentProjectName = await invoke('getCurrentProjectName');
        setProjectName(currentProjectName || '');

        // Load existing configuration
        const config = await invoke('getConfiguration');
        if (config) {
          setTechnicalDesignDoc(config.technicalDesignDoc || '');
          setTempTechDoc(config.technicalDesignDoc || '');
        }
      } catch (error) {
        console.error('Error loading configuration:', error);
        setSaveMessage('Error loading configuration');
      }
      setIsLoading(false);
    };

    loadConfiguration();
  }, []);

  const handleSaveTechDoc = async () => {
    try {
      await invoke('saveTechnicalDesignDoc', { technicalDesignDoc });
      setTempTechDoc(technicalDesignDoc);
      setSaveMessage('Technical Design Document saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error saving technical design document:', error);
      setSaveMessage('Error saving technical design document');
    }
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [pollInterval]);

  const handleCheckForResults = async () => {
    if (!lastCommandId || !lastUserId) return;
    
    setIsProcessing(true);
    setSaveMessage('Checking for results...');
    
    try {
      const result = await invoke('checkProgressAndResults', { 
        commandId: lastCommandId,
        userId: lastUserId
      });
      
      if (result.success && result.completed && result.data) {
        setEpicsData(result.data);
        setSaveMessage('Successfully retrieved Epics and Stories!');
        setShowCheckAgain(false);
        setIsProcessing(false);
      } else if (result.success && result.processing) {
        setSaveMessage(result.progress.message);
        // Start polling if not already polling
        if (!pollInterval) {
          startPolling(lastCommandId, lastUserId);
        }
      } else {
        setSaveMessage('Results not ready yet. Try again in a moment.');
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Error checking for results:', error);
      setSaveMessage(`Error: ${error.message}`);
      setIsProcessing(false);
    }
  };

  const startPolling = (commandId, userId) => {
    console.log('=== FRONTEND POLLING DEBUG ===');
    console.log('Starting polling with:', { commandId, userId });
    
    // Clear any existing polling
    if (pollInterval) {
      console.log('Clearing existing polling interval');
      clearInterval(pollInterval);
    }
    
    const interval = setInterval(async () => {
      console.log('=== POLLING ITERATION ===');
      console.log('Calling checkProgressAndResults...', { commandId, userId });
      
      try {
        const result = await invoke('checkProgressAndResults', {
          commandId: commandId,
          userId: userId
        });
        
        console.log('Polling result received:', JSON.stringify(result, null, 2));
        
        if (result.success) {
          if (result.completed && result.data) {
            // Final results received!
            console.log('✓ CONVERSION COMPLETED!');
            console.log('Setting epicsData:', result.data);
            setEpicsData(result.data);
            console.log('Setting success message');
            setSaveMessage('Successfully converted to Epics and Stories!');
            console.log('Setting isProcessing to false');
            setIsProcessing(false);
            console.log('Clearing polling interval');
            clearInterval(interval);
            setPollInterval(null);
          } else if (result.processing && result.progress) {
            // Progress update
            console.log('✓ PROGRESS UPDATE RECEIVED');
            console.log('Progress data:', result.progress);
            console.log('Setting progress message:', result.progress.message);
            setSaveMessage(result.progress.message);
            console.log('Progress message set successfully');
          } else {
            console.log('⚠ Unexpected result structure:', result);
          }
        } else {
          console.log('✗ POLLING ERROR:', result.error);
          setSaveMessage(`Error: ${result.error}`);
          setIsProcessing(false);
          clearInterval(interval);
          setPollInterval(null);
        }
      } catch (error) {
        console.error('✗ POLLING EXCEPTION:', error);
        setSaveMessage(`Polling error: ${error.message}`);
        clearInterval(interval);
        setPollInterval(null);
      }
    }, 3000); // Poll every 3 seconds
    
    console.log('Polling interval created:', interval);
    setPollInterval(interval);
    console.log('Polling started successfully');
  };

  const handleConvertToEpics = async () => {
    if (!technicalDesignDoc || !technicalDesignDoc.startsWith('http')) {
      setSaveMessage('Please enter a valid Confluence URL in the Technical Design Document field');
      return;
    }

    setIsProcessing(true);
    setSaveMessage('Fetching Confluence content...');
    
    try {
      // First fetch the Confluence content
      const confluenceResult = await invoke('fetchConfluenceContent', { 
        confluenceUrl: technicalDesignDoc 
      });
      
      if (!confluenceResult.success) {
        setSaveMessage(`Error fetching Confluence content: ${confluenceResult.error}`);
        setIsProcessing(false);
        return;
      }

      setSaveMessage('Starting conversion...');
      
      // Start the conversion process (returns immediately)
      const conversionResult = await invoke('convertToEpicsAndStories', {
        confluenceContent: confluenceResult.content,
        projectKey: projectName || 'DEFAULT'
      });
      
      if (conversionResult.success && conversionResult.processing) {
        // Conversion started successfully, begin polling
        console.log('=== CONVERSION STARTED SUCCESSFULLY ===');
        console.log('Conversion result:', JSON.stringify(conversionResult, null, 2));
        console.log('Setting initial message...');
        setSaveMessage('Conversion request sent to Claude...');
        console.log('Storing command details...');
        setLastCommandId(conversionResult.commandId);
        setLastUserId(conversionResult.userId);
        
        // Start real-time polling for progress and results
        console.log('About to start polling with:', {
          commandId: conversionResult.commandId,
          userId: conversionResult.userId
        });
        startPolling(conversionResult.commandId, conversionResult.userId);
        console.log('Polling initiation completed');
        
      } else {
        console.log('✗ CONVERSION START FAILED');
        console.log('Conversion result:', conversionResult);
        setSaveMessage(`Error starting conversion: ${conversionResult.error || 'Unknown error'}`);
        setIsProcessing(false);
      }
      
    } catch (error) {
      console.error('Error in epic conversion:', error);
      setSaveMessage(`Error: ${error.message}`);
      setIsProcessing(false);
    }
  };

  const countEpicsAndStories = () => {
    if (!epicsData || !epicsData.epics) return { epics: 0, stories: 0 };
    
    const epics = epicsData.epics.length;
    const stories = epicsData.epics.reduce((total, epic) => {
      return total + (epic.stories ? epic.stories.length : 0);
    }, 0);
    
    return { epics, stories };
  };

  // Transform epics data into DynamicTable format
  const transformEpicsDataForTable = () => {
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

  const handleCreateWorkItems = async () => {
    setIsCreatingItems(true);
    setShowConfirmDialog(false);
    setSaveMessage('Creating Jira work items...');
    
    try {
      // Get the actual project key (not display name) for Jira API
      const projectKey = await invoke('getCurrentProjectKey');
      
      if (!projectKey) {
        throw new Error('Unable to determine project key');
      }
      
      console.log('Creating work items for project key:', projectKey);
      
      const result = await invoke('createJiraWorkItems', {
        epicsData: epicsData,
        projectKey: projectKey
      });
      
      if (result.success) {
        setCreatedItems(result.createdItems);
        setSaveMessage(`Successfully created ${result.summary.epics} epics and ${result.summary.stories} stories!`);
        
        // Clear epics data since items are now created
        setEpicsData(null);
      } else {
        setSaveMessage(`Error creating work items: ${result.error}`);
      }
      
    } catch (error) {
      console.error('Error creating work items:', error);
      setSaveMessage(`Error: ${error.message}`);
    } finally {
      setIsCreatingItems(false);
      // Clear message after 10 seconds for success messages
      setTimeout(() => setSaveMessage(''), 10000);
    }
  };


  if (isLoading) {
    return <Text>Loading configuration...</Text>;
  }

  return (
    <>
      {/* Main Title */}
      <Box paddingBottom="space.500">
        <Text size="large" weight="bold">AI Coder</Text>
      </Box>
      
      {/* Configuration Section */}
      <Box paddingBottom="space.400">
        <Text size="medium">AI Coder configuration</Text>
      </Box>
      
      {/* Project Name Field */}
      <Box paddingBottom="space.300">
        <Box paddingBottom="space.100">
          <Text>Project name:</Text>
        </Box>
        <TextField
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="Placeholder"
          disabled={isSaving}
        />
      </Box>
      
      {/* Technical Design Document Field */}
      <Box paddingBottom="space.400">
        <Box paddingBottom="space.100">
          <Text>Technical design document:</Text>
        </Box>
        <Box paddingBottom="space.200">
          <TextArea
            value={technicalDesignDoc}
            onChange={(e) => setTechnicalDesignDoc(e.target.value)}
            placeholder="Click to enter a value"
            rows={3}
            disabled={isSaving}
          />
        </Box>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box />
          <Box display="flex" gap="space.100">
            <Button 
              appearance="subtle"
              onClick={handleSaveTechDoc}
              disabled={isSaving}
            >
              ✓
            </Button>
            <Button 
              appearance="subtle"
              onClick={() => {
                setTechnicalDesignDoc(tempTechDoc);
              }}
              disabled={isSaving}
            >
              ✕
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Conversion Action Section */}
      <Box paddingBottom="space.400">
        <Button 
          appearance="primary"
          onClick={handleConvertToEpics}
          disabled={isProcessing || !technicalDesignDoc || !technicalDesignDoc.startsWith('http')}
        >
          {isProcessing ? 'Converting...' : 'Convert to epics and stories'}
        </Button>
        {showCheckAgain && (
          <Box paddingTop="space.200">
            <Button 
              appearance="subtle"
              onClick={handleCheckForResults}
              disabled={isProcessing}
            >
              Check Again for Results
            </Button>
          </Box>
        )}
      </Box>

      {/* Results Section */}
      <Box paddingTop="space.300">
        {epicsData ? (
          <Box>
            <DynamicTable
              caption="Epics and User Stories"
              head={transformEpicsDataForTable().head}
              rows={transformEpicsDataForTable().rows}
              rowsPerPage={10}
              isLoading={false}
            />
          </Box>
        ) : (
          <Text>Converted epics and stories will appear here...</Text>
        )}
        
        {epicsData && (
          <Box paddingTop="space.200">
            <Button 
              appearance="primary"
              onClick={() => setShowConfirmDialog(true)}
              disabled={isProcessing}
            >
              Create Work Items
            </Button>
          </Box>
        )}
      </Box>

      {showConfirmDialog && (
        <Box paddingTop="space.200">
          <Text>You are about to create {countEpicsAndStories().epics} epics and {countEpicsAndStories().stories} user stories. Are you sure you want to proceed?</Text>
          <Box paddingTop="space.100">
            <Button 
              appearance="primary"
              onClick={handleCreateWorkItems}
              disabled={isCreatingItems}
            >
              {isCreatingItems ? 'Creating...' : 'Create stories'}
            </Button>
            <Button 
              appearance="subtle"
              onClick={() => setShowConfirmDialog(false)}
            >
              Cancel
            </Button>
          </Box>
        </Box>
      )}

      {createdItems && (
        <Box paddingTop="space.500">
          <Text size="medium" weight="bold">Created Work Items</Text>
          <Box paddingTop="space.200">
          {createdItems.map((epic) => (
            <Box key={epic.key} paddingTop="space.200">
              <Text>Epic: {epic.key} - {epic.title}</Text>
              {epic.stories.map((story) => (
                <Box key={story.key} paddingLeft="space.200" paddingTop="space.050">
                  <Text>Story: {story.key} - {story.title}</Text>
                </Box>
              ))}
            </Box>
          ))}
          </Box>
        </Box>
      )}
      
      {/* Status Messages */}
      {saveMessage && (
        <Box paddingTop="space.300" paddingBottom="space.300">
          <Text>{saveMessage}</Text>
        </Box>
      )}

    </>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <ConfigApp />
  </React.StrictMode>
);