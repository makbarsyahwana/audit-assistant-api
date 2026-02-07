import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { Logger } from '@nestjs/common';

const logger = new Logger('Checkpointer');

let checkpointerInstance: PostgresSaver | null = null;

/**
 * Get or create a PostgresSaver instance for short-term memory (checkpointing).
 * Each thread_id corresponds to a chat session scoped to an engagement.
 */
export async function getCheckpointer(
  connectionString: string,
): Promise<PostgresSaver> {
  if (checkpointerInstance) {
    return checkpointerInstance;
  }

  checkpointerInstance = PostgresSaver.fromConnString(connectionString);
  await checkpointerInstance.setup();
  logger.log('PostgresSaver (checkpointer) initialized');

  return checkpointerInstance;
}
