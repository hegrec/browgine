const MESSAGE_NAME = 'loadEntity';

export default class NetLoadEntity {
    constructor(entityData) {
        this.entityData = entityData;
    }

    static getMessageName() {
        return MESSAGE_NAME;
    }

    getEntityData() {
        return this.entityData;
    }

    getMessagePayload() {
        return [this.entityData];
    }
}
