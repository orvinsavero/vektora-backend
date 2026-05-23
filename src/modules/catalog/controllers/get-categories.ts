import { NextRequest } from "next/server";
import { CatalogService } from "../services/catalog.service";
import { ApiResponse } from "@/shared/http/response";

/**
 * Controller Handler for Serving Flat Marketplace Category Metadata.
 * Unprotected public discovery edge pathway optimized via cache parameters.
 *
 * @param {NextRequest} req - Ambient framework network request abstraction layer.
 * @returns {Promise<Response>} API success response enclosing the flat categories list dataset.
 */
export async function getCategoriesController(
  req: NextRequest,
): Promise<Response> {
  try {
    const categoriesData = await CatalogService.getAllCategories();

    // Pass the raw data array up directly. Let the FE construct hierarchical structures if needed.
    return ApiResponse.success(categoriesData, 200);
  } catch (error) {
    return ApiResponse.handle(error);
  }
}
