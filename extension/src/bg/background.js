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


    var peer = new Peer(userFp);

    var main = function () {
      const onPeerConnected = () => {
        localStorage.setItem('peerId', peer.id);
        console.log('Peer connected: %s', peer.id);
        socket.emit('peerConnected', peer.id);
        // remind the socket that this peer is still connected
        setInterval(() => {
          socket.emit('peerHealthy', peer.id);
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