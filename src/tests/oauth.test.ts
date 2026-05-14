import request from 'supertest';
import { app } from '../app';
import { useUserService } from '../services/user';

describe('OAuth flow', () => {
    let clientId: string;
    let clientSecret: string;
    let applicationId: string;
    let authCode: string;
    let accessToken: string;
    let refreshToken: string;

    beforeAll(async () => {
        const userService = useUserService();
        const existing = await userService.findByUsername('testuser');
        if (!existing) {
            await userService.createUser('testuser', 'testpassword', 'testuser@test.com');
        }
    });

    test('POST /admin/applications - create application', async () => {
        const res = await request(app)
            .post('/admin/applications')
            .auth('admin', 'motdepasse')
            .send({ name: 'Test App' });

        expect(res.status).toBe(201);
        expect(res.body.client_id).toBeDefined();
        expect(res.body.client_secret).toBeDefined();

        clientId = res.body.client_id;
        clientSecret = res.body.client_secret;
        applicationId = res.body.id;
    });

    test('POST /admin/applications/:id/redirect-uris - add redirect uri', async () => {
        const res = await request(app)
            .post(`/admin/applications/${applicationId}/redirect-uris`)
            .auth('admin', 'motdepasse')
            .send({ uri: 'http://localhost:4000/auth/callback' });

        expect(res.status).toBe(201);
    });

    test('GET /oauth/authorize - login page', async () => {
        const res = await request(app)
            .get('/oauth/authorize')
            .query({
                client_id: clientId,
                redirect_uri: 'http://localhost:4000/auth/callback',
                state: 'randomstate123'
            });

        expect(res.status).toBe(200);
        expect(res.text).toContain('</form>');
    });

    test('POST /oauth/authorize - login', async () => {
        const res = await request(app)
            .post('/oauth/authorize')
            .type('form')
            .send({
                client_id: clientId,
                redirect_uri: 'http://localhost:4000/auth/callback',
                state: 'randomstate123',
                username: 'testuser',
                password: 'testpassword',
                action: 'approve'
            });

        expect(res.status).toBe(302);
        const location = res.headers.location;
        expect(location).toContain('code=');
        authCode = new URL(location).searchParams.get('code')!;
    });

    test('POST /oauth/token - exchange code', async () => {
        const res = await request(app)
            .post('/oauth/token')
            .send({
                client_id: clientId,
                client_secret: clientSecret,
                code: authCode
            });

        expect(res.status).toBe(200);
        expect(res.body.access_token).toBeDefined();
        expect(res.body.refresh_token).toBeDefined();
        accessToken = res.body.access_token;
        refreshToken = res.body.refresh_token;
    });

    test('GET /oauth/userinfo - get user info', async () => {
        const res = await request(app)
            .get('/oauth/userinfo')
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body.username).toBe('testuser');
    });

    test('POST /oauth/token/refresh - refresh token', async () => {
        const res = await request(app)
            .post('/oauth/token/refresh')
            .send({
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: refreshToken
            });

        expect(res.status).toBe(200);
        expect(res.body.access_token).toBeDefined();
        refreshToken = res.body.refresh_token;
    });

    test('POST /oauth/token/revoke - revoke token', async () => {
        const res = await request(app)
            .post('/oauth/token/revoke')
            .send({
                client_id: clientId,
                client_secret: clientSecret,
                token: refreshToken
            });

        expect(res.status).toBe(204);
    });
});