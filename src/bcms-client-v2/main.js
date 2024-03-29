"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BCMSClient = void 0;
var handlers_1 = require("./handlers");
var axios_1 = require("axios");
var util_1 = require("./util");
function bcmsClient(config) {
    var keyAccess;
    var security = util_1.Security(config.key);
    function send(conf, doNotAuth) {
        return __awaiter(this, void 0, void 0, function () {
            var signature, signatureResult, response;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (conf.data && typeof conf.data === 'object') {
                            if (conf.headers) {
                                conf.headers['Content-Type'] = 'application/json';
                            }
                            else {
                                conf.headers = {
                                    'Content-Type': 'application/json',
                                };
                            }
                        }
                        if (!!doNotAuth) return [3, 2];
                        return [4, util_1.ErrorWrapper.exec(function () { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    return [2, security.sign(typeof conf.data === 'undefined' ? {} : conf.data)];
                                });
                            }); })];
                    case 1:
                        signatureResult = _a.sent();
                        if (!signatureResult) {
                            return [2];
                        }
                        signature = signatureResult;
                        _a.label = 2;
                    case 2:
                        conf.url = config.cmsOrigin + "/api" + conf.url;
                        if (signature) {
                            conf.url +=
                                '?key=' +
                                    signature.key +
                                    '&timestamp=' +
                                    signature.timestamp +
                                    '&nonce=' +
                                    signature.nonce +
                                    '&signature=' +
                                    signature.signature;
                        }
                        return [4, util_1.ErrorWrapper.exec(function () { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4, axios_1.default({
                                                url: conf.url,
                                                method: conf.method,
                                                headers: conf.headers,
                                                responseType: conf.responseType,
                                                data: conf.data,
                                            })];
                                        case 1: return [2, _a.sent()];
                                    }
                                });
                            }); })];
                    case 3:
                        response = _a.sent();
                        if (!response) {
                            return [2];
                        }
                        return [2, response.data];
                }
            });
        });
    }
    function getKeyAccess() {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!keyAccess) return [3, 2];
                        return [4, send({
                                url: "/key/access/list",
                                method: 'GET',
                            })];
                    case 1:
                        result = _a.sent();
                        keyAccess = result.access;
                        _a.label = 2;
                    case 2: return [2, JSON.parse(JSON.stringify(keyAccess))];
                }
            });
        });
    }
    var handlerManger = {
        template: handlers_1.BCMSTemplateHandler(getKeyAccess, send),
        entry: handlers_1.BCMSEntryHandler(getKeyAccess, send),
        media: handlers_1.BCMSMediaHandler(send),
        function: handlers_1.BCMSFunctionHandler(getKeyAccess, send),
        socket: handlers_1.BCMSSocketHandler(security),
    };
    return __assign(__assign({}, handlerManger), { keyAccess: function () {
            return getKeyAccess();
        } });
}
exports.BCMSClient = bcmsClient;
//# sourceMappingURL=main.js.map