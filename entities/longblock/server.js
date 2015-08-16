var _ = require('lodash');
var LongBlockShared = _.clone(require('./shared'));

var LongBlockServer = _.merge(LongBlockShared, {
    serverVariable: 'testServer'
});

module.exports = LongBlockServer;