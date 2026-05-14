export interface Application {
    id: string;
    name: string;
    client_id: string;
    client_secret_hash: string;
    created_at: Date;
    is_active: boolean;
}