const MESSAGE_NAME = 'load';

export default class NetLoadGame {
    constructor(mapData, localPlayerId) {
        this.mapData = mapData;
        this.localPlayerId = localPlayerId;
    }

    static getMessageName() {
        return MESSAGE_NAME;
    }

    getMapData() {
        return this.mapData;
    }

    getLocalPlayerId() {
        return this.localPlayerId;
    }

    getMessagePayload() {
        return [this.mapData, this.localPlayerId];
    }
}
