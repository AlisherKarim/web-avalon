const socket = io();

var joinForm = document.getElementById("joinForm");
var createForm = document.getElementById("createform");

joinForm.addEventListener('submit', (e) => {
    console.log("submit happened!");
    e.preventDefault(e);
    var username = document.getElementById("username").value;
    var room = document.getElementById("room").value;
    socket.emit("join room", {room: room, username: username});
})

createForm.addEventListener('submit', (e) => {
    e.preventDefault(e);
    var username = document.getElementById("create-username").value;
    
    var room = "";
    for(var i = 0; i < 6; i++){
        room += Math.floor(Math.random() * 10).toString();
    }
    
    console.log("creating new room event happened!");
    socket.emit("create room", {room: room, username: username});
})

socket.on('room', (data) => { //refreshes the room page for each member
    /*
    data = {
        room (object from index.js)
    }
    */
   console.log("<main.js> socket.on('room')");
   $("#main").load('room', {user: socket.id, room: data.room}); //.load(route, json_data) makes a post request to /route
})



socket.on("gameStart", (data) => {
    /**
     * data = {
     *  room: allRooms[i]
     * }
     * from index.js
     */
    $("#main").load("showRole", {id: socket.id, room: data.room});
})