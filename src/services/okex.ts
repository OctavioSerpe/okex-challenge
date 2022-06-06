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

  const headers = {
    "OK-ACCESS-KEY": apiKey,
    "OK-ACCESS-PASSPHRASE": passphrase,
    "OK-ACCESS-TIMESTAMP": `${timestamp}`,
    "OK-ACCESS-SIGN": signature,
    accept: "application/json",
  };

  if (process.env.NODE_ENV === "development") {
    headers["x-simulated-trading"] = 1;
  }

  const axiosConfig: AxiosRequestConfig = {
    method,
    url: `${process.env.OKEX_BASE_URL}${endpoint}`,
    headers,
  };

  if (method !== "GET") {
    axiosConfig.data = body;
    headers["Content-Type"] = "application/json";
  }

  const response = await axios(axiosConfig);

  // TODO: add response codes check

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

export const checkResponse = (okexResponse: any): Promise<string> => {
  if (okexResponse.code !== "0") {
    return Promise.reject(`Message: ${okexResponse.msg}\nCode: ${okexResponse.code}\nSmessage: ${okexResponse.data[0].sMsg}`);
  }

  return Promise.resolve("OK");
};
