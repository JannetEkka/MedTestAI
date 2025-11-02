// middleware/errorHandler.js
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const errorHandler = (err, req, res, next) => {
  console.error('\n' + '='.repeat(80));
  console.error(`❌ [ERROR] ${err.message}`);
  console.error(`📍 [PATH] ${req.method} ${req.path}`);
  console.error('='.repeat(80) + '\n');

  const statusCode = err.statusCode || 500;
  
  res.status(statusCode).json({
    success: false,
    error: err.message,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      path: req.path 
    })
  });
};