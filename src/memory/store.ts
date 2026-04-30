// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PostgresStore } = require('@langchain/langgraph-checkpoint-postgres/store');
import { Logger } from '@nestjs/common';

const logger = new Logger('MemoryStore');

let storeInstance: any = null;
let initPromise: Promise<any> | null = null;

/**
 * Get or create a PostgresStore instance for long-term memory.
 * Namespace convention: ["memories", userId, engagementId]
 *
 * Uses a promise-based mutex so concurrent callers await the same
 * initialization instead of racing to create duplicate instances.
 */
export async function getMemoryStore(
  connectionString: string,
): Promise<any> {
  if (storeInstance) {
    return storeInstance;
  }

  if (!initPromise) {
    initPromise = (async () => {
      const store = PostgresStore.fromConnString(connectionString);
      await store.setup();
      storeInstance = store;
      logger.log('PostgresStore (long-term memory) initialized');
      return store;
    })();
  }

  return initPromise;
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
