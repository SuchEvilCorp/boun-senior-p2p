const getCpuInfo = () => new Promise(resolve => chrome.system.cpu.getInfo(resolve));
const getMemoryInfo = () => new Promise(resolve => chrome.system.memory.getInfo(resolve));

setTimeout(() => {
  const getFpThen = (fn) => {
    Fingerprint2.get({excludes: {touchSupport: true}}, function (components) {
      var values = components.map(function (component) { return component.value });
      fp = Fingerprint2.x64hash128(values.join(''), 31);
      return fn(fp, components);
    })
  }

  getFpThen((userFp, components) => {
    var socket = io('http://localhost:3140');
    socket.on('connect', function(){
      console.log('Socket connected');
      main();
    });
    socket.on('event', function(data){});
    socket.on('disconnect', function(){});

    socket.on('task', (data, ackFn) => {
      // TODO: give some kind of notification to user when doing a task
      console.log(data);

      const sandbox = document.getElementById('sandboxFrame');
      const receiveResult = event => {
        const result = event.data;
        if (typeof ackFn === 'function') {
          ackFn(result);
        }
        window.removeEventListener('message', receiveResult, false);
      };
      window.addEventListener("message", receiveResult, false);

      sandbox.contentWindow.postMessage(data, '*');
    });

    var peer = new Peer(userFp);

    var main = function () {
      const onPeerConnected = () => {
        localStorage.setItem('peerId', peer.id);
        console.log('Peer connected: %s', peer.id);
        socket.emit('peerConnected', peer.id);
        // remind the socket that this peer is still connected
        setInterval(async () => {
          const cpuInfo = await getCpuInfo();
          const memoryInfo = await getMemoryInfo();

          const cpuName = cpuInfo.modelName;
          const cpuArch = cpuInfo.archName.replace(/_/g, '-');
          const cpuFeatures = cpuInfo.features.join(', ').toUpperCase().replace(/_/g, '.') || '-';
          const numProcessors = cpuInfo.numOfProcessors;
          const cpuUsage = cpuInfo.processors.reduce((xs, { usage }) => xs + Math.round((usage.kernel + usage.user) / usage.total * 100), 0) / numProcessors;
          const memoryUsage = Math.round(memoryInfo.availableCapacity / memoryInfo.capacity * 100)

          socket.emit('peerData', { id: peer.id, numProcessors, cpuUsage, memoryUsage, cpuName, cpuArch, cpuFeatures });
        }, 3 * 1000);
      }
      const waitForIdInterval = setInterval(() => {
        if (peer.id) {
          clearInterval(waitForIdInterval);
          onPeerConnected();
          return;
        }
      }, 50);

      peer.on('connection', function(conn) {
        console.log(peer);
        conn.on('data', function(data){
          // Will print 'hi!'
          console.log(data);
        });
      });
    }
  });
}, 1000);