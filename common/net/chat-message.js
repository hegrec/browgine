const MESSAGE_NAME = 'chat';

export default class NetChatMessage {
    constructor(text) {
        this.text = text;
    }

    static getMessageName() {
        return MESSAGE_NAME;
    }

    getText() {
        return this.text;
    }

    getMessagePayload() {
        return [this.getText()];
    }
}
