import * as d from 'drizzle-orm/pg-core';

export const roleEnum = d.pgEnum('user_role', ['OWNER', 'ADMIN', 'USER', 'SUPPORT']);
export const statusEnum = d.pgEnum('status', ['A', 'I', 'E']);

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