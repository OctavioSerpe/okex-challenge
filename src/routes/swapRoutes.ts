import { Express } from "express";
import { executeSwap, getSwap, getSwapDataById, getSwapDataByOrderId } from "../controllers/swapController";
import { executeSwapMiddleware, getSwapMiddleware, getSwapByIdMiddleware, getSwapByOrderIdMiddleware } from "../middlewares/swapMiddleware";

export default function(app: Express){
    app.get("/swap", getSwapMiddleware, getSwap);
    app.post("/swap/:id", executeSwapMiddleware, executeSwap);
    app.get("/swap/:id", getSwapByIdMiddleware, getSwapDataById);
    app.get("/swap/order/:id", getSwapByOrderIdMiddleware, getSwapDataByOrderId);
};