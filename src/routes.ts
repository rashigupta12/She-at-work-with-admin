// routes.ts
// Single source of truth for all route config.
// Normalized to regex only — no mixed string/RegExp array.
// Middleware reads this directly with zero runtime parsing overhead.

import { Role } from "./validaton-schema";

export const DEFAULT_LOGIN_REDIRECT = "/dashboard";
export const apiAuthPrefix          = "/api/auth";

// ── Public routes ──────────────────────────────────────────────────────────
// Converted to a single compiled regex so middleware does ONE .test() call
// instead of looping an array on every request.
//
// Covers:
//   /                          homepage
//   /auth/verify-email         email link
//   /about, /about/*           about + core-team + press-room
//   /news, /news/*             news listing + detail
//   /blogs, /blogs/*
//   /entrechat, /entrechat/*
//   /events, /events/*
//   /contact
//   /share-your-story
//   /gettingstarted, /gettingstarted/*
export const publicRoutePattern = /^(\/|\/auth\/verify-email|\/about(\/.*)?|\/news(\/.*)?|\/blogs(\/.*)?|\/entrechat(\/.*)?|\/events(\/.*)?|\/contact|\/share-your-story|\/gettingstarted(\/.*)?)$/;

// ── Public API prefixes ────────────────────────────────────────────────────
// Checked with startsWith — keep as array, easy to extend.
export const publicApiPrefixes: string[] = [
  "/api/contact-submissions",
  "/api/content",
  "/api/stories",
  "/api/resources",
  "/api/neon-backup",
  "/api/banners/active",
];

// ── Auth routes (login, register, etc.) ───────────────────────────────────
export const authRoutes: string[] = [
  "/auth/error",
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
];

// ── Role-based protected routes ────────────────────────────────────────────
// Pre-compiled regex → Role[] map. Compiled once at module load, not per-request.
export const protectedRoutes: { pattern: RegExp; roles: Role[] }[] = [
  { pattern: /^\/dashboard\/admin(\/.*)?$/, roles: ["ADMIN"] },
  { pattern: /^\/dashboard\/user(\/.*)?$/,  roles: ["USER"] },
];