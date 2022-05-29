import { zonedTimeToUtc } from "date-fns-tz";
import { Request, Response, NextFunction } from "express";
import { query } from "../db/initialDb";

import { getOptimalSwapForPair } from "../services/swap";

export type sideResult = {
  price: number;
  openOrders: number;
};

export const swap = async (req: Request, res: Response, next: NextFunction) => {
  const volume = parseFloat(req.query.volume as string);
  let pair = req.query.pair as string;
  const spread = parseFloat(req.query.spread as string);

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
  getOptimalSwapForPair(pair, spread, multiplier)
    .then(async (optimalSpotPairData) => {
      // log data into db, not really necessary
      if (pair == "AAVE-USDT") {
        await query(`UPDATE spot_instruments 
        SET 
          SPREAD = ${optimalSpotPairData.spread},
          LAST_TRADED_PRICE = ${optimalSpotPairData.lastTradedPrice / multiplier},
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

      await query(`UPDATE spot_instruments 
        SET 
          SPREAD = ${optimalSpotPairData.spread},
          LAST_TRADED_PRICE = ${optimalSpotPairData.lastTradedPrice},
          SPREAD_ASK = ${optimalSpotPairData.spreadAsk},
          TOTAL_SPREAD_ASK = ${optimalSpotPairData.spreadAsk * volume},
          SPREAD_BID = ${optimalSpotPairData.spreadBid},
          TOTAL_SPREAD_BID = ${optimalSpotPairData.spreadBid * volume},
          VOLUME = ${volume},
          EXPIRE_DATE = '${expireISODate}'
        WHERE INSTRUMENT_ID = '${pair}'`);

      const jsonResponse = {
        pair,
        lastTradedPrice: optimalSpotPairData.lastTradedPrice,
        buy: {
          unitPrice: optimalSpotPairData.spreadBid,
          totalPrice: optimalSpotPairData.spreadBid * volume, // limit
        },
        sell: {
          unitPrice: optimalSpotPairData.spreadAsk,
          totalPrice: optimalSpotPairData.spreadAsk * volume, // limit
        },
        expireISODate,
      };

      res.json(jsonResponse);
    })
    .catch((error) => {
      res.json({
        // data: error.response.data,
        error: error,
      });
    });
};

export const executeSwap = async (req: Request, res: Response, next: NextFunction) => {
  const pair = req.query.pair as string;




};
