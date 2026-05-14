import { config } from "./config";
import express from "express";
import { oauthRouter } from "./routes/oauth";
import { adminAuthMiddleware } from "./middlewares/adminAuth";
import { adminRouter } from "./routes/admin";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/admin", adminAuthMiddleware, adminRouter);

app.use("/oauth", oauthRouter);

app.listen(config.port, () => {
    console.log(`Server is running on port ${config.port}`);
});