const MESSAGE_NAME = 'loadEntity';

export default class NetLoadEntity {
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
