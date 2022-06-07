import { format, isAfter, isBefore, parseISO } from "date-fns";
import { zonedTimeToUtc } from "date-fns-tz";
import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { query } from "../db/initialDb";
import { StatusError } from "../errors/StatusError";
import { executeRequest } from "../services/okex";

import {
  checkInstrumentVolume,
  getOptimalSwapForPair,
  getOrderDataById,
  getOrderDataBySwapId,
  getOrderDetails,
  getSwapByPair,
  getSwapData,
  okexOrderDetails,
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

  let multiplier = 1;
  let applySpreadToAsk = true;
  if (pair === "AAVE-USDC" || pair === "BTC-USDC") {
    let optimalSpotPairData;
    try {
      // set spread to 0 as we want the optimal & also we are talking about stable coins
      optimalSpotPairData = await getOptimalSwapForPair(
        "USDC-USDT",
        0,
        multiplier,
        applySpreadToAsk
      );
    } catch (err) {
      next(
        new StatusError(
          `Error getting optimal swap for pair ${pair}. ${err}`,
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
      return;
    }

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
    pair = pair === "AAVE-USDC" ? "AAVE-USDT" : "BTC-USDT";
    applySpreadToAsk = false;
  }

  let optimalSpotPairData;
  try {
    optimalSpotPairData = await getOptimalSwapForPair(
      pair,
      spread,
      multiplier,
      applySpreadToAsk
    );
  } catch (err) {
    next(
      new StatusError(
        `Error getting optimal swap for pair ${pair}. ${err}`,
        StatusCodes.INTERNAL_SERVER_ERROR
      )
    );
    return;
  }

  // log data into db, not really necessary
  const originalPair = req.query.pair as string;
  if (originalPair === "AAVE-USDC" || originalPair === "BTC-USDC") {
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

    pair = pair === "AAVE-USDT" ? "AAVE-USDC" : "BTC-USDC";
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
         VALUES('${req.query.pair as string}', ${
      optimalSpotPairData.lastTradedPrice
    }, ${spread}, ${optimalSpotPairData.spreadBid}, ${totalBid}, ${
      optimalSpotPairData.spreadAsk
    }, ${totalAsk}, ${fee}, ${volume}, ${volume * fee}, ${
      volume * (1 - fee)
    }, '${expireISODate}')
  RETURNING ID`);

  id = id[0].id;

  const jsonResponse = {
    id,
    pair,
    last_traded_price: optimalSpotPairData.lastTradedPrice,
    spread,
    fee,
    buy: {
      max_unit_price: optimalSpotPairData.spreadBid,
      max_total_price: totalBid, // limit
      fee_volume: volume * fee,
      trade_volume: volume * (1 - fee),
    },
    sell: {
      min_unit_price: optimalSpotPairData.spreadAsk,
      min_total_price: totalAsk, // limit
      min_fee_price: totalAsk * fee,
      min_final_price: totalAsk * (1 - fee),
    },
    expire_ISO_date: expireISODate,
  };

  res.json(jsonResponse);
};

export const executeSwap = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let side = req.body.side as string;
  const swapId = parseInt(req.params.id as string);

  let swapData: swap = null;

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

  let pair = swapData.pair;
  const orderPrice = side === "BUY" ? swapData.spreadBid : swapData.spreadAsk;
  const orderVolume = side === "BUY" ? swapData.tradeVolume : swapData.volume;
  let auxOrderPrice = orderPrice;
  let auxOrderVolume = orderVolume;

  const hyphenPosition = pair.indexOf("-");
  const fromInstrument = swapData.pair.slice(0, hyphenPosition);
  // side === "BUY"
  //   ? swapData.pair.slice(hyphenPosition + 1)
  //   : swapData.pair.slice(0, hyphenPosition);

  let hasVolumeToPerformOperation = false;
  try {
    hasVolumeToPerformOperation = await checkInstrumentVolume(
      fromInstrument,
      swapData.volume
    );
  } catch (err) {
    next(
      new StatusError(
        "Error checking instrument volume, please check your account portfolio. " +
          err,
        StatusCodes.INTERNAL_SERVER_ERROR
      )
    );
    return;
  }

  if (!hasVolumeToPerformOperation) {
    next(
      new StatusError(
        "Not enough volume to perform operation, please check your account portfolio",
        StatusCodes.INTERNAL_SERVER_ERROR
      )
    );
    return;
  }

  let fromPair = "";
  let orderType = "limit";
  let switchSide = false;
  let auxFilledVolume, auxFilledPrice;
  let unregisteredPair = false;
  if (pair === "AAVE-USDC" || pair === "BTC-USDC") {
    unregisteredPair = true;
    const intermediateInstId =
      side === "BUY" ? "USDC-USDT" : `${fromInstrument}-USDT`;
    const intermediateSz =
      side === "BUY" ? swapData.totalSpreadBid : swapData.volume;
    // execute market order to sell USDC
    let intermediateOrder;
    try {
      intermediateOrder = await executeRequest(`/api/v5/trade/order`, "POST", {
        instId: intermediateInstId,
        tdMode: "cash",
        side: "sell",
        ordType: "market",
        sz: intermediateSz,
      });
    } catch (err) {
      next(
        new StatusError(
          "Error executing order, please check your account portfolio. " + err,
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
      return;
    }

    let intermediateOrderDetails;
    try {
      // prepare the order price for the next order (assuming the order status is filled)
      intermediateOrderDetails = await getOrderDetails(
        intermediateOrder.data[0].ordId,
        intermediateInstId,
        ""
      );
    } catch (err) {
      next(
        new StatusError(
          "Retrieval of order details failed, please check your account portfolio. " +
            err,
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
      return;
    }

    if (side === "BUY") {
      try {
        const fromUSDT = await getSwapByPair("USDC-USDT");
        auxOrderPrice *= fromUSDT.lastTradedPrice;
      } catch (err) {
        next(
          new StatusError(
            "Error getting USDC-USDT swap, please check your account portfolio. " +
              err,
            StatusCodes.INTERNAL_SERVER_ERROR
          )
        );
        return;
      }
      pair = `${fromInstrument}-USDT`;
    } else {
      auxFilledPrice = intermediateOrderDetails.filledPrice;
      auxFilledVolume = intermediateOrderDetails.filledVolume;
      auxOrderPrice = intermediateOrderDetails.avgPx;
      auxOrderVolume =
        intermediateOrderDetails.accumFillSz * intermediateOrderDetails.avgPx;
      orderType = "market";
      pair = "USDC-USDT";
      side = "BUY";
      switchSide = true;
    }

    fromPair = "USDC-USDT";
  }

  const body = {
    instId: pair,
    tdMode: "cash",
    side: side.toLowerCase(),
    ordType: orderType,
    sz: auxOrderVolume,
  };

  if (orderType === "limit") {
    body["px"] = auxOrderPrice;
  }

  let response;
  try {
    response = await executeRequest(`/api/v5/trade/order`, "POST", body);
  } catch (err) {
    next(
      new StatusError(
        "Swap failed, please check your account portfolio & try again. " + err,
        StatusCodes.INTERNAL_SERVER_ERROR
      )
    );
    return;
  }

  const orderId = response.data[0].ordId;

  let orderDetails;
  try {
    orderDetails = await getOrderDetails(orderId, pair, fromPair);
  } catch (err) {
    next(
      new StatusError(
        "Getting swap order details failed, please check your account portfolio & order history. " +
          err,
        StatusCodes.INTERNAL_SERVER_ERROR
      )
    );
    return;
  }

  if (switchSide) {
    side = side === "BUY" ? "SELL" : "BUY";
  }

  if (!unregisteredPair) {
    auxFilledPrice = orderDetails.filledPrice;
    auxFilledVolume = orderDetails.filledVolume;
  }

  // do something with the fee
  await query(`INSERT INTO logs 
  (swap_id, pair, side, order_id, order_price, filled_price, volume, filled_volume, spread, fee, fee_volume, fee_price, order_status) 
  VALUES(
    ${swapId},
    '${swapData.pair}', '${side}', '${orderId}', ${
    auxOrderPrice * orderDetails.multiplier
  }, ${
    side === "BUY"
      ? orderDetails.filledPrice
      : auxFilledPrice * orderDetails.multiplier
  }, ${orderVolume}, ${
    side === "BUY" ? orderDetails.filledVolume : auxFilledVolume
  },${swapData.spread}, ${swapData.fee}, ${
    side === "BUY" ? swapData.bidFeeVolume : 0
  }, ${
    side === "BUY" ? 0 : auxFilledPrice * orderDetails.multiplier * swapData.fee
  }, '${orderDetails.status}'
  )`);

  res.status(StatusCodes.CREATED).json({ order_id: orderId });
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

const updateOrderData = async (
  orderDetails: okexOrderDetails,
  swapData: order
) => {
  let fee = "";

  // do something with the fee
  if (swapData.side === "SELL") {
    fee = `, fee_price = ${orderDetails.filledPrice * swapData.fee}`;
  }

  await query(`UPDATE logs SET
      filled_price = ${orderDetails.filledPrice},
      filled_volume = ${orderDetails.filledVolume},
      order_status = '${orderDetails.status}' ${fee}
      WHERE swap_id = ${swapData.swapId}`);
};

export const getSwapDataById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const swapId = parseInt(req.params.id as string);
  let swapData: order[] = null;

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

  const swapDataResponse = swapData.map(parseSwapDataToJSON);

  let fromPair = "";
  let registeredPair = swapData[0].pair;
  if (swapData[0].pair === "AAVE-USDC" || swapData[0].pair === "BTC-USDC") {
    const hyphenPos = swapData[0].pair.indexOf("-");
    registeredPair = `${swapData[0].pair.slice(0, hyphenPos)}-USDT`;
    fromPair = "USDC-USDT";
  }

  // FIXME: has to be a for to update every order
  let index = 0;
  for(const swapLogData of swapData) {
    if (swapLogData.status === "live") {
      try {
        // fetch & update data
        const orderDetails = await getOrderDetails(
          swapLogData.orderId,
          registeredPair,
          fromPair
        );
  
        await updateOrderData(orderDetails, swapLogData);
  
        swapDataResponse[index].filled_price = orderDetails.filledPrice;
        swapDataResponse[index].filled_volume = orderDetails.filledVolume;
        swapDataResponse[index].order_status = orderDetails.status;

        index++;
      } catch (err) {
        next(
          new StatusError(
            "Getting swap order details failed, please check your order history. " +
              err,
            StatusCodes.INTERNAL_SERVER_ERROR
          )
        );
        return;
      }
    }
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
        "Order not found, please check the order id",
        StatusCodes.NOT_FOUND
      )
    );
    return;
  }

  const swapDataResponse = parseSwapDataToJSON(swapData);

  let fromPair = "";
  let registeredPair = swapData.pair;
  if (swapData.pair === "AAVE-USDC" || swapData.pair === "BTC-USDC") {
    const hyphenPos = swapData.pair.indexOf("-");
    registeredPair = `${swapData.pair.slice(0, hyphenPos)}-USDT`;
    fromPair = "USDC-USDT";
  }

  if (swapData.status === "live") {
    try {
      // fetch & update data
      const orderDetails = await getOrderDetails(
        swapData.orderId,
        registeredPair,
        fromPair
      );

      await updateOrderData(orderDetails, swapData);

      swapDataResponse.filled_price = orderDetails.filledPrice;
      swapDataResponse.filled_volume = orderDetails.filledVolume;
      swapDataResponse.order_status = orderDetails.status;
    } catch (err) {
      next(
        new StatusError(
          "Getting swap order details failed, please check your order history. " +
            err,
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
      return;
    }
  }

  res.json(swapDataResponse);
};
