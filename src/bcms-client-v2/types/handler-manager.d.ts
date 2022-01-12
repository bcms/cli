import { BCMSEntryHandlerPrototype, BCMSFunctionHandlerPrototype, BCMSMediaHandlerPrototype, BCMSSocketHandlerPrototype, BCMSTemplateHandlerPrototype } from '../handlers';
export interface HandlerManager {
    template: BCMSTemplateHandlerPrototype;
    entry: BCMSEntryHandlerPrototype;
    media: BCMSMediaHandlerPrototype;
    function: BCMSFunctionHandlerPrototype;
    socket: BCMSSocketHandlerPrototype;
}
