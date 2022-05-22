import { Request, Response, NextFunction } from "express";

export const swap = (req: Request, res: Response, next: NextFunction) => {
  res.json({
    message: "Hello World",
  });
};