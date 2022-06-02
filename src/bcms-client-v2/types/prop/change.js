"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PropChangeSchema = void 0;
exports.PropChangeSchema = {
    add: {
        __type: 'object',
        __required: false,
        __child: {
            label: {
                __type: 'string',
                __required: true,
            },
            type: {
                __type: 'string',
                __required: true,
            },
            array: {
                __type: 'boolean',
                __required: true,
            },
            required: {
                __type: 'boolean',
                __required: true,
            },
        },
    },
    remove: {
        __type: 'string',
        __required: false,
    },
    update: {
        __type: 'object',
        __required: false,
        __child: {
            label: {
                __type: 'object',
                __required: true,
                __child: {
                    old: {
                        __type: 'string',
                        __required: true,
                    },
                    new: {
                        __type: 'string',
                        __required: true,
                    },
                },
            },
            move: {
                __type: 'number',
                __required: true,
            },
            required: {
                __type: 'boolean',
                __required: true,
            },
        },
    },
};
//# sourceMappingURL=change.js.map