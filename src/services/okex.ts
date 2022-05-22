import crypto, { Hmac } from "crypto";

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

  console.log("message:", message);
  const secretKey = process.env.OKEX_SECRET_KEY || "";

  const tag: Hmac = crypto.createHmac("sha256", secretKey).update(message, "utf-8");
  return tag.digest("base64");
};
