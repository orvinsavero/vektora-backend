import { renderDocsController } from "@/modules/docs/controllers/render-docs";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Entry Gate for Vektora Backend API Specifications.
 * Delegates the request immediately down to the consolidated docs feature module.
 */
export async function GET(): Promise<Response> {
  return renderDocsController();
}
