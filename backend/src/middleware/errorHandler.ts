import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";
import { AppError } from "../utils/appError";
import { ApiResponseHelper } from "../utils/response";

export function errorHandler(
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
): void {
    console.error("Error:", err);

    if (err instanceof ApiError || err instanceof AppError) {
        ApiResponseHelper.error(res, err.message, (err as ApiError).statusCode ?? 500, err.details);
        return;
    }

    if (err?.name === "PrismaClientKnownRequestError") {
        if (err.code === "P2002") {
            ApiResponseHelper.conflict(res, "Unique constraint violation");
            return;
        }
        const dbMessage = err.meta?.cause || err.meta?.message || err.message.split("\n").pop() || "Database error";
        ApiResponseHelper.badRequest(res, `Database error: ${dbMessage}`);
        return;
    }

    if (Array.isArray(err?.errors)) {
        ApiResponseHelper.error(res, "Validation failed", 400, err.errors);
        return;
    }

    ApiResponseHelper.error(res, "Internal server error");
}
