export interface User {
    id: string;
    username: string;
    password_hash: string;
    email: string;
    created_at: Date;
    is_active: boolean;
}