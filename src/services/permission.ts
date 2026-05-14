import { Permission } from "../models/permission";
import database from "../db";

async function listPermissions(applicationId: string): Promise<Permission[]> {
    const result = await database.query<Permission>(
        "SELECT * FROM permissions WHERE application_id = $1",
        [applicationId]
    );
    return result.rows;
}

async function createPermission(applicationId: string, scope: string, description?: string): Promise<Permission> {
    const result = await database.query<Permission>(
        "INSERT INTO permissions (application_id, scope, description) VALUES ($1, $2, $3) RETURNING *",
        [applicationId, scope, description ?? null]
    );
    return result.rows[0];
}

async function deletePermission(permissionId: string): Promise<boolean> {
    const result = await database.query(
        "DELETE FROM permissions WHERE id = $1",
        [permissionId]
    );
    return !!result.rowCount;
}

async function assignPermissionToRole(permissionId: string, roleId: string): Promise<void> {
    await database.query(
        "INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [roleId, permissionId]
    );
}

async function removePermissionFromRole(permissionId: string, roleId: string): Promise<void> {
    await database.query(
        "DELETE FROM role_permissions WHERE role_id = $1 AND permission_id = $2",
        [roleId, permissionId]
    );
}

export function usePermissionService() {
    return {
        listPermissions,
        createPermission,
        deletePermission,
        assignPermissionToRole,
        removePermissionFromRole
    };
}