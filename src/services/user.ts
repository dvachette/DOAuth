import database from "../db";
import bcrypt from "bcrypt";
import { User } from "../models/user";
import { Role } from "../models/role";

async function findByUsername(username: string): Promise<User | null> {
    const userResult = await database.query<User>(
        "SELECT * FROM users WHERE username = $1",
        [username]
    );
    if (!userResult.rowCount) {
        return null;
    }

    return userResult.rows[0];
}

async function findById(id: string): Promise<User | null> {
    const userResult = await database.query<User>(
        "SELECT * FROM users WHERE id = $1",
        [id]
    );
    if (!userResult.rowCount) {
        return null;
    }

    return userResult.rows[0];
}

async function listUsers(): Promise<User[]> {
    const userResult = await database.query<User>(
        "SELECT * FROM users"
    );
    return userResult.rows;
}

async function createUser(username: string, password: string, email: string): Promise<User> {
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await database.query<User>(
        "INSERT INTO users (username, password_hash, email) VALUES ($1, $2, $3) RETURNING *",
        [username, passwordHash, email]
    );
    return result.rows[0];
}

async function updateUser(id: string, fields: Partial<{ username: string; password: string; email: string; is_active: boolean }>): Promise<User | null> {
    const setClauses = [];
    const values = [];
    let index = 1;

    if (fields.username) {
        setClauses.push(`username = $${index++}`);
        values.push(fields.username);
    }

    if (fields.password) {
        const passwordHash = await bcrypt.hash(fields.password, 10);
        setClauses.push(`password_hash = $${index++}`);
        values.push(passwordHash);
    }

    if (fields.email) {
        setClauses.push(`email = $${index++}`);
        values.push(fields.email);
    }

    if (typeof fields.is_active === "boolean") {
        setClauses.push(`is_active = $${index++}`);
        values.push(fields.is_active);
    }

    if (!setClauses.length) {
        return null;
    }

    const result = await database.query<User>(
        `UPDATE users SET ${setClauses.join(", ")} WHERE id = $${index} RETURNING *`,
        [...values, id]
    );

    if (!result.rowCount) {
        return null;
    }

    return result.rows[0];
}

async function deleteUser(id: string): Promise<boolean> {
    const result = await database.query(
        "DELETE FROM users WHERE id = $1",
        [id]
    );
    return !!result.rowCount;
}

async function listUserRoles(userId: string): Promise<Role[]> {
    const result = await database.query<Role>(
        `SELECT r.* FROM roles r
            JOIN user_roles ur ON ur.role_id = r.id
            WHERE ur.user_id = $1`,
        [userId]
    );
    return result.rows;
}

async function assignRoleToUser(userId: string, roleId: string): Promise<void> {
    await database.query(
        "INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [userId, roleId]
    );
}

async function removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    await database.query(
        "DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2",
        [userId, roleId]
    );
}

export function useUserService() {
    return {
        findByUsername,
        findById,
        listUsers,
        createUser,
        updateUser,
        deleteUser,
        listUserRoles,
        assignRoleToUser,
        removeRoleFromUser
    };
}