/**
 * API Layer Types
 * Base types for API requests and responses
 */

/** Custom API error with status code and error code */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Check if error is an authentication error */
  isAuthError(): boolean {
    return this.status === 401;
  }

  /** Check if error is a validation error */
  isValidationError(): boolean {
    return this.status === 400;
  }

  /** Check if error is a not found error */
  isNotFoundError(): boolean {
    return this.status === 404;
  }
}

/** Options for API requests */
export interface RequestOptions extends Omit<RequestInit, 'body'> {
  /** Whether to include auth token (default: true) */
  auth?: boolean;
  /** Request body (will be JSON stringified) */
  body?: unknown;
}

/** Standard API error response from backend */
export interface ApiErrorResponse {
  statusCode: number;
  message: string;
  error?: string;
}

/** Pagination parameters */
export interface PaginationParams {
  limit?: number;
  offset?: number;
}

/** Generic paginated response */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}
