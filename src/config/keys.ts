import { config } from "../config";
import fs from "fs";

export const jwtPrivateKey = fs.readFileSync(config.jwtPrivateKeyPath, "utf-8");
export const jwtPublicKey = fs.readFileSync(config.jwtPublicKeyPath, "utf-8");
