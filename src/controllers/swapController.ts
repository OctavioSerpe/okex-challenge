import { Request, Response, NextFunction } from "express";
import axios from "axios";
import { format, Locale } from "date-fns";
import { zonedTimeToUtc } from "date-fns-tz";

import { getSignature } from "../services/okex";

export const swap = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = process.env.OKEX_API_KEY || "";
  const passphrase = process.env.OKEX_PASSPHRASE || "";

  // ISO UTC date with milliseconds
  const timestamp = zonedTimeToUtc(
    new Date().getTime(),
    "America/Buenos_Aires"
  ).toISOString();
	console.log("timestamp:", timestamp);
  const endpoint =
    "https://www.okx.com/api/v5/public/instruments?instType=SPOT";

  const signature = getSignature(
    timestamp,
    "GET",
    "/api/v5/public/instruments?instType=SPOT",
    {}
  );

  axios
    .get(endpoint, {
      headers: {
        "OK-ACCESS-KEY": apiKey,
        "OK-ACCESS-PASSPHRASE": passphrase,
        "OK-ACCESS-TIMESTAMP": `${timestamp}`,
        "OK-ACCESS-SIGN": signature,
      },
    })
    .then((response) => {
      console.log(response);
      res.send(response.data);
    })
    .catch((error) => {
      res.json({
		data: error.response.data,
        error: error,
      });
    });
};
