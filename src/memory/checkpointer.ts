import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { Logger } from '@nestjs/common';

const logger = new Logger('Checkpointer');

let checkpointerInstance: PostgresSaver | null = null;
let initPromise: Promise<PostgresSaver> | null = null;

/**
 * Get or create a PostgresSaver instance for short-term memory (checkpointing).
 * Each thread_id corresponds to a chat session scoped to an engagement.
 *
 * Uses a promise-based mutex so concurrent callers await the same
 * initialization instead of racing to create duplicate instances.
 */
export async function getCheckpointer(
  connectionString: string,
): Promise<PostgresSaver> {
  if (checkpointerInstance) {
    return checkpointerInstance;
  }

  if (!initPromise) {
    initPromise = (async () => {
      const saver = PostgresSaver.fromConnString(connectionString);
      await saver.setup();
      checkpointerInstance = saver;
      logger.log('PostgresSaver (checkpointer) initialized');
      return saver;
    })();
  }

  return initPromise;
}
