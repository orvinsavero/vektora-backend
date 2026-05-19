import { AsyncLocalStorage } from "async_hooks";

export interface RequestStore {
  requestId: string;
  bearerToken: string | null;
}

/**
 * Ambient Storage Context for Inbound Request Metadata.
 * Preserves traceability metrics across asynchronous execution call chains.
 */
export const requestStorage = new AsyncLocalStorage<RequestStore>();

/**
 * Unified Accessor Helper for Tracing Parameters.
 */
export const getRequestContext = (): RequestStore => {
  return (
    requestStorage.getStore() ?? {
      requestId: "ambient-system-ctx",
      bearerToken: null,
    }
  );
};
