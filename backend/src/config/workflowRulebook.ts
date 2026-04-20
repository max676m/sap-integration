// ============================
// Workflow Rulebook
// ============================
// Approval chains per product type + configurable limits.

export interface ApprovalStep {
  role: string;
  label: string;
  order: number;
}

export interface WorkflowConfig {
  productType: string;
  label: string;
  requiresFieldExtraction: boolean;
  approvalChain: ApprovalStep[];
}

// ----- Configurable limits -----

export const MAX_PROMPT_RETRIES = 3;
export const FIELD_COMPLETION_THRESHOLD = 0.6; // 60%
export const MAX_CONVERSATION_TURNS = 20;

// ----- Approval chains per product type -----

export const WORKFLOW_RULES: Record<string, WorkflowConfig> = {
  NEW_PRODUCT: {
    productType: 'NEW_PRODUCT',
    label: 'New Product Launch',
    requiresFieldExtraction: true,
    approvalChain: [
      { role: 'Marketing', label: 'Marketing Review', order: 1 },
      { role: 'Manufacturing', label: 'Manufacturing Review', order: 2 },
      { role: 'Quality', label: 'Quality Review', order: 3 },
      { role: 'Finance', label: 'Finance Review', order: 4 },
    ],
  },
  EXTENSION: {
    productType: 'EXTENSION',
    label: 'Extension',
    requiresFieldExtraction: true,
    approvalChain: [
      { role: 'Marketing', label: 'Marketing Review', order: 1 },
      { role: 'Manufacturing', label: 'Manufacturing Review', order: 2 },
      { role: 'Finance', label: 'Finance Review', order: 3 },
    ],
  },
  PROCUREMENT: {
    productType: 'PROCUREMENT',
    label: 'Procurement',
    requiresFieldExtraction: false,
    approvalChain: [
      { role: 'Quality', label: 'Quality Review', order: 1 },
      { role: 'Finance', label: 'Finance Review', order: 2 },
    ],
  },
};

/**
 * Returns the workflow config for a given product type.
 */
export function getWorkflowConfig(
  productType: string,
): WorkflowConfig | undefined {
  return WORKFLOW_RULES[productType];
}
