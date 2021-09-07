var express = require('express');
var http = require('http');
var path = require('path');

// create the express app with socket.io
var app = express();
var server = http.createServer(app);
var io = require('socket.io')(server);

io.on("connection", (socket)=>{
    console.log("user sonnected");
})

app.set("view engine", "ejs");

app.get("/", (req, res) =>{
    res.render(path.resolve(__dirname + "/../client/main"));
})

server.listen(process.env.PORT || 3000, () =>{
    console.log("app is running properly");
})