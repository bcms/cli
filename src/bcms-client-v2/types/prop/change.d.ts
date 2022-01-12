import { PropType } from './prop';
export interface PropChange {
    add?: {
        label: string;
        type: PropType;
        required: boolean;
        array: boolean;
        value?: any;
    };
    remove?: string;
    update?: {
        label: {
            old: string;
            new: string;
        };
        move: number;
        required: boolean;
    };
}
export declare const PropChangeSchema: {
    add: {
        __type: string;
        __required: boolean;
        __child: {
            label: {
                __type: string;
                __required: boolean;
            };
            type: {
                __type: string;
                __required: boolean;
            };
            array: {
                __type: string;
                __required: boolean;
            };
            required: {
                __type: string;
                __required: boolean;
            };
        };
    };
    remove: {
        __type: string;
        __required: boolean;
    };
    update: {
        __type: string;
        __required: boolean;
        __child: {
            label: {
                __type: string;
                __required: boolean;
                __child: {
                    old: {
                        __type: string;
                        __required: boolean;
                    };
                    new: {
                        __type: string;
                        __required: boolean;
                    };
                };
            };
            move: {
                __type: string;
                __required: boolean;
            };
            required: {
                __type: string;
                __required: boolean;
            };
        };
    };
};
