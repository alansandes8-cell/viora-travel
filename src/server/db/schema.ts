import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgSchema,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  index,
  uuid,
} from "drizzle-orm/pg-core";
import type { IntakeAnswers, PlanDocument } from "@/core/types";

const ts = (name: string) => timestamp(name, { withTimezone: true });
const createdAt = () => ts("created_at").notNull().defaultNow();
const id = () => uuid("id").primaryKey().default(sql`gen_random_uuid()`);

// ═════════════════════════ Esquema público de la aplicación ═════════════════════════

export const staffUsers = pgTable("staff_users", {
  id: id(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("agent"), // owner | agent | viewer
  totpSecret: text("totp_secret"),
  active: boolean("active").notNull().default(true),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  lockedUntil: ts("locked_until"),
  lastLoginAt: ts("last_login_at"),
  createdAt: createdAt(),
});

export const staffSessions = pgTable("staff_sessions", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => staffUsers.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  createdAt: createdAt(),
  expiresAt: ts("expires_at").notNull(),
  userAgent: text("user_agent"),
});

export const clients = pgTable("clients", {
  id: id(),
  name: text("name"),
  email: text("email"),
  phone: text("phone"),
  country: text("country"),
  consentContact: boolean("consent_contact").notNull().default(false),
  consentAt: ts("consent_at"),
  source: text("source").notNull().default("web"),
  anonymizedAt: ts("anonymized_at"),
  createdAt: createdAt(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const projectStatuses = pgTable("project_statuses", {
  key: text("key").primaryKey(),
  label: text("label").notNull(),
  sort: integer("sort").notNull(),
  isFinal: boolean("is_final").notNull().default(false),
  color: text("color").notNull().default("slate"),
});

export const tripProjects = pgTable(
  "trip_projects",
  {
    id: id(),
    code: text("code").notNull().unique(),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    statusKey: text("status_key").notNull().default("new"),
    priority: text("priority").notNull().default("normal"),
    assignedUserId: uuid("assigned_user_id").references(() => staffUsers.id, { onDelete: "set null" }),
    currentVersionId: uuid("current_version_id"),
    publishedVersionId: uuid("published_version_id"),
    destinationSummary: text("destination_summary"),
    tentativeDates: text("tentative_dates"),
    travelers: integer("travelers"),
    budgetTier: text("budget_tier"),
    nextFollowUp: date("next_follow_up"),
    nextTask: text("next_task"),
    archivedAt: ts("archived_at"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("trip_projects_status_idx").on(t.statusKey), index("trip_projects_client_idx").on(t.clientId)],
);

export const intakeSessions = pgTable("intake_sessions", {
  id: id(),
  projectId: uuid("project_id").references(() => tripProjects.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  answers: jsonb("answers").$type<Partial<IntakeAnswers>>().notNull().default({}),
  step: integer("step").notNull().default(0),
  status: text("status").notNull().default("draft"), // draft | submitted
  createdAt: createdAt(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
  expiresAt: ts("expires_at").notNull(),
});

export const planVersions = pgTable(
  "plan_versions",
  {
    id: id(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => tripProjects.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    parentId: uuid("parent_id"),
    authorKind: text("author_kind").notNull(), // engine | ai | agent | client
    authorUserId: uuid("author_user_id"),
    reason: text("reason").notNull(),
    document: jsonb("document").$type<PlanDocument>().notNull(),
    status: text("status").notNull().default("draft"), // draft | approved
    changeSummary: jsonb("change_summary").$type<string[]>().notNull().default([]),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("plan_versions_project_number").on(t.projectId, t.number)],
);

export const changeRequests = pgTable("change_requests", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => tripProjects.id, { onDelete: "cascade" }),
  source: text("source").notNull(), // client | agent
  text: text("text").notNull(),
  parsed: jsonb("parsed"),
  status: text("status").notNull(), // applied | pending_approval | rejected | unmatched
  resultVersionId: uuid("result_version_id"),
  createdAt: createdAt(),
});

export const tasks = pgTable("tasks", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => tripProjects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  detail: text("detail"),
  status: text("status").notNull().default("pending"), // pending | in_progress | verified | done
  dueDate: date("due_date"),
  assigneeId: uuid("assignee_id"),
  origin: text("origin").notNull().default("manual"), // suggested | manual
  sort: integer("sort").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const clientSnapshots = pgTable("client_snapshots", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => tripProjects.id, { onDelete: "cascade" }),
  versionId: uuid("version_id").notNull(),
  kind: text("kind").notNull(), // client_proposal | priced_proposal
  content: jsonb("content").notNull(),
  contentHash: text("content_hash").notNull(),
  createdAt: createdAt(),
});

export const shareLinks = pgTable("share_links", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => tripProjects.id, { onDelete: "cascade" }),
  snapshotId: uuid("snapshot_id")
    .notNull()
    .references(() => clientSnapshots.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), // client_proposal | priced_proposal | draft_session
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: ts("expires_at").notNull(),
  revokedAt: ts("revoked_at"),
  createdBy: text("created_by").notNull(), // client | staff:<id>
  createdAt: createdAt(),
  lastAccessAt: ts("last_access_at"),
  accessCount: integer("access_count").notNull().default(0),
});

export const quoteRequests = pgTable("quote_requests", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => tripProjects.id, { onDelete: "cascade" }),
  clientId: uuid("client_id"),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  preferredChannel: text("preferred_channel").notNull().default("whatsapp"),
  message: text("message"),
  consent: boolean("consent").notNull(),
  notificationStatus: text("notification_status").notNull(), // not_configured | sent | failed
  notificationError: text("notification_error"),
  createdAt: createdAt(),
});

export const activityLog = pgTable(
  "activity_log",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    projectId: uuid("project_id"),
    actorKind: text("actor_kind").notNull(), // staff | client | system
    actorId: text("actor_id"),
    action: text("action").notNull(),
    details: jsonb("details").notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [index("activity_project_idx").on(t.projectId)],
);

export const destinations = pgTable("destinations", {
  id: text("id").primaryKey(),
  data: jsonb("data").notNull(),
  active: boolean("active").notNull().default(true),
  source: text("source").notNull().default("seed"), // seed | agent
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: id(),
    provider: text("provider").notNull(), // wikipedia | unsplash | pexels | youtube | agency
    externalId: text("external_id").notNull(),
    kind: text("kind").notNull(), // image | video
    url: text("url").notNull(),
    thumbUrl: text("thumb_url"),
    width: integer("width"),
    height: integer("height"),
    title: text("title"),
    author: text("author"),
    authorUrl: text("author_url"),
    sourceUrl: text("source_url"),
    license: text("license"),
    attribution: text("attribution"),
    aiGenerated: boolean("ai_generated").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("media_provider_external").on(t.provider, t.externalId)],
);

export const mediaQueries = pgTable("media_queries", {
  query: text("query").notNull(),
  kind: text("kind").notNull(),
  provider: text("provider").notNull(),
  assetIds: jsonb("asset_ids").$type<string[]>().notNull().default([]),
  status: text("status").notNull(), // ok | error | not_configured | empty
  error: text("error"),
  fetchedAt: ts("fetched_at").notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.query, t.kind, t.provider] })]);

export const linkChecks = pgTable("link_checks", {
  url: text("url").primaryKey(),
  ok: boolean("ok").notNull(),
  statusCode: integer("status_code"),
  checkedAt: ts("checked_at").notNull().defaultNow(),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text("key").notNull(),
    windowStart: ts("window_start").notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.key, t.windowStart] })],
);

// ═════════════════════════ Esquema interno (nunca accesible por el rol público) ═════════════════════════

export const internal = pgSchema("internal");

export const notes = internal.table("notes", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => tripProjects.id, { onDelete: "cascade" }),
  authorId: uuid("author_id"),
  kind: text("kind").notNull().default("note"), // note | decision | comment | client_change
  text: text("text").notNull(),
  createdAt: createdAt(),
});

export const budgetHints = internal.table("budget_hints", {
  projectId: uuid("project_id")
    .primaryKey()
    .references(() => tripProjects.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 14, scale: 2 }),
  currency: text("currency"),
  per: text("per"), // person | group
  includes: jsonb("includes").notNull().default({}),
  flexibility: text("flexibility"),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const quoteComponents = internal.table("quote_components", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => tripProjects.id, { onDelete: "cascade" }),
  versionId: uuid("version_id"),
  category: text("category").notNull(),
  description: text("description").notNull(),
  dateFrom: date("date_from"),
  dateTo: date("date_to"),
  pax: integer("pax"),
  specs: text("specs"),
  supplier: text("supplier"),
  sourceUrl: text("source_url"),
  verification: text("verification").notNull().default("pending"),
  planRef: text("plan_ref"),
  sort: integer("sort").notNull().default(0),
  createdAt: createdAt(),
});

export const priceObservations = internal.table("price_observations", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => tripProjects.id, { onDelete: "cascade" }),
  componentId: uuid("component_id"),
  kind: text("kind").notNull(), // consulted_real | observed_on_date | reference_estimate | historical | unavailable
  provider: text("provider"),
  observedAt: ts("observed_at").notNull(),
  travelFrom: date("travel_from"),
  travelTo: date("travel_to"),
  pax: integer("pax"),
  currency: text("currency"),
  amount: numeric("amount", { precision: 14, scale: 2 }),
  includes: text("includes"),
  excludes: text("excludes"),
  baggage: text("baggage"),
  cancellation: text("cancellation"),
  url: text("url"),
  availability: text("availability"),
  validUntil: ts("valid_until"),
  notes: text("notes"),
  createdBy: uuid("created_by"),
  createdAt: createdAt(),
});

export const quotes = internal.table("quotes", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => tripProjects.id, { onDelete: "cascade" }),
  versionId: uuid("version_id"),
  status: text("status").notNull().default("draft"), // draft | approved
  currency: text("currency").notNull(),
  travelers: integer("travelers").notNull(),
  fxNote: text("fx_note"),
  fxDate: date("fx_date"),
  taxes: jsonb("taxes").$type<{ label: string; mode: "percent" | "fixed"; value: string }[]>().notNull().default([]),
  marginPercent: numeric("margin_percent", { precision: 6, scale: 2 }),
  managementFee: numeric("management_fee", { precision: 14, scale: 2 }),
  paymentTerms: text("payment_terms"),
  validUntil: date("valid_until"),
  included: text("included"),
  excluded: text("excluded"),
  conditions: text("conditions"),
  createdAt: createdAt(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const quoteLines = internal.table("quote_lines", {
  id: id(),
  quoteId: uuid("quote_id")
    .notNull()
    .references(() => quotes.id, { onDelete: "cascade" }),
  componentId: uuid("component_id"),
  category: text("category").notNull(),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
  unitAmount: numeric("unit_amount", { precision: 14, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  fxRate: numeric("fx_rate", { precision: 14, scale: 6 }),
  perPerson: boolean("per_person").notNull().default(false),
  observationId: uuid("observation_id"),
  sort: integer("sort").notNull().default(0),
});

export const aiRuns = internal.table("ai_runs", {
  id: id(),
  projectId: uuid("project_id"),
  stage: text("stage").notNull(),
  model: text("model"),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  durationMs: integer("duration_ms"),
  ok: boolean("ok").notNull(),
  error: text("error"),
  createdAt: createdAt(),
});
