import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CitationResponse {
  @ApiProperty()
  chunkId: string;

  @ApiProperty()
  documentId: string;

  @ApiPropertyOptional()
  documentName?: string;

  @ApiPropertyOptional()
  pageNumber?: number;

  @ApiProperty()
  excerpt: string;
}

export class QueryResponse {
  @ApiProperty({ example: 'Based on ISO 27001 clause A.12.1...' })
  answer: string;

  @ApiProperty({ type: [CitationResponse] })
  citations: CitationResponse[];

  @ApiProperty({ example: 0.85 })
  confidence: number;

  @ApiProperty({ example: 'Generated using hybrid retrieval with 8 chunks.' })
  explanation: string;

  @ApiProperty({ example: 'run-uuid' })
  runId: string;

  @ApiProperty({ example: 'thread-uuid' })
  threadId: string;
}
