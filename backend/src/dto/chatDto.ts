import { z } from 'zod';

// ============================
// Request DTO
// ============================

export const ChatMessageRequestDto = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1).max(2000),
  context: z
    .object({
      selectedOption: z
        .enum(['NEW_PRODUCT', 'EXTENSION', 'PROCUREMENT'])
        .optional(),
      currentStage: z
        .enum(['OPTION_SELECT', 'FIELD_GATHERING'])
        .optional(),
      extractedFields: z.record(z.string(), z.any()).optional(),
      promptCount: z.number().int().min(0).optional(),
    })
    .optional(),
});

export type ChatMessageRequest = z.infer<typeof ChatMessageRequestDto>;

// ============================
// Response DTO
// ============================

export const OptionDto = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
});

export type Option = z.infer<typeof OptionDto>;

export const ChatMessageResponseDto = z.object({
  sessionId: z.string(),
  type: z.enum(['OPTIONS', 'TEXT', 'PROMPT_FIELDS', 'COMPLETE']),
  message: z.string(),
  options: z.array(OptionDto).optional(),
  extractedFields: z.record(z.string(), z.any()).optional(),
  missingFields: z.array(z.string()).optional(),
  completionPercentage: z.number().optional(),
});

export type ChatMessageResponse = z.infer<typeof ChatMessageResponseDto>;
