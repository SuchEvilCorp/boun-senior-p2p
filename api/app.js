const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const serializeError = require('serialize-error');
const mongoose = require('mongoose');

mongoose.connect('mongodb://root:x123123@ds143614.mlab.com:43614/peery');
mongoose.Promise = global.Promise;

const app = express();
const connectedPeers = new Set();
const lastOnline = new Map();
const availableCPU= new Map();
const connection= new Map();

const http = require('http').Server(app);
const io = require('socket.io')(http);
const models = require('./models');

const port = process.env.PORT || 3140;
// Use these later to limit the peer per task and play with the treshold
const peer_per_task_count= 10;
const cpu_treshold_for_send= 20;

app.use(helmet({ noCache: true, hsts: false }));
app.use(cors({ credentials: true }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/', (req, res) => res.json({ status: 'ok' }));

app.get('/peers', (req, res) => {
  const peers = Array.from(connectedPeers).map(id => ({ id, lastOnline: lastOnline.get(id) }));
  res.json({ peers, count: connectedPeers.size });
});

app.post('/register', async (req, res) => {
  try {
    const user = await models.User.create(req.body);
    return res.json(user);
  } catch (err) {
    return res.sendStatus(400);
  }
});

app.post('/login', async (req, res) => {
  const user = await models.User.findOne(req.body);
  if (!user) return res.sendStatus(401); // unauthorized
  return res.json(user);
});

app.post('/task', async(req, res) => {
  const owner= req.body.ownerId;
  const codeToRun= req.body.code;
  const receiverPeers= Array.from(connectedPeers).
                  map(id => ({ id, availableCPU: availableCPU.get(id) })).
                  filter(peer => { peer.availableCPU > cpu_threshold_for_send });
  
//TODO implement MapReduce here
  const partitionedData= req.body.data;
  let tasks= [], i= -1;
  while(receiverPeers[++i]) {
    tasks.push({
                code: codeToRun,
                receiver: receiverPeers[i],
                data: partitionedData[i]
    });
  }
  await tasks.forEach(task => { peer.connect(task.receiver).on('open', (conn) => {
    conn.send(JSON.stringify({ 
      code: task.code,
      data: task.data
    }));
  })});
});

io.on('connection', (socket) => {
  let ttl;
  let _peerId; // eslint-disable-line

  const setTtl = (peerId) => {
    clearTimeout(ttl);
    ttl = setTimeout(() => {
      connectedPeers.delete(peerId);
    }, 1000 * 5); // 5 min ttl
  };

  socket.on('peerConnected', (peerId) => {
    console.log('New peer: %s', peerId);
    _peerId = peerId;
    connectedPeers.add(peerId);
    lastOnline.set(peerId, Date.now());
    setTtl(peerId);
  });

  socket.on('peerHealthy', (peerId) => {
    // console.log('Peer healthy: %s', peerId);
    if (!connectedPeers.has(peerId)) {
      connectedPeers.add(peerId);
    }
    lastOnline.set(peerId, Date.now());
    setTtl(peerId);
  });

  socket.on('disconnect', () => {
    console.log('Peer disconnected: %s', _peerId);
    connectedPeers.delete(_peerId);
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
