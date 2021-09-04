const express = require('express')
var path = require('path')
const app = express()

app.get("/", (req, res)=>{
    res.sendFile(path.resolve(__dirname + "/../client/index.html"));
})

app.get("/game", (req, res)=>{
    res.sendFile(path.resolve(__dirname + "/../client/game.html"));
})

app.listen(process.env.PORT || 3000, process.env.IP, function(){
    console.log('app is running properly!...')
})