const socket = io();

var joinForm = document.getElementById("joinForm");

joinForm.addEventListener('submit', (e)=>{
    console.log("submit happened!");
    e.preventDefault(e);
    var username = document.getElementById("username").value;
    var room = document.getElementById("room").value;
    socket.emit("join room", {room: room, username: username});
})

socket.on('room', (data) => {
    $("#main").load('room', {members: data}); //.load(route, json_data) makes a post request to /route
})
