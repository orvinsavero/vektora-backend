import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { API_ROUTES } from "../config/routes.config";

extendZodWithOpenApi(z);
const registry = new OpenAPIRegistry();

// Loop through and auto-register all routes declared in the system manifest
API_ROUTES.forEach((route) => {
  const componentName =
    route.requestBody?.constructor.name ||
    `${route.path.replace(/[^a-zA-Z0-9]/g, "")}Payload`;
  const schemaRef = route.requestBody
    ? registry.register(componentName, route.requestBody)
    : undefined;

  registry.registerPath({
    method: route.method,
    path: route.path,
    summary: route.summary,
    description: route.description,
    tags: [route.module], // Groups your routes by folder/module automatically in Scalar
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
      500: { description: "Internal system fault boundary intercepted." },
    },
  });
});

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
