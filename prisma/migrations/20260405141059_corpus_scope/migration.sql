-- CreateEnum
CREATE TYPE "AppMode" AS ENUM ('AUDIT', 'LEGAL', 'COMPLIANCE');

-- CreateEnum
CREATE TYPE "DocType" AS ENUM ('POLICY', 'FRAMEWORK', 'WORKPAPER', 'EVIDENCE', 'REPORT', 'TICKET', 'CONTRACT', 'BRIEF', 'PRECEDENT', 'PLEADING', 'REGULATION', 'OBLIGATION', 'GUIDANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "CorpusScope" AS ENUM ('GLOBAL', 'ENGAGEMENT');

-- CreateEnum
CREATE TYPE "Confidentiality" AS ENUM ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "IngestionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "RequirementPriority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "ControlType" AS ENUM ('MANUAL', 'AUTOMATED', 'IT_DEPENDENT');

-- CreateEnum
CREATE TYPE "ControlStatus" AS ENUM ('NOT_TESTED', 'EFFECTIVE', 'INEFFECTIVE', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "CoverageLevel" AS ENUM ('FULL', 'PARTIAL', 'NONE');

-- CreateEnum
CREATE TYPE "EvidencePackStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'EXPORTED');

-- CreateEnum
CREATE TYPE "WorkpaperTemplate" AS ENUM ('GENERAL', 'CRITERIA_CONDITION', 'FINANCIAL_MEMO', 'WALKTHROUGH');

-- CreateEnum
CREATE TYPE "WorkpaperStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'FINAL');

-- CreateEnum
CREATE TYPE "FindingSeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL');

-- CreateEnum
CREATE TYPE "FindingStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'OPEN', 'REMEDIATION', 'CLOSED');

-- CreateEnum
CREATE TYPE "GroupSource" AS ENUM ('LOCAL', 'OIDC', 'SAML', 'SCIM');

-- CreateEnum
CREATE TYPE "SecretStatus" AS ENUM ('ACTIVE', 'ROTATED', 'REVOKED');

-- AlterTable
ALTER TABLE "engagements" ADD COLUMN     "archived_at" TIMESTAMP(3),
ADD COLUMN     "closed_at" TIMESTAMP(3),
ADD COLUMN     "closed_by_id" TEXT,
ADD COLUMN     "mode" "AppMode" NOT NULL DEFAULT 'AUDIT',
ALTER COLUMN "status" SET DEFAULT 'PLANNING';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "external_id" TEXT,
ADD COLUMN     "last_login_at" TIMESTAMP(3),
ADD COLUMN     "sso_provider" TEXT;

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "engagement_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "doc_type" "DocType" NOT NULL DEFAULT 'EVIDENCE',
    "source_system" TEXT,
    "source_uri" TEXT,
    "mime_type" TEXT,
    "size_bytes" INTEGER,
    "framework" TEXT,
    "clause_id" TEXT,
    "control_id" TEXT,
    "entity_id" TEXT,
    "period_start" TIMESTAMP(3),
    "period_end" TIMESTAMP(3),
    "corpus_scope" "CorpusScope" NOT NULL DEFAULT 'ENGAGEMENT',
    "confidentiality" "Confidentiality" NOT NULL DEFAULT 'INTERNAL',
    "ingestion_status" "IngestionStatus" NOT NULL DEFAULT 'PENDING',
    "rag_document_id" TEXT,
    "uploaded_by_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requirements" (
    "id" TEXT NOT NULL,
    "engagement_id" TEXT NOT NULL,
    "framework" TEXT NOT NULL,
    "clause_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "priority" "RequirementPriority" NOT NULL DEFAULT 'MEDIUM',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "controls" (
    "id" TEXT NOT NULL,
    "engagement_id" TEXT NOT NULL,
    "control_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "owner" TEXT,
    "frequency" TEXT,
    "control_type" "ControlType" NOT NULL DEFAULT 'MANUAL',
    "control_status" "ControlStatus" NOT NULL DEFAULT 'NOT_TESTED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "controls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requirement_control_mappings" (
    "id" TEXT NOT NULL,
    "requirement_id" TEXT NOT NULL,
    "control_id" TEXT NOT NULL,
    "coverage_level" "CoverageLevel" NOT NULL DEFAULT 'PARTIAL',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "requirement_control_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_packs" (
    "id" TEXT NOT NULL,
    "engagement_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "EvidencePackStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evidence_packs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_pack_items" (
    "id" TEXT NOT NULL,
    "evidence_pack_id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "control_id" TEXT,
    "rationale" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_pack_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workpapers" (
    "id" TEXT NOT NULL,
    "engagement_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "template_type" "WorkpaperTemplate" NOT NULL DEFAULT 'GENERAL',
    "criteria" TEXT,
    "condition" TEXT,
    "testing" TEXT,
    "result" TEXT,
    "conclusion" TEXT,
    "draft_content" TEXT,
    "citations" JSONB,
    "status" "WorkpaperStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workpapers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "findings" (
    "id" TEXT NOT NULL,
    "engagement_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "criteria" TEXT,
    "condition" TEXT,
    "cause" TEXT,
    "effect" TEXT,
    "recommendation" TEXT,
    "management_response" TEXT,
    "severity" "FindingSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "FindingStatus" NOT NULL DEFAULT 'DRAFT',
    "citations" JSONB,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "external_id" TEXT,
    "source" "GroupSource" NOT NULL DEFAULT 'LOCAL',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_members" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "secret_keys" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "enc_value" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL DEFAULT 'aes-256-gcm',
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "SecretStatus" NOT NULL DEFAULT 'ACTIVE',
    "rotated_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "secret_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "engagement_id" TEXT,
    "action" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT,
    "details" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "requirements_engagement_id_framework_clause_id_key" ON "requirements"("engagement_id", "framework", "clause_id");

-- CreateIndex
CREATE UNIQUE INDEX "controls_engagement_id_control_id_key" ON "controls"("engagement_id", "control_id");

-- CreateIndex
CREATE UNIQUE INDEX "requirement_control_mappings_requirement_id_control_id_key" ON "requirement_control_mappings"("requirement_id", "control_id");

-- CreateIndex
CREATE UNIQUE INDEX "evidence_pack_items_evidence_pack_id_document_id_key" ON "evidence_pack_items"("evidence_pack_id", "document_id");

-- CreateIndex
CREATE UNIQUE INDEX "groups_name_key" ON "groups"("name");

-- CreateIndex
CREATE UNIQUE INDEX "group_members_user_id_group_id_key" ON "group_members"("user_id", "group_id");

-- CreateIndex
CREATE UNIQUE INDEX "secret_keys_name_key" ON "secret_keys"("name");

-- CreateIndex
CREATE INDEX "audit_events_user_id_idx" ON "audit_events"("user_id");

-- CreateIndex
CREATE INDEX "audit_events_engagement_id_idx" ON "audit_events"("engagement_id");

-- CreateIndex
CREATE INDEX "audit_events_action_idx" ON "audit_events"("action");

-- CreateIndex
CREATE INDEX "audit_events_created_at_idx" ON "audit_events"("created_at");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_engagement_id_fkey" FOREIGN KEY ("engagement_id") REFERENCES "engagements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_engagement_id_fkey" FOREIGN KEY ("engagement_id") REFERENCES "engagements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "controls" ADD CONSTRAINT "controls_engagement_id_fkey" FOREIGN KEY ("engagement_id") REFERENCES "engagements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_control_mappings" ADD CONSTRAINT "requirement_control_mappings_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_control_mappings" ADD CONSTRAINT "requirement_control_mappings_control_id_fkey" FOREIGN KEY ("control_id") REFERENCES "controls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_packs" ADD CONSTRAINT "evidence_packs_engagement_id_fkey" FOREIGN KEY ("engagement_id") REFERENCES "engagements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_packs" ADD CONSTRAINT "evidence_packs_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_pack_items" ADD CONSTRAINT "evidence_pack_items_evidence_pack_id_fkey" FOREIGN KEY ("evidence_pack_id") REFERENCES "evidence_packs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_pack_items" ADD CONSTRAINT "evidence_pack_items_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_pack_items" ADD CONSTRAINT "evidence_pack_items_control_id_fkey" FOREIGN KEY ("control_id") REFERENCES "controls"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workpapers" ADD CONSTRAINT "workpapers_engagement_id_fkey" FOREIGN KEY ("engagement_id") REFERENCES "engagements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workpapers" ADD CONSTRAINT "workpapers_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "findings" ADD CONSTRAINT "findings_engagement_id_fkey" FOREIGN KEY ("engagement_id") REFERENCES "engagements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "findings" ADD CONSTRAINT "findings_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_engagement_id_fkey" FOREIGN KEY ("engagement_id") REFERENCES "engagements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
