export interface FieldError {
  field: string;
  message: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}

export interface CursorMeta {
  limit: number;
  total: number;
  next_cursor: number | null;
  has_more: boolean;
}

export type ResponseMeta = PaginationMeta | CursorMeta;

export interface ApiSuccess<T> {
  status: "success";
  message: string;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorBody {
  status: "error";
  message: string;
  errors: FieldError[];
}

export type ApiResponse<T> = ApiSuccess<T> | ApiErrorBody;

export const isApiSuccess = <T>(payload: ApiResponse<T>): payload is ApiSuccess<T> =>
  payload.status === "success";

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
}

export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };
