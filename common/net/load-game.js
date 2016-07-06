const MESSAGE_NAME = 'load';

export default class NetLoadGame {
    constructor() {
        this.gameData = arguments[0];
    }

    static getMessageName() {
        return MESSAGE_NAME;
    }

    getMessagePayload() {
        return this.gameData;
    }
}
