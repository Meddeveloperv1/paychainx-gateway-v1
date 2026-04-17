import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  bigint,
  uniqueIndex
} from 'drizzle-orm/pg-core';

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
