var Vec2 = require('vector2-node'),
    _ = require('lodash'),
    SharedPlayer = _.clone(require('./shared'));

var ServerPlayer = _.merge(SharedPlayer, {
    socket: null,

    setSocket: function (socket) {
        this.socket = socket;
    },

    disconnect: function () {
        this.socket.disconnect();
    }
});

module.exports = ServerPlayer;
