// src/modules/docs/config/routes.config.ts
import { z } from "zod";
import { registerUserSchema, loginSchema } from "@/modules/identity/request";
import { registerTalentSchema } from "@/modules/catalog/request";

// 1. Enforce strict token structures for HTTP parameters
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

// 2. Map system domain modules to enforce clean tag segregation in Scalar docs
export type ModuleTag = "Identity" | "Catalog" | "MediaProcessing" | "Webhooks";

/**
 * Strict structural contract representing an API endpoint configuration.
 * Hardens type parameters to reduce human error during code-review sequences.
 */
export interface RouteDefinition {
  method: HttpMethod;
  version: "v1" | "v2";
  module: ModuleTag;
  path: `/api/${string}`; // Enforces consistent filesystem design naming rules
  summary: string;
  description: string;
  isProtected: boolean; // Mandatory security parameter for middleware evaluation
  requestBody?: z.ZodSchema;
  responseBody?: z.ZodSchema;
}

/**
 * Centralized API Manifest Core Ledger.
 * Serves as the single source of truth for both OpenAPI auto-generation
 * and ambient route authorization logic pipelines.
 */
export const API_ROUTES: RouteDefinition[] = [
  {
    method: "POST",
    version: "v1",
    module: "Identity",
    path: "/api/identity/register-user",
    summary: "Register a new base user profile",
    description:
      "Validates incoming field constraints, intercepts email duplication parameters, hashes passwords, and persists the identity record.",
    isProtected: false,
    requestBody: registerUserSchema,
  },
  {
    method: "POST",
    version: "v1",
    module: "Catalog",
    path: "/api/catalog/register-talent",
    summary: "Elevate a base user profile to marketplace talent",
    description:
      "Upgrades an authenticated user to a talent profile status and mounts portfolio/skill criteria within an atomic database transaction window.",
    isProtected: true,
    requestBody: registerTalentSchema,
  },
  {
    method: "POST",
    version: "v1",
    module: "Identity",
    path: "/api/identity/login",
    summary: "Authenticate user credentials",
    description:
      "Verifies incoming handle credentials against system hash signatures, generating short-lived access authorization and setting a secure session cookie.",
    isProtected: false,
    requestBody: loginSchema,
  },
  {
    method: "GET",
    version: "v1",
    module: "Identity",
    path: "/api/identity/profile",
    summary: "Retrieve personal user profile parameters",
    description:
      "Extracts identity metadata details via active cryptographically signed session variables.",
    isProtected: true,
  },
  {
    method: "PATCH",
    version: "v1",
    module: "Identity",
    path: "/api/identity/profile",
    summary: "Update personal user profile parameters",
    description:
      "Accepts partial optional frontend configurations and metadata variables, completely blocking system state overrides.",
    isProtected: true,
  },
  {
    method: "PUT",
    version: "v1",
    module: "Identity",
    path: "/api/identity/account",
    summary: "Update critical identity credentials",
    description:
      "Mutates sensitive registration paths (email, username, password) following thorough unique restriction verification checks.",
    isProtected: true,
  },
  {
    method: "POST",
    version: "v1",
    module: "Identity",
    path: "/api/identity/logout",
    summary: "Log out active user session",
    description:
      "Clears the active HTTP-only authentication cookie and destroys the active session layout string inside the Redis cache pool.",
    isProtected: true,
  },
  {
    method: "GET",
    version: "v1",
    module: "Catalog",
    path: "/api/catalog/talent/[id]", // Maps onto filesystem naming parameters safely
    summary: "Resolve Public Talent Storefront",
    description:
      "Fetches a fully-hydrated profile layout joined with active user metadata parameters.",
    isProtected: false,
  },
  {
    method: "GET",
    version: "v1",
    module: "Catalog",
    path: "/api/catalog/talent/me",
    summary: "Retrieve Self-Service Seller Context",
    description:
      "Proxies active web session tokens straight down onto core dashboard record paths.",
    isProtected: true,
  },
  {
    method: "PATCH",
    version: "v1",
    module: "Catalog",
    path: "/api/catalog/talent/profile",
    summary: "Update Talent Storefront Showcase Settings",
    description:
      "Accepts partial modifications for professional biographies and skill tag matrices, stripping unauthorized column parameters.",
    isProtected: true,
  },
  {
    method: "GET",
    version: "v1",
    module: "Catalog",
    path: "/api/catalog/categories",
    summary: "List all active marketplace categories",
    description:
      "Fetches an unprivileged flat array of valid category entries containing IDs, names, slugs, and hierarchical parent relationships.",
    isProtected: false,
  },
  {
    method: "POST",
    version: "v1",
    module: "Catalog",
    path: "/api/catalog/portfolio",
    summary: "Publish a new creative portfolio project entry",
    description:
      "Enables active marketplace sellers to map professional text context records joined with arrays of visual carousel slide items strings up into atomic database rows.",
    isProtected: true,
  },
  {
    method: "PATCH",
    version: "v1",
    module: "Catalog",
    path: "/api/catalog/portfolio/[id]",
    summary: "Modify an existing portfolio project entry",
    description:
      "Accepts partial optional updates, evaluates explicit profile ownership constraints, purges obsolete child attachments records collections, and re-inserts updated asset array sequences cleanly.",
    isProtected: true,
  },
  // Append this block inside the API_ROUTES array layout configuration inside routes.config.ts
  {
    method: "DELETE",
    version: "v1",
    module: "Catalog",
    path: "/api/catalog/portfolio/[id]",
    summary: "Delete an existing portfolio project entry",
    description:
      "Evaluates profile ownership constraints, triggers cascading drops across related child media elements, and completely flushes metadata rows from disk space.",
    isProtected: true,
  },
  {
    method: "GET",
    version: "v1",
    module: "Catalog",
    path: "/api/catalog/talent/portfolios/[id]",
    summary:
      "List all public portfolio entries for a specific talent storefront",
    description:
      "Fetches an unprivileged, deep-hydrated collection array of creative showcase entries joined with ordered slide media paths.",
    isProtected: false,
  },
];
