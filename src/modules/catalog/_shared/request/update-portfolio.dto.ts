// src/modules/catalog/request/update-portfolio.dto.ts
import { z } from "zod";
import { CATALOG_LIMITS } from "../../catalog.constants";
import { attachmentInputSchema } from "./portfolio-attachments.dto";

export const updatePortfolioSchema = z.object({
  title: z
    .string()
    .trim()
    .min(
      CATALOG_LIMITS.portfolio.title.min,
      `Title must be at least ${CATALOG_LIMITS.portfolio.title.min} characters long.`,
    )
    .max(
      CATALOG_LIMITS.portfolio.title.max,
      `Title cannot exceed ${CATALOG_LIMITS.portfolio.title.max} characters.`,
    )
    .optional(),
  description: z
    .string()
    .trim()
    .max(
      CATALOG_LIMITS.portfolio.description.max,
      "Description path is too long.",
    )
    .optional()
    .nullable(),
  externalLink: z
    .string()
    .trim()
    .url("External linkage must be a valid hyperlink.")
    .max(
      CATALOG_LIMITS.portfolio.externalLink.max,
      "External reference path is too long.",
    )
    .optional()
    .nullable(),
  attachments: z
    .array(attachmentInputSchema) // <-- Target shared schema directly
    .max(
      CATALOG_LIMITS.portfolio.attachments.max,
      `Maximum asset capacity capped at ${CATALOG_LIMITS.portfolio.attachments.max} media attachments per project.`,
    )
    .optional(),
});

export type UpdatePortfolioNetworkInput = z.infer<typeof updatePortfolioSchema>;

export interface UpdatePortfolioPayload extends UpdatePortfolioNetworkInput {
  portfolioId: string;
  talentId: string;
}
