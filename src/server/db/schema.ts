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
  customType,
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

/** Conversaciones de Viorita-bot (asistente de la web). Solo las lee el panel. */
export const chatConversations = internal.table(
  "chat_conversations",
  {
    id: id(),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    messages: jsonb("messages").$type<{ role: "user" | "assistant"; content: string; at: string }[]>().notNull().default([]),
    status: text("status").notNull().default("open"), // open | handled
    page: text("page"),
    createdAt: createdAt(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("chat_conversations_client_idx").on(t.clientId)],
);

/**
 * Paquetes armados que la agencia publica con precio («desde»). Son públicos: los lee el rol
 * restringido de las páginas públicas (solo los publicados). Precio y servicios los carga la agencia.
 */
export const packages = pgTable(
  "packages",
  {
    id: id(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    category: text("category").notNull(),
    summary: text("summary").notNull().default(""),
    stops: jsonb("stops").$type<{ destinationId: string; nights: number }[]>().notNull().default([]),
    includes: jsonb("includes").$type<string[]>().notNull().default([]),
    excludes: jsonb("excludes").$type<string[]>().notNull().default([]),
    priceFrom: numeric("price_from", { precision: 12, scale: 2 }),
    currency: text("currency").notNull().default("USD"),
    priceNote: text("price_note").notNull().default("por persona, en base doble"),
    departures: text("departures").notNull().default(""),
    imageUrl: text("image_url"),
    status: text("status").notNull().default("draft"), // draft | published
    sort: integer("sort").notNull().default(100),
    createdAt: createdAt(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("packages_category_idx").on(t.category)],
);

/**
 * Pedidos de cotización desde el buscador (vuelos, hoteles, actividades, paquetes) y desde Viorita.
 * Datos personales: esquema interno, el rol público no los lee.
 */
export const quoteLeads = internal.table(
  "quote_leads",
  {
    id: id(),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // flight | hotel | activity | package | viorita | custom
    summary: text("summary").notNull(),
    details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
    message: text("message").notNull().default(""),
    status: text("status").notNull().default("new"), // new | contacted | quoted | closed
    createdAt: createdAt(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("quote_leads_status_idx").on(t.status)],
);

/**
 * Opiniones de clientes reales. Las envía el cliente (con permiso para publicarlas) o las carga
 * la agencia a partir de un mensaje real; solo se muestran las aprobadas.
 */
export const testimonials = pgTable("testimonials", {
  id: id(),
  name: text("name").notNull(),
  city: text("city").notNull().default(""),
  trip: text("trip").notNull().default(""),
  text: text("text").notNull(),
  rating: integer("rating").notNull().default(5),
  source: text("source").notNull().default("cliente"), // cliente | agencia
  status: text("status").notNull().default("pending"), // pending | approved | hidden
  contact: text("contact"), // solo para verificar; nunca se publica
  createdAt: createdAt(),
});

// ───────────────────────── Mi viaje (clientes que compraron) ─────────────────────────

const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });

/** Acceso del cliente a «Mi viaje». Se crea cuando compra; el cliente elige su contraseña con un enlace. */
export const clientAccounts = internal.table("client_accounts", {
  id: id(),
  clientId: uuid("client_id")
    .notNull()
    .unique()
    .references(() => clients.id, { onDelete: "cascade" }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  active: boolean("active").notNull().default(true),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  lockedUntil: ts("locked_until"),
  lastLoginAt: ts("last_login_at"),
  createdAt: createdAt(),
});

/** Enlaces de un solo uso para activar la cuenta o recuperar la contraseña. */
export const clientAccountTokens = internal.table("client_account_tokens", {
  id: id(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => clientAccounts.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  purpose: text("purpose").notNull(), // activate | reset
  expiresAt: ts("expires_at").notNull(),
  usedAt: ts("used_at"),
  createdAt: createdAt(),
});

export const clientSessions = internal.table("client_sessions", {
  id: id(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => clientAccounts.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: ts("expires_at").notNull(),
  createdAt: createdAt(),
});

export interface PlanEntry {
  time: string;
  title: string;
  text: string;
  link: string;
  /** Lugar para buscar la foto (p. ej. «Fontana di Trevi») o enlace https a una foto. */
  photo: string;
  /** Servicio relacionado (su voucher aparece en la actividad). */
  itemId: string;
}
export interface PlanDay {
  date: string; // AAAA-MM-DD
  city: string;
  countryCode: string;
  summary: string;
  entries: PlanEntry[];
}

/** Viaje vendido: lo que el cliente ve en «Mi viaje». */
export const bookedTrips = internal.table(
  "booked_trips",
  {
    id: id(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => tripProjects.id, { onDelete: "set null" }),
    title: text("title").notNull().default("Plan de viaje"),
    subtitle: text("subtitle").notNull().default(""),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    travelers: text("travelers").notNull().default(""),
    coverPlace: text("cover_place").notNull().default(""),
    europaGo: boolean("europa_go").notNull().default(false),
    assistance: text("assistance").notNull().default(""),
    notes: text("notes").notNull().default(""),
    plan: jsonb("plan").$type<PlanDay[]>().notNull().default([]),
    status: text("status").notNull().default("draft"), // draft | published
    createdAt: createdAt(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("booked_trips_client_idx").on(t.clientId)],
);

/** Servicios comprados: vuelos, hoteles, traslados, actividades, asistencia… */
export const tripItems = internal.table(
  "trip_items",
  {
    id: id(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => bookedTrips.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    provider: text("provider").notNull().default(""),
    startDate: date("start_date"),
    startTime: text("start_time").notNull().default(""),
    endDate: date("end_date"),
    endTime: text("end_time").notNull().default(""),
    place: text("place").notNull().default(""),
    address: text("address").notNull().default(""),
    confirmation: text("confirmation").notNull().default(""),
    details: text("details").notNull().default(""),
    breakfast: boolean("breakfast"),
    rating: text("rating").notNull().default(""),
    price: numeric("price", { precision: 12, scale: 2 }),
    currency: text("currency").notNull().default("USD"),
    photos: jsonb("photos").$type<string[]>().notNull().default([]),
    voucherUrl: text("voucher_url").notNull().default(""),
    sort: integer("sort").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("trip_items_trip_idx").on(t.tripId)],
);

/** Vouchers subidos (PDF o imagen). Solo los ve el dueño del viaje o el equipo. */
export const tripFiles = internal.table(
  "trip_files",
  {
    id: id(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => bookedTrips.id, { onDelete: "cascade" }),
    itemId: uuid("item_id").references(() => tripItems.id, { onDelete: "set null" }),
    filename: text("filename").notNull(),
    mime: text("mime").notNull(),
    size: integer("size").notNull(),
    data: bytea("data").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("trip_files_trip_idx").on(t.tripId)],
);
