import { ApiError } from '../types'

export function getErrorMessage(e: unknown, fallback: string): string {
  return e instanceof ApiError ? e.message : fallback
}
