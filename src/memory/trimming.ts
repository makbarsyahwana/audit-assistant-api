import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { Logger } from '@nestjs/common';

const logger = new Logger('MessageTrimming');

/**
 * Default maximum number of conversation turns to keep.
 * Each turn = 1 human message + 1 AI response.
 */
const DEFAULT_MAX_TURNS = 20;

/**
 * Maximum token estimate before triggering summarization.
 * Uses a rough word-count heuristic (1 token ≈ 0.75 words).
 */
const DEFAULT_MAX_TOKENS = 8000;

/**
 * Trim messages to the most recent N turns, preserving the system message.
 * A "turn" is a human message followed by an AI response.
 *
 * @param messages - Full message history
 * @param maxTurns - Maximum number of turns to keep (default: 20)
 * @returns Trimmed message array
 */
export function trimMessagesByTurns(
  messages: BaseMessage[],
  maxTurns: number = DEFAULT_MAX_TURNS,
): BaseMessage[] {
  if (!messages || messages.length === 0) return [];

  // Separate system messages (always kept) from conversation
  const systemMessages = messages.filter((m) => m instanceof SystemMessage);
  const conversationMessages = messages.filter(
    (m) => !(m instanceof SystemMessage),
  );

  // Count turns (each HumanMessage starts a new turn)
  const turnBoundaries: number[] = [];
  for (let i = 0; i < conversationMessages.length; i++) {
    if (conversationMessages[i] instanceof HumanMessage) {
      turnBoundaries.push(i);
    }
  }

  if (turnBoundaries.length <= maxTurns) {
    return messages; // No trimming needed
  }

  // Keep only the last N turns
  const startIdx = turnBoundaries[turnBoundaries.length - maxTurns];
  const trimmedConversation = conversationMessages.slice(startIdx);

  logger.debug(
    `Trimmed ${turnBoundaries.length} turns → ${maxTurns} (removed ${turnBoundaries.length - maxTurns} turns)`,
  );

  return [...systemMessages, ...trimmedConversation];
}

/**
 * Estimate the total token count of messages using a word-count heuristic.
 */
export function estimateTokenCount(messages: BaseMessage[]): number {
  let totalWords = 0;
  for (const msg of messages) {
    const content =
      typeof msg.content === 'string'
        ? msg.content
        : JSON.stringify(msg.content);
    totalWords += content.split(/\s+/).length;
  }
  // Rough heuristic: 1 token ≈ 0.75 words
  return Math.ceil(totalWords / 0.75);
}

/**
 * Build a summarization prompt for compressing old conversation history.
 * Returns a system message with the summary to replace old messages.
 */
export function buildSummaryPrompt(messagesToSummarize: BaseMessage[]): string {
  const lines = messagesToSummarize.map((m) => {
    const role = m instanceof HumanMessage ? 'User' : 'Assistant';
    const content =
      typeof m.content === 'string'
        ? m.content
        : JSON.stringify(m.content);
    return `${role}: ${content.slice(0, 500)}`;
  });

  return (
    'Summarize the following conversation history into a concise paragraph ' +
    'that captures the key questions asked, answers provided, documents referenced, ' +
    'and any important decisions or findings. Keep it under 200 words.\n\n' +
    lines.join('\n')
  );
}

/**
 * Apply both trimming and optional summarization.
 *
 * Strategy:
 * 1. If messages exceed maxTurns, trim to last N turns
 * 2. If estimated tokens exceed maxTokens, further trim
 * 3. Return trimmed messages ready for the next invocation
 */
export function applyMessageTrimming(
  messages: BaseMessage[],
  options: {
    maxTurns?: number;
    maxTokens?: number;
  } = {},
): {
  messages: BaseMessage[];
  trimmed: boolean;
  originalCount: number;
  finalCount: number;
} {
  const maxTurns = options.maxTurns || DEFAULT_MAX_TURNS;
  const maxTokens = options.maxTokens || DEFAULT_MAX_TOKENS;
  const originalCount = messages.length;

  // Step 1: Trim by turns
  let result = trimMessagesByTurns(messages, maxTurns);

  // Step 2: If still over token budget, progressively trim more
  let tokenEstimate = estimateTokenCount(result);
  let currentMaxTurns = maxTurns;

  while (tokenEstimate > maxTokens && currentMaxTurns > 5) {
    currentMaxTurns = Math.max(5, Math.floor(currentMaxTurns * 0.7));
    result = trimMessagesByTurns(messages, currentMaxTurns);
    tokenEstimate = estimateTokenCount(result);
  }

  const trimmed = result.length < originalCount;
  if (trimmed) {
    logger.log(
      `Message trimming: ${originalCount} → ${result.length} messages (est. ${tokenEstimate} tokens)`,
    );
  }

  return {
    messages: result,
    trimmed,
    originalCount,
    finalCount: result.length,
  };
}
