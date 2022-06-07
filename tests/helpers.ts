import { agent } from "supertest";
import App, {server} from "../src/index";
import { loadInitialTables, query} from "../src/db/initialDb";

// export server
export const request = agent(App);

export const shutdownServer = () => {
  server.close();
};

export const initDb = async () => {
  await loadInitialTables();

  console.log("Test database initialized");
};

export const teardownDb = async () => {
  await query(`TRUNCATE TABLE spot_instruments CASCADE`);
  await query(`TRUNCATE TABLE config`);
};
