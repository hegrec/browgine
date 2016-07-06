var _ = require('lodash');
var BaseSharedEntity = _.clone(require('./shared'));

var BaseServerEntity = _.merge(BaseSharedEntity, {
    serverVariable: 'testServer',

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
            x: this.getPhysicsState().position.x,
            y: this.getPhysicsState().position.y,
            uniqueId: this.uniqueId,
            angle: this.getPhysicsState().angle
        };
    }
});

module.exports = BaseServerEntity;
