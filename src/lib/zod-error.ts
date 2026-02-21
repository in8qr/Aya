import { ZodError } from "zod";

/**
 * Returns a single string suitable for API error responses from a Zod validation error.
 * Use this instead of parsed.error.flatten().message (flatten() returns
 * { formErrors, fieldErrors } and has no .message property).
 */
export function zodErrorToMessage(error: ZodError): string {
  return error.message;
}
