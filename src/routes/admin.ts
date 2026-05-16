import { Router, Request, Response } from "express";
import { useUserService } from "../services/user";
import { useApplicationService } from "../services/application";
import { useRoleService } from "../services/role";
import { usePermissionService } from "../services/permission";

export const adminRouter = Router();

adminRouter.get("/users", async (req: Request, res: Response): Promise<void | Response> => {
    const userService = useUserService();

    const users = await userService.listUsers();

    res.json(users);
});

adminRouter.post("/users", async (req: Request, res: Response): Promise<void | Response> => {
    const { username, password, email } = req.body;

    if (!username || !password || !email) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const userService = useUserService();

    const existingUser = await userService.findByUsername(username);
    if (existingUser) {
        return res.status(409).json({ error: "Username already exists" });
    }

    const newUser = await userService.createUser(username, password, email);

    res.status(201).json(newUser);
});

adminRouter.patch("/users/:id", async (req: Request, res: Response): Promise<void | Response> => {
    const { id } = req.params;
    const { username, password, email, is_active } = req.body;

    const userService = useUserService();

    const updatedUser = await userService.updateUser(id as string, { username, password, email, is_active });

    if (!updatedUser) {
        return res.status(404).json({ error: "User not found or no fields to update" });
    }

    res.json(updatedUser);
});

adminRouter.delete("/users/:id", async (req: Request, res: Response): Promise<void | Response> => {
    const { id } = req.params;

    const userService = useUserService();

    const success = await userService.deleteUser(id as string);

    if (!success) {
        return res.status(404).json({ error: "User not found" });
    }

    res.status(204).send();
});

adminRouter.get("/applications", async (req: Request, res: Response): Promise<void | Response> => {
    const applicationService = useApplicationService();

    const applications = await applicationService.listApplications();
    res.json(applications);
});

adminRouter.post("/applications", async (req: Request, res: Response): Promise<void | Response> => {
    const { name, admin_username } = req.body;

    if (!name) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const userService = useUserService();

    if (!admin_username) {
        return res.status(400).json({ error: "Admin username is required" });
    }
    const adminUser = await userService.findByUsername(admin_username);
    if (!adminUser) {
        return res.status(400).json({ error: "Admin user not found" });
    }


    const applicationService = useApplicationService();

    const newApplication = await applicationService.createApplication(name);

    const roleService = useRoleService();
    const adminRole = await roleService.createRole(newApplication.id, "admin", "Full access to the application");

    await userService.assignRoleToUser(adminUser.id, adminRole.id);

    const permissionService = usePermissionService();

    const permissions = [
        { scope: "roles:read", description: "Read roles" },
        { scope: "roles:write", description: "Create, update and delete roles" },
        { scope: "roles:assign", description: "Assign and remove roles to users" },
    ];
    for (const perm of permissions) {
        const permission = await permissionService.createPermission(newApplication.id, perm.scope, perm.description);
        await permissionService.assignPermissionToRole(permission.id, adminRole.id);
    }
    res.status(201).json(newApplication);

});

adminRouter.delete("/applications/:id", async (req: Request, res: Response): Promise<void | Response> => {
    const { id } = req.params;

    const applicationService = useApplicationService();

    const success = await applicationService.deleteApplication(id as string);

    if (!success) {
        return res.status(404).json({ error: "Application not found" });
    }

    res.status(204).send();
});

adminRouter.post("/applications/:id/redirect-uris", async (req: Request, res: Response): Promise<void | Response> => {
    const { id } = req.params;
    const { uri } = req.body;

    if (!uri) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const applicationService = useApplicationService();

    try {
        const newUriId = await applicationService.addRedirectUri(id as string, uri);
        res.status(201).json({ id: newUriId, uri });
    } catch (error) {
        res.status(404).json({ error: "Application not found" });
    }
});

adminRouter.delete("/applications/:appId/redirect-uris/:uriId", async (req: Request, res: Response): Promise<void | Response> => {
    const { appId, uriId } = req.params;

    const applicationService = useApplicationService();

    try {
        const success = await applicationService.removeRedirectUri(appId as string, uriId as string);
        if (!success) {
            return res.status(404).json({ error: "Redirect URI not found" });
        }
        res.status(204).send();
    } catch (error) {
        res.status(404).json({ error: "Application not found" });
    }
});

adminRouter.get("/applications/:id/redirect-uris", async (req: Request, res: Response): Promise<void | Response> => {
    const { id } = req.params;

    const applicationService = useApplicationService();

    try {
        const redirectUris = await applicationService.getRedirectUris(id as string);
        res.json(redirectUris);
    } catch (error) {
        res.status(404).json({ error: "Application not found" });
    }
});

adminRouter.get("/applications/:id/roles", async (req: Request, res: Response): Promise<void | Response> => {
    const { id } = req.params;

    const roleService = useRoleService();
    try {
        const roles = await roleService.listRoles(id as string);
        res.json(roles);
    } catch (error) {
        res.status(404).json({ error: "Application not found" });
    }
});

adminRouter.post("/applications/:id/roles", async (req: Request, res: Response): Promise<void | Response> => {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!name) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const roleService = useRoleService();

    try {
        const newRole = await roleService.createRole(id as string, name, description);
        res.status(201).json(newRole);
    } catch (error) {
        res.status(404).json({ error: "Application not found" });
    }
});

adminRouter.delete("/applications/:id/roles/:roleId", async (req: Request, res: Response): Promise<void | Response> => {
    const { id, roleId } = req.params;

    const roleService = useRoleService();

    try {
        const success = await roleService.deleteRole(roleId as string);
        if (!success) {
            return res.status(404).json({ error: "Role not found" });
        }
        res.status(204).send();
    } catch (error) {
        res.status(404).json({ error: "Application not found" });
    }
});

adminRouter.get("/applications/:id/permissions", async (req: Request, res: Response): Promise<void | Response> => {
    const { id } = req.params;

    const permissionService = usePermissionService();
    try {
        const permissions = await permissionService.listPermissions(id as string);
        res.json(permissions);
    } catch (error) {
        res.status(404).json({ error: "Application not found" });
    }
});

adminRouter.post("/applications/:id/permissions", async (req: Request, res: Response): Promise<void | Response> => {
    const { id } = req.params;
    const { scope, description } = req.body;

    if (!scope) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const permissionService = usePermissionService();

    try {
        const newPermission = await permissionService.createPermission(id as string, scope, description);
        res.status(201).json(newPermission);
    } catch (error) {
        res.status(404).json({ error: "Application not found" });
    }
});

adminRouter.delete("/applications/:id/permissions/:permissionId", async (req: Request, res: Response): Promise<void | Response> => {
    const { id, permissionId } = req.params;

    const permissionService = usePermissionService();

    try {
        const success = await permissionService.deletePermission(permissionId as string);
        if (!success) {
            return res.status(404).json({ error: "Permission not found" });
        }
        res.status(204).send();
    } catch (error) {
        res.status(404).json({ error: "Application not found" });
    }
});

adminRouter.post("/applications/:appId/roles/:roleId/permissions", async (req: Request, res: Response): Promise<void | Response> => {
    const { appId, roleId } = req.params;
    const { permissionId } = req.body;

    if (!permissionId) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const permissionService = usePermissionService();

    try {
        await permissionService.assignPermissionToRole(permissionId as string, roleId as string);
        res.status(204).send();
    } catch (error) {
        res.status(404).json({ error: "Application, Role or Permission not found" });
    }
});

adminRouter.delete("/applications/:appId/roles/:roleId/permissions/:permissionId", async (req: Request, res: Response): Promise<void | Response> => {
    const { appId, roleId, permissionId } = req.params;

    const permissionService = usePermissionService();

    try {
        await permissionService.removePermissionFromRole(permissionId as string, roleId as string);
        res.status(204).send();
    } catch (error) {
        res.status(404).json({ error: "Application, Role or Permission not found" });
    }
});

adminRouter.get("/users/:id/roles", async (req: Request, res: Response): Promise<void | Response> => {
    const { id } = req.params;

    const userService = useUserService();

    try {
        const roles = await userService.listUserRoles(id as string);
        res.json(roles);
    } catch (error) {
        res.status(404).json({ error: "User not found" });
    }

});

adminRouter.post("/users/:id/roles", async (req: Request, res: Response): Promise<void | Response> => {
    const { id } = req.params;
    const { roleId } = req.body;

    if (!roleId) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const userService = useUserService();

    try {
        await userService.assignRoleToUser(id as string, roleId as string);
        res.status(204).send();
    } catch (error) {
        res.status(404).json({ error: "User or Role not found" });
    }
});

adminRouter.delete("/users/:id/roles/:roleId", async (req: Request, res: Response): Promise<void | Response> => {
    const { id, roleId } = req.params;

    const userService = useUserService();

    try {
        await userService.removeRoleFromUser(id as string, roleId as string);
        res.status(204).send();
    } catch (error) {
        res.status(404).json({ error: "User or Role not found" });
    }
});