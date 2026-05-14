import { Request, Response } from "express";
import { config } from "../config";
import bcrypt from "bcrypt";
export async function adminAuthMiddleware(req: Request, res: Response, next: () => void): Promise<void> {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Basic ")) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }

    const base64Credentials = authHeader.split(" ")[1];
    const credentials = Buffer.from(base64Credentials, "base64").toString("ascii");
    const [username, password] = credentials.split(":");

    if (username === config.adminUsername && await bcrypt.compare(password, config.adminPasswordHash)) {
        next();
    } else {
        res.status(401).json({ error: "Unauthorized" });
    }
}