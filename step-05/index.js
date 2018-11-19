//return  process.abort();
console.log(new Date().getTime() + ` index 1`);

'use strict';

var os = require('os');
var nodeStatic = require('node-static');
var http = require('http');
var socketIO = require('socket.io');
console.log(new Date().getTime() + ` index 2`);

var fileServer = new(nodeStatic.Server)();
var app = http.createServer(function(req, res) {
  console.log(new Date().getTime() + ` index 3`);
  fileServer.serve(req, res);
}).listen(8080);

var io = socketIO.listen(app);
io.sockets.on('connection', function(socket) {

  // convenience function to log server messages on the client
  function log() {
    var array = ['Message from server:'];
    array.push.apply(array, arguments);
    socket.emit('log', array);
  }

  socket.on('message', function(message) {
    console.log(new Date().getTime() + ` index 5` + message);
    log('Client said: ', message);
    // for a real app, would be room-only (not broadcast)
    socket.broadcast.emit('message', message);
  });

  socket.on('create or join', function(room) {
    console.log(new Date().getTime() + ` index 6 ` + room);
    log('Received request to create or join room ' + room);

    var clientsInRoom = io.sockets.adapter.rooms[room];
    var numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;
    log('Room ' + room + ' now has ' + numClients + ' client(s)');

    if (numClients === 0) {
      console.log(new Date().getTime() + ` index 7`);
      socket.join(room);
      log('Client ID ' + socket.id + ' created room ' + room);
      socket.emit('created', room, socket.id);

    } else if (numClients === 1) {
      console.log(new Date().getTime() + ` index 8`);
      log('Client ID ' + socket.id + ' joined room ' + room);
      io.sockets.in(room).emit('join', room);
	  socket.join(room);
      socket.emit('joined', room, socket.id);
      io.sockets.in(room).emit('ready');
    } else { // max two clients
      console.log(new Date().getTime() + ` index 9`);
      socket.emit('full', room);
    }
  });

  socket.on('ipaddr', function() {
    console.log(new Date().getTime() + ` index 10`);
    var ifaces = os.networkInterfaces();
    for (var dev in ifaces) {
      ifaces[dev].forEach(function(details) {
        if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
          socket.emit('ipaddr', details.address);
        }
      });
    }
  });

  socket.on('bye', function(){
    console.log(new Date().getTime() + ` index 11`);
    console.log(new Date().getTime() + ` received bye`);
  });

});
