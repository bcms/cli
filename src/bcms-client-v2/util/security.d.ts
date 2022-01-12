import { ApiKey, ApiKeySignature } from '../types';
export interface SecurityPrototype {
    sign(payload: any): ApiKeySignature;
}
declare function security(key: ApiKey): SecurityPrototype;
export declare const Security: typeof security;
export {};
