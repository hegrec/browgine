var _ = require('lodash');
var Vec2 = require('vector2-node');
var BaseSharedEntity = _.clone(require('./../base/shared'));

var LongBlockShared = _.merge(BaseSharedEntity, {
    init: function() {
        console.log("testinclinshared")
        this.physicsState.vertices = [
            new Vec2(-0.5, 1.5),
            new Vec2(0.5, 1.5),
            new Vec2(0.5, -1.5),
            new Vec2(-0.5, -1.5)
        ];
    }
});

module.exports = LongBlockShared;