import "dotenv/config";
import express from "express";

import swapRoutes from "./routes/swapRoutes";
import errorRoutes from "./routes/errorRoutes";

import { loadInitialTables } from "./db/initialDb";

loadInitialTables();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
swapRoutes(app);
errorRoutes(app);

app.listen(process.env.PORT, () =>
  console.log(`Server has started and listening on port ${process.env.PORT}!`)
);
