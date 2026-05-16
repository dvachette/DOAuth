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

async function listAppUsers(applicationId: string): Promise<{ user_id: string; roles: Role[] }[]> {
    const result = await database.query(
        `SELECT ur.user_id, json_agg(json_build_object('id', r.id, 'application_id', r.application_id, 'name', r.name, 'description', r.description, 'created_at', r.created_at)) AS roles
         FROM user_roles ur
         JOIN roles r ON ur.role_id = r.id
         WHERE r.application_id = $1
         GROUP BY ur.user_id`,
        [applicationId]
    );
    return result.rows.map(row => ({
        user_id: row.user_id,
        roles: row.roles
    }));
}
export function useRoleService() {
    return {
        listRoles,
        createRole,
        deleteRole,
        listAppUsers
    };
}