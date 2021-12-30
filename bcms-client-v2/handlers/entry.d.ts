import { Entry, GetApiKeyAccess, Send } from '../types';
export interface BCMSEntryHandlerPrototype {
    getAll(templateId: string, parse?: boolean): Promise<Entry[]>;
    get(data: {
        templateId: string;
        entryId: string;
        parse?: boolean;
    }): Promise<Entry>;
}
declare function bcmsEntryHandler(getKeyAccess: GetApiKeyAccess, send: Send): BCMSEntryHandlerPrototype;
export declare const BCMSEntryHandler: typeof bcmsEntryHandler;
export {};
