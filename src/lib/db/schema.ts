import { pgTable, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core'

export const mcpServers = pgTable('mcp_servers', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  tools: jsonb('tools').notNull().default([]),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('mcp_servers_user_id_idx').on(table.userId),
])

export type DbMcpServer = typeof mcpServers.$inferSelect
export type InsertMcpServer = typeof mcpServers.$inferInsert
