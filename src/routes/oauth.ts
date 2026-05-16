import { Request, response, Response, Router } from "express";
import { useApplicationService } from "../services/application";
import { useAuthCodeService } from "../services/authCode";
import { useTokenService } from "../services/token";
import { useUserService } from "../services/user";
import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";
import { exportJWK, importSPKI } from "jose";
import { jwtPublicKey } from "../config/keys";

export const oauthRouter = Router();

oauthRouter.post("/token", async (req: Request, res: Response): Promise<void | Response> => {
    const { client_id, client_secret, code } = req.body;

    if (!client_id || !client_secret || !code) {
        return res.status(400).json({ error: "Missing required parameters" });
    }

    const applicationService = useApplicationService();
    const authCodeService = useAuthCodeService();
    const tokenService = useTokenService();


    const application = await applicationService.verifyClient(client_id, client_secret);

    if (!application) {
        return res.status(401).json({ error: "Invalid client credentials" });
    }

    const userId = await authCodeService.consumeAuthCode(code, application.id);

    if (!userId) {
        return res.status(400).json({ error: "Invalid or expired authorization code" });
    }

    const accessToken = await tokenService.generateAccessToken(userId, application.id);
    const refreshToken = await tokenService.generateRefreshToken(userId, application.id);

    res.json({
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: 900,
        refresh_token: refreshToken,
    });
});

oauthRouter.get("/authorize", async (req: Request, res: Response): Promise<void | Response> => {
    const { client_id, redirect_uri, state, message } = req.query;

    if (!client_id || !redirect_uri || !state) {
        return res.status(400).json({ error: "Missing required parameters" });
    }

    const applicationService = useApplicationService();
    const application = await applicationService.findByClientId(client_id as string);
    if (!application) {
        return res.status(401).json({ error: "Invalid client credentials" });
    }
    const isRedirectUriValid = await applicationService.verifyRedirectUri(application.id, redirect_uri as string);
    if (!isRedirectUriValid) {
        return res.status(400).json({ error: "Invalid redirect URI" });
    }

    const pageContent = fs.readFileSync(path.join(__dirname, "../views/authorize.html"), "utf-8")
        .replace("__APPLICATION_NAME__", application.name)
        .replace("__CLIENT_ID__", application.client_id)
        .replace("__REDIRECT_URI__", redirect_uri as string)
        .replace("__STATE__", state as string)
        .replace("__MESSAGE__", message ? message as string : "");

    res.setHeader("Content-Type", "text/html");
    res.send(pageContent);
});

oauthRouter.post("/authorize", async (req: Request, res: Response): Promise<void | Response> => {
    const { client_id, redirect_uri, state, username, password, action } = req.body;

    if (!client_id || !redirect_uri || !state || !username || !password || !action) {
        return res.status(400).json({ error: "Missing required parameters" });
    }

    if (action !== "approve") {
        const redirectUrl = new URL(redirect_uri);
        redirectUrl.searchParams.set("error", "access_denied");
        redirectUrl.searchParams.set("state", state);
        return res.redirect(redirectUrl.toString());
    }

    const applicationService = useApplicationService();
    const application = await applicationService.findByClientId(client_id);
    if (!application) {
        return res.status(401).json({ error: "Invalid client credentials" });
    }
    const isRedirectUriValid = await applicationService.verifyRedirectUri(application.id, redirect_uri);
    if (!isRedirectUriValid) {
        return res.status(400).json({ error: "Invalid redirect URI" });
    }

    const userService = useUserService();
    const user = await userService.findByUsername(username);

    if (!user) {
        return res.status(401).json({ error: "Invalid user credentials" });
    }

    if (!user.is_active) {
        return res.status(403).json({ error: "User account is inactive" });
    }

    if (!await bcrypt.compare(password, user.password_hash)) {
        return res.status(401).json({ error: "Invalid user credentials" });
    }

    const authCodeService = useAuthCodeService();
    const tokenService = useTokenService();

    const authCode = await authCodeService.generateAuthCode(user.id, application.id);

    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.set("code", authCode);
    redirectUrl.searchParams.set("state", state);
    res.redirect(redirectUrl.toString());
});

oauthRouter.post("/token/refresh", async (req: Request, res: Response): Promise<void | Response> => {
    const { client_id, client_secret, refresh_token } = req.body;

    if (!client_id || !client_secret || !refresh_token) {
        return res.status(400).json({ error: "Missing required parameters" });
    }

    const applicationService = useApplicationService();
    const tokenService = useTokenService();

    const application = await applicationService.verifyClient(client_id, client_secret);

    if (!application) {
        return res.status(401).json({ error: "Invalid client credentials" });
    }

    const userId = await tokenService.verifyRefreshToken(refresh_token, application.id);

    if (!userId) {
        return res.status(400).json({ error: "Invalid or expired refresh token" });
    }

    const accessToken = await tokenService.generateAccessToken(userId, application.id);
    const newRefreshToken = await tokenService.generateRefreshToken(userId, application.id);

    res.json({
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: 900,
        refresh_token: newRefreshToken,
    });
});


oauthRouter.post("/token/revoke", async (req: Request, res: Response): Promise<void | Response> => {
    const { client_id, client_secret, token } = req.body;

    if (!client_id || !client_secret || !token) {
        return res.status(400).json({ error: "Missing required parameters" });
    }

    const applicationService = useApplicationService();
    const tokenService = useTokenService();

    const application = await applicationService.verifyClient(client_id, client_secret);

    if (!application) {
        return res.status(401).json({ error: "Invalid client credentials" });
    }

    await tokenService.verifyRefreshToken(token, application.id);

    res.status(204).send();
});

oauthRouter.get("/userinfo", async (req: Request, res: Response): Promise<void | Response> => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Missing or invalid authorization header" });
    }

    const accessToken = authHeader.substring(7);
    const tokenService = useTokenService();
    const userId = await tokenService.verifyAccessToken(accessToken);



    if (!userId) {
        return res.status(401).json({ error: "Invalid or expired access token" });
    }

    const userService = useUserService();
    const user = await userService.findById(userId);

    if (!user) {
        return res.status(404).json({ error: "User not found" });
    }

    res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        created_at: user.created_at,
    });
});

oauthRouter.get("/jwks", async (req: Request, res: Response): Promise<void | Response> => {
    const publicKey = await importSPKI(jwtPublicKey, 'RS256');
    const jwk = await exportJWK(publicKey);
    res.json({ keys: [{ ...jwk, use: 'sig', alg: 'RS256' }] });
});

oauthRouter.post("/register", async (req: Request, res: Response): Promise<void | Response> => {
    const { username, email, password, client_id, redirect_uri, state } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: "Missing required parameters" });
    }

    const userService = useUserService();

    const usernameExists = await userService.findByUsername(username);
    if (usernameExists) {
        return res.redirect(`/oauth/authorize?client_id=${encodeURIComponent(client_id)}&redirect_uri=${encodeURIComponent(redirect_uri)}&state=${encodeURIComponent(state)}&message=Nom d'utilisateur déjà utilisé`);
    }

    const existingUser = await userService.findByEmail(email);
    if (existingUser) {
        return res.redirect(`/oauth/authorize?client_id=${encodeURIComponent(client_id)}&redirect_uri=${encodeURIComponent(redirect_uri)}&state=${encodeURIComponent(state)}&message=Email déjà utilisé`);
    }

    const newUser = await userService.createUser(username, email, password);

    return res.redirect(`/oauth/authorize?client_id=${encodeURIComponent(client_id)}&redirect_uri=${encodeURIComponent(redirect_uri)}&state=${encodeURIComponent(state)}&message=Compte créé avec succès, veuillez vous connecter`);
});