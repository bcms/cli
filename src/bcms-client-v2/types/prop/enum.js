"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PropEnumSchema = void 0;
exports.PropEnumSchema = {
    items: {
        __type: 'array',
        __required: true,
        __child: {
            __type: 'string',
        },
    },
    selected: {
        __type: 'string',
        __required: true,
    },
};
//# sourceMappingURL=enum.js.map