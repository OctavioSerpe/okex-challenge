import { Client } from "pg";
import { schema } from "./schema";

export const listingPairs = ["BTC-USDT", "ETH-USDT", "USDC-USDT", "AAVE-USDT", "AAVE-USDC"];

export const loadInitialTables = async () => {
  const client = new Client();

  try {
    await client.connect();

    for (const table of schema) {
      const query = `CREATE TABLE IF NOT EXISTS ${
        table.table
      } (${table.columns.join(", ")})`;
      await client.query(query);
    }

    // load the pairs to be listed
    for (const pair of listingPairs) {
      await client.query(
        `INSERT INTO spot_instruments(INSTRUMENT_ID) VALUES ('${pair}') ON CONFLICT DO NOTHING`
      );
    }

    await client.query(
      "INSERT INTO config (ID, FEE, SPREAD) VALUES (1, 0.01, 0.2) ON CONFLICT DO NOTHING"
    );

    await client.end();
  } catch (error) {
    console.log("ERROR: ", error);
  }
};

export const query = async (query: string) => {
  const client = new Client();

  try {
    await client.connect();
    
    const response = await client.query(query);

    await client.end();

    return response.rows;
  } catch (error) {
    console.log("ERROR: ", error);
  }
};
