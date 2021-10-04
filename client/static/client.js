const socket = io();


socket.on('room', (data) => { //refreshes the room page for each member
    /*
    data = {
        room (object from index.js)
    }
    */
   console.log("<main.js> socket.on('room')");
   $("#home").load('room', {user: socket.id, room: data.room}); //.load(route, json_data) makes a post request to /route
})



socket.on("gameStart", (data) => {
    /**
     * data = {
     *  room: allRooms[i]
     * }
     * from index.js
     */
    $("#home").load("showRole", {id: socket.id, room: data.room});
})

socket.on("showMain", (data) => {
    /**
     * data = {
     *  room: allRooms[i]
     * }
     * from index.js
     */
    $("#home").load("showMain", {id: socket.id, room: data.room});
})