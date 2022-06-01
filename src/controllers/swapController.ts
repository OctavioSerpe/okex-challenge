import { format, isAfter, isBefore, parseISO } from "date-fns";
import { zonedTimeToUtc } from "date-fns-tz";
import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { query } from "../db/initialDb";
import { StatusError } from "../errors/StatusError";
import { executeRequest } from "../services/okex";

import {
  getOptimalSwapForPair,
  getOrderDataById,
  getOrderDataBySwapId,
  getSwapData,
  order,
  swap,
} from "../services/swap";

export type sideResult = {
  price: number;
  openOrders: number;
};

export const getSwap = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const volume = parseFloat(req.query.volume as string);
  let pair = req.query.pair as string;
  const spread = parseFloat(req.query.spread as string);
  const fee = parseFloat(req.query.fee as string);

  // getOptimalSwapForPair(pair, spread)
  //   .then(response => res.json(response))
  // .then(async (optimalSwap) => {

  //   // to add more time because of the processing we add 100ms more
  //   const expireISODate = zonedTimeToUtc(
  //     new Date().getTime() + 60 * 1100,
  //     "America/Buenos_Aires"
  //   ).toISOString();

  //   await query(`UPDATE spot_instruments
  //     SET
  //       SPREAD = ${optimalSwap.spread},
  //       BID = ${optimalSwap.buy.price},
  //       OPEN_BID_ORDERS = ${optimalSwap.buy.openOrders},
  //       ASK = ${optimalSwap.sell.price},
  //       OPEN_ASK_ORDERS = ${optimalSwap.sell.openOrders},
  //       EXPIRE_DATE = '${expireISODate}'
  //     WHERE INSTRUMENT_ID = '${pair}'`);

  //   let jsonResponse: { [key: string]: any } = {
  //     expire_in_milliseconds: 60 * 1000,
  //     expire_utc_date: expireISODate,
  //   };

  //   let price;

  //   jsonResponse = {
  //     ...jsonResponse,
  //     price,
  //   };

  //   res.json(jsonResponse);
  // })
  let multiplier = 1;
  if (pair === "AAVE-USDC") {
    // set spread to 0 as we want the optimal & also we are talking about stable coins
    const optimalSpotPairData = await getOptimalSwapForPair(
      "USDC-USDT",
      0,
      multiplier
    );

    // log data into db, not really necessary
    await query(`UPDATE spot_instruments 
    SET 
      SPREAD = ${optimalSpotPairData.spread},
      LAST_TRADED_PRICE = ${optimalSpotPairData.lastTradedPrice},
      SPREAD_ASK = ${optimalSpotPairData.spreadAsk},
      TOTAL_SPREAD_ASK = ${optimalSpotPairData.spreadAsk},
      SPREAD_BID = ${optimalSpotPairData.spreadBid},
      TOTAL_SPREAD_BID = ${optimalSpotPairData.spreadBid},
      VOLUME = 1
    WHERE INSTRUMENT_ID = 'USDC-USDT'`);

    multiplier = 1 / optimalSpotPairData.lastTradedPrice;

    // set pair recognized by OKX API
    pair = "AAVE-USDT";
  }
  const optimalSpotPairData = await getOptimalSwapForPair(
    pair,
    spread,
    multiplier
  );
  // log data into db, not really necessary
  if (pair === "AAVE-USDT") {
    await query(`UPDATE spot_instruments 
        SET 
          SPREAD = ${optimalSpotPairData.spread},
          LAST_TRADED_PRICE = ${
            optimalSpotPairData.lastTradedPrice / multiplier
          },
          SPREAD_ASK = ${optimalSpotPairData.spreadAsk / multiplier},
          TOTAL_SPREAD_ASK = ${optimalSpotPairData.spreadAsk / multiplier},
          SPREAD_BID = ${optimalSpotPairData.spreadBid / multiplier},
          TOTAL_SPREAD_BID = ${optimalSpotPairData.spreadBid / multiplier},
          VOLUME = 1
        WHERE INSTRUMENT_ID = '${pair}'`);

    pair = "AAVE-USDC";
  }

  // to add more time because of the processing we add 100ms more
  const expireISODate = zonedTimeToUtc(
    new Date().getTime() + 60 * 1100,
    "America/Buenos_Aires"
  ).toISOString();

  const totalBid = optimalSpotPairData.spreadBid * volume;
  const totalAsk = optimalSpotPairData.spreadAsk * volume;

  let id =
    await query(`INSERT INTO spot_instruments(INSTRUMENT_ID, LAST_TRADED_PRICE, SPREAD, SPREAD_BID, TOTAL_SPREAD_BID, SPREAD_ASK, TOTAL_SPREAD_ASK, FEE, VOLUME, FEE_VOLUME, TRADE_VOLUME, EXPIRE_DATE)
         VALUES('${pair}', ${optimalSpotPairData.lastTradedPrice}, ${spread}, ${
      optimalSpotPairData.spreadBid
    }, ${totalBid}, ${
      optimalSpotPairData.spreadAsk
    }, ${totalAsk}, ${fee}, ${volume}, ${volume * fee}, ${
      volume * (1 - fee)
    }, '${expireISODate}')
  RETURNING ID`);

  id = id[0].id;

  const jsonResponse = {
    id,
    pair,
    lastTradedPrice: optimalSpotPairData.lastTradedPrice,
    fee,
    buy: {
      maxUnitPrice: optimalSpotPairData.spreadBid,
      maxTotalPrice: totalBid, // limit
      tradeVolume: volume * (1 - fee),
      feeVolume: volume * fee,
    },
    sell: {
      minUnitPrice: optimalSpotPairData.spreadAsk,
      minTotalPrice: totalAsk, // limit
      minFinalPrice: totalAsk * (1 - fee),
      minFeePrice: totalAsk * fee,
    },
    expireISODate,
  };

  res.json(jsonResponse);
};

type okexOrderDetails = {
  filledPrice: number;
  filledVolume: number;
  status: string;
};

const getOrderDetails = async (
  orderId: string,
  pair: string,
  next: NextFunction
): Promise<okexOrderDetails> => {
  const orderDetails = await executeRequest(
    `/api/v5/trade/order?ordId=${orderId}&instId=${pair}`,
    "GET"
  );

  if (orderDetails.code === "1") {
    next(
      new StatusError(
        `Retrieval of order details failed, please check your account portfolio & order status with ID ${orderId} on OKEX. OKEX message: ${orderDetails.msg}`,
        StatusCodes.INTERNAL_SERVER_ERROR
      )
    );
    return null;
  }

  if (orderDetails.code !== "0") {
    next(
      new StatusError(
        `Retrieval of order details failed, please check your account portfolio & order status with ID ${orderId} on OKEX. OKEX message: ${orderDetails.msg}`,
        StatusCodes.INTERNAL_SERVER_ERROR
      )
    );
    return null;
  }

  const executedPrice =
    orderDetails.data[0].fillPx.length === 0
      ? 0
      : parseFloat(orderDetails.data[0].fillPx[0] as string);
  const executedVolume = parseFloat(orderDetails.data[0].fillSz as string);
  const orderStatus = orderDetails.data[0].state;

  return {
    filledPrice: executedPrice,
    filledVolume: executedVolume,
    status: orderStatus,
  };
};

export const executeSwap = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const pair = req.body.pair as string;
  const side = req.body.side as string;
  const swapId = parseInt(req.params.id as string);

  let swapData = null;

  try {
    swapData = await getSwapData(swapId);
  } catch (err) {
    // handles every type of error in the same way
    next(
      new StatusError(
        "Swap id not found, please request a swap first at /swap endpoint or check the id",
        StatusCodes.NOT_FOUND
      )
    );
    return;
  }

  const currentISODate = zonedTimeToUtc(
    new Date().getTime(),
    "America/Buenos_Aires"
  ).toISOString();

  const expireISODate = swapData.expireDate;

  if (isAfter(new Date(currentISODate), new Date(expireISODate))) {
    next(
      new StatusError(
        "Swap expired, please request a new swap at /swap endpoint",
        StatusCodes.CONFLICT
      )
    );
    return;
  }

  const orderPrice = side === "BUY" ? swapData.spreadBid : swapData.spreadAsk;
  const orderVolume = side === "BUY" ? swapData.tradeVolume : swapData.volume;

  // TODO: execute swap on OKEX API & if succeeded truncate entry from DB
  const response = await executeRequest(`/api/v5/trade/order`, "POST", {
    instId: pair,
    tdMode: "cash",
    side: side.toLowerCase(),
    ordType: "limit",
    sz: orderVolume,
    px: orderPrice,
  });

  if (response.code === "1") {
    next(
      new StatusError(
        `Swap failed, please try again & check your account portfolio on OKEX. OKEX message: ${response.msg}`,
        StatusCodes.INTERNAL_SERVER_ERROR
      )
    );
    return;
  }

  if (response.code === "0") {
    const orderId = response.data[0].ordId;

    const orderDetails = await getOrderDetails(orderId, pair, next);

    if (orderDetails === null) {
      return;
    }

    // do something with the fee
    await query(`INSERT INTO logs 
  (swap_id, pair, side, order_id, order_price, filled_price, volume, filled_volume, spread, fee, fee_volume, fee_price, order_status) 
  VALUES(
    ${swapId},
    '${pair}', '${side}', '${orderId}', ${orderPrice}, ${
      orderDetails.filledPrice
    }, ${orderVolume}, ${orderDetails.filledVolume},${swapData.spread}, ${
      swapData.fee
    }, ${side === "BUY" ? swapData.bidFeeVolume : 0}, ${
      side === "BUY" ? 0 : orderDetails.filledPrice * swapData.fee
    }, '${orderDetails.status}'
  )`);

    res.json({ orderId: orderId });
    return;
  }
};

type swapDataJSON = {
  swap_id: number;
  pair: string;
  side: string;
  order_id: string;
  order_price: number;
  filled_price: number;
  volume: number;
  filled_volume: number;
  spread: number;
  fee: number;
  fee_volume: number;
  fee_price: number;
  order_status: string;
};

const parseSwapDataToJSON = (swapData: order): swapDataJSON => {
  return {
    swap_id: swapData.swapId,
    pair: swapData.pair,
    side: swapData.side,
    order_id: swapData.orderId,
    order_price: swapData.orderPrice,
    filled_price: swapData.filledPrice,
    volume: swapData.volume,
    filled_volume: swapData.filledVolume,
    spread: swapData.spread,
    fee: swapData.fee,
    fee_volume: swapData.feeVolume,
    fee_price: swapData.feePrice,
    order_status: swapData.status,
  };
};

const updateOrderData = async (orderDetails: okexOrderDetails, swapData: order) => {
  await query(`UPDATE logs SET
      filled_price = ${orderDetails.filledPrice},
      filled_volume = ${orderDetails.filledVolume},
      order_status = '${orderDetails.status}'
      WHERE swap_id = ${swapData.swapId}`);
}

export const getSwapDataById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const swapId = parseInt(req.params.id as string);
  let swapData = null;

  try {
    swapData = await getOrderDataBySwapId(swapId);
  } catch (err) {
    // handles every type of error in the same way
    next(
      new StatusError(
        "Order not found, please check the swap id",
        StatusCodes.NOT_FOUND
      )
    );
    return;
  }

  const swapDataResponse = parseSwapDataToJSON(swapData);

  if (swapData.status === "live") {
    // fetch & update data
    const orderDetails = await getOrderDetails(
      swapData.orderId,
      swapData.pair,
      next
    );

    if (orderDetails === null) {
      return;
    }

    await updateOrderData(orderDetails, swapData);

    swapDataResponse.filled_price = orderDetails.filledPrice;
    swapDataResponse.filled_volume = orderDetails.filledVolume;
    swapDataResponse.order_status = orderDetails.status;
  }

  res.json(swapDataResponse);
};

export const getSwapDataByOrderId = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const orderId = req.params.id;
  let swapData = null;

  try {
    swapData = await getOrderDataById(orderId);
  } catch (err) {
    // handles every type of error in the same way
    next(
      new StatusError(
        "Order not found, please check the swap id",
        StatusCodes.NOT_FOUND
      )
    );
    return;
  }

  const swapDataResponse = parseSwapDataToJSON(swapData);

  if (swapData.status === "live") {
    // fetch & update data
    const orderDetails = await getOrderDetails(
      swapData.orderId,
      swapData.pair,
      next
    );

    if (orderDetails === null) {
      return;
    }

    await updateOrderData(orderDetails, swapData);

    swapDataResponse.filled_price = orderDetails.filledPrice;
    swapDataResponse.filled_volume = orderDetails.filledVolume;
    swapDataResponse.order_status = orderDetails.status;
  }

  res.json(parseSwapDataToJSON(swapData));
};
