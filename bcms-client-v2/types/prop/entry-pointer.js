"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PropEntryPointerSchema = void 0;
exports.PropEntryPointerSchema = {
    templateId: {
        __type: 'string',
        __required: true,
    },
    entryIds: {
        __type: 'array',
        __required: true,
        __child: {
            __type: 'string',
        },
    },
    displayProp: {
        __type: 'string',
        __required: true,
    },
};
//# sourceMappingURL=entry-pointer.js.map