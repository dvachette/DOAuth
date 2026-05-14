import database from "../db";
import bcrypt from "bcrypt";
import { Application } from "../models/application";
async function verifyClient(clientId: string, clientSecret: string): Promise<Application | null> {
    const applicationResult = await database.query<Application>(
        "SELECT * FROM applications WHERE client_id = $1",
        [clientId]
    );
    if (!applicationResult.rowCount) {
        return null;
    }

    const application = applicationResult.rows[0];

    if (await bcrypt.compare(clientSecret, application.client_secret_hash)) {
        return application;
    }

    return null;
}

async function findByClientId(clientId: string): Promise<Application | null> {
    const applicationResult = await database.query<Application>(
        "SELECT * FROM applications WHERE client_id = $1",
        [clientId]
    );
    if (!applicationResult.rowCount) {
        return null;
    }

    return applicationResult.rows[0];
}

async function verifyRedirectUri(applicationId: string, redirectUri: string): Promise<boolean> {
    const result = await database.query(
        "SELECT * FROM redirect_uris WHERE application_id = $1 AND uri = $2",
        [applicationId, redirectUri]
    );
    return !!result.rowCount;
}
export function useApplicationService() {
    return {
        verifyClient,
        findByClientId,
        verifyRedirectUri,
    };
}