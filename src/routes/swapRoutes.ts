import { Express } from "express";
import { swap } from "../controllers/swapController";
import { getSwapMiddleware } from "../middlewares/swapMiddleware";

export default function(app: Express){
    app.get("/swap", getSwapMiddleware, swap);
};