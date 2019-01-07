require('dotenv').config();
const express = require('express');
const XMLHttpRequest = require('xhr2');
const winston = require('winston');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const serializeError = require('serialize-error');
const mongoose = require('mongoose');
const _ = require('lodash');
const Papa = require('papaparse');

global.XMLHttpRequest = XMLHttpRequest;

// set up logging
const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.splat(),
    winston.format.json()
  ),
  transports: [
    // write all logs error (and below) to `error.log`.
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    // write to all logs to `combined.log`
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    level: 'debug',
    format: winston.format.combine(
      winston.format.splat(),
      winston.format.simple()
    )
  }));
}

mongoose.connect('mongodb://root:x123123@ds143614.mlab.com:43614/peery');
mongoose.Promise = global.Promise;

const app = express();
const connectedPeers = {};
const sockets = {};

const http = require('http').Server(app);
const io = require('socket.io')(http);
const uploadS3 = require('./uploadS3');
const models = require('./models');

const port = process.env.PORT || 3140;
const maxChunkSize = 10e3;
const numPeersPerTask = 50;
const peerMaxCpu = 95; // TODO: use later

app.use(helmet({ noCache: true, hsts: false }));
app.use(cors({ credentials: true }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const getPeers = () => Object.entries(connectedPeers).map(([id, peerData]) => ({ id, ...peerData }));

const parseData = data => new Promise((resolve, reject) => {
  if (!data || !data.payload) return [];
  if (data.type === 'csv') {
    return Papa.parse(data.payload, {
      download: !!data.payload.match(/https?:\/\/.*$/),
      skipEmptyLines: true,
      trimHeaders: true,
      dynamicTyping: true,
      complete: (res) => {
        resolve(res.data);
      },
      error: (err) => {
        reject(err);
      }
    });
  }
  return [];
});

app.get('/', (req, res) => res.json({ status: 'ok' }));

app.get('/peers', (req, res) => {
  const peers = getPeers();
  res.json({ peers, count: peers.size });
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

app.get('/task', async (req, res) => {
  const tasks = await models.Task.find({});
  res.json({ tasks, count: tasks.length });
});

app.post('/task', async (req, res) => {
  const { ownerId, code, data } = req.body;
  const peers = getPeers()
    .filter(peer => peer.cpuUsage < peerMaxCpu)
    .slice(0, numPeersPerTask);
  if (!peers.length) return res.status(401).send('No available peers');

  const task = await models.Task.create({ ownerId, code, data });
  task.peers = peers.map(p => p.id);
  await task.save();

  let rows = [];
  try {
    rows = await parseData(data);
  } catch (err) {
    console.error(err);
    logger.error(err.message);
    return res.status(401).send(err.message || 'Unexpected error');
  }

  const chunks = _.chunk(rows, Math.min(rows.length / peers.length, maxChunkSize))
    // give each chunk the index number so we can build the output asynchronously later
    .map((chunk, idx) => ({ code, data: chunk, chunkNum: idx }));

  res.json({ queued: true });

  const resultChunks = await Promise.all(
    chunks.map((chunk, idx) => new Promise((resolve, reject) => {
      sockets[peers[idx % peers.length].id].emit('task', chunk, (chunkRes) => {
        // TODO: error handling => on error, give the failed chunk to a new peer
        resolve(chunkRes);
      });
    }))
  );

  const result = _.flatten(resultChunks);
  const resultFile = (await uploadS3(result)).Location;

  task.isDone = true;
  task.completedAt = new Date();
  task.result = resultFile;
  await task.save();
});

io.on('connection', (socket) => {
  let ttl;
  let _peerId;

  const setTtl = (peerId) => {
    clearTimeout(ttl);
    ttl = setTimeout(() => {
      delete connectedPeers[peerId];
    }, 1000 * 5); // 5 min ttl
  };

  socket.on('peerConnected', (peerId) => {
    logger.log('debug', 'New peer: %s', peerId);
    _peerId = peerId;
    connectedPeers[peerId] = { lastOnline: Date.now() };
    sockets[peerId] = socket;
    setTtl(peerId);
  });

  socket.on('peerData', ({ id, ...restData }) => {
    // logger.log('debug', 'Peer data: %s', id, restData);
    if (!connectedPeers[id]) {
      connectedPeers[id] = {};
    }
    connectedPeers[id] = { ...connectedPeers[id], ...restData };
    connectedPeers[id].lastOnline = Date.now();
    setTtl(id);
  });

  socket.on('disconnect', () => {
    logger.log('debug', 'Peer disconnected: %s', _peerId);
    delete sockets[_peerId];
    delete connectedPeers[_peerId];
  });
});

http.listen(port, () => logger.log('info', `Example app listening on port ${port}!`));

// error handler
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    error: serializeError(err)
  });
});

const runAllTasks = () => {
  models.Task.find({ completedAt: null }).then((tasks) => {
    tasks.forEach(async (task) => {
      let rows = [];
      try {
        rows = await parseData(task.data);
      } catch (err) {
        console.error(err);
        return;
      }

      const peers = getPeers();

      const chunks = _.chunk(rows, Math.min(rows.length / peers.length, maxChunkSize))
      // give each chunk the index number so we can build the output asynchronously later
        .map((chunk, idx) => ({ code: task.code, data: chunk, chunkNum: idx }));

      const resultChunks = await Promise.all(
        chunks.map((chunk, idx) => new Promise((resolve, reject) => {
          sockets[peers[idx % peers.length].id].emit('task', chunk, (chunkRes) => {
          // TODO: error handling => on error, give the failed chunk to a new peer
            resolve(chunkRes);
          });
        }))
      );

      const result = _.flatten(resultChunks);
      const resultFile = (await uploadS3(result)).Location;

      task.isDone = true;
      task.completedAt = new Date();
      task.result = resultFile;
      await task.save();
    });
  });
};

runAllTasks();

module.exports = app;
