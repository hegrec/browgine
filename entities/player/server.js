var _ = require('lodash'),
    SharedPlayer = _.clone(require('./shared'));

var ServerPlayer = _.merge(SharedPlayer, {
    socket: null,
    setSocket: function (sck) {
        this.socket = sck;
    },

    getIPAddress: function() {
        return this.socket.handshake.address;
    },

    disconnect: function () {
        this.socket.disconnect();
    },

    sendMessage(netMessage) {
        this.socket.emit(netMessage.constructor.getMessageName(), netMessage.getMessagePayload());
    },

    on(messageClass, callback) {
        this.socket.on(messageClass.getMessageName(), (messageData) => {
            const message = Object.create(messageClass.prototype);
            messageClass.apply(message, messageData);

            callback.call(this, message);
        })
    }
});

module.exports = ServerPlayer;
