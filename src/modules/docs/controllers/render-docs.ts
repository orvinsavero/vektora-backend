import { NextResponse } from "next/server";
import { generateOpenApiDocument } from "../utils/openapi.builder";

/**
 * Core Controller Handler for Serving the Interactive API Documentation.
 * Compiles the live Zod schema matrix and returns a secure, standalone Scalar UI page.
 */
export async function renderDocsController(): Promise<Response> {
  const specObject = generateOpenApiDocument();
  const specString = JSON.stringify(specObject);

  const htmlPayload = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <title>Vektora Core API Reference</title>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>body { margin: 0; padding: 0; background-color: #0f0a1c; }</style>
      </head>
      <body>
        <script id="api-reference" data-configuration='{"theme": "purple", "darkMode": true, "layout": "modern"}'></script>
        <script>
          document.getElementById('api-reference').dataset.spec = ${JSON.stringify(specString)};
        </script>
        <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
      </body>
    </html>
  `;

  const response = new NextResponse(htmlPayload, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });

  // Inject structural transport defense lines
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self' https://cdn.jsdelivr.net; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' http://localhost:3000;",
  );

  return response;
}
