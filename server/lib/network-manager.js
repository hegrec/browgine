import socketIo from 'socket.io';

export default class ServerNetworkManager {
    constructor(port) {
        this.io = socketIo.listen(port);

        this.handlePlayerConnected = function() {};
        this.handlePlayerInit = function() {};
        this.handlePlayerChat = function() {};
    }

    initialize() {
        this.io.on('connection', (socket) => {
            const player = this.handlePlayerInit();
            player.setSocket(socket);

            this.handlePlayerConnected(player);
        });
    }

    broadcastMessage(message) {
        this.io.emit(message.constructor.getMessageName(), message.getMessagePayload());
    }

    setPlayerConnectedHandler(handler) {
        this.handlePlayerConnected = handler;
    }

    setPlayerChatHandler(handler) {
        this.handlePlayerChat = handler;
    }

    setPlayerInitHandler(handler) {
        this.handlePlayerInit = handler;
    }
}
