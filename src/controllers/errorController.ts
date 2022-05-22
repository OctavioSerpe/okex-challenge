import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { StatusError } from "../errors/StatusError";

export const notFound = (req: Request, res: Response, next: NextFunction) => {
  const error = new StatusError(
    "Endpoint does not exist",
    StatusCodes.NOT_FOUND
  );
  next(error);
};

export const handler = (
  error: StatusError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.status(error.statusCode).json({
    message: error.message,
    error_code: error.statusCode,
    error_stack: error.stack,
  });
};