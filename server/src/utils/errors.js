class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error.isJoi) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Please check the submitted values.',
        details: error.details.map((item) => item.message),
      },
    });
  }
  if (error.code === 11000)
    return res
      .status(409)
      .json({ error: { code: 'DUPLICATE', message: 'A record with that value already exists.' } });
  const status = error.status || 500;
  if (status >= 500) console.error(error);
  return res.status(status).json({
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: status >= 500 ? 'Something went wrong.' : error.message,
      ...(error.details ? { details: error.details } : {}),
    },
  });
}

module.exports = { AppError, asyncHandler, errorHandler };
