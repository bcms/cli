export interface PropEntryPointer {
    templateId: string;
    entryIds: string[];
    displayProp: string;
}
export declare const PropEntryPointerSchema: {
    templateId: {
        __type: string;
        __required: boolean;
    };
    entryIds: {
        __type: string;
        __required: boolean;
        __child: {
            __type: string;
        };
    };
    displayProp: {
        __type: string;
        __required: boolean;
    };
};
