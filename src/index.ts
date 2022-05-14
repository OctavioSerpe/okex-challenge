import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import {StatusCodes} from "http-status-codes";
import { StatusError } from "./errors/StatusError";

const app = express();

app.get("/", (req: Request, res: Response, next: NextFunction) => {
  res.send("Hello World!");
});


app.use((req: Request, res: Response, next: NextFunction) => {
  const error: StatusError = new StatusError("Endpoint does not exist", StatusCodes.NOT_FOUND);
  next(error);
});

app.use((error: StatusError, req: Request, res: Response, next: NextFunction) => {
  res.status(error.statusCode).json({ message: error.message, errorCode: error.statusCode,errorStack: error.stack });
});

app.listen(process.env.PORT, () => console.log(`Server has started and listening on port ${process.env.PORT}!`));
