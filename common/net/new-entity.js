const MESSAGE_NAME = 'newEntity';

export default class NetNewEntity {
    constructor() {
        this.entityData = arguments[0];
    }

    static getMessageName() {
        return MESSAGE_NAME;
    }

    getMessagePayload() {
        return this.entityData;
    }
}
