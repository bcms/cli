import { ApiKey, ApiKeyAccess } from './types';
import { HandlerManager } from './types';
export interface BCMSClientPrototype extends HandlerManager {
    keyAccess(): Promise<ApiKeyAccess>;
}
declare function bcmsClient(config: {
    cmsOrigin: string;
    key: ApiKey;
}): BCMSClientPrototype;
export declare const BCMSClient: typeof bcmsClient;
export {};
