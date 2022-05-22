import { Client } from "pg";
import { schema } from "./schema";

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

    await client.end();
  } catch (error) {
    console.log("ERROR: ", error);
  }
};
