const MESSAGE_NAME = 'removeEntity';

export default class NetRemoveEntity {
    constructor() {
        this.entityUniqueId = arguments[0];
    }

    static getMessageName() {
        return MESSAGE_NAME;
    }

    getMessagePayload() {
        return this.entityUniqueId;
    }
}
