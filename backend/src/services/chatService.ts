import { mastra } from '../mastra/index.js';
import { getFieldsForStage } from '../config/fieldRegistry.js';
import {
  FIELD_COMPLETION_THRESHOLD,
  MAX_PROMPT_RETRIES,
  getWorkflowConfig,
} from '../config/workflowRulebook.js';
import type {
  ChatMessageRequest,
  ChatMessageResponse,
  Option,
} from '../dto/chatDto.js';

// ============================
// Initial Options
// ============================

const INITIAL_OPTIONS: Option[] = [
  {
    id: 'NEW_PRODUCT',
    label: 'New Product Launch',
    description: 'Launch a brand-new product with full BOM, Recipe, and Material Master creation.',
  },
  {
    id: 'EXTENSION',
    label: 'Extension',
    description: 'Extend an existing product to a new plant or sales area.',
  },
  {
    id: 'PROCUREMENT',
    label: 'Procurement',
    description: 'Procure raw/packaging materials — no product description needed.',
  },
];

// ============================
// Public API
// ============================

/**
 * Returns the 3 initial product type options.
 */
export function getInitialOptions(): ChatMessageResponse {
  return {
    sessionId: '',
    type: 'OPTIONS',
    message:
      'Welcome to MenaBev NPL Assistant! How can I help you today? Please select an option:',
    options: INITIAL_OPTIONS,
  };
}

/**
 * Main chat orchestration — processes a single user message
 * and returns the appropriate response.
 */
export async function processMessage(
  request: ChatMessageRequest,
): Promise<ChatMessageResponse> {
  const { sessionId, message, context } = request;
  const currentStage = context?.currentStage ?? 'OPTION_SELECT';

  // ------ Stage: OPTION_SELECT ------
  if (currentStage === 'OPTION_SELECT') {
    return handleOptionSelect(sessionId, message, context?.selectedOption);
  }

  // ------ Stage: FIELD_GATHERING ------
  if (currentStage === 'FIELD_GATHERING') {
    return handleFieldGathering(
      sessionId,
      message,
      context?.selectedOption!,
      context?.extractedFields ?? {},
      context?.promptCount ?? 0,
    );
  }

  // Fallback — shouldn't happen
  return {
    sessionId,
    type: 'TEXT',
    message: 'Something went wrong. Please start a new conversation.',
  };
}

// ============================
// Internal Handlers
// ============================

function handleOptionSelect(
  sessionId: string,
  _message: string,
  selectedOption?: string,
): ChatMessageResponse {
  if (!selectedOption) {
    return {
      sessionId,
      type: 'OPTIONS',
      message: 'Please select one of the options below:',
      options: INITIAL_OPTIONS,
    };
  }

  const workflow = getWorkflowConfig(selectedOption);
  if (!workflow) {
    return {
      sessionId,
      type: 'TEXT',
      message: `Unknown option: "${selectedOption}". Please select a valid option.`,
    };
  }

  // Procurement → no field extraction, go directly to SAP
  if (!workflow.requiresFieldExtraction) {
    return {
      sessionId,
      type: 'COMPLETE',
      message:
        "Procurement selected. Will now search in SAP to get the data. Stay Tuned! SAP API's integration is in WIP!!",
      extractedFields: {},
      missingFields: [],
      completionPercentage: 100,
    };
  }

  // New Product / Extension → ask user to describe product
  return {
    sessionId,
    type: 'TEXT',
    message:
      'Please describe your product in natural language. Include details like the product name, size/volume, packaging type, and plant location.\n\nExample: "We\'re launching a new Pepsi Zero Sugar 330ml glass bottle, manufactured in Jeddah Mega Plant."',
  };
}

async function callAgentWithRetry(
  agent: any,
  contextMessage: string,
  maxRetries = 2,
): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await agent.generate(contextMessage, { toolChoice: 'auto' });
    } catch (error: any) {
      const errorMsg = String(error?.message ?? error);
      const isRateLimit =
        errorMsg.includes('429') ||
        errorMsg.includes('quota') ||
        errorMsg.includes('RESOURCE_EXHAUSTED') ||
        errorMsg.includes('rate');

      if (isRateLimit && attempt < maxRetries) {
        const waitSec = 15 * attempt; // 15s, 30s
        console.log(
          `[chatService] Rate limited (attempt ${attempt}/${maxRetries}). Waiting ${waitSec}s before retry…`,
        );
        await new Promise((r) => setTimeout(r, waitSec * 1000));
        continue;
      }
      throw error; // Re-throw if not rate-limit or final attempt
    }
  }
}

async function handleFieldGathering(
  sessionId: string,
  userMessage: string,
  productType: string,
  previousFields: Record<string, unknown>,
  promptCount: number,
): Promise<ChatMessageResponse> {
  const fieldDefinitions = getFieldsForStage('MATERIAL_SEARCH');

  // Call the Mastra agent which will use extractFieldsTool → Python /extract
  try {
    const agent = mastra.getAgent('nplAgent');

    // Build context message for the agent
    const contextMessage = buildAgentPrompt(
      userMessage,
      productType,
      previousFields,
      promptCount,
      fieldDefinitions,
    );

    const response = await callAgentWithRetry(agent, contextMessage);

    // After agent runs, check if extractFieldsTool was called
    // and merge results with previous fields
    const toolResults = extractToolResults(response);
    const mergedFields = { ...previousFields, ...toolResults.fields };

    // Calculate completion
    const allFieldKeys = fieldDefinitions.map((f) => f.key);
    const { percentage, missing } = checkFieldCompletion(
      mergedFields,
      allFieldKeys,
    );

    // Decision: complete or re-prompt?
    const newPromptCount = promptCount + 1;

    if (percentage >= FIELD_COMPLETION_THRESHOLD || newPromptCount >= MAX_PROMPT_RETRIES) {
      const qualifier =
        newPromptCount >= MAX_PROMPT_RETRIES && percentage < FIELD_COMPLETION_THRESHOLD
          ? 'Proceeding with the available information.'
          : 'Great! I have enough information.';

      return {
        sessionId,
        type: 'COMPLETE',
        message: `${qualifier} Will now search in SAP to get the data. Stay Tuned! SAP API's integration is in WIP!!`,
        extractedFields: mergedFields,
        missingFields: missing,
        completionPercentage: Math.round(percentage * 100),
      };
    }

    // Re-prompt for missing fields
    const missingLabels = fieldDefinitions
      .filter((f) => missing.includes(f.key))
      .map((f) => `• **${f.label}** (e.g., "${f.example}")`)
      .join('\n');

    return {
      sessionId,
      type: 'PROMPT_FIELDS',
      message: `Thanks! I was able to extract some details, but I'm still missing:\n\n${missingLabels}\n\nCould you provide these?`,
      extractedFields: mergedFields,
      missingFields: missing,
      completionPercentage: Math.round(percentage * 100),
    };
  } catch (error: any) {
    const errorMsg = String(error?.message ?? error);
    const isRateLimit =
      errorMsg.includes('429') ||
      errorMsg.includes('quota') ||
      errorMsg.includes('RESOURCE_EXHAUSTED');

    console.error('[chatService] Error during field gathering:', error);

    if (isRateLimit) {
      return {
        sessionId,
        type: 'TEXT',
        message:
          'The AI service is temporarily busy (rate limit reached). Please wait about 30 seconds and try sending your description again.',
      };
    }

    return {
      sessionId,
      type: 'TEXT',
      message:
        'I encountered an error while processing your description. Please try again.',
    };
  }
}

// ============================
// Helpers
// ============================

function buildAgentPrompt(
  userMessage: string,
  productType: string,
  previousFields: Record<string, unknown>,
  promptCount: number,
  fieldDefinitions: { key: string; label: string; required: boolean; example: string }[],
): string {
  const prevFieldsSummary = Object.keys(previousFields).length > 0
    ? `\n\nPreviously extracted fields:\n${JSON.stringify(previousFields, null, 2)}`
    : '';

  return `The user selected "${productType}" and is describing their product.
This is prompt attempt ${promptCount + 1} of ${MAX_PROMPT_RETRIES}.

User message: "${userMessage}"
${prevFieldsSummary}

Please call the extract-fields tool with:
- text: the user's message above
- productType: "${productType}"
- fieldDefinitions: ${JSON.stringify(fieldDefinitions)}

After extraction, report what was found.`;
}

/**
 * Extracts tool call results from the agent response.
 * Looks for extractFields tool results in the response steps.
 */
function extractToolResults(response: any): {
  fields: Record<string, unknown>;
  confidence: number;
  missingFields: string[];
} {
  const defaultResult = { fields: {}, confidence: 0, missingFields: [] };

  try {
    // Navigate through the response to find tool results
    if (response?.steps) {
      for (const step of response.steps) {
        if (step?.toolResults) {
          for (const toolResult of step.toolResults) {
            if (toolResult?.toolName === 'extractFields' && toolResult?.result) {
              return {
                fields: toolResult.result.fields ?? {},
                confidence: toolResult.result.confidence ?? 0,
                missingFields: toolResult.result.missingFields ?? [],
              };
            }
          }
        }
      }
    }
  } catch {
    // If parsing fails, return empty
  }

  return defaultResult;
}

/**
 * Checks how many of the required fields have been extracted.
 * Returns the completion percentage (0-1) and list of missing field keys.
 */
export function checkFieldCompletion(
  extractedFields: Record<string, unknown>,
  allFieldKeys: string[],
): { percentage: number; missing: string[] } {
  if (allFieldKeys.length === 0) {
    return { percentage: 1, missing: [] };
  }

  const missing = allFieldKeys.filter((key) => {
    const value = extractedFields[key];
    return value === undefined || value === null || value === '';
  });

  const filled = allFieldKeys.length - missing.length;
  const percentage = filled / allFieldKeys.length;

  return { percentage, missing };
}
