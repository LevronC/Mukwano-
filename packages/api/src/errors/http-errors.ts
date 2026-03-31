export class HttpError extends Error {
  statusCode: number
  code: string
  field: string | null

  constructor(statusCode: number, code: string, message: string, field: string | null = null) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.field = field
  }
}

export class UnauthorizedError extends HttpError {
  constructor(code: string = 'UNAUTHORIZED', message: string = 'Authentication required') {
    super(401, code, message)
  }
}

export class ForbiddenError extends HttpError {
  constructor(code: string = 'FORBIDDEN', message: string = 'Insufficient permissions') {
    super(403, code, message)
  }
}

export class NotFoundError extends HttpError {
  constructor(message: string = 'Resource not found') {
    super(404, 'NOT_FOUND', message)
  }
}

export class ConflictError extends HttpError {
  constructor(code: string, message: string) {
    super(409, code, message)
  }
}

export class ValidationError extends HttpError {
  constructor(message: string, field: string | null = null) {
    super(422, 'VALIDATION_ERROR', message, field)
  }
}

export class InternalError extends HttpError {
  constructor(message: string = 'An unexpected error occurred') {
    super(500, 'INTERNAL_SERVER_ERROR', message)
  }
}
