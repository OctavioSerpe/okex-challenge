import "dotenv/config";
import express from "express";

import swapRoutes from "./routes/swapRoutes";
import errorRoutes from "./routes/errorRoutes";

import { loadInitialTables } from "./db/initialDb";

// TODO: check if keys are loaded on .env file
if (process.env.NODE_ENV !== "test") {
  loadInitialTables();
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
swapRoutes(app);
errorRoutes(app);

export const server = app.listen(process.env.PORT, () =>
  console.log(`Server has started and listening on port ${process.env.PORT}!`)
);

export default app;
