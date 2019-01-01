const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const serializeError = require('serialize-error');

const app = express();

var http = require('http').Server(app);
var io = require('socket.io')(http);

const port = process.env.PORT || 3140;

app.use(helmet({ noCache: true, hsts: false }));
app.use(cors({ credentials: true }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/', (req, res) => res.json({ status: 'ok' }));

io.on('connection', (socket) => {
  console.log(socket.id);

  console.log('a user connected');

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

http.listen(port, () => console.log(`Example app listening on port ${port}!`));

// error handler
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    error: serializeError(err)
  });
});

module.exports = app;
