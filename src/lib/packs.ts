import type { ToolPack } from '@/types'
import { generateId } from './utils'
import type { McpTool } from '@/types'

// Shopify Admin API version — bump this to upgrade all tools at once
const SHOPIFY_API_VERSION = '2025-01'

export const TOOL_PACKS: ToolPack[] = [
  // ── Shopify ────────────────────────────────────────────────────────────────
  {
    id: 'shopify',
    name: 'Shopify Store',
    description: 'Manage your Shopify store with Claude — query orders, products, customers, inventory and more.',
    icon: '🛍',
    category: 'E-commerce',
    authRequired: true,
    authLabel: 'Shopify Admin API Token',
    authPlaceholder: 'shpat_xxxxxxxxxxxxxxxxxxxx',
    setupGuideUrl: 'https://help.shopify.com/en/manual/apps/app-types/custom-apps',
    tools: [
      {
        name: 'shopify_list_orders',
        description: 'List recent orders from the Shopify store. Can filter by status (open, closed, cancelled, any). Returns order ID, customer name, total price, fulfillment status, and line items.',
        inputs: [
          { id: generateId(), name: 'status', type: 'enum', description: 'Order status to filter by', required: false, enumValues: ['open', 'closed', 'cancelled', 'any'] },
          { id: generateId(), name: 'limit', type: 'number', description: 'Number of orders to return (max 250, default 50)', required: false },
        ],
        connector: {
          method: 'GET',
          url: `https://{shop_domain}/admin/api/${SHOPIFY_API_VERSION}/orders.json?status={status}&limit={limit}`,
          authType: 'api-key',
          authHeader: 'X-Shopify-Access-Token',
        },
      },
      {
        name: 'shopify_get_order',
        description: 'Get full details of a specific Shopify order by ID. Returns customer info, line items, shipping address, payment status, and fulfillment details.',
        inputs: [
          { id: generateId(), name: 'order_id', type: 'string', description: 'The numeric Shopify order ID', required: true },
        ],
        connector: {
          method: 'GET',
          url: `https://{shop_domain}/admin/api/${SHOPIFY_API_VERSION}/orders/{order_id}.json`,
          authType: 'api-key',
          authHeader: 'X-Shopify-Access-Token',
        },
      },
      {
        name: 'shopify_list_products',
        description: 'List products in the Shopify store with title, price, inventory, and status. Useful for checking what is in stock or searching the catalog.',
        inputs: [
          { id: generateId(), name: 'limit', type: 'number', description: 'Number of products to return (max 250, default 50)', required: false },
          { id: generateId(), name: 'status', type: 'enum', description: 'Product status', required: false, enumValues: ['active', 'archived', 'draft'] },
        ],
        connector: {
          method: 'GET',
          url: `https://{shop_domain}/admin/api/${SHOPIFY_API_VERSION}/products.json?limit={limit}&status={status}`,
          authType: 'api-key',
          authHeader: 'X-Shopify-Access-Token',
        },
      },
      {
        name: 'shopify_get_product',
        description: 'Get full details of a specific product including all variants, prices, inventory levels, images, and tags.',
        inputs: [
          { id: generateId(), name: 'product_id', type: 'string', description: 'The numeric Shopify product ID', required: true },
        ],
        connector: {
          method: 'GET',
          url: `https://{shop_domain}/admin/api/${SHOPIFY_API_VERSION}/products/{product_id}.json`,
          authType: 'api-key',
          authHeader: 'X-Shopify-Access-Token',
        },
      },
      {
        name: 'shopify_list_customers',
        description: 'List customers in the Shopify store with name, email, order count, and total spent. Useful for finding customers or checking purchase history.',
        inputs: [
          { id: generateId(), name: 'limit', type: 'number', description: 'Number of customers to return (max 250, default 50)', required: false },
          { id: generateId(), name: 'query', type: 'string', description: 'Search query — search by name, email, phone, or city', required: false },
        ],
        connector: {
          method: 'GET',
          url: `https://{shop_domain}/admin/api/${SHOPIFY_API_VERSION}/customers/search.json?query={query}&limit={limit}`,
          authType: 'api-key',
          authHeader: 'X-Shopify-Access-Token',
        },
      },
      {
        name: 'shopify_get_customer',
        description: 'Get full profile of a specific customer — contact info, address, order history, total spend, and notes.',
        inputs: [
          { id: generateId(), name: 'customer_id', type: 'string', description: 'The numeric Shopify customer ID', required: true },
        ],
        connector: {
          method: 'GET',
          url: `https://{shop_domain}/admin/api/${SHOPIFY_API_VERSION}/customers/{customer_id}.json`,
          authType: 'api-key',
          authHeader: 'X-Shopify-Access-Token',
        },
      },
      {
        name: 'shopify_inventory_levels',
        description: 'Check inventory levels for a product variant at all locations. Returns available quantity per location.',
        inputs: [
          { id: generateId(), name: 'inventory_item_ids', type: 'string', description: 'Comma-separated inventory item IDs (get from product variants)', required: true },
        ],
        connector: {
          method: 'GET',
          url: `https://{shop_domain}/admin/api/${SHOPIFY_API_VERSION}/inventory_levels.json?inventory_item_ids={inventory_item_ids}`,
          authType: 'api-key',
          authHeader: 'X-Shopify-Access-Token',
        },
      },
      {
        name: 'shopify_list_fulfillments',
        description: 'List fulfillments for a specific order — tracking numbers, carrier, status, and shipped items.',
        inputs: [
          { id: generateId(), name: 'order_id', type: 'string', description: 'The Shopify order ID to get fulfillments for', required: true },
        ],
        connector: {
          method: 'GET',
          url: `https://{shop_domain}/admin/api/${SHOPIFY_API_VERSION}/orders/{order_id}/fulfillments.json`,
          authType: 'api-key',
          authHeader: 'X-Shopify-Access-Token',
        },
      },
      {
        name: 'shopify_store_info',
        description: 'Get general information about the Shopify store — name, email, currency, timezone, plan, and contact details.',
        inputs: [],
        connector: {
          method: 'GET',
          url: `https://{shop_domain}/admin/api/${SHOPIFY_API_VERSION}/shop.json`,
          authType: 'api-key',
          authHeader: 'X-Shopify-Access-Token',
        },
      },
      {
        name: 'shopify_list_locations',
        description: 'List all physical and fulfillment locations for the store with address and active status.',
        inputs: [],
        connector: {
          method: 'GET',
          url: `https://{shop_domain}/admin/api/${SHOPIFY_API_VERSION}/locations.json`,
          authType: 'api-key',
          authHeader: 'X-Shopify-Access-Token',
        },
      },
      {
        name: 'shopify_count_orders',
        description: 'Get a count of orders filtered by status. Useful for quick dashboard stats without fetching full order data.',
        inputs: [
          { id: generateId(), name: 'status', type: 'enum', description: 'Order status to count', required: false, enumValues: ['open', 'closed', 'cancelled', 'any'] },
          { id: generateId(), name: 'financial_status', type: 'enum', description: 'Payment status', required: false, enumValues: ['pending', 'paid', 'refunded', 'partially_refunded', 'unpaid'] },
        ],
        connector: {
          method: 'GET',
          url: `https://{shop_domain}/admin/api/${SHOPIFY_API_VERSION}/orders/count.json?status={status}&financial_status={financial_status}`,
          authType: 'api-key',
          authHeader: 'X-Shopify-Access-Token',
        },
      },
      {
        name: 'shopify_count_products',
        description: 'Get a count of products filtered by status. Quick way to see how many active/draft/archived products exist.',
        inputs: [
          { id: generateId(), name: 'status', type: 'enum', description: 'Product status to count', required: false, enumValues: ['active', 'archived', 'draft'] },
        ],
        connector: {
          method: 'GET',
          url: `https://{shop_domain}/admin/api/${SHOPIFY_API_VERSION}/products/count.json?status={status}`,
          authType: 'api-key',
          authHeader: 'X-Shopify-Access-Token',
        },
      },
    ],
  },

  // ── Stripe ─────────────────────────────────────────────────────────────────
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Manage payments, customers, subscriptions, and invoices via the Stripe API.',
    icon: '💳',
    category: 'Payments',
    authRequired: true,
    authLabel: 'Stripe Secret Key',
    authPlaceholder: 'sk_test_...',
    tools: [
      {
        name: 'stripe_list_customers',
        description: 'List Stripe customers',
        inputs: [
          { id: generateId(), name: 'limit', type: 'number', description: 'Max results (1-100)', required: false },
        ],
        connector: {
          method: 'GET',
          url: 'https://api.stripe.com/v1/customers?limit={limit}',
          authType: 'bearer',
        },
      },
      {
        name: 'stripe_get_customer',
        description: 'Get a Stripe customer by ID',
        inputs: [
          { id: generateId(), name: 'customer_id', type: 'string', description: 'Customer ID (cus_...)', required: true },
        ],
        connector: {
          method: 'GET',
          url: 'https://api.stripe.com/v1/customers/{customer_id}',
          authType: 'bearer',
        },
      },
      {
        name: 'stripe_list_charges',
        description: 'List Stripe charges',
        inputs: [
          { id: generateId(), name: 'limit', type: 'number', description: 'Max results (1-100)', required: false },
        ],
        connector: {
          method: 'GET',
          url: 'https://api.stripe.com/v1/charges?limit={limit}',
          authType: 'bearer',
        },
      },
      {
        name: 'stripe_get_charge',
        description: 'Get a Stripe charge by ID',
        inputs: [
          { id: generateId(), name: 'charge_id', type: 'string', description: 'Charge ID (ch_...)', required: true },
        ],
        connector: {
          method: 'GET',
          url: 'https://api.stripe.com/v1/charges/{charge_id}',
          authType: 'bearer',
        },
      },
      {
        name: 'stripe_list_invoices',
        description: 'List Stripe invoices',
        inputs: [
          { id: generateId(), name: 'limit', type: 'number', description: 'Max results (1-100)', required: false },
        ],
        connector: {
          method: 'GET',
          url: 'https://api.stripe.com/v1/invoices?limit={limit}',
          authType: 'bearer',
        },
      },
      {
        name: 'stripe_get_invoice',
        description: 'Get a Stripe invoice by ID',
        inputs: [
          { id: generateId(), name: 'invoice_id', type: 'string', description: 'Invoice ID (in_...)', required: true },
        ],
        connector: {
          method: 'GET',
          url: 'https://api.stripe.com/v1/invoices/{invoice_id}',
          authType: 'bearer',
        },
      },
      {
        name: 'stripe_list_subscriptions',
        description: 'List Stripe subscriptions',
        inputs: [
          { id: generateId(), name: 'limit', type: 'number', description: 'Max results (1-100)', required: false },
        ],
        connector: {
          method: 'GET',
          url: 'https://api.stripe.com/v1/subscriptions?limit={limit}',
          authType: 'bearer',
        },
      },
      {
        name: 'stripe_get_subscription',
        description: 'Get a Stripe subscription by ID',
        inputs: [
          { id: generateId(), name: 'subscription_id', type: 'string', description: 'Subscription ID (sub_...)', required: true },
        ],
        connector: {
          method: 'GET',
          url: 'https://api.stripe.com/v1/subscriptions/{subscription_id}',
          authType: 'bearer',
        },
      },
      {
        name: 'stripe_list_products',
        description: 'List Stripe products',
        inputs: [
          { id: generateId(), name: 'limit', type: 'number', description: 'Max results (1-100)', required: false },
        ],
        connector: {
          method: 'GET',
          url: 'https://api.stripe.com/v1/products?limit={limit}',
          authType: 'bearer',
        },
      },
      {
        name: 'stripe_get_balance',
        description: 'Get the Stripe account balance',
        inputs: [],
        connector: {
          method: 'GET',
          url: 'https://api.stripe.com/v1/balance',
          authType: 'bearer',
        },
      },
    ],
  },

  // ── GitHub ─────────────────────────────────────────────────────────────────
  {
    id: 'github',
    name: 'GitHub',
    description: 'Browse repos, issues, pull requests, and commits from GitHub.',
    icon: '🐙',
    category: 'Developer Tools',
    authRequired: false,
    authLabel: 'GitHub Personal Access Token (optional)',
    authPlaceholder: 'ghp_...',
    tools: [
      {
        name: 'github_get_repo',
        description: 'Get details about a GitHub repository',
        inputs: [
          { id: generateId(), name: 'owner', type: 'string', description: 'Repository owner', required: true },
          { id: generateId(), name: 'repo', type: 'string', description: 'Repository name', required: true },
        ],
        connector: {
          method: 'GET',
          url: 'https://api.github.com/repos/{owner}/{repo}',
          authType: 'bearer',
        },
      },
      {
        name: 'github_list_repos',
        description: 'List public repositories for a GitHub user',
        inputs: [
          { id: generateId(), name: 'username', type: 'string', description: 'GitHub username', required: true },
          { id: generateId(), name: 'per_page', type: 'number', description: 'Results per page (max 100)', required: false },
        ],
        connector: {
          method: 'GET',
          url: 'https://api.github.com/users/{username}/repos?per_page={per_page}',
          authType: 'bearer',
        },
      },
      {
        name: 'github_list_issues',
        description: 'List issues for a GitHub repository',
        inputs: [
          { id: generateId(), name: 'owner', type: 'string', description: 'Repository owner', required: true },
          { id: generateId(), name: 'repo', type: 'string', description: 'Repository name', required: true },
          { id: generateId(), name: 'state', type: 'enum', description: 'Issue state', required: false, enumValues: ['open', 'closed', 'all'] },
        ],
        connector: {
          method: 'GET',
          url: 'https://api.github.com/repos/{owner}/{repo}/issues?state={state}',
          authType: 'bearer',
        },
      },
      {
        name: 'github_get_issue',
        description: 'Get a specific GitHub issue',
        inputs: [
          { id: generateId(), name: 'owner', type: 'string', description: 'Repository owner', required: true },
          { id: generateId(), name: 'repo', type: 'string', description: 'Repository name', required: true },
          { id: generateId(), name: 'issue_number', type: 'number', description: 'Issue number', required: true },
        ],
        connector: {
          method: 'GET',
          url: 'https://api.github.com/repos/{owner}/{repo}/issues/{issue_number}',
          authType: 'bearer',
        },
      },
      {
        name: 'github_list_pull_requests',
        description: 'List pull requests for a GitHub repository',
        inputs: [
          { id: generateId(), name: 'owner', type: 'string', description: 'Repository owner', required: true },
          { id: generateId(), name: 'repo', type: 'string', description: 'Repository name', required: true },
          { id: generateId(), name: 'state', type: 'enum', description: 'PR state', required: false, enumValues: ['open', 'closed', 'all'] },
        ],
        connector: {
          method: 'GET',
          url: 'https://api.github.com/repos/{owner}/{repo}/pulls?state={state}',
          authType: 'bearer',
        },
      },
      {
        name: 'github_get_pull_request',
        description: 'Get a specific GitHub pull request',
        inputs: [
          { id: generateId(), name: 'owner', type: 'string', description: 'Repository owner', required: true },
          { id: generateId(), name: 'repo', type: 'string', description: 'Repository name', required: true },
          { id: generateId(), name: 'pull_number', type: 'number', description: 'Pull request number', required: true },
        ],
        connector: {
          method: 'GET',
          url: 'https://api.github.com/repos/{owner}/{repo}/pulls/{pull_number}',
          authType: 'bearer',
        },
      },
      {
        name: 'github_list_commits',
        description: 'List commits for a GitHub repository',
        inputs: [
          { id: generateId(), name: 'owner', type: 'string', description: 'Repository owner', required: true },
          { id: generateId(), name: 'repo', type: 'string', description: 'Repository name', required: true },
          { id: generateId(), name: 'per_page', type: 'number', description: 'Results per page (max 100)', required: false },
        ],
        connector: {
          method: 'GET',
          url: 'https://api.github.com/repos/{owner}/{repo}/commits?per_page={per_page}',
          authType: 'bearer',
        },
      },
      {
        name: 'github_search_repos',
        description: 'Search GitHub repositories by keyword',
        inputs: [
          { id: generateId(), name: 'query', type: 'string', description: 'Search query', required: true },
          { id: generateId(), name: 'per_page', type: 'number', description: 'Results per page (max 100)', required: false },
        ],
        connector: {
          method: 'GET',
          url: 'https://api.github.com/search/repositories?q={query}&per_page={per_page}',
          authType: 'bearer',
        },
      },
    ],
  },

  // ── Notion ─────────────────────────────────────────────────────────────────
  {
    id: 'notion',
    name: 'Notion',
    description: 'Query databases, read pages, and search your Notion workspace.',
    icon: '📝',
    category: 'Productivity',
    authRequired: true,
    authLabel: 'Notion Integration Token',
    authPlaceholder: 'secret_...',
    tools: [
      {
        name: 'notion_list_databases',
        description: 'List all databases accessible to the integration',
        inputs: [],
        connector: {
          method: 'POST',
          url: 'https://api.notion.com/v1/search',
          authType: 'bearer',
          bodyTemplate: '{"filter":{"value":"database","property":"object"}}',
        },
      },
      {
        name: 'notion_query_database',
        description: 'Query a Notion database',
        inputs: [
          { id: generateId(), name: 'database_id', type: 'string', description: 'Database ID', required: true },
        ],
        connector: {
          method: 'POST',
          url: 'https://api.notion.com/v1/databases/{database_id}/query',
          authType: 'bearer',
          bodyTemplate: '{}',
        },
      },
      {
        name: 'notion_get_page',
        description: 'Get a Notion page by ID',
        inputs: [
          { id: generateId(), name: 'page_id', type: 'string', description: 'Page ID', required: true },
        ],
        connector: {
          method: 'GET',
          url: 'https://api.notion.com/v1/pages/{page_id}',
          authType: 'bearer',
        },
      },
      {
        name: 'notion_get_database',
        description: 'Get metadata for a Notion database',
        inputs: [
          { id: generateId(), name: 'database_id', type: 'string', description: 'Database ID', required: true },
        ],
        connector: {
          method: 'GET',
          url: 'https://api.notion.com/v1/databases/{database_id}',
          authType: 'bearer',
        },
      },
      {
        name: 'notion_search',
        description: 'Search Notion for pages and databases by title',
        inputs: [
          { id: generateId(), name: 'query', type: 'string', description: 'Search query', required: true },
        ],
        connector: {
          method: 'POST',
          url: 'https://api.notion.com/v1/search',
          authType: 'bearer',
          bodyTemplate: '{"query":"{query}"}',
        },
      },
      {
        name: 'notion_list_users',
        description: 'List users in the Notion workspace',
        inputs: [],
        connector: {
          method: 'GET',
          url: 'https://api.notion.com/v1/users',
          authType: 'bearer',
        },
      },
      {
        name: 'notion_get_page_content',
        description: 'Get the block children (content) of a Notion page',
        inputs: [
          { id: generateId(), name: 'page_id', type: 'string', description: 'Page ID', required: true },
        ],
        connector: {
          method: 'GET',
          url: 'https://api.notion.com/v1/blocks/{page_id}/children',
          authType: 'bearer',
        },
      },
      {
        name: 'notion_create_page',
        description: 'Create a new Notion page in a database',
        inputs: [
          { id: generateId(), name: 'database_id', type: 'string', description: 'Parent database ID', required: true },
          { id: generateId(), name: 'title', type: 'string', description: 'Page title', required: true },
        ],
        connector: {
          method: 'POST',
          url: 'https://api.notion.com/v1/pages',
          authType: 'bearer',
          bodyTemplate: '{"parent":{"database_id":"{database_id}"},"properties":{"title":{"title":[{"text":{"content":"{title}"}}]}}}',
        },
      },
    ],
  },

  // ── Airtable ───────────────────────────────────────────────────────────────
  {
    id: 'airtable',
    name: 'Airtable',
    description: 'Read and write records in Airtable bases and tables.',
    icon: '📊',
    category: 'Productivity',
    authRequired: true,
    authLabel: 'Airtable Personal Access Token',
    authPlaceholder: 'pat...',
    tools: [
      {
        name: 'airtable_list_bases',
        description: 'List all accessible Airtable bases',
        inputs: [],
        connector: {
          method: 'GET',
          url: 'https://api.airtable.com/v0/meta/bases',
          authType: 'bearer',
        },
      },
      {
        name: 'airtable_list_tables',
        description: 'List tables in an Airtable base',
        inputs: [
          { id: generateId(), name: 'base_id', type: 'string', description: 'Base ID (app...)', required: true },
        ],
        connector: {
          method: 'GET',
          url: 'https://api.airtable.com/v0/meta/bases/{base_id}/tables',
          authType: 'bearer',
        },
      },
      {
        name: 'airtable_list_records',
        description: 'List records from an Airtable table',
        inputs: [
          { id: generateId(), name: 'base_id', type: 'string', description: 'Base ID (app...)', required: true },
          { id: generateId(), name: 'table_name', type: 'string', description: 'Table name or ID', required: true },
          { id: generateId(), name: 'max_records', type: 'number', description: 'Max records to return', required: false },
        ],
        connector: {
          method: 'GET',
          url: 'https://api.airtable.com/v0/{base_id}/{table_name}?maxRecords={max_records}',
          authType: 'bearer',
        },
      },
      {
        name: 'airtable_get_record',
        description: 'Get a single record from an Airtable table',
        inputs: [
          { id: generateId(), name: 'base_id', type: 'string', description: 'Base ID', required: true },
          { id: generateId(), name: 'table_name', type: 'string', description: 'Table name or ID', required: true },
          { id: generateId(), name: 'record_id', type: 'string', description: 'Record ID (rec...)', required: true },
        ],
        connector: {
          method: 'GET',
          url: 'https://api.airtable.com/v0/{base_id}/{table_name}/{record_id}',
          authType: 'bearer',
        },
      },
      {
        name: 'airtable_create_record',
        description: 'Create a new record in an Airtable table. Pass field_name and field_value for a single field.',
        inputs: [
          { id: generateId(), name: 'base_id', type: 'string', description: 'Base ID (appXXXXXX)', required: true },
          { id: generateId(), name: 'table_name', type: 'string', description: 'Table name or ID', required: true },
          { id: generateId(), name: 'field_name', type: 'string', description: 'Field name to set (e.g. Name)', required: true },
          { id: generateId(), name: 'field_value', type: 'string', description: 'Value for that field', required: true },
        ],
        connector: {
          method: 'POST',
          url: 'https://api.airtable.com/v0/{base_id}/{table_name}',
          authType: 'bearer',
          bodyTemplate: '{"fields":{"{field_name}":"{field_value}"}}',
        },
      },
      {
        name: 'airtable_update_record',
        description: 'Update a single field on an existing Airtable record.',
        inputs: [
          { id: generateId(), name: 'base_id', type: 'string', description: 'Base ID (appXXXXXX)', required: true },
          { id: generateId(), name: 'table_name', type: 'string', description: 'Table name or ID', required: true },
          { id: generateId(), name: 'record_id', type: 'string', description: 'Record ID (recXXXXXX)', required: true },
          { id: generateId(), name: 'field_name', type: 'string', description: 'Field name to update', required: true },
          { id: generateId(), name: 'field_value', type: 'string', description: 'New value for that field', required: true },
        ],
        connector: {
          method: 'PATCH',
          url: 'https://api.airtable.com/v0/{base_id}/{table_name}/{record_id}',
          authType: 'bearer',
          bodyTemplate: '{"fields":{"{field_name}":"{field_value}"}}',
        },
      },
      {
        name: 'airtable_delete_record',
        description: 'Delete a record from an Airtable table',
        inputs: [
          { id: generateId(), name: 'base_id', type: 'string', description: 'Base ID', required: true },
          { id: generateId(), name: 'table_name', type: 'string', description: 'Table name or ID', required: true },
          { id: generateId(), name: 'record_id', type: 'string', description: 'Record ID (rec...)', required: true },
        ],
        connector: {
          method: 'DELETE',
          url: 'https://api.airtable.com/v0/{base_id}/{table_name}/{record_id}',
          authType: 'bearer',
        },
      },
      {
        name: 'airtable_search_records',
        description: 'Search records in an Airtable table using a formula',
        inputs: [
          { id: generateId(), name: 'base_id', type: 'string', description: 'Base ID', required: true },
          { id: generateId(), name: 'table_name', type: 'string', description: 'Table name or ID', required: true },
          { id: generateId(), name: 'filter_formula', type: 'string', description: 'Airtable formula (e.g. {Name}="John")', required: true },
        ],
        connector: {
          method: 'GET',
          url: 'https://api.airtable.com/v0/{base_id}/{table_name}?filterByFormula={filter_formula}',
          authType: 'bearer',
        },
      },
    ],
  },

  // ── WooCommerce ────────────────────────────────────────────────────────────
  // Auth: HTTP Basic using consumer_key (user) + consumer_secret (pass)
  // Credentials are sent in the Authorization header, never in the URL.
  {
    id: 'woocommerce',
    name: 'WooCommerce',
    description: 'Manage orders, products, and customers in your WooCommerce store.',
    icon: '🛒',
    category: 'E-commerce',
    authRequired: true,
    authLabel: 'Consumer Key',
    authPlaceholder: 'ck_...',
    tools: [
      {
        name: 'woo_list_orders',
        description: 'List WooCommerce orders',
        inputs: [
          { id: generateId(), name: 'per_page', type: 'number', description: 'Orders per page (max 100)', required: false },
          { id: generateId(), name: 'status', type: 'enum', description: 'Order status filter', required: false, enumValues: ['pending', 'processing', 'on-hold', 'completed', 'cancelled', 'refunded', 'failed', 'any'] },
        ],
        connector: {
          method: 'GET',
          url: 'https://{shop_domain}/wp-json/wc/v3/orders?per_page={per_page}&status={status}',
          authType: 'basic',
        },
      },
      {
        name: 'woo_get_order',
        description: 'Get a WooCommerce order by ID',
        inputs: [
          { id: generateId(), name: 'order_id', type: 'number', description: 'Order ID', required: true },
        ],
        connector: {
          method: 'GET',
          url: 'https://{shop_domain}/wp-json/wc/v3/orders/{order_id}',
          authType: 'basic',
        },
      },
      {
        name: 'woo_list_products',
        description: 'List WooCommerce products',
        inputs: [
          { id: generateId(), name: 'per_page', type: 'number', description: 'Products per page (max 100)', required: false },
        ],
        connector: {
          method: 'GET',
          url: 'https://{shop_domain}/wp-json/wc/v3/products?per_page={per_page}',
          authType: 'basic',
        },
      },
      {
        name: 'woo_get_product',
        description: 'Get a WooCommerce product by ID',
        inputs: [
          { id: generateId(), name: 'product_id', type: 'number', description: 'Product ID', required: true },
        ],
        connector: {
          method: 'GET',
          url: 'https://{shop_domain}/wp-json/wc/v3/products/{product_id}',
          authType: 'basic',
        },
      },
      {
        name: 'woo_list_customers',
        description: 'List WooCommerce customers',
        inputs: [
          { id: generateId(), name: 'per_page', type: 'number', description: 'Customers per page (max 100)', required: false },
        ],
        connector: {
          method: 'GET',
          url: 'https://{shop_domain}/wp-json/wc/v3/customers?per_page={per_page}',
          authType: 'basic',
        },
      },
      {
        name: 'woo_get_customer',
        description: 'Get a WooCommerce customer by ID',
        inputs: [
          { id: generateId(), name: 'customer_id', type: 'number', description: 'Customer ID', required: true },
        ],
        connector: {
          method: 'GET',
          url: 'https://{shop_domain}/wp-json/wc/v3/customers/{customer_id}',
          authType: 'basic',
        },
      },
      {
        name: 'woo_list_coupons',
        description: 'List WooCommerce coupons',
        inputs: [
          { id: generateId(), name: 'per_page', type: 'number', description: 'Coupons per page (max 100)', required: false },
        ],
        connector: {
          method: 'GET',
          url: 'https://{shop_domain}/wp-json/wc/v3/coupons?per_page={per_page}',
          authType: 'basic',
        },
      },
      {
        name: 'woo_get_store_info',
        description: 'Get WooCommerce store information and settings',
        inputs: [],
        connector: {
          method: 'GET',
          url: 'https://{shop_domain}/wp-json/wc/v3',
          authType: 'basic',
        },
      },
    ],
  },
]

export const PACK_CATEGORIES = [...new Set(TOOL_PACKS.map((p) => p.category))]

export function getPackById(id: string): ToolPack | undefined {
  return TOOL_PACKS.find((p) => p.id === id)
}

export function packToTools(pack: ToolPack): McpTool[] {
  return pack.tools.map((t) => ({
    ...t,
    id: generateId(),
    inputs: t.inputs.map((inp) => ({ ...inp, id: generateId() })),
  }))
}
