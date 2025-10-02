-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identities" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "solana_public_key" TEXT NOT NULL,
    "did" TEXT NOT NULL,
    "verification_bitmap" BIGINT NOT NULL DEFAULT 0,
    "reputation_score" INTEGER NOT NULL DEFAULT 500,
    "staked_amount" BIGINT NOT NULL DEFAULT 0,
    "metadata_uri" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_requests" (
    "id" TEXT NOT NULL,
    "identity_id" TEXT NOT NULL,
    "verification_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "request_data_hash" TEXT,
    "proof_hash" TEXT,
    "api_setu_request_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "verification_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credentials" (
    "id" TEXT NOT NULL,
    "credential_id" TEXT NOT NULL,
    "identity_id" TEXT NOT NULL,
    "issuer_id" TEXT,
    "credential_type" TEXT NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "revoked_at" TIMESTAMP(3),
    "metadata_uri" TEXT,
    "proof_hash" TEXT,

    CONSTRAINT "credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reputation_history" (
    "id" TEXT NOT NULL,
    "identity_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "score_delta" INTEGER NOT NULL,
    "new_score" INTEGER NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reputation_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stake_accounts" (
    "id" TEXT NOT NULL,
    "identity_id" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "staked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unlock_time" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "stake_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "identities_solana_public_key_key" ON "identities"("solana_public_key");

-- CreateIndex
CREATE UNIQUE INDEX "identities_did_key" ON "identities"("did");

-- CreateIndex
CREATE INDEX "identities_solana_public_key_idx" ON "identities"("solana_public_key");

-- CreateIndex
CREATE INDEX "identities_did_idx" ON "identities"("did");

-- CreateIndex
CREATE INDEX "verification_requests_identity_id_idx" ON "verification_requests"("identity_id");

-- CreateIndex
CREATE INDEX "verification_requests_status_idx" ON "verification_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "credentials_credential_id_key" ON "credentials"("credential_id");

-- CreateIndex
CREATE INDEX "credentials_identity_id_idx" ON "credentials"("identity_id");

-- CreateIndex
CREATE INDEX "credentials_credential_type_idx" ON "credentials"("credential_type");

-- CreateIndex
CREATE INDEX "reputation_history_identity_id_idx" ON "reputation_history"("identity_id");

-- CreateIndex
CREATE INDEX "reputation_history_created_at_idx" ON "reputation_history"("created_at");

-- CreateIndex
CREATE INDEX "stake_accounts_identity_id_idx" ON "stake_accounts"("identity_id");

-- AddForeignKey
ALTER TABLE "identities" ADD CONSTRAINT "identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "identities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "identities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reputation_history" ADD CONSTRAINT "reputation_history_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "identities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
