const MESSAGE_NAME = 'removeEntity';

export default class NetRemoveEntity {
    constructor(uniqueId) {
        this.entityUniqueId = uniqueId;
    }

    static getMessageName() {
        return MESSAGE_NAME;
    }

    getUniqueId() {
        return this.entityUniqueId;
    }

    getMessagePayload() {
        return [this.entityUniqueId];
    }
}
