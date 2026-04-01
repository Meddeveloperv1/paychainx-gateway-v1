import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
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
