// src/modules/catalog/request/create-portfolio.dto.ts
import { z } from "zod";
import { CATALOG_LIMITS } from "../../catalog.constants";
import { attachmentInputSchema } from "./portfolio-attachments.dto"; // <-- Import shared schema

export const createPortfolioSchema = z.object({
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
    ),
  description: z
    .string()
    .trim()
    .max(
      CATALOG_LIMITS.portfolio.description.max,
      "Description path is too long.",
    )
    .optional()
    .transform((val) => val || null),
  externalLink: z
    .string()
    .trim()
    .url("External linkage must be a valid hyperlink.")
    .max(
      CATALOG_LIMITS.portfolio.externalLink.max,
      "External reference path is too long.",
    )
    .optional()
    .transform((val) => val || null),
  attachments: z
    .array(attachmentInputSchema) // <-- Use shared schema here
    .max(
      CATALOG_LIMITS.portfolio.attachments.max,
      `Maximum asset capacity capped at ${CATALOG_LIMITS.portfolio.attachments.max} media attachments per project.`,
    )
    .optional()
    .default([]),
});

export type CreatePortfolioNetworkInput = z.infer<typeof createPortfolioSchema>;

export interface CreatePortfolioPayload extends CreatePortfolioNetworkInput {
  talentId: string;
}
