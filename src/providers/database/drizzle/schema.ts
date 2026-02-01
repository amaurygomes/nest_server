import * as d from 'drizzle-orm/pg-core';

export const roleEnum = d.pgEnum('user_role', ['OWNER', 'ADMIN', 'USER', 'SUPPORT']);
export const statusEnum = d.pgEnum('status', ['A', 'I', 'E']);
export const paymentStatusEnum = d.pgEnum('payment_status', ['PENDING', 'COMPLETED', 'APPROVED', 'FAILED', 'REFUNDED']);
export const paymentMethodEnum = d.pgEnum('payment_method', ['PIX', 'APPROVED']);

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

  createdAt: d.timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: d.timestamp('updated_at', { withTimezone: true })
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

  createdAt: d.timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: d.timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
});

export const logs = d.pgTable('logs', {
  id: d.uuid('id').defaultRandom().primaryKey(),

  accountId: d
    .uuid('account_id')
    .notNull()
    .references(() => accounts.id),

  action: d.text('action').notNull(),
  description: d.text('description'),

  createdAt: d.timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});