const socket = io();

var joinForm = document.getElementById("joinForm");

joinForm.addEventListener('submit', (e)=>{
    console.log("submit happened!");
    e.preventDefault(e);
    var username = document.getElementById("username").value;
    var room = document.getElementById("room").value;
    socket.emit("join room", {room: room, username: username});
    document.getElementById("username").value = "";
    document.getElementById("room").value = "";
    document.getElementById("joinForm").style.display = "none";
    document.getElementById("room_members_list").style.display = "block";
})

socket.on('your room', (room_members)=>{
    console.log("ou yeah...");
    document.getElementById("room_members_ul").innerHTML = "";
    for(var i = 0; i < room_members.length; i++){
        const li = document.createElement("li");
        li.classList.add("list-group-item");
        li.innerText = room_members[i].username;
        document.getElementById("room_members_ul").appendChild(li);
    }
})