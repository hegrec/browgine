var _ = require('lodash');
var BaseSharedEntity = _.clone(require('./shared'));

var BaseServerEntity = _.merge(BaseSharedEntity, {
    serverVariable: 'testServer'
});

module.exports = BaseServerEntity;