import database from "../db";
import { User } from "../models/user";

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


export function useUserService() {
    return {
        findByUsername,
        findById,
    };
}