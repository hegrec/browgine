var _ = require('lodash');
var Vec2 = require('vector2-node');
var BaseSharedEntity = _.clone(require('./../base/shared'));

var LongBlockShared = _.merge(BaseSharedEntity, {
    baseClass: "base",
    init: function() {
    }
});

module.exports = LongBlockShared;
