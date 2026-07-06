"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const ApiError_1 = require("../utils/ApiError");
const appError_1 = require("../utils/appError");
const response_1 = require("../utils/response");
function errorHandler(err, req, res, next) {
    console.error("Error:", err);
    if (err instanceof ApiError_1.ApiError || err instanceof appError_1.AppError) {
        response_1.ApiResponseHelper.error(res, err.message, err.statusCode ?? 500, err.details);
        return;
    }
    if (err?.name === "PrismaClientKnownRequestError") {
        if (err.code === "P2002") {
            response_1.ApiResponseHelper.conflict(res, "Unique constraint violation");
            return;
        }
        const dbMessage = err.meta?.cause || err.meta?.message || err.message.split("\n").pop() || "Database error";
        response_1.ApiResponseHelper.badRequest(res, `Database error: ${dbMessage}`);
        return;
    }
    if (Array.isArray(err?.errors)) {
        response_1.ApiResponseHelper.error(res, "Validation failed", 400, err.errors);
        return;
    }
    response_1.ApiResponseHelper.error(res, "Internal server error");
}
