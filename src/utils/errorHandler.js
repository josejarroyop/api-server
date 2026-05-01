const AppError = require('./AppError');
const errorHandler = (err, req, res, next) => {
    if (err instanceof AppError) {
        console.error(`[AppError] ${err.statusCode} - ${err.message}`);
        return res.status(err.statusCode).json({
            error: err.name,
            message: err.message,
            detail: err.detail,
        });
    }

    // Error inesperado
    console.error('[UnhandledError]', err);
    return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Ha ocurrido un error inesperado.',
        detail: err.message,
    });
};

const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

const notFoundHandler = (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Ruta ${req.method} ${req.originalUrl} no existe`,
    });
};

module.exports = { errorHandler, asyncHandler, notFoundHandler };
