var _ = require('lodash');
var LongBlockShared = _.clone(require('./shared'));

var LongBlockClient = _.merge(LongBlockShared, {
    init: function() { console.log("testinsdsclin")},
});

module.exports = LongBlockClient;