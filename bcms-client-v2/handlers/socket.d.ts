import { SocketEventData, SocketEventName } from '../types';
import { SecurityPrototype } from '../util';
export interface BCMSSocketHandlerPrototype {
    connect(server: {
        url: string;
        path: string;
    }): Promise<void>;
    subscribe(handler: (event: SocketEventName, data: SocketEventData) => void): () => void;
}
export declare function BCMSSocketHandler(security: SecurityPrototype): BCMSSocketHandlerPrototype;
