import { config } from "./config";
import express from "express";
import { Request, Response } from "express";
import { oauthRouter } from "./routes/oauth";
import { adminAuthMiddleware } from "./middlewares/adminAuth";
import { adminRouter } from "./routes/admin";

export const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((err: Error, req: Request, res: Response, next: Function) => {
    console.error(err);
    res.status(500).json({ error: err.message });
});

app.use("/admin", adminAuthMiddleware, adminRouter);

app.use("/oauth", oauthRouter);
