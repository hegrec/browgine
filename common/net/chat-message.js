const MESSAGE_NAME = 'chat';

export default class NetChatMessage {
    constructor() {
        this.text = arguments[0];
    }

    static getMessageName() {
        return MESSAGE_NAME;
    }

    getText() {
        return this.text;
    }

    getMessagePayload() {
        return this.getText();
    }
}
