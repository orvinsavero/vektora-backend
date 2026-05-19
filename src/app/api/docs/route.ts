import { NextResponse } from "next/server";
import { generateOpenApiDocument } from "@/modules/docs/utils/openapi.builder";

/**
 * Next.js 15 Segment Configuration Options.
 * Enforces dynamic runtime evaluation per request, ensuring schema updates
 * propagate instantly without getting trapped in stale compilation caches.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Centralized Entry Gate for Vektora Backend API Specifications.
 * Compiles the Zod OpenAPI matrix and delivers a sanitized, self-contained Scalar playground.
 */
export async function GET(): Promise<Response> {
  // 1. Compile the latest live state of our OpenAPI document
  const specObject = generateOpenApiDocument();
  const specString = JSON.stringify(specObject);

  // 2. Generate a clean, self-contained HTML payload using Scalar's standalone core
  const htmlPayload = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <title>Vektora Core API Reference</title>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body {
            margin: 0;
            padding: 0;
            background-color: #0f0a1c;
          }
        </style>
      </head>
      <body>
        <script 
          id="api-reference" 
          data-configuration='{"theme": "purple", "darkMode": true, "layout": "modern"}'
        ></script>
        
        <script>
          document.getElementById('api-reference').dataset.spec = ${JSON.stringify(specString)};
        </script>

        <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
      </body>
    </html>
  `;

  // 3. Emit the response explicitly declaring the content type
  const response = new NextResponse(htmlPayload, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });

  // 4. Inject structural security headers to secure our endpoint blueprints
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self' https://cdn.jsdelivr.net; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' http://localhost:3000;",
  );

  return response;
}
