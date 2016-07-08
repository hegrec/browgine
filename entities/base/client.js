var _ = require('lodash');
var BaseSharedEntity = _.clone(require('./shared'));

var BaseClientEntity = _.merge(BaseSharedEntity, {
    texture: null,

    init: function() {},

    setTexture: function(texturePath) {
        this.texture = texturePath;
    },

    getTexture: function() {
        return this.texture;
    }
});

module.exports = BaseClientEntity;
