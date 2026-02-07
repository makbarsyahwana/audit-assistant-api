// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PostgresStore } = require('@langchain/langgraph-checkpoint-postgres/store');
import { Logger } from '@nestjs/common';

const logger = new Logger('MemoryStore');

let storeInstance: any = null;

/**
 * Get or create a PostgresStore instance for long-term memory.
 * Namespace convention: ["memories", userId, engagementId]
 */
export async function getMemoryStore(
  connectionString: string,
): Promise<any> {
  if (storeInstance) {
    return storeInstance;
  }

  storeInstance = PostgresStore.fromConnString(connectionString);
  await storeInstance.setup();
  logger.log('PostgresStore (long-term memory) initialized');

  return storeInstance;
}

/**
 * Build the namespace array for long-term memory.
 */
export function buildMemoryNamespace(
  userId: string,
  engagementId: string,
): string[] {
  return ['memories', userId, engagementId];
}
