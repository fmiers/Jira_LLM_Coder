import React, { useEffect, useState } from 'react';
import ForgeReconciler, { Text, Button, TextArea, Box } from '@forge/react';
import { invoke } from '@forge/bridge';
import { view } from '@forge/bridge';

const App = () => {
  const [textareaValue, setTextareaValue] = useState('');
  const [originalDescription, setOriginalDescription] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    invoke('getIssueDescription').then(desc => {
      const description = desc || 'No description available';
      setOriginalDescription(description);
      setTextareaValue(description);
      setIsLoading(false);
    }).catch(err => {
      console.error('Error fetching issue description:', err);
      const errorMsg = 'Error loading issue description';
      setOriginalDescription(errorMsg);
      setTextareaValue(errorMsg);
      setIsLoading(false);
    });
  }, []);

  const handleCancel = () => {
    // Close the view/modal
    view.close();
  };

  const handleSend = () => {
    setIsSending(true);
    setStatusMessage('Sending...');
    
    // Use the backend resolver to handle WebSocket connection
    invoke('sendToClaude', { description: textareaValue })
      .then(response => {
        console.log('Response received:', response);
        setStatusMessage(`Response: ${response}`);
        setIsSending(false);
        
      })
      .catch(error => {
        console.error('Send error:', error);
        setStatusMessage(`Error: ${error.message || 'Failed to send to Claude extension'}`);
        setIsSending(false);
      });
  };

  return (
    <>
      <Text>Send to development</Text>
      <TextArea
        value={isLoading ? 'Loading issue description...' : textareaValue}
        onChange={(e) => setTextareaValue(e.target.value)}
        placeholder="Issue description..."
        rows={6}
        disabled={isLoading || isSending}
      />
      <Text>Status</Text>
      <TextArea
        value={statusMessage}
        placeholder="Status messages will appear here..."
        rows={3}
        disabled={true}
      />
      <Box paddingBlock="space.100" />
      <Button appearance="subtle" onClick={handleCancel} disabled={isLoading || isSending}>
        Cancel
      </Button>
      <Button appearance="primary" onClick={handleSend} disabled={isLoading || isSending}>
        Send
      </Button>
    </>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
