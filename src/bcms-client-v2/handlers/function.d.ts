import { FunctionResponse, GetApiKeyAccess, Send } from '../types';
export interface BCMSFunctionHandlerPrototype {
    call<T>(name: string, body?: any): Promise<FunctionResponse<T>>;
}
declare function bcmsFunctionHandler(getKeyAccess: GetApiKeyAccess, send: Send): BCMSFunctionHandlerPrototype;
export declare const BCMSFunctionHandler: typeof bcmsFunctionHandler;
export {};
