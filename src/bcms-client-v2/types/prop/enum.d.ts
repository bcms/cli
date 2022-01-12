export interface PropEnum {
    items: string[];
    selected?: string;
}
export declare const PropEnumSchema: {
    items: {
        __type: string;
        __required: boolean;
        __child: {
            __type: string;
        };
    };
    selected: {
        __type: string;
        __required: boolean;
    };
};
