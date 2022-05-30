import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { listingPairs } from "../db/initialDb";
import { StatusError } from "../errors/StatusError";
import { getConfig } from "../services/okex";

export const getSwapMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.query.volume === undefined) {
    next(new StatusError("Missing volume parameter", StatusCodes.BAD_REQUEST));
    return;
  }

  if (!req.query.pair) {
    next(new StatusError("Missing pair parameter", StatusCodes.BAD_REQUEST));
    return;
  }
  req.query.pair = (req.query.pair as string).toUpperCase();

  if (req.query.spread === undefined) {
    next(new StatusError("Missing spread parameter", StatusCodes.BAD_REQUEST));
    return;
  }

  if (isNaN(parseFloat(req.query.volume as string))) {
    next(
      new StatusError(
        "Volume parameter must be a number",
        StatusCodes.BAD_REQUEST
      )
    );
    return;
  }

  if (isNaN(parseFloat(req.query.spread as string))) {
    next(
      new StatusError(
        "Spread parameter must be a number",
        StatusCodes.BAD_REQUEST
      )
    );
    return;
  }

  if (
    req.query.fee !== undefined &&
    isNaN(parseFloat(req.query.fee as string))
  ) {
    next(
      new StatusError("Fee parameter must be a number", StatusCodes.BAD_REQUEST)
    );
    return;
  } else if (req.query.fee == undefined) {
    const config = await getConfig();
    req.query.fee = `${config.fee}`;
  }

  if (!listingPairs.some((pair) => pair === (req.query.pair as string))) {
    next(
      new StatusError(
        "Pair parameter must be one of the following: " +
          listingPairs.join(", "),
        StatusCodes.BAD_REQUEST
      )
    );
    return;
  }

  next();
};

const validSwaps = ["BTC-USDT", "ETH-USDT", "AAVE-USDC"];

export const executeSwapMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.query.pair) {
    next(new StatusError("Missing pair parameter", StatusCodes.BAD_REQUEST));
    return;
  }
  req.query.pair = (req.query.pair as string).toUpperCase();

  if(!req.query.side) {
    next(new StatusError("Missing side parameter", StatusCodes.BAD_REQUEST));
    return;
  }
  req.query.side = (req.query.side as string).toUpperCase();

  if (!validSwaps.some((pair) => pair === (req.query.pair as string))) {
    next(
      new StatusError(
        "Pair parameter must be one of the following: " + validSwaps.join(", "),
        StatusCodes.BAD_REQUEST
      )
    );
    return;
  }

  if(req.query.side !== "BUY" && req.query.side !== "SELL") {
    next(
      new StatusError(
        "Side parameter must be one of the following: BUY, SELL",
        StatusCodes.BAD_REQUEST
      )
    );
    return;
  }

  next();
};
