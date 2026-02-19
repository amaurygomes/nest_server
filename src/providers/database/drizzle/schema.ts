import * as d from 'drizzle-orm/pg-core';

export const roleEnum = d.pgEnum('user_role', [
  'OWNER',
  'ADMIN',
  'USER',
  'SUPPORT',
]);
export const statusEnum = d.pgEnum('status', ['A', 'I', 'E', 'S', 'R', 'F']);
export const paymentStatusEnum = d.pgEnum('payment_status', [
  'PENDING',
  'COMPLETED',
  'APPROVED',
  'FAILED',
  'REFUNDED',
]);
export const paymentMethodEnum = d.pgEnum('payment_method', [
  'PIX',
  'APPROVED',
]);

export const vehicleTypeEnum = d.pgEnum('vehicle_type', [
  'CAR',
  'MOTORCYCLE',
  'BICYCLE',
]);

export const accounts = d.pgTable('accounts', {
  id: d.uuid('id').defaultRandom().primaryKey(),

  authId: d.text('auth_id').unique(),
  machineId: d.text('machine_id').unique().notNull(),

  cpf: d.text('cpf').unique().notNull(),
  name: d.text('name').notNull(),
  vtrNumber: d.text('vtr_number').notNull(),
  email: d.text('email').unique().notNull(),
  chavePix: d.text('chave_pix').unique(),

  status: statusEnum('status').default('A').notNull(),
  role: roleEnum('role').default('USER').notNull(),
  isPartner: d.boolean('is_partner').default(false).notNull(),
  vehicleType: vehicleTypeEnum('vehicle_type'),

  createdAt: d
    .timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: d
    .timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
  deletedAt: d.timestamp('deleted_at', { withTimezone: true }),
});

export const payments = d.pgTable('payments', {
  id: d.uuid('id').defaultRandom().primaryKey(),

  accountId: d
    .uuid('account_id')
    .notNull()
    .references(() => accounts.id),

  subscriptionId: d.uuid('subscription_id').references(() => subscriptions.id),

  amount: d.decimal('amount', { precision: 10, scale: 2 }).notNull(),
  status: paymentStatusEnum('status').default('PENDING').notNull(),
  description: d.text('description'),
  transactionId: d.text('transaction_id').unique().notNull(),
  paymentDate: d.timestamp('payment_date', { withTimezone: true }),

  pixCopyPaste: d.text('pix_copy_paste'),
  pixImageBase64: d.text('pix_image_base64'),

  paymentMethod: paymentMethodEnum('payment_method'),

  approvedAt: d.timestamp('approved_at', { withTimezone: true }),
  approvedBy: d.uuid('approved_by').references(() => accounts.id),
  refundedBy: d.uuid('refunded_by').references(() => accounts.id),
  refundedAt: d.timestamp('refunded_at', { withTimezone: true }),
  refundReason: d.text('refund_reason'),

  statusSyncAt: d.boolean('status_sync_at').default(false).notNull(),

  createdAt: d
    .timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: d
    .timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
});

export const userLogs = d.pgTable('user_logs', {
  id: d.uuid('id').defaultRandom().primaryKey(),

  accountId: d
    .uuid('account_id')
    .notNull()
    .references(() => accounts.id),

  action: d.text('action').notNull(),
  description: d.text('description'),

  createdAt: d
    .timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const paymentLogs = d.pgTable('payment_logs', {
  id: d.uuid('id').defaultRandom().primaryKey(),

  paymentId: d
    .uuid('payment_id')
    .notNull()
    .references(() => payments.id),

  status: paymentStatusEnum('status').notNull(),
  message: d.text('message'),
  details: d.jsonb('details'),

  createdAt: d
    .timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const scheduleLogs = d.pgTable('schedule_logs', {
  id: d.uuid('id').defaultRandom().primaryKey(),

  action: d.text('action').notNull(),
  status: d.text('status').notNull(),
  message: d.text('message'),
  details: d.jsonb('details'),

  createdAt: d
    .timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const planIntervalEnum = d.pgEnum('plan_interval', [
  'WEEKLY',
  'MONTHLY',
  'YEARLY',
  'DAILY',
]);

export const subscriptionStatusEnum = d.pgEnum('subscription_status', [
  'ACTIVE',
  'CANCELLED',
  'PAST_DUE',
  'PENDING',
]);

export const plans = d.pgTable('plans', {
  id: d.uuid('id').defaultRandom().primaryKey(),

  name: d.text('name').notNull(),
  description: d.text('description'),
  price: d.decimal('price', { precision: 10, scale: 2 }).notNull(),
  interval: planIntervalEnum('interval').notNull(),
  dailyLateFee: d.decimal('daily_late_fee', { precision: 10, scale: 2 }),
  lateFeeAfter30Days: d.decimal('late_fee_after_30_days', {
    precision: 10,
    scale: 2,
  }),
  customPrices: d.jsonb('custom_prices'),
  tax: d.decimal('tax', { precision: 10, scale: 2 }).default('0').notNull(),
  targetVehicleTypes: d.jsonb('target_vehicle_types'),

  createdAt: d
    .timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: d
    .timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
  deletedAt: d.timestamp('deleted_at', { withTimezone: true }),
});

export const subscriptions = d.pgTable('subscriptions', {
  id: d.uuid('id').defaultRandom().primaryKey(),

  accountId: d
    .uuid('account_id')
    .notNull()
    .references(() => accounts.id),
  planId: d
    .uuid('plan_id')
    .notNull()
    .references(() => plans.id),

  status: subscriptionStatusEnum('status').default('PENDING').notNull(),
  startDate: d.timestamp('start_date', { withTimezone: true }).notNull(),
  nextBillingDate: d
    .timestamp('next_billing_date', { withTimezone: true })
    .notNull(),
  dueDay: d.integer('due_day'),

  createdAt: d
    .timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: d
    .timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
  deletedAt: d.timestamp('deleted_at', { withTimezone: true }),
});
