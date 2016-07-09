var _ = require('lodash');
var BaseSharedEntity = _.clone(require('./shared'));

function shorten(value) {
    return Math.round(value * 100) / 100;
}


var BaseServerEntity = _.merge(BaseSharedEntity, {
    serverVariable: 'testServer',
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
