import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * extractFieldsTool
 * Mastra tool that calls Python AI Service POST /extract
 * to perform NLP structured field extraction from user text.
 */
export const extractFieldsTool = createTool({
  id: 'extract-fields',
  description:
    'Extracts structured product fields from a natural-language user description by calling the Python AI service. Use this tool whenever the user describes a product and you need to parse out specific fields like product name, size, packaging type, and plant location.',
  inputSchema: z.object({
    text: z
      .string()
      .describe('The raw natural-language text from the user describing their product.'),
    productType: z
      .enum(['NEW_PRODUCT', 'EXTENSION'])
      .describe('The product type selected by the user.'),
    fieldDefinitions: z
      .array(
        z.object({
          key: z.string(),
          label: z.string(),
          required: z.boolean(),
          example: z.string(),
        }),
      )
      .describe('The list of field definitions to extract from the text.'),
  }),
  outputSchema: z.object({
    fields: z
      .record(z.string(), z.any())
      .describe('Key-value pairs of successfully extracted fields.'),
    confidence: z
      .number()
      .describe('Overall confidence score (0-1) for the extraction.'),
    missingFields: z
      .array(z.string())
      .describe('List of field keys that could not be extracted.'),
  }),
  execute: async ({ context }) => {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    const maxAttempts = 2;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(`${aiServiceUrl}/extract`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: context.text,
            product_type: context.productType,
            field_definitions: context.fieldDefinitions,
          }),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          const isRetryable =
            response.status === 429 || response.status >= 500;

          if (isRetryable && attempt < maxAttempts) {
            console.log(
              `[extractFieldsTool] Got ${response.status}, retrying in 10s…`,
            );
            await new Promise((r) => setTimeout(r, 10_000));
            continue;
          }
          throw new Error(
            `AI Service returned ${response.status}: ${errorBody}`,
          );
        }

        const data = (await response.json()) as {
          fields?: Record<string, unknown>;
          confidence?: number;
          missing_fields?: string[];
        };

        return {
          fields: data.fields ?? {},
          confidence: data.confidence ?? 0,
          missingFields: data.missing_fields ?? [],
        };
      } catch (error) {
        if (attempt < maxAttempts) {
          console.log(
            `[extractFieldsTool] Error on attempt ${attempt}, retrying in 10s…`,
          );
          await new Promise((r) => setTimeout(r, 10_000));
          continue;
        }
        // If the Python service is unreachable, return empty extraction
        // so the agent can still ask the user for fields manually
        console.error('[extractFieldsTool] Error calling AI service:', error);
        return {
          fields: {},
          confidence: 0,
          missingFields: context.fieldDefinitions.map(
            (f: { key: string }) => f.key,
          ),
        };
      }
    }

    // Fallback (shouldn't reach here)
    return {
      fields: {},
      confidence: 0,
      missingFields: context.fieldDefinitions.map(
        (f: { key: string }) => f.key,
      ),
    };
  },
});
