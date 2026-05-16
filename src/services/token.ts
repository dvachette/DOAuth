import crypto, { verify } from 'crypto';
import bcrypt from 'bcrypt';
import database from '../db';
import { SignJWT, importPKCS8, importSPKI, jwtVerify } from 'jose';
import { jwtPrivateKey, jwtPublicKey } from '../config/keys'
async function generateAccessToken(userId: string, applicationId: string): Promise<string> {
    const userScopesResult = await database.query(
        "SELECT perm.scope FROM permissions perm JOIN role_permissions rp ON perm.id = rp.permission_id JOIN user_roles ur ON rp.role_id = ur.role_id WHERE ur.user_id = $1 AND perm.application_id = $2",
        [userId, applicationId]
    );
    const scopes = userScopesResult.rows.map(row => row.scope);

    const privateKey = await importPKCS8(jwtPrivateKey, 'RS256');
    const token = await new SignJWT({ scopes })
        .setProtectedHeader({ alg: 'RS256' })
        .setSubject(userId)
        .setAudience(applicationId)
        .setIssuer('https://auth.dvachette.fr')
        .setIssuedAt()
        .setExpirationTime('15m')
        .sign(privateKey);
    return token;
}

async function generateRefreshToken(userId: string, applicationId: string): Promise<string> {
    const randomString = crypto.randomBytes(32).toString('hex');
    const randomStringBcryptHash = await bcrypt.hash(randomString, 10);
    await database.query(
        "INSERT INTO refresh_tokens (user_id, application_id, token_hash, expires_at) VALUES ($1, $2, $3, NOW() + INTERVAL '30 days')",
        [userId, applicationId, randomStringBcryptHash]
    );
    return randomString;
}

async function verifyRefreshToken(token: string, applicationId: string): Promise<string | null> {
    const result = await database.query(
        "SELECT * FROM refresh_tokens WHERE application_id = $1 AND expires_at > NOW() AND revoked = FALSE",
        [applicationId]
    );

    for (const row of result.rows) {
        if (await bcrypt.compare(token, row.token_hash)) {
            await database.query(
                "UPDATE refresh_tokens SET revoked = TRUE WHERE id = $1",
                [row.id]
            );

            return row.user_id;
        }
    }

    return null;
}

async function verifyAccessToken(token: string): Promise<string | null> {
    try {
        const publicKey = await importSPKI(jwtPublicKey, 'RS256');
        const { payload } = await jwtVerify(token, publicKey, {
            issuer: 'https://auth.dvachette.fr',
        });
        return payload.sub as string;
    } catch (err) {
        return null;
    }
}

async function verifyAccessTokenFull(token: string): Promise<any | null> {
    try {
        const publicKey = await importSPKI(jwtPublicKey, 'RS256');
        const { payload } = await jwtVerify(token, publicKey, {
            issuer: 'https://auth.dvachette.fr',
        });
        return payload;
    } catch (err) {
        return null;
    }
}

export function useTokenService() {
    return {
        generateAccessToken,
        generateRefreshToken,
        verifyRefreshToken,
        verifyAccessToken,
        verifyAccessTokenFull
    };
}