import type { FieldError } from "@smarthub/shared";

export class HttpError extends Error {
  public readonly statusCode: number;
  public readonly errors: FieldError[];

  constructor(statusCode: number, message: string, errors: FieldError[] = []) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.errors = errors;
  }

  static badRequest(message: string, errors: FieldError[] = []): HttpError {
    return new HttpError(400, message, errors);
  }

  static unauthorized(message = "Autentikasi diperlukan"): HttpError {
    return new HttpError(401, message);
  }

  static forbidden(message = "Akses ditolak untuk role ini"): HttpError {
    return new HttpError(403, message);
  }

  static notFound(message = "Data tidak ditemukan"): HttpError {
    return new HttpError(404, message);
  }

  static conflict(message: string): HttpError {
    return new HttpError(409, message);
  }

  static tooManyRequests(message = "Terlalu banyak permintaan, coba lagi nanti"): HttpError {
    return new HttpError(429, message);
  }

  static unprocessable(message = "Validasi gagal", errors: FieldError[] = []): HttpError {
    return new HttpError(422, message, errors);
  }
}
