export class OkexError extends Error {
  code: string;
  msg: string;
  sMsg: string;
  sCode: string;
  orderId: string;

  constructor(code: string, msg: string, sMsg: string, sCode: string, orderId: string) {
    super();
    this.code = code;
    this.msg = msg;
    this.sMsg = sMsg ?? "";
    this.sCode = sCode ?? "";
    this.orderId = orderId ?? "";
  }

  toString() {
    return `Code: ${this.code} <> Msg: ${this.msg} <> sMsg: ${this.sMsg} <> sCode: ${this.sCode} <> orderId: ${this.orderId}`;
  }
}
