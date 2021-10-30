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

// a helper function to shuffle an array
function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

//===============small descriptions of user and room "objects"===========
/*allUsers[i] = {
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
    leaderIndex: int, index of current leader
    currentRound: int, index of current round
    acceptedVotes: int, number of players who accepted the proposal
    declinedVotes: int, number of players who declined the proposal
    captainSwaps: int, number of captain swaps, if reaches 5, spies win the game
    history: List[int], keeps history of the game, 1 - resistance won, 0 - not yet reached, -1 - spies won
    success: int,  number of succes votes
    fail: int, number of fail votes
}


allRooms[i].members[j] = {
    username: String, name of a player
    id: String, socketID
    isSpy: boolean, true if a player is spy, false otherwise
    friends: List[String], list of names of players with the same role
    proposed: boolean //to indicate if this user is proposed for a round or not
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
            spiesCount: 0,
            leaderIndex: 0,
            currentRound: 0,
            acceptedVotes: 0,
            declinedVotes: 0,
            captainSwaps: 0,
            history: [0, 0, 0, 0, 0],
            success: 0,
            fail: 0
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
            isSpy: false, // isSpy = true -> spy, isSpy = false -> resistance
            friends: [], //List[String], list of names of people with the same role
            proposed: false
        });
        socket.join(data.room);

        io.in(data.room).emit('room', {room: allRooms[data.room]});
    })

    socket.on("join room", (data) => {
        console.log("joining the room=" + data.room)
        if(!(data.room in allRooms)){
            socket.emit('alert room', {message: "There is no room with the given room-code!"});
            console.log("join room event for non-existing room!");
            // exit();
            return;
        }
        else if (allRooms[data.room].members.length > 10) {
            socket.emit('alert room', {message: "The room is full!"});
            console.log("join room event for a full room");
            return;
        }
        if (allRooms[data.room].members.find(user => {
            return user.username == data.username;
        })) {
            socket.emit('alert room', {message: "The username is already taken in the room!"});
            console.log("The username is already taken in the room");
            return;
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
            isSpy: false, // isSpy = true -> spy, isSpy = false -> resistance
            friends: [], //List[String], list of names of people with the same role
            proposed: false //to indicate if this user is proposed for a round or not
        });

        socket.join(data.room);
        io.in(data.room).emit('room', {room: allRooms[data.room]});
    })

    socket.on("start", () => {
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
         * Initial assignment happens when the start the game is pressed
         * and there are at least 5 people
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
        //Assigning roles
        var i = 0, randIndex;
        while (i < allRooms[roomID].spiesCount) {
            randIndex = getRandomInt(playerCount);
            if (!allRooms[roomID].members[randIndex].isSpy) { //if player is not a spy
                allRooms[roomID].members[randIndex].isSpy = true; //we make him a spy
                i++;
            }
        }
        //Identifying allies
        for (var i = 0; i < allRooms[roomID].members.length; i++) {
            if (allRooms[roomID].members[i].isSpy == true) { //if a player is spy
                for (var j = 0; j < allRooms[roomID].members.length; j++) {
                    if (allRooms[roomID].members[j].isSpy == true && i != j) {
                        allRooms[roomID].members[i].friends.push(allRooms[roomID].members[j].username);
                    }
                }
            }
            else {
                for (var j = 0; j < allRooms[roomID].members.length; j++) {
                    if (allRooms[roomID].members[j].isSpy == false && i != j) {
                        allRooms[roomID].members[i].friends.push(allRooms[roomID].members[j].username);
                    }
                }
            }
        }
        //Setting up captains
        //shuffled array of members is the order of the leaders
        shuffleArray(allRooms[roomID].members);

        io.in(roomID).emit("gameStart", {room: allRooms[roomID]});
    })

    socket.on("showMain", () => {
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

        if (allRooms[roomID].captainSwaps == 5) {
            //end game
            io.in(roomID).emit("results", {win: true});
            return;
        }

        var spyRounds = 0, resistanceRounds = 0;
        for (var i = 0; i < 5; i++) {
            if (allRooms[roomID].history[i] > 0) {
                resistanceRounds++;
            }
            else if (allRooms[roomID].history[i] < 0) {
                spyRounds++;
            }
        }
        
        if (spyRounds == 3) {
            //spies won
            io.in(roomID).emit("results", {win: true});
            return;
        }

        if (resistanceRounds == 3) {
            // resistance won
            io.in(roomID).emit("results", {win: false});
            return;
        }

        // Each time round is finished, we have to nullify proposed
        allRooms[roomID].members.forEach(member => {
            member.proposed = false;
        });

        // Nullifying votes
        allRooms[roomID].acceptedVotes = 0;
        allRooms[roomID].declinedVotes = 0;

        allRooms[roomID].success = 0;
        allRooms[roomID].fail = 0;

        io.in(roomID).emit("showMain", {room: allRooms[roomID]});
    })

    socket.on("propose", (data) => {
        /**
         * data = {
         *    players[i] = String //name of a player
         * }
         */
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

        allRooms[roomID].members.forEach(member => {
            if (data.players.includes(member.username)) {
                member.proposed = true;
            }
        })

        io.in(roomID).emit("proposePhase", {room: allRooms[roomID]});
    })

    socket.on("acceptDecline", (vote) => {
        /**
         * vote = {
         *      isAccepted = Boolean // vote of a player
         * }
         */
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


        
        if (vote.isAccepted) {
            allRooms[roomID].acceptedVotes += 1;
        }
        else {
            allRooms[roomID].declinedVotes += 1;
        }

        if(allRooms[roomID].acceptedVotes + allRooms[roomID].declinedVotes == allRooms[roomID].members.length){
            if (allRooms[roomID].acceptedVotes > allRooms[roomID].declinedVotes) {
                // passes to the next phase (votePhase)
                if (allRooms[roomID].leaderIndex + 1 == allRooms[roomID].members.length) {
                    allRooms[roomID].leaderIndex = 0;
                }
                else {
                    allRooms[roomID].leaderIndex++;
                }
                allRooms[roomID].currentRound++;

                io.in(roomID).emit("votingPhase", {room : allRooms[roomID]})
            }
            else {
                // repeats vote phases
                if (allRooms[roomID].leaderIndex + 1 == allRooms[roomID].members.length) {
                    allRooms[roomID].leaderIndex = 0;
                }
                else {
                    allRooms[roomID].leaderIndex++;
                }
                allRooms[roomID].captainSwaps++;

                io.in(roomID).emit("loadMain", {room: allRooms[roomID]});
            }
        }
    })

    socket.on("decision", (decision) => {
        /**
         * decision = {
         *      isSuccess = Boolean // decision of a player
         *      id = socket.id //client id
         * }
         */
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

        // if member is a spy, his vote is always success.
        allRooms[roomID].members.forEach(member => {
            if (member.id == decision.id && !member.isSpy) {
                decision.isSuccess = true;
            }
        })

        if (decision.isSuccess) {
            allRooms[roomID].success++;
        }
        else {
            allRooms[roomID].fail++;
        }

        if((allRooms[roomID].success + allRooms[roomID].fail) == allRooms[roomID].roundsDistribution[allRooms[roomID].currentRound - 1]) {
            if(allRooms[roomID].currentRound == 3 && allRooms[roomID].members.length >= 7) {
                if (allRooms[roomID].fail >= 2) {
                    //spies won the round
                    allRooms[roomID].history[allRooms[roomID].currentRound - 1] = -allRooms[roomID].fail;
                }
                else {
                    //resistance won the round
                    allRooms[roomID].history[allRooms[roomID].currentRound - 1] = allRooms[roomID].success;
                }
            }
            else{
                if (allRooms[roomID].fail >= 1) {
                    //spies won the round
                    allRooms[roomID].history[allRooms[roomID].currentRound - 1] = -allRooms[roomID].fail;
                }
                else {
                    //resistance won the round
                    allRooms[roomID].history[allRooms[roomID].currentRound - 1] = allRooms[roomID].success;
                }
            } 

            io.in(roomID).emit("loadMain", ({room: allRooms[roomID]}))
        }
    })

    socket.on("disconnect", () => {
        //todo: implement allRooms[i].members list filtering
        console.log("socket/client disconnected!");
        var currentUser = allUsers.find((user) => {
            return user.id === socket.id;
        })
        //this if is not necessary 
        if(currentUser){
            allUsers = allUsers.filter((user) => {
                return user.id !== socket.id;
            })
        }
        //we have to delete the user from the room if the user existed in some specific room
        if (currentUser) {
            //todo: check if the user is the host of the room
            console.log("user", currentUser.username, "disconnected from his room", currentUser.room);
            allRooms[currentUser.room].members = allRooms[currentUser.room].members.filter((user) =>{
                return user.id !== socket.id;
            });
            if(allRooms[currentUser.room].roomhost === currentUser.id && allRooms[currentUser.room].members.length > 0){
                allRooms[currentUser.room].roomhost = allRooms[currentUser.room].members[0].id;
            }
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

app.post("/showMain", (req, res) => {
    res.render("mainPhase_regular", {id: req.body.id, room: req.body.room});
})

app.post("/proposePhase", (req, res) => {
    res.render("proposePhase", {id: req.body.id, room: req.body.room});
})


app.post("/votingPhaseOthers", (req, res) => {
    res.render("votePhase_others", {id: req.body.id, room: req.body.room})
})

app.post("/votingPhaseVoters", (req, res) => {
    res.render("votePhase_voters", {id: req.body.id, room: req.body.room})
})

app.post("/results", (req, res) => {
    res.render("results", {win : req.body.win})
})

//===============Server LISTENS=================
server.listen(process.env.PORT || 3000, function(){
   console.log('listening on localhost:3000');
});


