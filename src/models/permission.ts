export interface Permission {
    id: string;
    application_id: string;
    scope: string;
    description: string | null;
    created_at: Date;
}