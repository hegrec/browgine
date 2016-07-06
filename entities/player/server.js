var _ = require('lodash'),
    SharedPlayer = _.clone(require('./shared'));

let socket = null;

var ServerPlayer = _.merge(SharedPlayer, {
    setSocket: function (sck) {
        socket = sck;
    },

    getIPAddress: function() {
        return socket.handshake.address;
    },

    disconnect: function () {
        socket.disconnect();
    },

    sendMessage(netMessage) {
        socket.emit(netMessage.constructor.getMessageName(), netMessage.getMessagePayload());
    },

    on(messageClass, callback) {
        socket.on(messageClass.getMessageName(), (messageData) => {
            const message = new messageClass(messageData);

            callback.call(this, message);
        })
    }
});

module.exports = ServerPlayer;
