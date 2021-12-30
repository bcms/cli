export interface ApiKey {
    id: string;
    secret: string;
}
export interface ApiKeyAccess {
    templates: Array<ApiKeyPolicyCRUD & {
        _id: string;
    }>;
    functions: Array<{
        name: string;
    }>;
}
export interface ApiKeyPolicyCRUD {
    get: boolean;
    post: boolean;
    put: boolean;
    delete: boolean;
}
export interface ApiKeySignature {
    key: string;
    timestamp: number;
    nonce: string;
    signature: string;
}
export declare type GetApiKeyAccess = () => Promise<ApiKeyAccess>;
