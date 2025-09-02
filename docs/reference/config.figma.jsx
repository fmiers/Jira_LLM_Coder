import React, { useEffect, useState } from 'react';
import ForgeReconciler, { Text, TextArea, TextField, Button, Box, DynamicTable } from '@forge/react';
import { invoke } from '@forge/bridge';

/** ---------- PRESENTATION HELPERS (no new deps) ---------- */
const Section = ({ title, children, top = 'space.500' }) => (
  <Box paddingTop={top}>
    {title ? <Text size="medium" weight="bold">{title}</Text> : null}
    <Box paddingTop="space.200">{children}</Box>
  </Box>
);

const FieldRow = ({ label, children }) => (
  <Box paddingTop="space.300">
    <Text weight="bold">{label}</Text>
    <Box paddingTop="space.100">{children}</Box>
  </Box>
);

const ValueBox = ({ children }) => (
  <Box
    padding="space.150"
    style={{
      background: '#FFFFFF',
      border: '1px solid #DFE1E6',
      borderRadius: 3,
    }}
  >
    <Text>{children}</Text>
  </Box>
);

const Panel = ({ children }) => (
  <Box
    padding="space.200"
    style={{
      background: '#F7F8F9',
      border: '1px solid #DFE1E6',
      borderRadius: 3,
    }}
  >
    {children}
  </Box>
);

/** ---------- ORIGINAL APP (logic unchanged) ---------- */
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
    const loadConfiguration = async () => {
      setIsLoading(true);
      try {
        const currentProjectName = await invoke('getCurrentProjectName');
        setProjectName(currentProjectName || '');

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

  useEffect(() => {
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [pollInterval]);

  const startPolling = (commandId, userId) => {
    if (pollInterval) clearInterval(pollInterval);
    const interval = setInterval(async () => {
      try {
        const result = await invoke('checkProgressAndResults', { commandId, userId });
        if (result.success) {
          if (result.completed && result.data) {
            setEpicsData(result.data);
            setSaveMessage('Successfully converted to Epics and Stories!');
            setIsProcessing(false);
            clearInterval(interval);
            setPollInterval(null);
          } else if (result.processing && result.progress) {
            setSaveMessage(result.progress.message);
          }
        } else {
          setSaveMessage(`Error: ${result.error}`);
          setIsProcessing(false);
          clearInterval(interval);
          setPollInterval(null);
        }
      } catch (error) {
        setSaveMessage(`Polling error: ${error.message}`);
        clearInterval(interval);
        setPollInterval(null);
      }
    }, 3000);
    setPollInterval(interval);
  };

  const handleCheckForResults = async () => {
    if (!lastCommandId || !lastUserId) return;
    setIsProcessing(true);
    setSaveMessage('Checking for results...');
    try {
      const result = await invoke('checkProgressAndResults', { commandId: lastCommandId, userId: lastUserId });
      if (result.success && result.completed && result.data) {
        setEpicsData(result.data);
        setSaveMessage('Successfully retrieved Epics and Stories!');
        setShowCheckAgain(false);
        setIsProcessing(false);
      } else if (result.success && result.processing) {
        setSaveMessage(result.progress.message);
        if (!pollInterval) startPolling(lastCommandId, lastUserId);
      } else {
        setSaveMessage('Results not ready yet. Try again in a moment.');
        setIsProcessing(false);
      }
    } catch (error) {
      setSaveMessage(`Error: ${error.message}`);
      setIsProcessing(false);
    }
  };

  const handleConvertToEpics = async () => {
    if (!technicalDesignDoc || !technicalDesignDoc.startsWith('http')) {
      setSaveMessage('Please enter a valid Confluence URL in the Technical Design Document field');
      return;
    }
    setIsProcessing(true);
    setSaveMessage('Fetching Confluence content...');
    try {
      const confluenceResult = await invoke('fetchConfluenceContent', { confluenceUrl: technicalDesignDoc });
      if (!confluenceResult.success) {
        setSaveMessage(`Error fetching Confluence content: ${confluenceResult.error}`);
        setIsProcessing(false);
        return;
      }
      setSaveMessage('Starting conversion...');
      const conversionResult = await invoke('convertToEpicsAndStories', {
        confluenceContent: confluenceResult.content,
        projectKey: projectName || 'DEFAULT'
      });
      if (conversionResult.success && conversionResult.processing) {
        setSaveMessage('Conversion request sent to Claude...');
        setLastCommandId(conversionResult.commandId);
        setLastUserId(conversionResult.userId);
        startPolling(conversionResult.commandId, conversionResult.userId);
      } else {
        setSaveMessage(`Error starting conversion: ${conversionResult.error || 'Unknown error'}`);
        setIsProcessing(false);
      }
    } catch (error) {
      setSaveMessage(`Error: ${error.message}`);
      setIsProcessing(false);
    }
  };

  const countEpicsAndStories = () => {
    if (!epicsData || !epicsData.epics) return { epics: 0, stories: 0 };
    const epics = epicsData.epics.length;
    const stories = epicsData.epics.reduce((total, epic) => total + (epic.stories ? epic.stories.length : 0), 0);
    return { epics, stories };
  };

  const transformEpicsDataForTable = () => {
    if (!epicsData || !epicsData.epics) return { head: null, rows: [] };
    const head = {
      cells: [
        { key: 'epic', content: 'Epic', isSortable: true, width: 20 },
        { key: 'story', content: 'Story Title', isSortable: true, width: 30 },
        { key: 'description', content: 'Description', isSortable: false, width: 35 },
        { key: 'criteria', content: 'Acceptance Criteria', isSortable: false, width: 15 }
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
              { key: `epic-${rowIndex}`, content: storyIndex === 0 ? epic.title : '' },
              { key: `story-${rowIndex}`, content: story.title },
              { key: `desc-${rowIndex}`, content: story.description || 'No description' },
              { key: `criteria-${rowIndex}`, content: criteriaText }
            ]
          });
          rowIndex++;
        });
      } else {
        rows.push({
          key: `row-${rowIndex}`,
          cells: [
            { key: `epic-${rowIndex}`, content: epic.title },
            { key: `story-${rowIndex}`, content: '(No stories defined)' },
            { key: `desc-${rowIndex}`, content: epic.description || 'No description' },
            { key: `criteria-${rowIndex}`, content: 'N/A' }
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
      const projectKey = await invoke('getCurrentProjectKey');
      if (!projectKey) throw new Error('Unable to determine project key');
      const result = await invoke('createJiraWorkItems', { epicsData, projectKey });
      if (result.success) {
        setCreatedItems(result.createdItems);
        setSaveMessage(`Successfully created ${result.summary.epics} epics and ${result.summary.stories} stories!`);
        setEpicsData(null);
      } else {
        setSaveMessage(`Error creating work items: ${result.error}`);
      }
    } catch (error) {
      setSaveMessage(`Error: ${error.message}`);
    } finally {
      setIsCreatingItems(false);
      setTimeout(() => setSaveMessage(''), 10000);
    }
  };

  if (isLoading) return <Text>Loading configuration...</Text>;

  /** ---------- LAYOUT: mirrors Figma, logic unchanged ---------- */
  return (
    <Box padding="space.400">
      {/* Title & Subtitle */}
      <Text size="xlarge" weight="bold">AI Coder</Text>
      <Box paddingTop="space.100">
        <Text>AI Coder configuration</Text>
      </Box>

      {/* Details (Project name, Tech doc) */}
      <Section title="Configuration">
        <FieldRow label="Project name">
          {/* Keep TextField (logic unchanged) but box it to look tidier */}
          <Box>
            <TextField
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Placeholder"
              disabled={isSaving}
            />
          </Box>
        </FieldRow>

        <FieldRow label="Technical design document">
          <Box>
            <TextArea
              value={technicalDesignDoc}
              onChange={(e) => setTechnicalDesignDoc(e.target.value)}
              placeholder="Click to enter a value"
              rows={2}
              disabled={isSaving}
            />
            <Box paddingTop="space.100" display="flex" justifyContent="flex-end" gap="space.100">
              <Button appearance="subtle" onClick={handleSaveTechDoc} disabled={isSaving}>Save</Button>
              <Button
                appearance="subtle"
                onClick={() => setTechnicalDesignDoc(tempTechDoc)}
                disabled={isSaving}
              >
                Cancel
              </Button>
            </Box>
          </Box>
        </FieldRow>
      </Section>

      {/* Primary action */}
      <Box paddingTop="space.500">
        <Button
          appearance="primary"
          onClick={handleConvertToEpics}
          disabled={isProcessing || !technicalDesignDoc || !technicalDesignDoc.startsWith('http')}
        >
          {isProcessing ? 'Converting…' : 'Convert to epics and stories'}
        </Button>
        {showCheckAgain && (
          <Box paddingTop="space.200">
            <Button appearance="subtle" onClick={handleCheckForResults} disabled={isProcessing}>
              Check Again for Results
            </Button>
          </Box>
        )}
      </Box>

      {/* Results */}
      <Section title="Generated Epics and Stories">
        {epicsData ? (
          <DynamicTable
            caption="Epics and User Stories"
            head={transformEpicsDataForTable().head}
            rows={transformEpicsDataForTable().rows}
            rowsPerPage={10}
            isLoading={false}
          />
        ) : (
          <Panel>
            <Text>Converted epics and stories will appear here…</Text>
          </Panel>
        )}

        {epicsData && (
          <Box paddingTop="space.200">
            <Button appearance="primary" onClick={() => setShowConfirmDialog(true)} disabled={isProcessing}>
              Create Work Items
            </Button>
          </Box>
        )}
      </Section>

      {/* Confirmation */}
      {showConfirmDialog && (
        <Section>
          <Panel>
            <Text>
              You are about to create {countEpicsAndStories().epics} epics and {countEpicsAndStories().stories} user stories.
              Are you sure you want to proceed?
            </Text>
            <Box paddingTop="space.100" display="flex" gap="space.100">
              <Button appearance="primary" onClick={handleCreateWorkItems} disabled={isCreatingItems}>
                {isCreatingItems ? 'Creating…' : 'Create stories'}
              </Button>
              <Button appearance="subtle" onClick={() => setShowConfirmDialog(false)}>Cancel</Button>
            </Box>
          </Panel>
        </Section>
      )}

      {/* Created items summary */}
      {createdItems && (
        <Section title="Created Work Items">
          <Box paddingTop="space.100">
            {createdItems.map((epic) => (
              <Box key={epic.key} paddingTop="space.150">
                <Text>Epic: {epic.key} - {epic.title}</Text>
                {epic.stories.map((story) => (
                  <Box key={story.key} paddingLeft="space.200" paddingTop="space.050">
                    <Text>Story: {story.key} - {story.title}</Text>
                  </Box>
                ))}
              </Box>
            ))}
          </Box>
        </Section>
      )}

      {/* Status message */}
      {saveMessage && (
        <Box paddingTop="space.400">
          <Text>{saveMessage}</Text>
        </Box>
      )}
    </Box>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <ConfigApp />
  </React.StrictMode>
);
