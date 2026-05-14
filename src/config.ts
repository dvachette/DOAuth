import dotenv from 'dotenv';

dotenv.config();

function required(key: string): string {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}

export const config = {
    port: parseInt(process.env.PORT || '3000', 10),
    databaseUrl: required('DATABASE_URL'),
    jwtPrivateKeyPath: required('JWT_PRIVATE_KEY_PATH'),
    jwtPublicKeyPath: required('JWT_PUBLIC_KEY_PATH'),
    adminUsername: required('ADMIN_USERNAME'),
    adminPasswordHash: required('ADMIN_PASSWORD_HASH'),
};