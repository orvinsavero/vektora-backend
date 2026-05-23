import { z } from "zod";
import { CATALOG_LIMITS } from "../catalog.constants";

/**
 * Single Media Attachment Inbound Validator Specification
 */
const portfolioAttachmentInputSchema = z.object({
  mediaUrl: z
    .string()
    .trim()
    .url("Media attachment must be a valid resource hyperlink.")
    .max(
      CATALOG_LIMITS.portfolio.mediaUrl.max,
      "Media asset path is too long.",
    ),
  mediaType: z.enum(["IMAGE", "VIDEO", "DOCUMENT"], {
    errorMap: () => ({
      message: "MediaType must be either IMAGE, VIDEO, or DOCUMENT.",
    }),
  }),
});

/**
 * Inbound Request Validation Contract for Creating Portfolio Showcases.
 */
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
    .array(portfolioAttachmentInputSchema)
    .max(
      CATALOG_LIMITS.portfolio.attachments.max,
      `Maximum asset capacity capped at ${CATALOG_LIMITS.portfolio.attachments.max} media attachments per project.`,
    )
    .optional()
    .default([]),
});

export type CreatePortfolioNetworkInput = z.infer<typeof createPortfolioSchema>;

/**
 * Expanded Internal Business Context Payload
 */
export interface CreatePortfolioPayload extends CreatePortfolioNetworkInput {
  talentId: string; // Attributed directly from the verified request auth session token context
}
