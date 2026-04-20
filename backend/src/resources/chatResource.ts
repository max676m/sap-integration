import type { FastifyInstance } from 'fastify';
import { ChatMessageRequestDto } from '../dto/chatDto.js';
import { getInitialOptions, processMessage } from '../services/chatService.js';

/**
 * Chat Resource — Fastify route plugin.
 * Thin HTTP layer: validation, delegation, error formatting.
 */
export default async function chatResource(app: FastifyInstance) {
  // ------ GET /api/chat/options ------
  // Returns the 3 initial product type options (convenience for test UI)
  app.get('/api/chat/options', async (_request, reply) => {
    const options = getInitialOptions();
    return reply.send(options);
  });

  // ------ POST /api/chat ------
  // Main chat endpoint — validates body, delegates to chatService
  app.post('/api/chat', async (request, reply) => {
    // Validate request body
    const parseResult = ChatMessageRequestDto.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    try {
      const response = await processMessage(parseResult.data);
      // Attach the sessionId from the request
      response.sessionId = parseResult.data.sessionId;
      return reply.send(response);
    } catch (error) {
      console.error('[chatResource] Error processing message:', error);
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to process chat message.',
      });
    }
  });
}
