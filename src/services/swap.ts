import { query } from "../db/initialDb";
import { executeRequest, getConfig } from "./okex";

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
  multiplier?: number
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
    spreadAsk: lastTradedPrice * (1 + parametricSpread),
    spread: parametricSpread,
  };

  return optimalSpotPairData;

  // return getOptimalSwap(response.data[0].bids, response.data[0].asks, ORDER_BOOK_DEPTH, spread);
};

export type swap = {
  spreadBid: number;
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
    spreadBid: DBswapData[0].spread_bid,
    spreadAsk: DBswapData[0].spread_ask,
    tradeVolume: DBswapData[0].trade_volume,
    bidFeeVolume: DBswapData[0].fee_volume,
    volume: DBswapData[0].volume,
    fee: DBswapData[0].fee,
    spread: DBswapData[0].spread,
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
    orderPrice: orderLog.order_price,
    filledPrice: orderLog.filled_price,
    volume: orderLog.volume,
    filledVolume: orderLog.filled_volume,
    spread: orderLog.spread,
    fee: orderLog.fee,
    feeVolume: orderLog.fee_volume,
    feePrice: orderLog.fee_price,
    status: orderLog.order_status,
  };
};

const gerOrderData = async (queryLog: string): Promise<order> => {
  const log = await query(queryLog);

  if (log.length === 0) {
    throw new Error("No order log found");
  }

  return parseOrderLog(log[0]);
};

export const getOrderDataBySwapId = async (swapId: number): Promise<order> => {
  return await gerOrderData(`SELECT * FROM logs WHERE swap_id = ${swapId}`)
};

export const getOrderDataById = async (orderId: string): Promise<order> => {
  return await gerOrderData(`SELECT * FROM logs WHERE order_id = '${orderId}'`)
};
