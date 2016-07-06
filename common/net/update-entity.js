const MESSAGE_NAME = 'updateEntity';

export default class NetUpdateEntity {
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
