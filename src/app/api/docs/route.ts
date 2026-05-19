import { ApiReference } from "@scalar/nextjs-api-reference";
import { generateOpenApiDocument } from "@/shared/utils/openapi.util";

const config = {
  spec: {
    content: generateOpenApiDocument(), // Pass the evaluated JSON spec directly
  },
  theme: "purple" as const, // Uses the dark modern purple theme
  isEditable: false,
};

// Next.js 15 handles the pipeline execution mapping natively through the wrapper
export const GET = ApiReference(config);
