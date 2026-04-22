import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  boolean,
  integer,
  uuid,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

////////////////////////////////////////////////////////////
//////////////////// ENUMS //////////////////////////////////
////////////////////////////////////////////////////////////

export const UserRole = pgEnum("user_role", [
  "SUPER_ADMIN",
  "ADMIN",
  "USER",
]);

export const contentStatusEnum = pgEnum("content_status", [
  "DRAFT",
  "PUBLISHED",
  "PENDING",
  "REJECTED",
]);

export const contentTypeEnum = pgEnum("content_type", [
  "BLOG",
  "NEWS",
  "ENTRECHAT",
  "EVENT",
  "PRESS",
  "SUCCESS_STORY",
  "RESOURCE",
]);

export const resourceScopeEnum = pgEnum("resource_scope", [
  "INDIA_STATE",
  "GLOBAL",
]);

// Banner Enums
export const ScreenTypeEnum = pgEnum("screen_type", [
  "DESKTOP",
  "TABLET",
  "MOBILE",
]);

export const BannerStatusEnum = pgEnum("banner_status", [
  "DRAFT",
  "ACTIVE",
  "INACTIVE",
  "SCHEDULED",
]);

export const BannerElementTypeEnum = pgEnum("banner_element_type", [
  "TEXT",
  "BUTTON",
]);

export const IconPositionEnum = pgEnum("icon_position", [
  "left",
  "right",
]);

////////////////////////////////////////////////////////////
//////////////////// USERS //////////////////////////////////
////////////////////////////////////////////////////////////

export const UsersTable = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),

    name: text("name").notNull(),

    email: text("email").notNull(),

    emailVerified: timestamp("email_verified", { mode: "date" }),

    isActive: boolean("is_active").default(true).notNull(),

    password: text("password"),

    mobile: text("mobile"),

    image: text("image"),

    phoneVerified: timestamp("phone_verified", { mode: "date" }),

    role: UserRole("role").default("USER").notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),

    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("users_email_key").on(table.email),

    index("users_role_idx").on(table.role),

    index("users_active_idx").on(table.isActive),
  ]
);

////////////////////////////////////////////////////////////
//////////////////// AUTH TOKENS ////////////////////////////
////////////////////////////////////////////////////////////

export const EmailVerificationTokenTable = pgTable(
  "email_verification_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    email: text("email").notNull(),
    token: uuid("token").notNull(),
    expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("email_verification_tokens_email_token_key").on(table.email, table.token),
    uniqueIndex("email_verification_tokens_token_key").on(table.token),
  ]
);

export const PasswordResetTokenTable = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    email: text("email").notNull(),
    token: uuid("token").notNull(),
    expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("password_reset_tokens_email_token_key").on(table.email, table.token),
    uniqueIndex("password_reset_tokens_token_key").on(table.token),
  ]
);

////////////////////////////////////////////////////////////
//////////////////// CATEGORIES //////////////////////////////
////////////////////////////////////////////////////////////

export const CategoriesTable = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),

    name: text("name").notNull(),

    slug: text("slug").notNull(),

    description: text("description"),

    contentType: contentTypeEnum("content_type").notNull(),

    isActive: boolean("is_active").default(true).notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("categories_slug_content_type_key").on(
      table.slug,
      table.contentType
    ),

    index("categories_slug_idx").on(table.slug),

    index("categories_content_type_idx").on(table.contentType),

    index("categories_active_idx").on(table.isActive),

    index("categories_content_type_active_idx").on(
      table.contentType,
      table.isActive
    ),
  ]
);

////////////////////////////////////////////////////////////
//////////////////// TAGS ///////////////////////////////////
////////////////////////////////////////////////////////////

export const TagsTable = pgTable(
  "tags",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),

    name: text("name").notNull(),

    slug: text("slug").notNull(),

    usageCount: integer("usage_count").default(0).notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("tags_name_key").on(table.name),

    uniqueIndex("tags_slug_key").on(table.slug),

    index("tags_usage_count_desc_idx").on(table.usageCount),
  ]
);

////////////////////////////////////////////////////////////
//////////////////// CONTENT ////////////////////////////////
////////////////////////////////////////////////////////////

export const ContentTable = pgTable(
  "content",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),

    wpId: text("wp_id"),

    title: text("title").notNull(),

    slug: text("slug").notNull(),

    summary: text("summary"),

    content: text("content").notNull(),

    contentType: contentTypeEnum("content_type")
      .default("BLOG")
      .notNull(),

    categoryId: uuid("category_id").references(
      () => CategoriesTable.id,
      { onDelete: "set null" }
    ),

    createdBy: uuid("created_by").references(
      () => UsersTable.id,
      { onDelete: "set null" }
    ),

    authorName: text("author_name"),

    featuredImage: text("featured_image"),

    externalUrl: text("external_url"),

    contentImages: jsonb("content_images"),

    readingTime: integer("reading_time"),

    status: contentStatusEnum("status")
      .default("PUBLISHED")
      .notNull(),

    publishedAt: timestamp("published_at", { mode: "date" }),

    createdAt: timestamp("created_at").defaultNow().notNull(),

    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },

  (table) => [
    uniqueIndex("content_slug_key").on(table.slug),

    uniqueIndex("content_wp_id_key")
      .on(table.wpId)
      .where(sql`${table.wpId} IS NOT NULL`),

    index("content_type_idx").on(table.contentType),

    index("content_status_idx").on(table.status),

    index("content_category_id_idx").on(table.categoryId),

    index("content_published_at_idx").on(table.publishedAt),

    index("content_created_at_desc_idx").on(table.createdAt),

    index("content_created_by_idx").on(table.createdBy),

    index("content_type_status_published_idx").on(
      table.contentType,
      table.status,
      table.publishedAt
    ),

    index("content_type_status_created_idx").on(
      table.contentType,
      table.status,
      table.createdAt
    ),

    index("content_related_query_idx").on(
      table.categoryId,
      table.status,
      table.publishedAt
    ),
  ]
);

////////////////////////////////////////////////////////////
//////////////////// CONTENT TAGS ///////////////////////////
////////////////////////////////////////////////////////////

export const ContentTagsTable = pgTable(
  "content_tags",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),

    contentId: uuid("content_id")
      .notNull()
      .references(() => ContentTable.id, { onDelete: "cascade" }),

    tagId: uuid("tag_id")
      .notNull()
      .references(() => TagsTable.id, { onDelete: "cascade" }),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },

  (table) => [
    uniqueIndex("content_tags_content_tag_key").on(
      table.contentId,
      table.tagId
    ),

    index("content_tags_content_id_idx").on(table.contentId),

    index("content_tags_tag_id_idx").on(table.tagId),
  ]
);

////////////////////////////////////////////////////////////
//////////////////// RESOURCES //////////////////////////////
////////////////////////////////////////////////////////////

export const ResourcesTable = pgTable(
  "resources",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),

    scope: resourceScopeEnum("scope").notNull(),

    locationKey: text("location_key").notNull(),

    locationLabel: text("location_label").notNull(),

    title: text("title").notNull(),

    description: text("description"),

    link: text("link"),

    sourceId: integer("source_id"),

    isActive: boolean("is_active").default(true).notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),

    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("resources_scope_idx").on(table.scope),

    index("resources_location_key_idx").on(table.locationKey),

    index("resources_scope_location_idx").on(
      table.scope,
      table.locationKey
    ),

    index("resources_scope_location_active_idx").on(
      table.scope,
      table.locationKey,
      table.isActive
    ),
  ]
);

////////////////////////////////////////////////////////////
//////////////////// BANNERS TABLE //////////////////////////
////////////////////////////////////////////////////////////

export const BannersTable = pgTable(
  "banners",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),

    // Identity
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),

    // Targeting
    screenType: ScreenTypeEnum("screen_type").notNull(),
    page: text("page").notNull(),
    position: text("position").default("top").notNull(),

    // Canvas
    width: integer("width").notNull(),
    height: integer("height").notNull(),

    // Background
    backgroundColor: text("background_color").default("#ffffff"),
    backgroundImageUrl: text("background_image_url"),
    backgroundImageAlt: text("background_image_alt"),
    backgroundSize: text("background_size").default("cover"),
    backgroundPosition: text("background_position").default("center"),

    // Elements - stored as JSONB array
    elements: jsonb("elements").default([]).notNull(),

    // Scheduling & status
    status: BannerStatusEnum("status").default("DRAFT").notNull(),
    startsAt: timestamp("starts_at", { mode: "date" }),
    endsAt: timestamp("ends_at", { mode: "date" }),
    priority: integer("priority").default(0).notNull(),

    // Audit
    createdBy: uuid("created_by")
      .notNull()
      .references(() => UsersTable.id, { onDelete: "restrict" }),
    updatedBy: uuid("updated_by").references(() => UsersTable.id, {
      onDelete: "set null",
    }),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    // Indexes for banners
    index("banners_status_idx").on(table.status),
    index("banners_slug_screen_idx").on(table.slug, table.screenType),
    index("banners_screen_page_position_idx").on(
      table.screenType,
      table.page,
      table.position
    ),
    index("banners_priority_idx").on(table.priority),
    index("banners_status_dates_idx").on(table.status, table.startsAt, table.endsAt),
    index("banners_dates_idx").on(table.startsAt, table.endsAt),
    index("banners_created_by_idx").on(table.createdBy),
    index("banners_updated_by_idx").on(table.updatedBy),
  ]
);

////////////////////////////////////////////////////////////
//////////////////// STORY SUBMISSIONS //////////////////////
////////////////////////////////////////////////////////////

export const StorySubmissionsTable = pgTable(
  "story_submissions",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    title: text("title").notNull(),
    story: text("story").notNull(),
    businessName: text("business_name"),
    industry: text("industry"),
    images: jsonb("images"),
    status: contentStatusEnum("status").notNull().default("PENDING"),
    reviewedBy: uuid("reviewed_by").references(() => UsersTable.id, {
      onDelete: "set null",
    }),
    reviewNotes: text("review_notes"),
    publishedContentId: uuid("published_content_id").references(
      () => ContentTable.id,
      { onDelete: "set null" }
    ),
    submittedAt: timestamp("submitted_at").defaultNow().notNull(),
    reviewedAt: timestamp("reviewed_at", { mode: "date" }),
  },
  (table) => [
    index("story_submissions_status_idx").on(table.status),
    index("story_submissions_submitted_at_idx").on(table.submittedAt),
    index("story_submissions_reviewed_by_idx").on(table.reviewedBy),
    index("story_submissions_status_submitted_idx").on(
      table.status,
      table.submittedAt
    ),
  ]
);

////////////////////////////////////////////////////////////
//////////////////// CONTACT SUBMISSIONS ////////////////////
////////////////////////////////////////////////////////////

export const ContactSubmissionsTable = pgTable(
  "contact_submissions",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    subject: text("subject"),
    message: text("message").notNull(),
    isResolved: boolean("is_resolved").notNull().default(false),
    resolvedBy: uuid("resolved_by").references(() => UsersTable.id, {
      onDelete: "set null",
    }),
    resolvedAt: timestamp("resolved_at", { mode: "date" }),
    notes: text("notes"),
    submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  },
  (table) => [
    index("contact_submissions_resolved_idx").on(table.isResolved),
    index("contact_submissions_submitted_at_idx").on(table.submittedAt),
    index("contact_submissions_resolved_by_idx").on(table.resolvedBy),
    index("contact_submissions_resolved_submitted_idx").on(
      table.isResolved,
      table.submittedAt
    ),
  ]
);

////////////////////////////////////////////////////////////
//////////////////// RELATIONS //////////////////////////////
////////////////////////////////////////////////////////////

export const contentRelations = relations(ContentTable, ({ one, many }) => ({
  category: one(CategoriesTable, {
    fields: [ContentTable.categoryId],
    references: [CategoriesTable.id],
  }),

  creator: one(UsersTable, {
    fields: [ContentTable.createdBy],
    references: [UsersTable.id],
  }),

  tags: many(ContentTagsTable),
}));

export const tagsRelations = relations(TagsTable, ({ many }) => ({
  contentTags: many(ContentTagsTable),
}));

export const contentTagsRelations = relations(
  ContentTagsTable,
  ({ one }) => ({
    content: one(ContentTable, {
      fields: [ContentTagsTable.contentId],
      references: [ContentTable.id],
    }),

    tag: one(TagsTable, {
      fields: [ContentTagsTable.tagId],
      references: [TagsTable.id],
    }),
  })
);

export const categoryRelations = relations(
  CategoriesTable,
  ({ many }) => ({
    posts: many(ContentTable),
  })
);

export const storySubmissionRelations = relations(
  StorySubmissionsTable,
  ({ one }) => ({
    reviewer: one(UsersTable, {
      fields: [StorySubmissionsTable.reviewedBy],
      references: [UsersTable.id],
    }),
    publishedContent: one(ContentTable, {
      fields: [StorySubmissionsTable.publishedContentId],
      references: [ContentTable.id],
    }),
  })
);

export const contactSubmissionRelations = relations(
  ContactSubmissionsTable,
  ({ one }) => ({
    resolver: one(UsersTable, {
      fields: [ContactSubmissionsTable.resolvedBy],
      references: [UsersTable.id],
    }),
  })
);

// Banner Relations
export const bannersRelations = relations(BannersTable, ({ one }) => ({
  createdByUser: one(UsersTable, {
    fields: [BannersTable.createdBy],
    references: [UsersTable.id],
    relationName: "createdBanners",
  }),
  updatedByUser: one(UsersTable, {
    fields: [BannersTable.updatedBy],
    references: [UsersTable.id],
    relationName: "updatedBanners",
  }),
}));

// Updated User Relations with Banners
export const userRelations = relations(UsersTable, ({ many }) => ({
  posts: many(ContentTable),
  storyReviews: many(StorySubmissionsTable),
  contactResolutions: many(ContactSubmissionsTable),
  createdBanners: many(BannersTable, { relationName: "createdBanners" }),
  updatedBanners: many(BannersTable, { relationName: "updatedBanners" }),
}));

////////////////////////////////////////////////////////////
//////////////////// TYPES //////////////////////////////////
////////////////////////////////////////////////////////////

export type User = typeof UsersTable.$inferSelect;
export type NewUser = typeof UsersTable.$inferInsert;

export type Category = typeof CategoriesTable.$inferSelect;
export type NewCategory = typeof CategoriesTable.$inferInsert;

export type Tag = typeof TagsTable.$inferSelect;
export type NewTag = typeof TagsTable.$inferInsert;

export type Content = typeof ContentTable.$inferSelect;
export type NewContent = typeof ContentTable.$inferInsert;

export type ContentTag = typeof ContentTagsTable.$inferSelect;
export type NewContentTag = typeof ContentTagsTable.$inferInsert;

export type Resource = typeof ResourcesTable.$inferSelect;
export type NewResource = typeof ResourcesTable.$inferInsert;

export type StorySubmission = typeof StorySubmissionsTable.$inferSelect;
export type NewStorySubmission = typeof StorySubmissionsTable.$inferInsert;

export type ContactSubmission = typeof ContactSubmissionsTable.$inferSelect;
export type NewContactSubmission = typeof ContactSubmissionsTable.$inferInsert;

// Banner Types
export type Banner = typeof BannersTable.$inferSelect;
export type NewBanner = typeof BannersTable.$inferInsert;
