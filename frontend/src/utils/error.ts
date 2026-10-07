import { ApiError } from '../types'

export function getErrorMessage(e: unknown, fallback: string): string {
  return e instanceof ApiError ? e.message : fallback
}

/**
 * Backend error codes (the response's `error` field, `ApiError.code`) that have their own
 * localized message, instead of the backend's English one.
 */
export const API_ERROR_KEYS: Readonly<Record<string, string>> = {
  TEAM_NAME_TAKEN: 'teams.nameTaken',
}

/** The i18n key for an error the backend tagged with a known code, otherwise null. */
export function apiErrorKey(e: unknown): string | null {
  return e instanceof ApiError ? (API_ERROR_KEYS[e.code] ?? null) : null
}
