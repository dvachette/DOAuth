import database from "../db"
import crypto from "crypto";
async function consumeAuthCode(code: string, applicationId: string): Promise<string | null> {
    const rows = await database.query(
        "SELECT * FROM authorization_codes WHERE code = $1", [code]
    );

    if (!rows.rowCount) {
        return null;
    }

    const authCode = rows.rows[0];

    if (authCode.used) {
        return null;
    }

    if (authCode.expires_at < new Date()) {
        return null;
    }

    if (authCode.application_id !== applicationId) {
        return null;
    }

    await database.query(
        "UPDATE authorization_codes SET used = true WHERE code = $1", [code]
    );

    return authCode.user_id;
}

async function generateAuthCode(userId: string, applicationId: string): Promise<string> {
    const code = crypto.randomBytes(32).toString("hex");

    await database.query(
        "INSERT INTO authorization_codes (code, user_id, application_id, expires_at) VALUES ($1, $2, $3, NOW() + INTERVAL '5 minutes')",
        [code, userId, applicationId]
    );
    return code;
}
export function useAuthCodeService() {
    return {
        consumeAuthCode,
        generateAuthCode,
    };
}