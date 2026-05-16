import { Request, Response, Router, NextFunction } from "express";
import { useRoleService } from "../services/role";
import { useUserService } from "../services/user";
import { useTokenService } from "../services/token";

export const appAdminRouter = Router();

function requireAppScope(scope: string) {
    return async function (req: Request, res: Response, next: NextFunction): Promise<void | Response> {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const token = authHeader.substring(7);
        const tokenService = useTokenService();
        const payload = await tokenService.verifyAccessTokenFull(token);

        if (!payload) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const { appId } = req.params;
        if (payload.aud !== appId) {
            return res.status(403).json({ error: "Forbidden" });
        }

        const scopes = (payload.scopes as string[]) || [];
        if (!scopes.includes(scope)) {
            return res.status(403).json({ error: "Forbidden" });
        }

        (req as any).user = payload;
        next();
    }
}

appAdminRouter.get("/:appId/users", requireAppScope("roles:read"), async (req: Request, res: Response) => {
    const { appId } = req.params;
    const roleService = useRoleService();
    const users = await roleService.listAppUsers(appId as string);
    res.json(users);
});

appAdminRouter.get("/:appId/roles", requireAppScope("roles:read"), async (req: Request, res: Response) => {
    const { appId } = req.params;
    const roleService = useRoleService();
    const roles = await roleService.listRoles(appId as string);
    res.json(roles);
});

appAdminRouter.post("/:appId/users/:userId/roles", requireAppScope("roles:assign"), async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { roleId } = req.body;
    if (!roleId) {
        return res.status(400).json({ error: "Missing required fields" });
    }
    const userService = useUserService();
    await userService.assignRoleToUser(userId as string, roleId);
    res.status(204).send();
});

appAdminRouter.delete("/:appId/users/:userId/roles/:roleId", requireAppScope("roles:revoke"), async (req: Request, res: Response) => {
    const { userId, roleId } = req.params;
    const userService = useUserService();
    await userService.removeRoleFromUser(userId as string, roleId as string);
    res.status(204).send();
});