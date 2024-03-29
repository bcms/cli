export declare enum SocketEventName {
    USER = "user",
    TEMPLATE = "template",
    LANGUAGE = "language",
    GROUP = "group",
    WIDGET = "widget",
    ENTRY = "entry",
    INTERNAL = "internal",
    MEDIA = "media",
    API_KEY = "apiKey",
    PLUGIN = "plugin",
    ENTRY_CHANGE = "entryChange"
}
export interface SocketEventData {
    type: 'add' | 'update' | 'remove';
    message: any;
    source: string;
    entry: {
        _id: string;
        additional?: {
            templateId?: string;
        };
    };
}
export interface SocketEventEntryChangeData {
    tree: string;
    source: string;
    data: any;
}
export interface SocketEventDataClient {
    data: SocketEventData;
    [key: string]: any;
}
