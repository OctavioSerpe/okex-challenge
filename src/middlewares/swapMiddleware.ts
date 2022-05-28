import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { listingPairs } from "../db/initialDb";
import { StatusError } from "../errors/StatusError";

export const getSwapMiddleware = (req: Request, res: Response, next: NextFunction) => {

    if(!req.query.volume) {
        next(new StatusError("Missing volume parameter", StatusCodes.BAD_REQUEST));
    }

    if(!req.query.pair) {
        next(new StatusError("Missing pair parameter", StatusCodes.BAD_REQUEST));
    }
    req.query.pair = (req.query.pair as string).toUpperCase();

    if(!req.query.spread) {
        next(new StatusError("Missing spread parameter", StatusCodes.BAD_REQUEST));
    }

    if(isNaN(parseFloat(req.query.volume as string))) {
        next(new StatusError("Volume parameter must be a number", StatusCodes.BAD_REQUEST));
    }

    if(isNaN(parseFloat(req.query.spread as string))) {
        next(new StatusError("Spread parameter must be a number", StatusCodes.BAD_REQUEST));
    }

    if(!listingPairs.some(pair => pair === req.query.pair as string)) {
        next(new StatusError("Pair parameter must be one of the following: " + listingPairs.join(", "), StatusCodes.BAD_REQUEST));
    }

    next();
};
