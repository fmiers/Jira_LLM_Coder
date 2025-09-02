import React, { useEffect, useState } from 'react';
import ForgeReconciler, { Text, TextArea, Button, Link, Box, DynamicTable, Inline, InlineEdit, Textfield, Stack } from '@forge/react';
import { invoke } from '@forge/bridge';
import * as logic from './configLogic';

const ConfigApp = () => {
  const [projectName, setProjectName] = useState('');
  const [technicalDesignDoc, setTechnicalDesignDoc] = useState('');
  const [projectTechnology, setProjectTechnology] = useState('Jira app / VSCode extension');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [isEditingTechDoc, setIsEditingTechDoc] = useState(false);
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
      const result = await logic.loadConfiguration(invoke);
      
      if (result.success) {
        setProjectName(result.projectName);
        setTechnicalDesignDoc(result.config.technicalDesignDoc || '');
        setProjectTechnology(result.config.projectTechnology || 'Jira app / VSCode extension');
      } else {
        setSaveMessage(result.error);
      }
      setIsLoading(false);
    };

    loadConfiguration();
  }, []);


  const handleConfirmTechDoc = async (value) => {
    const result = await logic.saveTechnicalDesignDoc(invoke, value);
    
    if (result.success) {
      // Update local state
      setTechnicalDesignDoc(value);
      setIsEditingTechDoc(false);
      setSaveMessage('Technical Design Document saved successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSaveMessage(''), 3000);
    } else {
      setSaveMessage(result.error);
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
    
    const result = await logic.checkForResults(invoke, lastCommandId, lastUserId);
    
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
      setSaveMessage(result.error || 'Results not ready yet. Try again in a moment.');
      setIsProcessing(false);
    }
  };

  const startPolling = (commandId, userId) => {
    // Clear any existing polling
    if (pollInterval) {
      clearInterval(pollInterval);
    }
    
    const interval = logic.startPolling(invoke, commandId, userId, {
      onComplete: (data) => {
        setEpicsData(data);
        setSaveMessage('Successfully converted to Epics and Stories!');
        setIsProcessing(false);
        setPollInterval(null);
      },
      onProgress: (progress) => {
        setSaveMessage(progress.message);
      },
      onError: (error) => {
        setSaveMessage(`Error: ${error}`);
        setIsProcessing(false);
        setPollInterval(null);
      }
    });
    
    setPollInterval(interval);
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
      <Text>AI Coder Configuration</Text>
      
      <Text>Project Name: {projectName}</Text>
      
      <Inline alignBlock="baseline" space="space.200">
        <Text>Technical Design Document:</Text>
        <InlineEdit
          defaultValue={technicalDesignDoc}
          isEditing={isEditingTechDoc}
          editView={({ ...fieldProps }) => (
            <Box xcss={{ width: '600px' }}>
              <Textfield
                {...fieldProps}
                placeholder=""
                autoFocus
              />
            </Box>
          )}
          readView={() => (
            <Inline space="space.075" alignBlock="center">
              <Button
                appearance="link"
                onClick={() => setIsEditingTechDoc(true)}
              >
                Edit
              </Button>
              {technicalDesignDoc && technicalDesignDoc.startsWith('http') ? (
                <Link href={technicalDesignDoc} target="_blank">
                  {technicalDesignDoc}
                </Link>
              ) : (
                <Text>{technicalDesignDoc || ""}</Text>
              )}
            </Inline>
          )}
          onConfirm={handleConfirmTechDoc}
          onCancel={() => setIsEditingTechDoc(false)}
        />
      </Inline>

      <Stack space="space.400">
        <Text></Text>
        <Box>
          <Button 
            appearance="primary"
            onClick={handleConvertToEpics}
            disabled={isProcessing || !technicalDesignDoc || !technicalDesignDoc.startsWith('http')}
          >
            {isProcessing ? 'Converting...' : 'Convert to Epics & Stories'}
          </Button>
        </Box>
        {showCheckAgain && (
          <Box>
            <Button 
              appearance="subtle"
              onClick={handleCheckForResults}
              disabled={isProcessing}
            >
              Check Again for Results
            </Button>
          </Box>
        )}
        <Text>Generated Epics and Stories</Text>
      </Stack>

      <Box>
        {epicsData ? (
          <DynamicTable
            caption="Epics and User Stories"
            head={logic.transformEpicsDataForTable(epicsData).head}
            rows={logic.transformEpicsDataForTable(epicsData).rows}
            rowsPerPage={10}
            isLoading={false}
          />
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
          <Text>You are about to create {logic.countEpicsAndStories(epicsData).epics} epics and {logic.countEpicsAndStories(epicsData).stories} user stories. Are you sure you want to proceed?</Text>
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
        <Box paddingTop="space.300">
          <Text>Created Work Items</Text>
          {createdItems.map((epic, epicIndex) => (
            <Box key={epic.key} paddingTop="space.200">
              <Text>Epic: {epic.key} - {epic.title}</Text>
              {epic.stories.map((story, storyIndex) => (
                <Box key={story.key} paddingLeft="space.200" paddingTop="space.050">
                  <Text>Story: {story.key} - {story.title}</Text>
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      )}
      
      <Inline alignBlock="baseline" space="space.200">
        <Text>Project Technology:</Text>
        <Text>{projectTechnology}</Text>
      </Inline>

      {saveMessage && (
        <Text>{saveMessage}</Text>
      )}

    </>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <ConfigApp />
  </React.StrictMode>
);