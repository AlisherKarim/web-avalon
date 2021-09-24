var express         = require('express');
var app             = express();
var server          = require('http').Server(app);
var io              = require('socket.io')(server);
var path            = require('path');
const { exit } = require('process');

app.set("view engine", "ejs");
app.set("views", path.resolve(__dirname + "/../client"));
app.use(express.json()); // Used to parse JSON bodies
app.use(express.urlencoded()); //Parse URL-encoded bodies
app.use("/static", express.static(path.resolve(__dirname + '/../client/static/')));


var users = new Array();
var rooms = {}; //dictionary or map

//===============small descriptions of user and room "objects"===========
/*user = {
    id: String, socketID,
    username: String, nickName,
    room: String, room id the user is in,
}

rooms[i] is a list of users in ith room
rooms[i] = {
    roomhost: String, socket-id of the person who created it
    members: List, users in this room
}

*/


//===============Socket IO=====================
io.on('connection', function (socket) {
    console.log("user connected!");

    socket.on("create room", (data) => {
        rooms[data.room] = {
            roomhost: socket.id,
            members: []
        };
        users.push(
            {
                id: socket.id, 
                username: data.username, 
                room: data.room
            }
        )
        rooms[data.room].members.push({
            username: data.username,
            id: data.room
        });
        socket.join(data.room);
        io.in(data.room).emit('room', {roomID: data.room, room: rooms[data.room]});
    })

    socket.on("join room", (data)=>{
        users.push(
            {
                id: socket.id, 
                username: data.username, 
                room: data.room
            }
        )
        if(!(data.room in rooms)){
            console.log("join room event for non-existing room!");
            exit();
        }
        rooms[data.room].members.push({
            username: data.username,
            id: socket.id
        });
        socket.join(data.room);
        io.in(data.room).emit('room', {roomID: data.room, room: rooms[data.room]});
    })

    socket.on("disconnect", ()=>{
        console.log("User disconnected!");
        var currentUser = users.find((user) => {
            return user.id === socket.id;
        })
        users = users.filter((user)=>{ 
            return user.id !== socket.id;
        });
        //we have to delete the user from the room if the user existed in some specific room
        if(currentUser){
            console.log("user", currentUser.username, "disconnected from his room", currentUser.room);
            rooms[currentUser.room].members = rooms[currentUser.room].members.filter((user) =>{
                return user.id !== socket.id;
            });
            io.in(currentUser.room).emit('room', {room: rooms[currentUser.room], roomID: currentUser.room});
        }
    })
})


//===============GET requests==================
app.get("/", (req, res) =>{
    res.render("main");
})

app.get("/game", (req, res) =>{
    res.render(("game"), {users: users});
})


//===============POST requests==================
app.post("/room", (req, res) => {
    // console.log(req.body);
    res.render('room', {room: req.body.room, roomID: req.body.roomID, user: req.body.user});
})

//===============Server LISTENS=================
server.listen(3000, function(){
   console.log('listening on localhost:3000');
});


