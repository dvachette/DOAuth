import database from "../db";
import bcrypt from "bcrypt";
import crypto from "crypto";
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

async function createApplication(name: string): Promise<ApplicationWithSecret> {
    const clientId = crypto.randomBytes(16).toString("hex");
    const clientSecret = crypto.randomBytes(32).toString("hex");
    const clientSecretHash = await bcrypt.hash(clientSecret, 10);
    const result = await database.query<Application>(
        "INSERT INTO applications (name, client_id, client_secret_hash) VALUES ($1, $2, $3) RETURNING *",
        [name, clientId, clientSecretHash]
    );
    const application = result.rows[0];
    return {
        ...application,
        client_secret: clientSecret,
    };
}

async function listApplications(): Promise<Application[]> {
    const result = await database.query<Application>(
        "SELECT * FROM applications"
    );
    return result.rows;
}

async function deleteApplication(applicationId: string): Promise<boolean> {
    const result = await database.query(
        "DELETE FROM applications WHERE id = $1",
        [applicationId]
    );
    return !!result.rowCount;
}

async function addRedirectUri(applicationId: string, uri: string): Promise<string> {
    // return the id of the new redirect uri
    const result = await database.query(
        "INSERT INTO redirect_uris (application_id, uri) VALUES ($1, $2) RETURNING id",
        [applicationId, uri]
    );
    return result.rows[0].id;
}

async function removeRedirectUri(applicationId: string, uriId: string): Promise<boolean> {
    const result = await database.query(
        "DELETE FROM redirect_uris WHERE application_id = $1 AND id = $2",
        [applicationId, uriId]
    );
    return !!result.rowCount;

}

async function getRedirectUris(applicationId: string): Promise<string[]> {
    const result = await database.query(
        "SELECT uri FROM redirect_uris WHERE application_id = $1",
        [applicationId]
    );
    return result.rows.map(row => row.uri);
}

export function useApplicationService() {
    return {
        verifyClient,
        findByClientId,
        verifyRedirectUri,
        createApplication,
        listApplications,
        deleteApplication,
        addRedirectUri,
        removeRedirectUri,
        getRedirectUris
    };
}

export interface ApplicationWithSecret extends Application {
    client_secret: string;
}