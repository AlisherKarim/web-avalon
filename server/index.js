var express         = require('express');
var app             = express();
var server          = require('http').Server(app);
var io              = require('socket.io')(server);
var path            = require('path')

app.set("view engine", "ejs");
app.set("views", path.resolve(__dirname + "/../client"));
app.use(express.json()); // Used to parse JSON bodies
app.use(express.urlencoded()); //Parse URL-encoded bodies
app.use("/static", express.static(path.resolve(__dirname + '/../client/static/')));


var users = new Array();
var rooms = {};

//===============Socket IO=====================
io.on('connection', function (socket) {
    console.log("user connected!");
    socket.on("join room", (data)=>{
        users.push(
            {
                id: socket.id, 
                username: data.username, 
                room: data.room
            }
        )
        if(!(data.room in rooms)){
            rooms[data.room] = [];
        }
        rooms[data.room].push({
            username: data.username,
            id: socket.id
        });
        socket.join(data.room);
        io.in(data.room).emit('your room', rooms[data.room]);
    })

    socket.on("disconnect", ()=>{
        console.log("User disconnected!");
        var currentUser = users.find((user) => {
            return user.id === socket.id;
        })
        users = users.filter((user)=>{ 
            return user.id !== socket.id;
        });
        if(currentUser){
            console.log("user", currentUser.username, "disconnected from his room", currentUser.room);
            rooms[currentUser.room] = rooms[currentUser.room].filter((user) =>{
                return user.id !== socket.id;
            });
            io.in(currentUser.room).emit('your room', rooms[currentUser.room]);
        }
    })
})


//===============GET requests==================
app.get("/", (req, res) =>{
    res.render("main");
})

app.get("/game", (req, res) =>{
    res.render(("room"), {users: users});
})
  

//===============POST requests==================
// app.post("/game", (req, res) =>{
//     users.push(req.body.username);
//     res.redirect("/game/1234");
// })


//===============Server LISTENS=================
server.listen(3000, function(){
   console.log('listening on localhost:3000');
});


