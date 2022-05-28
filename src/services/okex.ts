import axios, { AxiosRequestConfig } from "axios";
import crypto, { Hmac } from "crypto";
import { zonedTimeToUtc } from "date-fns-tz";
import { query } from "../db/initialDb";

export const getSignature = (
  timestamp: string,
  method: string,
  requestPath: string,
  body: object
): string => {
  let message = `${timestamp}${method}${requestPath}`;
  if (method.toUpperCase() !== "GET") {
    message += JSON.stringify(body);
  }

  const secretKey = process.env.OKEX_SECRET_KEY;

  const tag: Hmac = crypto
    .createHmac("sha256", secretKey)
    .update(message, "utf-8");
  return tag.digest("base64");
};

export const executeRequest = async (
  endpoint: string,
  method: string,
  body?: object
) => {
  const apiKey = process.env.OKEX_API_KEY;
  const passphrase = process.env.OKEX_PASSPHRASE;

  // ISO UTC date with milliseconds
  const timestamp = zonedTimeToUtc(
    new Date().getTime(),
    "America/Buenos_Aires"
  ).toISOString();

  const signature = getSignature(timestamp, method, endpoint, body ?? {});

  const axiosConfig: AxiosRequestConfig = {
    method,
    url: `${process.env.OKEX_BASE_URL}${endpoint}`,
    headers: {
      "OK-ACCESS-KEY": apiKey,
      "OK-ACCESS-PASSPHRASE": passphrase,
      "OK-ACCESS-TIMESTAMP": `${timestamp}`,
      "OK-ACCESS-SIGN": signature,
    },
  };

  if (method !== "GET") {
    axiosConfig.data = body;
  }

  const response = await axios(axiosConfig);

  return response.data;
};

export type config = {
  fee: number;
  spread: number;
  id: number;
};

export const getConfig = async (): Promise<config> => {
  // read config from database
  const config = await query(`SELECT * FROM config WHERE ID = 1`);

  return config[0] as config;
};
