-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'AUDIT_MANAGER', 'AUDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "EngagementStatus" AS ENUM ('PLANNING', 'ACTIVE', 'CLOSED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT,
    "role" "Role" NOT NULL DEFAULT 'AUDITOR',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "engagements" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "EngagementStatus" NOT NULL DEFAULT 'ACTIVE',
    "entity_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "engagements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "engagement_members" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "engagement_id" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'AUDITOR',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "engagement_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "query_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "engagement_id" TEXT NOT NULL,
    "query_text" TEXT NOT NULL,
    "retrieval_mode" TEXT,
    "response_text" TEXT,
    "latency_ms" INTEGER,
    "run_id" TEXT,
    "agent_graph" TEXT,
    "agent_steps" JSONB,
    "confidence" DOUBLE PRECISION,
    "explanation" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "query_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retrieval_events" (
    "id" TEXT NOT NULL,
    "query_log_id" TEXT NOT NULL,
    "chunk_id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "retrieval_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retrieval_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "engagement_members_user_id_engagement_id_key" ON "engagement_members"("user_id", "engagement_id");

-- AddForeignKey
ALTER TABLE "engagement_members" ADD CONSTRAINT "engagement_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engagement_members" ADD CONSTRAINT "engagement_members_engagement_id_fkey" FOREIGN KEY ("engagement_id") REFERENCES "engagements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "query_logs" ADD CONSTRAINT "query_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "query_logs" ADD CONSTRAINT "query_logs_engagement_id_fkey" FOREIGN KEY ("engagement_id") REFERENCES "engagements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retrieval_events" ADD CONSTRAINT "retrieval_events_query_log_id_fkey" FOREIGN KEY ("query_log_id") REFERENCES "query_logs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
