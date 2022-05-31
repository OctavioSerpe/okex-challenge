import { Express } from "express";
import { executeSwap, getSwap } from "../controllers/swapController";
import { executeSwapMiddleware, getSwapMiddleware } from "../middlewares/swapMiddleware";

export default function(app: Express){
    app.get("/swap", getSwapMiddleware, getSwap);
    app.post("/swap/:id", executeSwapMiddleware, executeSwap);
};