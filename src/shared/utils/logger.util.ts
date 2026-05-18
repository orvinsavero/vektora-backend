import pino from "pino";
import { CONFIG } from "@/config/env.config";

// Centralized structured logging instance driving standard output streams based on operational environments
export const logger = pino(
  {
    level: CONFIG.logger.level,
  },
  // Configure stream synchronization to manage event-loop performance boundaries vs process loss vectors
  pino.destination({
    sync: CONFIG.logger.sync,
  }),
);
