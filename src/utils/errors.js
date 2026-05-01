class NotFoundError extends AppError {
    constructor(resource = 'Recurso', id = null) {
        const message = id 
            ? `${resource} con ID ${id} no encontrado`
            : `${resource} no encontrado`;
        super(message, 404, 'NOT_FOUND');
    }
}

class ValidationError extends AppError {
    constructor(message, detail = null) {
        super(message, 400, 'VALIDATION_ERROR', detail);
    }
}

class UnauthorizedError extends AppError {
    constructor(message = 'No autorizado') {
        super(message, 401, 'UNAUTHORIZED');
    }
}

class ForbiddenError extends AppError {
    constructor(message = 'Acceso denegado') {
        super(message, 403, 'FORBIDDEN');
    }
}

module.exports = {
    AppError,
    NotFoundError,
    ValidationError,
    UnauthorizedError,
    ForbiddenError
};