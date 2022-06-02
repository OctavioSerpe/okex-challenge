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
  if (!req.params.id) {
    next(
      new StatusError("Missing swap id path parameter", StatusCodes.BAD_REQUEST)
    );
    return;
  }

  if (!req.body.side) {
    next(new StatusError("Missing side parameter", StatusCodes.BAD_REQUEST));
    return;
  }
  req.body.side = (req.body.side as string).toUpperCase();

  const swapId = parseInt(req.params.id as string);
  if (isNaN(swapId)) {
    next(
      new StatusError(
        "Swap id path parameter must be a number",
        StatusCodes.BAD_REQUEST
      )
    );
    return;
  } else if (swapId < 1) {
    next(
      new StatusError(
        "Swap id path parameter must be greater than 0",
        StatusCodes.BAD_REQUEST
      )
    );
    return;
  }

  if (req.body.side !== "BUY" && req.body.side !== "SELL") {
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

export const getSwapByIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {


  if (!req.params.id) {
    next(
      new StatusError("Missing swap id path parameter", StatusCodes.BAD_REQUEST)
    );
    return;
  }

  const swapId = parseInt(req.params.id as string);
  if (isNaN(swapId)) {
    next(
      new StatusError(
        "Swap id path parameter must be a number",
        StatusCodes.BAD_REQUEST
      )
    );
    return;
  } else if (swapId < 1) {
    next(
      new StatusError(
        "Swap id path parameter must be greater than 0",
        StatusCodes.BAD_REQUEST
      )
    );
    return;
  }

  next();
};

export const getSwapByOrderIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.params.id || req.params.id.length === 0) {
    next(
      new StatusError(
        "Missing order id path parameter",
        StatusCodes.BAD_REQUEST
      )
    );
    return;
  }

  next();
};
