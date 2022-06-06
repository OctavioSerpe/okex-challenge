import { NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { query } from "../db/initialDb";
import { StatusError } from "../errors/StatusError";
import { checkResponse, executeRequest, getConfig } from "./okex";

// export type optimalSideData ={
//     price: number,
//     openOrders: number,
// };

// export type optimalSwap = {
//     buy: optimalSideData,
//     sell: optimalSideData,
//     spread: number,
// };

// export type sideResult = {
//     [key: string]: string
// };

// export const getOptimalSwap = (bestBids: sideResult[], bestAsks: sideResult[], orderBookDepth: number, spread: number): optimalSwap => {

//     let parsedBestAsk;
//     let parsedBestBid;
//     let index = 0;

//     while(index < orderBookDepth) {
//         parsedBestAsk = parseFloat(bestAsks[index][0]);
//         parsedBestBid = parseFloat(bestBids[index][0]);

//         const orderBookSpread = Math.abs((parsedBestAsk - parsedBestBid) / parsedBestAsk);

//         // if the requested spread is lower than the order book one, then we found the optimal spread
//         if(orderBookSpread >= spread) {
//             break;
//         }

//         index++;
//     }

//     // if the index is equal to the order book depth, then we did not find the optimal spread
//     if (index === orderBookDepth) {
//         index = orderBookDepth - 1;
//     }

//     const optimalSwap = {
//         buy: {
//             price: parsedBestBid,
//             openOrders: parseFloat(bestBids[index][3]),
//         },
//         sell: {
//             price: parsedBestAsk,
//             openOrders: parseFloat(bestAsks[index][3]),
//         },
//         spread
//     };

//     return optimalSwap;
// };

export type optimalSpotData = {
  lastTradedPrice: number;
  spreadBid: number;
  spreadAsk: number;
  spread: number;
};

export const getOptimalSwapForPair = async (
  pair: string,
  parametricSpread?: number,
  multiplier?: number,
  applyParametricSpreadToAsk?: boolean
): Promise<optimalSpotData> => {
  const response = await executeRequest(
    `/api/v5/market/tickers?instType=SPOT`,
    "GET"
  );

  if (parametricSpread === undefined) {
    const config = await getConfig();
    parametricSpread = config.spread;
  }

  const spotPairData = response.data.find(
    (spotInstrument) => spotInstrument.instId === pair
  );

  const lastTradedPrice = parseFloat(spotPairData.last) * (multiplier ?? 1);

  const optimalSpotPairData: optimalSpotData = {
    lastTradedPrice: lastTradedPrice,
    spreadBid: lastTradedPrice * (1 - parametricSpread),
    spreadAsk: applyParametricSpreadToAsk ? lastTradedPrice * (1 + parametricSpread) : lastTradedPrice,
    spread: parametricSpread,
  };

  return optimalSpotPairData;

  // return getOptimalSwap(response.data[0].bids, response.data[0].asks, ORDER_BOOK_DEPTH, spread);
};

export type swap = {
  pair: string;
  lastTradedPrice: number;
  spreadBid: number;
  totalSpreadBid: number;
  spreadAsk: number;
  tradeVolume: number;
  bidFeeVolume: number;
  volume: number;
  fee: number;
  spread: number;
  expireDate: string;
};

export const getSwapData = async (swapId: number): Promise<swap> => {
  const DBswapData = await query(
    `SELECT * FROM spot_instruments WHERE id = ${swapId}`
  );

  if (DBswapData.length === 0) {
    throw new Error("Swap not found");
  }

  const swapData = {
    pair: DBswapData[0].instrument_id,
    lastTradedPrice: parseFloat(DBswapData[0].last_traded_price),
    spreadBid: parseFloat(DBswapData[0].spread_bid),
    totalSpreadBid: parseFloat(DBswapData[0].total_spread_bid),
    spreadAsk: parseFloat(DBswapData[0].spread_ask),
    tradeVolume: parseFloat(DBswapData[0].trade_volume),
    bidFeeVolume: parseFloat(DBswapData[0].fee_volume),
    volume: parseFloat(DBswapData[0].volume),
    fee: parseFloat(DBswapData[0].fee),
    spread: parseFloat(DBswapData[0].spread),
    expireDate: new Date(DBswapData[0].expire_date).toISOString(),
  };

  return swapData;
};

export type order = {
  swapId: number;
  pair: string;
  side: string;
  orderId: string;
  orderPrice: number;
  filledPrice: number;
  volume: number;
  filledVolume: number;
  spread: number;
  fee: number;
  feeVolume: number;
  feePrice: number;
  status: string;
};

const parseOrderLog = (orderLog: any): order => {
  return {
    swapId: orderLog.swap_id,
    pair: orderLog.pair,
    side: orderLog.side,
    orderId: orderLog.order_id,
    orderPrice: parseFloat(orderLog.order_price),
    filledPrice: parseFloat(orderLog.filled_price),
    volume: parseFloat(orderLog.volume),
    filledVolume: parseFloat(orderLog.filled_volume),
    spread: parseFloat(orderLog.spread),
    fee: parseFloat(orderLog.fee),
    feeVolume: parseFloat(orderLog.fee_volume),
    feePrice: parseFloat(orderLog.fee_price),
    status: orderLog.order_status,
  };
};

const getOrderData = async (queryLog: string): Promise<order> => {
  const log = await query(queryLog);

  if (log.length === 0) {
    throw new Error("No order log found");
  }

  return parseOrderLog(log[0]);
};

export const getOrderDataBySwapId = async (swapId: number): Promise<order> => {
  return await getOrderData(`SELECT * FROM logs WHERE swap_id = ${swapId}`);
};

export const getOrderDataById = async (orderId: string): Promise<order> => {
  return await getOrderData(`SELECT * FROM logs WHERE order_id = '${orderId}'`);
};

export const getSwapByPair = async (pair: string): Promise<swap> => {
  const DBswapData = await query(
    `SELECT * FROM spot_instruments WHERE instrument_id = '${pair}'`
  );

  if (DBswapData.length === 0) {
    throw new Error("Swap not found");
  }

  const swapData = {
    pair: DBswapData[DBswapData.length - 1].instrument_id,
    lastTradedPrice: parseFloat(
      DBswapData[DBswapData.length - 1].last_traded_price
    ),
    spreadBid: parseFloat(DBswapData[DBswapData.length - 1].spread_bid),
    totalSpreadBid: parseFloat(
      DBswapData[DBswapData.length - 1].total_spread_bid
    ),
    spreadAsk: parseFloat(DBswapData[DBswapData.length - 1].spread_ask),
    tradeVolume: parseFloat(DBswapData[DBswapData.length - 1].trade_volume),
    bidFeeVolume: parseFloat(DBswapData[DBswapData.length - 1].fee_volume),
    volume: parseFloat(DBswapData[DBswapData.length - 1].volume),
    fee: parseFloat(DBswapData[DBswapData.length - 1].fee),
    spread: parseFloat(DBswapData[DBswapData.length - 1].spread),
    expireDate: DBswapData[DBswapData.length - 1].expire_date,
  };

  return swapData;
};

export const checkInstrumentVolume = async (
  instrument: string,
  volume: number
): Promise<boolean> => {
  const response = await executeRequest(
    `/api/v5/account/balance?ccy=${instrument}`,
    "GET"
  );

  try {
    checkResponse(response);
  } catch (error) {
    throw new Error(error.message);
  }

  const availableBalance = parseFloat(response.data[0].details[0].availBal as string);
  return availableBalance >= volume;
};

export type okexOrderDetails = {
  filledPrice: number;
  filledVolume: number;
  status: string;
  multiplier: number;
  avgPx: number;
  accumFillSz: number;
};

export const getOrderDetails = async (
  orderId: string,
  pair: string,
  next: NextFunction,
  fromPair: string
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

  let multiplier = 1;
  if (fromPair.length > 0) {
    const fromSwap = await query(
      `SELECT * FROM spot_instruments WHERE INSTRUMENT_ID = '${fromPair}'`
    );
    multiplier = 1 / parseFloat(fromSwap[0].last_traded_price as string);
  }

  const executedPrice =
    orderDetails.data[0].fillPx.length === 0
      ? 0
      : parseFloat(orderDetails.data[0].fillPx as string) * multiplier;
  const executedVolume = parseFloat(orderDetails.data[0].fillSz as string);
  const orderStatus = orderDetails.data[0].state;
  const avgPx =
    orderDetails.data[0].avgPx.length === 0
      ? 0
      : parseFloat(orderDetails.data[0].avgPx as string);
  const accumFillSz = parseFloat(orderDetails.data[0].accFillSz as string);

  return {
    filledPrice: executedPrice,
    filledVolume: executedVolume,
    status: orderStatus,
    multiplier,
    avgPx,
    accumFillSz,
  };
};
