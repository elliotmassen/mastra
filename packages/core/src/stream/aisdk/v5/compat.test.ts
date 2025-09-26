import { describe, expect, it } from 'vitest';
import { convertFullStreamChunkToUIMessageStream } from './compat';

describe('convertFullStreamChunkToUIMessageStream', () => {
  it('should convert tool-output part into UI message with correct format', () => {
    // Arrange: Create a tool-output part with sample data
    const toolOutput = {
      type: 'tool-output',
      toolCallId: 'test-tool-123',
      output: {
        content: 'Sample tool output content',
        timestamp: 1234567890,
        metadata: {
          source: 'test',
          version: '1.0',
        },
        status: 'success',
      },
    };

    // Act: Convert the tool output to UI message
    const result = convertFullStreamChunkToUIMessageStream({
      part: toolOutput,
      onError: error => `Error: ${error}`,
    });

    // Assert: Verify the transformation
    expect(result).toBeDefined();
    expect(result).toEqual({
      id: 'test-tool-123',
      content: 'Sample tool output content',
      timestamp: 1234567890,
      metadata: {
        source: 'test',
        version: '1.0',
      },
      status: 'success',
    });
  });

  // workflow-start
  // workflow-finish
  // workflow-canceled
  // workflow-step-start
  // workflow-step-output
  // workflow-step-finish
  // workflow-step-suspended
  // workflow-step-waiting
  // workflow-step-result

  it('should convert tool output part containing workflow-start payload into UI message with correct format', () => {
    // Arrange: Create a workflow-start part with sample data
    const toolOutput = {
      type: 'tool-output',
      output: {
        type: 'workflow-start',
        runId: '215f330d-7da0-42c1-8a0c-8809a41bc898',
        from: 'WORKFLOW',
        payload: { workflowId: 'Test Workflow' },
      },
      toolCallId: 'call_vds1lY3t5KNXUTRCX8wtn4uR',
      toolName: 'test-workflow',
    };

    // Act: Convert the workflow start to UI message
    const result = convertFullStreamChunkToUIMessageStream({
      part: toolOutput,
      onError: error => `Error: ${error}`,
    });

    // Assert: Verify the transformation
    expect(result).toBeDefined();
    expect(result).toEqual({
      type: 'data-workflow-start',
      data: {
        id: 'call_vds1lY3t5KNXUTRCX8wtn4uR',
        runId: '215f330d-7da0-42c1-8a0c-8809a41bc898',
        from: 'WORKFLOW',
        payload: { workflowId: 'Test Workflow' },
      },
    });
  });
});
