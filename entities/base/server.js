var _ = require('lodash');
var BaseSharedEntity = _.clone(require('./shared'));

function shorten(value) {
    return Math.round(value * 1000) / 1000;
}


var BaseServerEntity = _.merge(BaseSharedEntity, {
    stateHash:  '',
    init: function() {
        this.setModel('base');
    },

    getEntityNetworkData: function() {
        return {
            className: this.getClass(),
            uniqueId: this.uniqueId,
            instanceData: {
                model: this.getModel()
            }
        };
    },

    stateChanged: function(data) {
        return this.stateHash !== this.getStateHash(data);
    },

    getStateHash(data) {
        return `${data.x}|${data.y}|${data.angle}`;
    },

    setNetworkState(data) {
        this.stateHash = this.getStateHash(data);
    },

    getUpdateData: function() {
        return {
            x: shorten(this.getPhysicsState().position.x),
            y: shorten(this.getPhysicsState().position.y),
            uniqueId: this.uniqueId,
            angle: shorten(this.getPhysicsState().angle)
        };
    }
});

module.exports = BaseServerEntity;
