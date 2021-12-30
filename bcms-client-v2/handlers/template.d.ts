import { GetApiKeyAccess, Send, Template } from '../types';
export interface BCMSTemplateHandlerPrototype {
    get(id: string): Promise<Template>;
}
declare function bcmsTemplateHandler(getKeyAccess: GetApiKeyAccess, send: Send): BCMSTemplateHandlerPrototype;
export declare const BCMSTemplateHandler: typeof bcmsTemplateHandler;
export {};
