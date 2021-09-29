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


var allUsers = new Array();
var allRooms = new Map();

// a helper function to generate random integers [0, max)
function getRandomInt(max) { 
    return Math.floor(Math.random() * max);
}

//===============small descriptions of user and room "objects"===========
/*user = {
    id: String, socketID,
    username: String, nickName,
    room: String, room id the user is in,
}

allRooms[i] is a list of users in ith room
allRooms[i] = {
    id: String, 6 digits
    roomhost: String, socket-id of the person who created it
    members: List[Object], users in this room (refer below)
    roundsDistribution: List[int], number of members going for a round
    spiesCount: int, number of spies
}

allRooms[i].members[j] = {
    username: String, name of a player
    id: String, socketID
    role: boolean, true if a player is spy, false otherwise
    friends: List[String], list of names of players with the same role
}

*/


//===============Socket IO=====================
io.on('connection', function (socket) {
    console.log("socket/client connected!");

    socket.on("create room", (data) => {
        allRooms[data.room] = {
            id: data.room,
            roomhost: socket.id,
            members: [],
            roundsDistribution: [],
            spiesCount: 0
        };
        allUsers.push(
            {
                id: socket.id, 
                username: data.username, 
                room: data.room
            }
        )
        allRooms[data.room].members.push({
            username: data.username,
            id: socket.id,
            role: false, // role = true -> spy, role = false -> resistance
            friends: [] //List[String], list of names of people with the same role
        });
        socket.join(data.room);

        io.in(data.room).emit('room', {room: allRooms[data.room]});
    })

    socket.on("join room", (data) => {
        console.log("joining the room=" + data.room)
        if (allRooms[data.room].members.length > 10) {
            //todo: implement notification of full room
            console.log("join room event for a full room");
            exit();
        }
        if(!(data.room in allRooms)){
            //todo: implement notification of non-existing room
            console.log("join room event for non-existing room!");
            exit();
        }
        allUsers.push(
            {
                id: socket.id, 
                username: data.username, 
                room: data.room
            }
        )
        
        allRooms[data.room].members.push({
            username: data.username,
            id: socket.id,
            role: false, // role = true -> spy, role = false -> resistance
            friends: [] //List[String], list of names of people with the same role
        });

        socket.join(data.room);
        io.in(data.room).emit('room', {room: allRooms[data.room]});
    })

    socket.on("start", () => {
        console.log("the game started! <index.js>")
        var roomID = "", found = false;
        for (var i = 0; i < allUsers.length; i++) {
            if (allUsers[i].id.localeCompare(socket.id) == 0) {
                roomID = allUsers[i].room;
                found = true;
                break;
            }
        }
        if (!found) { // if room is not found
            console.log("Room not found error!")
            exit(-1);
        }
        /**
         * When start button is pressed we assign roles
         * Initial assignment of roles happens when the number of members
         * reaches 5 people
         */
        const playerCount = allRooms[roomID].members.length;
        if (playerCount == 5) {
            allRooms[roomID].spiesCount = 2;
            allRooms[roomID].roundsDistribution[0] = 2;
            allRooms[roomID].roundsDistribution[1] = 3;
            allRooms[roomID].roundsDistribution[2] = 2;
            allRooms[roomID].roundsDistribution[3] = 3;
            allRooms[roomID].roundsDistribution[4] = 3;
        }
        else if (playerCount == 6) {
            allRooms[roomID].spiesCount = 2;
            allRooms[roomID].roundsDistribution[0] = 2;
            allRooms[roomID].roundsDistribution[1] = 3;
            allRooms[roomID].roundsDistribution[2] = 4;
            allRooms[roomID].roundsDistribution[3] = 3;
            allRooms[roomID].roundsDistribution[4] = 4;
        }
        else if (playerCount == 7) { // from 7 people and more, 4th round is a star round(requires two fails)
            allRooms[roomID].spiesCount = 3;
            allRooms[roomID].roundsDistribution[0] = 2;
            allRooms[roomID].roundsDistribution[1] = 3;
            allRooms[roomID].roundsDistribution[2] = 3;
            allRooms[roomID].roundsDistribution[3] = 4;
            allRooms[roomID].roundsDistribution[4] = 4;
        }
        else if (playerCount == 8 || playerCount == 9) {
            allRooms[roomID].spiesCount = 3;
            allRooms[roomID].roundsDistribution[0] = 3;
            allRooms[roomID].roundsDistribution[1] = 4;
            allRooms[roomID].roundsDistribution[2] = 4;
            allRooms[roomID].roundsDistribution[3] = 5;
            allRooms[roomID].roundsDistribution[4] = 5;
        }
        else {
            allRooms[roomID].spiesCount = 4;
            allRooms[roomID].roundsDistribution[0] = 3;
            allRooms[roomID].roundsDistribution[1] = 4;
            allRooms[roomID].roundsDistribution[2] = 4;
            allRooms[roomID].roundsDistribution[3] = 5;
            allRooms[roomID].roundsDistribution[4] = 5;
        }
        var i = 0, randIndex;
        while (i < allRooms[roomID].spiesCount) {
            randIndex = getRandomInt(playerCount);
            if (!allRooms[roomID].members[randIndex].role) { //if player is not a spy
                allRooms[roomID].members[randIndex].role = true; //we make him a spy
                i++;
            }
        }
        for (var i = 0; i < allRooms[roomID].members.length; i++) {
            if (allRooms[roomID].members[i].role == true) { //if a player is spy
                for (var j = 0; j < allRooms[roomID].members.length; j++) {
                    if (allRooms[roomID].members[j].role == true && i != j) {
                        allRooms[roomID].members[i].friends.push(allRooms[roomID].members[j].username);
                    }
                }
            }
            else {
                for (var j = 0; j < allRooms[roomID].members.length; j++) {
                    if (allRooms[roomID].members[j].role == false && i != j) {
                        allRooms[roomID].members[i].friends.push(allRooms[roomID].members[j].username);
                    }
                }
            }
        }
        console.log(allRooms[roomID].members[0].friends);
        io.in(roomID).emit("gameStart", {room: allRooms[roomID]});
    })  

    socket.on("disconnect", () => {
        //todo: implement allRooms[i].members list filtering
        console.log("socket/client disconnected!");
        var currentUser = allUsers.find((user) => {
            return user.id === socket.id;
        })
        allUsers = allUsers.filter((user)=>{ 
            return user.id !== socket.id;
        });
        //we have to delete the user from the room if the user existed in some specific room
        if (currentUser) {
            //todo: check if the user is the host of the room
            console.log("user", currentUser.username, "disconnected from his room", currentUser.room);
            allRooms[currentUser.room].members = allRooms[currentUser.room].members.filter((user) =>{
                return user.id !== socket.id;
            });
            io.in(currentUser.room).emit('room', {room: allRooms[currentUser.room]});
        }
    })
})


//===============GET requests==================
app.get("/", (req, res) =>{
    res.render("main");
})

app.get("/game", (req, res) =>{
    res.render(("game"), {users: allUsers});
})


//===============POST requests==================
app.post("/room", (req, res) => {
    // console.log(req.body);
    res.render('room', {room: req.body.room, user: req.body.user});
})

app.post("/showRole", (req, res) => {
    res.render('showRole', {id: req.body.id, room: req.body.room});
})

//===============Server LISTENS=================
server.listen(3000, function(){
   console.log('listening on localhost:3000');
});


