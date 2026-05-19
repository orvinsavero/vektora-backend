import { z } from "zod";
import {
  registerUserSchema,
  registerTalentSchema,
} from "@/modules/identity/validators";

// 1. Enforce strict token structures for HTTP parameters
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

// 2. Map system domain modules to enforce clean tag segregation in Scalar docs
export type ModuleTag =
  | "Identity"
  | "Marketplace"
  | "MediaProcessing"
  | "Webhooks";

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
    module: "Identity",
    path: "/api/identity/register-talent",
    summary: "Elevate a base user profile to marketplace talent",
    description:
      "Upgrades an authenticated user to a talent profile status and mounts portfolio/skill criteria within an atomic database transaction window.",
    isProtected: true,
    requestBody: registerTalentSchema,
  },
];
