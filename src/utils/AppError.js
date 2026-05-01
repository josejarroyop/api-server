class AppError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', detail = null) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.code = code; 
        this.detail = detail;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = AppError;