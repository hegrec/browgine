const MESSAGE_NAME = 'updateEntity';

export default class NetUpdateEntity {
    constructor(entityData) {
        this.entityData = entityData;
    }

    static getMessageName() {
        return MESSAGE_NAME;
    }

    getUpdatedEntity() {
        return this.entityData;
    }

    getMessagePayload() {
        return [this.entityData];
    }
}
