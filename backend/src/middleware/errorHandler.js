/**
 * Global error handler middleware.
 */
export function errorHandler(err, req, res, _next) {
  console.error('[ERROR]', err.stack || err.message || err);

  // Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  // Prisma known request errors
  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: 'Record not found',
    });
  }

  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      error: 'Duplicate record',
    });
  }

  // Custom errors with status
  const status = err.status || err.statusCode || 500;
  const message = status < 500 ? err.message : 'Internal server error';

  return res.status(status).json({
    success: false,
    error: message,
  });
}

