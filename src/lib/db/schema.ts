import { pgTable, text, timestamp, jsonb } from 'drizzle-orm/pg-core'

export const mcpServers = pgTable('mcp_servers', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  tools: jsonb('tools').notNull().default([]),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type DbMcpServer = typeof mcpServers.$inferSelect
export type InsertMcpServer = typeof mcpServers.$inferInsert
