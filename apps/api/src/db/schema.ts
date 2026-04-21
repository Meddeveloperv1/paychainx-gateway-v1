import {
  pgTable,
  text,
  uuid,
  integer,
  timestamp,
  boolean,
  bigint,
  jsonb,
  uniqueIndex,
  varchar
} from 'drizzle-orm/pg-core';

  uniqueIndex
} 

export const merchants = pgTable('merchants', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  status: text('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const merchantProcessorAccounts = pgTable('merchant_processor_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  merchantId: uuid('merchant_id').notNull().references(() => merchants.id, { onDelete: 'cascade' }),
  processor: text('processor').notNull().default('cybersource'),
  accountName: text('account_name').notNull(),
  transactingMid: text('transacting_mid').notNull(),
  merchantIdOnProcessor: text('merchant_id_on_processor').notNull(),
  keyId: text('key_id').notNull(),
  keySecretEncrypted: text('key_secret_encrypted').notNull(),
  environment: text('environment').notNull().default('sandbox'),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const apiKeys = pgTable('api_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  merchantId: uuid('merchant_id').notNull().references(() => merchants.id, { onDelete: 'cascade' }),
  keyHash: text('key_hash').notNull(),
  label: text('label').notNull(),
  status: text('status').notNull().default('active'),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true })
}, (table) => ({
  keyHashIdx: uniqueIndex('api_keys_key_hash_idx').on(table.keyHash)
}));

export const idempotencyKeys = pgTable('idempotency_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  merchantId: uuid('merchant_id').notNull().references(() => merchants.id, { onDelete: 'cascade' }),
  idempotencyKey: text('idempotency_key').notNull(),
  routeKey: text('route_key').notNull(),
  requestHash: text('request_hash').notNull(),
  responseCode: text('response_code'),
  responseBody: text('response_body'),
  status: text('status').notNull().default('processing'),
  lockedUntil: timestamp('locked_until', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  merchantRouteIdemIdx: uniqueIndex('idempotency_keys_merchant_route_key_idx').on(
    table.merchantId,
    table.idempotencyKey,
    table.routeKey
  )
}));

export const paymentIntents = pgTable('payment_intents', {
  id: uuid('id').defaultRandom().primaryKey(),
  merchantId: uuid('merchant_id').notNull().references(() => merchants.id, { onDelete: 'cascade' }),
  merchantReference: text('merchant_reference').notNull(),
  amount: bigint('amount', { mode: 'number' }).notNull(),
  currency: text('currency').notNull(),
  status: text('status').notNull().default('created'),
  paymentMethodType: text('payment_method_type').notNull(),
  paymentTokenRef: text('payment_token_ref').notNull(),
  customerRef: text('customer_ref'),
  customerEmail: text('customer_email'),
  description: text('description'),
  channel: text('channel').notNull().default('api'),
  terminalId: text('terminal_id'),
  deviceId: text('device_id'),
  processor: text('processor').notNull().default('cybersource'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const paymentAttempts = pgTable('payment_attempts', {
  id: uuid('id').defaultRandom().primaryKey(),
  paymentIntentId: uuid('payment_intent_id').notNull().references(() => paymentIntents.id, { onDelete: 'cascade' }),
  merchantId: uuid('merchant_id').notNull().references(() => merchants.id, { onDelete: 'cascade' }),
  action: text('action').notNull(),
  processor: text('processor').notNull().default('cybersource'),
  status: text('status').notNull().default('pending'),
  processorTransactionId: text('processor_transaction_id'),
  processorStatus: text('processor_status'),
  processorHttpStatus: text('processor_http_status'),
  requestPayload: text('request_payload').notNull(),
  responsePayload: text('response_payload'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});


export const auditEvents = pgTable('audit_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  merchantId: uuid('merchant_id').references(() => merchants.id, { onDelete: 'set null' }),
  requestId: text('request_id').notNull(),
  route: text('route').notNull(),
  httpMethod: text('http_method').notNull(),
  eventType: text('event_type').notNull(),
  payloadHash: text('payload_hash').notNull(),
  previousHash: text('previous_hash'),
  eventHash: text('event_hash').notNull(),
  metadata: text('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});


export const proofVault = pgTable('proof_vault', {
  id: uuid('id').defaultRandom().primaryKey(),

  proofId: text('proof_id').notNull().unique(),
  paymentAttemptId: uuid('payment_attempt_id').notNull(),
  merchantId: uuid('merchant_id').notNull(),
  merchantReference: text('merchant_reference').notNull(),

  proofHash: text('proof_hash').notNull(),
  hashAlgorithm: text('hash_algorithm').default('sha256'),

  signature: text('signature'),
  signatureAlgorithm: text('signature_algorithm'),

  proofStatus: text('proof_status').notNull(),

  requestFingerprint: text('request_fingerprint'),
  processorResponseFingerprint: text('processor_response_fingerprint'),

  sidecarVersion: text('sidecar_version'),
  evidenceBundleUri: text('evidence_bundle_uri'),

  policySnapshot: text('policy_snapshot'),

  createdAt: timestamp('created_at').defaultNow(),
  verifiedAt: timestamp('verified_at')
});


export const proofJobs = pgTable('proof_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),

  merchantId: uuid('merchant_id').notNull(),
  merchantReference: text('merchant_reference').notNull(),
  paymentIntentId: uuid('payment_intent_id'),
  paymentAttemptId: uuid('payment_attempt_id').notNull(),

  payload: text('payload').notNull(),
  payloadHash: text('payload_hash').notNull(),

  mode: text('mode').notNull(),
  status: text('status').notNull().default('queued'),

  attempts: integer('attempts').notNull().default(0),
  lastError: text('last_error'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const merchantCapabilities = pgTable('merchant_capabilities', {
  id: uuid('id').defaultRandom().primaryKey(),

  merchantId: uuid('merchant_id').notNull().unique(),

  allowedCurrencies: text('allowed_currencies').notNull().default('USD'),
  allowedChannels: text('allowed_channels').notNull().default('ecom'),

  defaultProcessor: text('default_processor').notNull().default('cybersource'),

  cybersourceEnabled: boolean('cybersource_enabled').notNull().default(true),
  bankRailEnabled: boolean('bank_rail_enabled').notNull().default(false),

  pqEnabled: boolean('pq_enabled').notNull().default(true),
  pqStrictMode: boolean('pq_strict_mode').notNull().default(false),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const webhookEndpoints = pgTable('webhook_endpoints', {
  id: uuid('id').defaultRandom().primaryKey(),
  merchantId: uuid('merchant_id').notNull(),
  url: text('url').notNull(),
  eventTypes: text('event_types').notNull().default('payment.succeeded,payment.failed,proof.generated'),
  isEnabled: boolean('is_enabled').notNull().default(true),
  signingSecret: text('signing_secret'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const webhookDeliveries = pgTable('webhook_deliveries', {
  id: uuid('id').defaultRandom().primaryKey(),
  merchantId: uuid('merchant_id').notNull(),
  endpointId: uuid('endpoint_id').notNull(),
  eventType: text('event_type').notNull(),
  eventId: text('event_id').notNull(),
  payload: text('payload').notNull(),
  status: text('status').notNull().default('queued'),
  attempts: integer('attempts').notNull().default(0),
  lastHttpStatus: integer('last_http_status'),
  lastError: text('last_error'),
  nextAttemptAt: timestamp('next_attempt_at').defaultNow(),
  deliveredAt: timestamp('delivered_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const paymentTokens = pgTable('payment_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  tokenId: text('token_id').notNull().unique(),
  customerRef: text('customer_ref'),
  merchantId: uuid('merchant_id').notNull(),
  processor: text('processor').notNull().default('cybersource'),
  processorTokenRef: text('processor_token_ref').notNull(),
  fingerprintSha256: text('fingerprint_sha256').notNull(),
  brand: text('brand'),
  last4: text('last4'),
  expMonth: integer('exp_month'),
  expYear: integer('exp_year'),
  billingName: text('billing_name'),
  billingZip: text('billing_zip'),
  status: text('status').notNull().default('active'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true })
});

export const pqKeys = pgTable('pq_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  keyId: varchar('key_id', { length: 128 }).notNull(),
  keyVersion: integer('key_version').notNull(),
  algorithm: varchar('algorithm', { length: 64 }).notNull(),
  status: varchar('status', { length: 32 }).notNull().default('active'),
  publicKey: text('public_key').notNull(),
  privateKeyRef: text('private_key_ref'),
  policyVersion: varchar('policy_version', { length: 64 }).notNull(),
  verificationAllowed: boolean('verification_allowed').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  retiredAt: timestamp('retired_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true })
});

export const pqPolicies = pgTable('pq_policies', {
  id: uuid('id').defaultRandom().primaryKey(),
  version: varchar('version', { length: 64 }).notNull().unique(),
  hashSuite: varchar('hash_suite', { length: 64 }).notNull(),
  pqSignatureSuite: varchar('pq_signature_suite', { length: 64 }).notNull(),
  canonicalizationVersion: varchar('canonicalization_version', { length: 64 }).notNull(),
  retentionPolicyId: varchar('retention_policy_id', { length: 128 }).notNull(),
  verificationRequireArchiveSeal: boolean('verification_require_archive_seal').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const pqArchiveReceipts = pgTable('pq_archive_receipts', {
  id: uuid('id').defaultRandom().primaryKey(),
  receiptId: varchar('receipt_id', { length: 128 }).notNull().unique(),
  proofId: varchar('proof_id', { length: 128 }).notNull(),
  archiveStatus: varchar('archive_status', { length: 32 }).notNull(),
  archiveTimestamp: timestamp('archive_timestamp', { withTimezone: true }),
  retentionPolicyId: varchar('retention_policy_id', { length: 128 }).notNull(),
  integrityChainRef: text('integrity_chain_ref'),
  merkleRoot: text('merkle_root'),
  storageUri: text('storage_uri'),
  lastArchiveError: text('last_archive_error'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const pqProofs = pgTable('pq_proofs', {
  id: uuid('id').defaultRandom().primaryKey(),
  proofId: varchar('proof_id', { length: 128 }).notNull().unique(),
  proofType: varchar('proof_type', { length: 128 }).notNull(),
  proofVersion: varchar('proof_version', { length: 32 }).notNull(),
  transactionId: varchar('transaction_id', { length: 128 }),
  paymentAttemptId: uuid('payment_attempt_id').notNull(),
  merchantReference: varchar('merchant_reference', { length: 255 }),
  merchantId: uuid('merchant_id'),
  terminalId: varchar('terminal_id', { length: 128 }),
  deviceId: varchar('device_id', { length: 128 }),
  channel: varchar('channel', { length: 32 }),
  processor: varchar('processor', { length: 64 }).notNull(),
  processorTransactionId: varchar('processor_transaction_id', { length: 128 }),
  amount: integer('amount').notNull(),
  currency: varchar('currency', { length: 8 }).notNull(),
  status: varchar('status', { length: 64 }).notNull(),
  riskDecision: varchar('risk_decision', { length: 32 }),
  riskScore: integer('risk_score'),
  avsCode: varchar('avs_code', { length: 16 }),
  cvvCode: varchar('cvv_code', { length: 16 }),
  eventTime: timestamp('event_time', { withTimezone: true }).notNull(),
  hashSuite: varchar('hash_suite', { length: 64 }).notNull(),
  pqSignatureSuite: varchar('pq_signature_suite', { length: 64 }).notNull(),
  signingKeyId: varchar('signing_key_id', { length: 128 }).notNull(),
  signingKeyVersion: integer('signing_key_version').notNull(),
  cryptoPolicyVersion: varchar('crypto_policy_version', { length: 64 }).notNull(),
  canonicalizationVersion: varchar('canonicalization_version', { length: 64 }).notNull(),
  canonicalPayload: jsonb('canonical_payload').notNull(),
  canonicalPayloadString: text('canonical_payload_string').notNull(),
  proofHash: text('proof_hash').notNull(),
  signature: text('signature').notNull(),
  archiveReceiptId: varchar('archive_receipt_id', { length: 128 }),
  archiveStatus: varchar('archive_status', { length: 32 }).notNull().default('submitted'),
  archiveTimestamp: timestamp('archive_timestamp', { withTimezone: true }),
  retentionPolicyId: varchar('retention_policy_id', { length: 128 }).notNull(),
  integrityChainRef: text('integrity_chain_ref'),
  merkleRoot: text('merkle_root'),
  lastArchiveError: text('last_archive_error'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const pqVerificationLogs = pgTable('pq_verification_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  proofId: varchar('proof_id', { length: 128 }).notNull(),
  requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
  verifierVersion: varchar('verifier_version', { length: 32 }).notNull().default('v1'),
  passed: boolean('passed').notNull(),
  reasonCode: varchar('reason_code', { length: 128 }).notNull(),
  details: jsonb('details').notNull().default({})
});
