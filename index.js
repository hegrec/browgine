import express from 'express';
import http from 'http';

let app = express();
let GameServer = require('./server/server');
let options = {
    socketIoPort: 8888,
    serverPort: 4000
};
let server = http.Server(app);

app.use(express.static('public'));

server.listen(options.serverPort, '0.0.0.0', () => {
    let gameServer = new GameServer(options);
    gameServer.start();
});
