const socket = io();


socket.on('room', (data) => { //refreshes the room page for each member
    /*
    data = {
        room (object from index.js)
    }
    */
   $("#home").load('room', {user: socket.id, room: data.room}); //.load(route, json_data) makes a post request to /route
})

socket.on("gameStart", (data) => {
    /**
     * data = {
     *  room: allRooms[i]
     * }
     * from server.js
     */
    $("#home").load("showRole", {id: socket.id, room: data.room});
})

socket.on("loadMain", (data) => {
    socket.emit("showMain", {room: data.room, id: socket.id});
})

socket.on("showMain", (data) => {
    /**
     * data = {
     *  room: allRooms[i]
     * }
     * from server.js
     */
    $("#home").load("showMain", {id: socket.id, room: data.room});
})

socket.on("proposePhase", (data) => {
    /**
     * data = {
     *  room: allRooms[i]
     * }
     * from server.js
     */
    $("#home").load("proposePhase", {id: socket.id, room: data.room});
})

socket.on("votingPhase", (data) => {
    /**
     * data = {
     *  room: allRooms[i] 
     * }
     */

    data.room.members.forEach(member => {
        if (member.id == socket.id){
            if (member.proposed) {
                $("#home").load("votingPhaseVoters", {id: socket.id, room: data.room});
            }
            else{
                $("#home").load("votingPhaseOthers", {id: socket.id, room: data.room});
            }
        }
    });

})

socket.on("results", (data) => {
    $("#home").load("results", {win : data.win});
})