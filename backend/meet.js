const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const { v4: uuidv4 } = require('uuid');


app.get('/', function(req, res){
  res.sendFile(__dirname + '/meet.html');
});


io.on('connection', function(socket){
  const uuid = uuidv4();
  console.log('New User Connected With UserId : ' + uuid);
  
  socket.on('getuserId', function(image){
    io.emit('getuserId', uuid);
  });
  socket.on('stream', function(image){
    io.emit('stream', image);
    socket.broadcast.emit('stream',{userId : image.userId,image : image.image});
  });
});



http.listen(3000, function(){
  console.log('listening on *:3000');
});
