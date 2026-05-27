import { NextRequest } from "next/server";
import { CategoriesService } from "../categories.service"; // Fixed local path relative to controller directory
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
    // Pipe operation directly to specialized taxonomy data provider logic
    const categoriesData = await CategoriesService.getAllCategories();
    return ApiResponse.success(categoriesData, 200);
  } catch (error) {
    return ApiResponse.handle(error);
  }
}
