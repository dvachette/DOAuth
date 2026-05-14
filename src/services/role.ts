import database from "../db";
import { Role } from "../models/role";
async function listRoles(applicationId: string): Promise<Role[]> {
    const result = await database.query<Role>(
        "SELECT * FROM roles WHERE application_id = $1",
        [applicationId]
    );
    return result.rows;
}

async function createRole(applicationId: string, name: string, description?: string): Promise<Role> {
    const result = await database.query<Role>(
        "INSERT INTO roles (application_id, name, description) VALUES ($1, $2, $3) RETURNING *",
        [applicationId, name, description ?? null]
    );
    return result.rows[0];
}

async function deleteRole(roleId: string): Promise<boolean> {
    const result = await database.query(
        "DELETE FROM roles WHERE id = $1",
        [roleId]
    );
    return !!result.rowCount;
}

export function useRoleService() {
    return {
        listRoles,
        createRole,
        deleteRole
    };
}