"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Security = void 0;
var crypto = require("crypto-js");
function security(key) {
    return {
        sign: function (payload) {
            var data = {
                key: key.id,
                timestamp: Date.now(),
                nonce: crypto.lib.WordArray.random(3).toString(),
                signature: '',
            };
            var payloadAsString = '';
            if (typeof payload === 'object') {
                if (typeof window !== 'undefined' &&
                    typeof window.btoa !== 'undefined') {
                    payloadAsString = window.btoa(encodeURIComponent(JSON.stringify(payload)));
                }
                else {
                    payloadAsString = Buffer.from(encodeURIComponent(JSON.stringify(payload))).toString('base64');
                }
            }
            else {
                payloadAsString = '' + payload;
            }
            data.signature = crypto
                .HmacSHA256(data.nonce + data.timestamp + key.id + payloadAsString, key.secret)
                .toString();
            return data;
        },
    };
}
exports.Security = security;
//# sourceMappingURL=security.js.map