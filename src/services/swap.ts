import { query } from "../db/initialDb";
import { executeRequest, getConfig, config } from "./okex";

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
    const config: config = await getConfig();
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
  totalSpreadBid: number;
  totalSpreadAsk: number;
  expireDate: string;
};

export const getSwapData = async (pair: string): Promise<swap> => {
  const DBswapData = await query(`SELECT * FROM spot_instruments WHERE instrument_id = '${pair}'`);

  const swapData = {
    totalSpreadBid: DBswapData[0].total_spread_bid,
    totalSpreadAsk: DBswapData[0].total_spread_ask,
    expireDate: new Date(DBswapData[0].expire_date).toISOString(),
  };

  return swapData;
};
