import { z } from "zod";
import { CATALOG_LIMITS, ALLOWED_MEDIA_TYPES } from "../../catalog.constants";

/**
 * Reusable Multi-Media Attachment Inbound Validator Specification.
 * Shared across Portfolio project cards and Gig catalog listings.
 */
export const attachmentInputSchema = z.object({
  id: z.string().uuid("Invalid attachment ID format.").optional(),
  mediaUrl: z
    .string()
    .trim()
    .url("Media attachment must be a valid resource hyperlink.")
    .max(
      CATALOG_LIMITS.portfolio.mediaUrl.max,
      "Media asset path is too long.",
    ),
  mediaType: z.enum(ALLOWED_MEDIA_TYPES, {
    errorMap: () => ({
      message: `MediaType must be either ${ALLOWED_MEDIA_TYPES.join(", or ")}.`,
    }),
  }),
});
