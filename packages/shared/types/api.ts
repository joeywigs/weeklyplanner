export interface ApiResponse<T = unknown> {
  data: T | null;
  error: string | null;
  meta?: Record<string, unknown>;
}
