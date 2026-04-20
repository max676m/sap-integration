import { Mastra } from '@mastra/core';
import type { Mastra as MastraType } from '@mastra/core';
import { nplAgent } from './agents/nplAgent.js';

/**
 * Mastra instance — registers all agents and makes them
 * available to the service layer.
 */
export const mastra: MastraType = new Mastra({
  agents: {
    nplAgent,
  },
});
