import { config } from '../config/config.js';

export const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    const response = {
        success: false,
        message,
        ...(config.nodeEnv === 'development' && { stack: err.stack }),
    };

    console.error(`[ERROR] ${statusCode} - ${message}`);

    res.status(statusCode).json(response);
};

export class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}
