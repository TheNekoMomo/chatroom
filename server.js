const express = require('express');
const { createServer } = require('node:http');
const { Server } = require('socket.io');

const port = 3001;

const app = express();
const server = createServer(app);
const io = new Server(server, {
  connectionStateRecovery: {}
});

app.set('view engine', 'ejs');
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.render('index');
});

server.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});