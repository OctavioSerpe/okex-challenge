import { Express } from "express";
import { notFound, handler } from "../controllers/errorController";

export default function (app: Express) {
  // No routes defined yet
  app.use(notFound);

  // Error handling route
  app.use(handler);
};