import { MediaResponse, Send } from '../types';
export interface BCMSMediaHandlerPrototype {
    getAll(): Promise<MediaResponse[]>;
    get(id: string): Promise<MediaResponse>;
}
declare function bcmsMediaHandler(send: Send): BCMSMediaHandlerPrototype;
export declare const BCMSMediaHandler: typeof bcmsMediaHandler;
export {};
