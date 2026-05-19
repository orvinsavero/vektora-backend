import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { API_ROUTES } from "../config/routes.config";

// 1. Initialize prototype extensions safely before building the ledger graph
extendZodWithOpenApi(z);
const registry = new OpenAPIRegistry();

// 2. Define the security scheme definition for bearer token management
const SecurityBearerRef = registry.registerComponent(
  "securitySchemes",
  "BearerAuth",
  {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
    description:
      "Provide your short-lived access JWT to interact with secure marketplace resources.",
  },
);

// 3. Process and map the core ledger entries cleanly
API_ROUTES.forEach((route) => {
  let schemaRef: any = undefined;

  if (route.requestBody) {
    // Generate an absolute, unique component name to insulate against production minification traps
    const cleanPathName = route.path
      .split("/")
      .filter(Boolean)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join("");

    const uniqueComponentName = `${cleanPathName}Payload`;
    schemaRef = registry.register(uniqueComponentName, route.requestBody);
  }

  // Map individual route parameter blocks matching OpenAPI structural constraints
  registry.registerPath({
    // FIX: Convert "GET"/"POST" to lowercase dynamically and cast to satisfy the internal zod-to-openapi type definition
    method: route.method.toLowerCase() as
      | "get"
      | "post"
      | "put"
      | "delete"
      | "patch",
    path: route.path,
    summary: route.summary,
    description: route.description,
    tags: [route.module],
    security: route.isProtected
      ? [{ [SecurityBearerRef.name]: [] }]
      : undefined,
    request: schemaRef
      ? {
          body: {
            content: {
              "application/json": { schema: schemaRef },
            },
          },
        }
      : undefined,
    responses: {
      200: { description: "Operation executed successfully." },
      201: { description: "Resource materialized successfully." },
      400: { description: "Invalid constraints or bad client format mapping." },
      401: { description: "Missing or malformed authorization credentials." },
      500: { description: "Internal system fault boundary intercepted." },
    },
  });
});

/**
 * Compiles the programmatically evaluated registry matrix into an openAPI 3.0 specification object.
 */
export function generateOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "Vektora Marketplace Core API",
      version: "1.0.0",
      description:
        "High-performance modular engine for the AI media generation marketplace.",
    },
    servers: [{ url: "http://localhost:3000" }],
  });
}
