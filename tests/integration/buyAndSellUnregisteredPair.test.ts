import { initDb, request, teardownDb, shutdownServer } from "../helpers";

describe("Buy an unregistered pair on Okex with default fee & without spread", () => {
  beforeAll(async () => {
    await initDb();
  }, 7 * 1000);

  afterAll(async () => {
    await teardownDb();
  }, 7 * 1000);

  test("pair=btc-usdc, volume=0.0001, spread=0 & default fee", async () => {
    const volume = 0.0001;
    let response = await request.get(
      `/swap?pair=btc-usdc&volume=${volume}&spread=0`
    );
    expect(response.status).toBe(200);
    expect(response.type).toBe("application/json");

    const {
      id,
      pair,
      fee,
      buy: {
        max_unit_price: maxUnitPrice,
        fee_volume: feeVolume,
        trade_volume: tradeVolume,
      },
      last_traded_price: lastTradedPrice,
      sell: {
        min_unit_price: minUnitPrice,
        min_fee_price: minFeePrice,
        min_final_price: minFinalPrice,
        min_total_price: minTotalPrice,
      },
    } = response.body;

    expect(pair.toLowerCase()).toBe("btc-usdc");
    expect(maxUnitPrice).toBe(lastTradedPrice);
    expect(feeVolume).toBe(volume * fee);
    expect(tradeVolume).toBe(volume * (1 - fee));
    expect(minUnitPrice).toBe(lastTradedPrice);
    expect(minFeePrice).toBe(minTotalPrice * fee);
    expect(minFinalPrice).toBe(minTotalPrice * (1 - fee));

    response = await request.post(`/swap/${id}`).send({ side: "buy" });

    expect(response.status).toBe(200);
    expect(response.type).toBe("application/json");

    const { order_id: orderId } = response.body;

    response = await request.get(`/swap/order/${orderId}`);
    expect(response.status).toBe(200);
    expect(response.type).toBe("application/json");

    const {
      swap_id: swapId,
      pair: resOrderPair,
      side: resOrderSide,
      order_id: resOrderId,
      order_price: resOrderPrice,
      filled_price: resOrderFilledPrice,
      volume: resOrderVolume,
      fee_volume: resOrderFeeVolume,
      filled_volume: resOrderFilledVolume,
      fee: resOrderFee,
      fee_price: resOrderFeePrice,
      spread: resOrderSpread,
      order_status: resOrderStatus,
    } = response.body;

    expect(swapId).toBe(id);
    expect(resOrderPair.toLowerCase()).toBe("btc-usdc");
    expect(resOrderSide.toLowerCase()).toBe("buy");
    expect(resOrderId).toBe(orderId);
    expect(resOrderPrice).toBeCloseTo(maxUnitPrice, 7);
    expect(resOrderFilledPrice).toBeLessThanOrEqual(lastTradedPrice);
    expect(resOrderVolume).toBe(volume * (1 - fee));
    expect(resOrderFilledVolume).toBeLessThanOrEqual(volume * (1 - fee));
    expect(resOrderFeeVolume).toBe(volume * fee);
    expect(resOrderFee).toBe(fee);
    expect(resOrderFeePrice).toBe(0);
    expect(resOrderSpread).toBe(0);
    expect(["filled", "live"]).toContain(resOrderStatus.toLowerCase());
  }, 15 * 1000);
});

describe("Buy an unregistered pair on Okex with spread & fee", () => {
  beforeAll(async () => {
    await initDb();
  }, 7 * 1000);

  afterAll(async () => {
    await teardownDb();
  }, 7 * 1000);

  test("pair=btc-usdc, volume=0.0001, spread=0.1 & fee=0.1", async () => {
    const volume = 0.0001;
    const fee = 0.1;
    const spread = 0.1;
    let response = await request.get(
      `/swap?pair=btc-usdc&volume=${volume}&spread=${spread}&fee=${fee}`
    );
    expect(response.status).toBe(200);
    expect(response.type).toBe("application/json");

    const {
      id,
      pair,
      buy: {
        max_unit_price: maxUnitPrice,
        fee_volume: feeVolume,
        trade_volume: tradeVolume,
      },
      last_traded_price: lastTradedPrice,
      sell: {
        min_unit_price: minUnitPrice,
        min_fee_price: minFeePrice,
        min_final_price: minFinalPrice,
        min_total_price: minTotalPrice,
      },
    } = response.body;

    expect(pair.toLowerCase()).toBe("btc-usdc");
    expect(maxUnitPrice).toBe(lastTradedPrice * (1 - spread));
    expect(feeVolume).toBe(volume * fee);
    expect(tradeVolume).toBe(volume * (1 - fee));
    expect(minUnitPrice).toBe(lastTradedPrice);
    expect(minFeePrice).toBe(minTotalPrice * fee);
    expect(minFinalPrice).toBe(minTotalPrice * (1 - fee));

    response = await request.post(`/swap/${id}`).send({ side: "buy" });

    expect(response.status).toBe(200);
    expect(response.type).toBe("application/json");

    const { order_id: orderId } = response.body;

    response = await request.get(`/swap/order/${orderId}`);
    expect(response.status).toBe(200);
    expect(response.type).toBe("application/json");

    const {
      swap_id: swapId,
      pair: resOrderPair,
      side: resOrderSide,
      order_id: resOrderId,
      order_price: resOrderPrice,
      filled_price: resOrderFilledPrice,
      volume: resOrderVolume,
      fee_volume: resOrderFeeVolume,
      filled_volume: resOrderFilledVolume,
      fee: resOrderFee,
      fee_price: resOrderFeePrice,
      spread: resOrderSpread,
      order_status: resOrderStatus,
    } = response.body;

    expect(swapId).toBe(id);
    expect(resOrderPair.toLowerCase()).toBe("btc-usdc");
    expect(resOrderSide.toLowerCase()).toBe("buy");
    expect(resOrderId).toBe(orderId);
    expect(resOrderPrice).toBeCloseTo(maxUnitPrice, 7);
    expect(resOrderFilledPrice).toBeLessThanOrEqual(maxUnitPrice);
    expect(resOrderVolume).toBe(volume * (1 - fee));
    expect(resOrderFilledVolume).toBeLessThanOrEqual(volume * (1 - fee));
    expect(resOrderFeeVolume).toBe(volume * fee);
    expect(resOrderFee).toBe(fee);
    expect(resOrderFeePrice).toBe(0);
    expect(resOrderSpread).toBe(spread);
    expect(["filled", "live"]).toContain(resOrderStatus.toLowerCase());
  }, 15 * 1000);
});

describe("Sell an unregistered pair on Okex with default fee & without spread", () => {
  beforeAll(async () => {
    await initDb();
  }, 7 * 1000);

  afterAll(async () => {
    await teardownDb();
  }, 7 * 1000);

  test("pair=btc-usdc, volume=0.0001, spread=0 & default fee", async () => {
    const volume = 0.0001;
    let response = await request.get(
      `/swap?pair=btc-usdc&volume=${volume}&spread=0`
    );
    expect(response.status).toBe(200);
    expect(response.type).toBe("application/json");

    const {
      id,
      pair,
      fee,
      buy: {
        max_unit_price: maxUnitPrice,
        fee_volume: feeVolume,
        trade_volume: tradeVolume,
      },
      last_traded_price: lastTradedPrice,
      sell: {
        min_unit_price: minUnitPrice,
        min_fee_price: minFeePrice,
        min_final_price: minFinalPrice,
        min_total_price: minTotalPrice,
      },
    } = response.body;

    expect(pair.toLowerCase()).toBe("btc-usdc");
    expect(maxUnitPrice).toBe(lastTradedPrice);
    expect(feeVolume).toBe(volume * fee);
    expect(tradeVolume).toBe(volume * (1 - fee));
    expect(minUnitPrice).toBe(lastTradedPrice);
    expect(minFeePrice).toBe(minTotalPrice * fee);
    expect(minFinalPrice).toBe(minTotalPrice * (1 - fee));

    response = await request.post(`/swap/${id}`).send({ side: "sell" });

    expect(response.status).toBe(200);
    expect(response.type).toBe("application/json");

    const { order_id: orderId } = response.body;

    response = await request.get(`/swap/order/${orderId}`);
    expect(response.status).toBe(200);
    expect(response.type).toBe("application/json");

    const {
      swap_id: swapId,
      pair: resOrderPair,
      side: resOrderSide,
      order_id: resOrderId,
      order_price: resOrderPrice,
      filled_price: resOrderFilledPrice,
      volume: resOrderVolume,
      fee_volume: resOrderFeeVolume,
      filled_volume: resOrderFilledVolume,
      fee: resOrderFee,
      fee_price: resOrderFeePrice,
      spread: resOrderSpread,
      order_status: resOrderStatus,
    } = response.body;

    expect(swapId).toBe(id);
    expect(resOrderPair.toLowerCase()).toBe("btc-usdc");
    expect(resOrderSide.toLowerCase()).toBe("sell");
    expect(resOrderId).toBe(orderId);
    // test range with +- 0.1%
    expect(resOrderPrice).toBeLessThanOrEqual(minUnitPrice * (1 + 0.001));
    expect(resOrderPrice).toBeGreaterThanOrEqual(minUnitPrice * (1 - 0.001));
    expect(resOrderFilledPrice).toBeGreaterThanOrEqual(minUnitPrice * (1 - 0.001));
    expect(resOrderVolume).toBe(volume);
    expect(resOrderFilledVolume).toBe(volume);
    expect(resOrderFeeVolume).toBe(0);
    expect(resOrderFee).toBe(fee);
    expect(resOrderFeePrice).toBe(resOrderFilledPrice * fee);
    expect(resOrderSpread).toBe(0);
    expect(resOrderStatus.toLowerCase()).toBe("filled");
  }, 15 * 1000);
});

describe("Sell an unregistered pair on Okex with spread & fee", () => {
  beforeAll(async () => {
    await initDb();
  }, 7 * 1000);

  afterAll(async () => {
    await teardownDb();
    shutdownServer();
  }, 7 * 1000);

  test("pair=btc-usdc, volume=0.0001, spread=0.1 & fee=0.1", async () => {
    const volume = 0.0001;
    const fee = 0.1;
    const spread = 0.1;
    let response = await request.get(
      `/swap?pair=btc-usdc&volume=${volume}&spread=${spread}&fee=${fee}`
    );
    expect(response.status).toBe(200);
    expect(response.type).toBe("application/json");

    const {
      id,
      pair,
      buy: {
        max_unit_price: maxUnitPrice,
        fee_volume: feeVolume,
        trade_volume: tradeVolume,
      },
      last_traded_price: lastTradedPrice,
      sell: {
        min_unit_price: minUnitPrice,
        min_fee_price: minFeePrice,
        min_final_price: minFinalPrice,
        min_total_price: minTotalPrice,
      },
    } = response.body;

    expect(pair.toLowerCase()).toBe("btc-usdc");
    expect(maxUnitPrice).toBe(lastTradedPrice * (1 - spread));
    expect(feeVolume).toBe(volume * fee);
    expect(tradeVolume).toBe(volume * (1 - fee));
    expect(minUnitPrice).toBe(lastTradedPrice);
    expect(minFeePrice).toBe(minTotalPrice * fee);
    expect(minFinalPrice).toBe(minTotalPrice * (1 - fee));

    response = await request.post(`/swap/${id}`).send({ side: "sell" });

    expect(response.status).toBe(200);
    expect(response.type).toBe("application/json");

    const { order_id: orderId } = response.body;

    response = await request.get(`/swap/order/${orderId}`);
    expect(response.status).toBe(200);
    expect(response.type).toBe("application/json");

    const {
      swap_id: swapId,
      pair: resOrderPair,
      side: resOrderSide,
      order_id: resOrderId,
      order_price: resOrderPrice,
      filled_price: resOrderFilledPrice,
      volume: resOrderVolume,
      fee_volume: resOrderFeeVolume,
      filled_volume: resOrderFilledVolume,
      fee: resOrderFee,
      fee_price: resOrderFeePrice,
      spread: resOrderSpread,
      order_status: resOrderStatus,
    } = response.body;

    expect(swapId).toBe(id);
    expect(resOrderPair.toLowerCase()).toBe("btc-usdc");
    expect(resOrderSide.toLowerCase()).toBe("sell");
    expect(resOrderId).toBe(orderId);
    // test range with +- 0.1%
    expect(resOrderPrice).toBeLessThanOrEqual(minUnitPrice * (1 + 0.001));
    expect(resOrderPrice).toBeGreaterThanOrEqual(minUnitPrice * (1 - 0.001));
    expect(resOrderFilledPrice).toBeGreaterThanOrEqual(minUnitPrice * (1 - 0.001));
    expect(resOrderVolume).toBe(volume);
    expect(resOrderFilledVolume).toBe(volume);
    expect(resOrderFeeVolume).toBe(0);
    expect(resOrderFee).toBe(fee);
    expect(resOrderFeePrice).toBe(resOrderFilledPrice * fee);
    expect(resOrderSpread).toBe(spread);
    expect(resOrderStatus.toLowerCase()).toBe("filled");
  }, 15 * 1000);
});
