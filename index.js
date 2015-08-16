var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io').listen(8888);
var Server = require('./server/server');


app.use(express.static('public'));

http.listen(3000, function(){
    var gameServer = new Server(io);
    gameServer.start();
});