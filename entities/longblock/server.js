var _ = require('lodash');
var LongBlockShared = require('./shared');

var LongBlockServer = _.merge(_.clone(LongBlockShared), {
    serverVariable: 'testServer',

    init: function() {
        LongBlockShared.init.call(this);

        this.setModel('longblock');
    }
});

module.exports = LongBlockServer;
