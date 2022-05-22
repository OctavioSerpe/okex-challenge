import { Express } from "express";
import { swap } from "../controllers/swapController";

export default function(app: Express){
    app.get("/", swap);
};