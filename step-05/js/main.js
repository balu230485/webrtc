//throw new Error("Something went badly wrong!");
'use strict';
console.log(Date.now() + ' main 1');
var isChannelReady = false;
var isInitiator = false;
var isStarted = false;
var localStream;
var pc;
var remoteStream;
var turnReady;

console.log(Date.now() + ' main 2');
var pcConfig = {
  'iceServers': [{
    'urls': 'stun:stun.l.google.com:19302'
  }]
};

// Set up audio and video regardless of what devices are present.
var sdpConstraints = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: true
};

/////////////////////////////////////////////

var room = 'foo';
// Could prompt for room name:
// room = prompt('Enter room name:');
console.log(Date.now() + ' main 3');

var socket = io.connect();
console.log(Date.now() + ' main 4');

if (room !== '') {
  console.log(Date.now() + ' main 5');
  socket.emit('create or join', room);
  console.log(Date.now() + ' Attempted to create or  join room', room);
}

socket.on('created', function(room) {
  console.log(Date.now() + ' main 6');
  console.log(Date.now() + ' Created room ' + room);
  isInitiator = true;
});

socket.on('full', function(room) {
  console.log(Date.now() + ' main 7');
  console.log(Date.now() + ' Room ' + room + ' is full');
});


socket.on('join', function (room){
  console.log(Date.now() + ' main 8');
  console.log(Date.now() + ' Another peer made a request to join room ' + room);
  console.log(Date.now() + ' This peer is the initiator of room ' + room + '!');
  isChannelReady = true;
});

socket.on('joined', function(room) {
  console.log(Date.now() + ' main 9');
  console.log(Date.now() + ' joined: ' + room);
  isChannelReady = true;
});

socket.on('log', function(array) {
  console.log.apply(console, array);
});


////////////////////////////////////////////////

function sendMessage(message) {
  console.log(Date.now() + ' main 11');
  console.log(Date.now() + ' Client sending message: ', message);
  socket.emit('message', message);
}

// This client receives a message
socket.on('message', function(message) {
  console.log(Date.now() + ' main 12');
  console.log(Date.now() + ' Client received message:', message);
  if (message === 'got user media') {
	console.log(Date.now() + ' main 13');
    maybeStart();
  } else if (message.type === 'offer') {
	console.log(Date.now() + ' main 14');
    if (!isInitiator && !isStarted) {
  	  console.log(Date.now() + ' main 15');
      maybeStart();
    }
    pc.setRemoteDescription(new RTCSessionDescription(message));
    doAnswer();
	console.log(Date.now() + ' main 16');
  } else if (message.type === 'answer' && isStarted) {
	console.log(Date.now() + ' main 17');
    pc.setRemoteDescription(new RTCSessionDescription(message));
  } else if (message.type === 'candidate' && isStarted) {
	console.log(Date.now() + ' main 18');
    var candidate = new RTCIceCandidate({
      sdpMLineIndex: message.label,
      candidate: message.candidate
    });
    pc.addIceCandidate(candidate);
  } else if (message === 'bye' && isStarted) {
	console.log(Date.now() + ' main 20');
    handleRemoteHangup();
  }
});

////////////////////////////////////////////////////

var localVideo = document.querySelector('#localVideo');
var remoteVideo = document.querySelector('#remoteVideo');

/*navigator.mediaDevices.getUserMedia({
  audio: true,
  video: true
})
.then(gotStream)
.catch(function(e) {
  alert('getUserMedia() error: ' + e.name);
});

video: {
    width: { min: 200, ideal: 1280, max: 1920 },
    height: { min: 100, ideal: 720, max: 1080 }
  }
  */


navigator.mediaDevices.getUserMedia({
  audio: true,
  video: true
})
.then(gotStream)
.catch(function(e) {
  alert('getUserMedia() error: ' + e.name);
});

function gotStream(stream) {
  console.log(Date.now() + ' main 21');
  console.log(Date.now() + ' Adding local stream.');
  localStream = stream;
  localVideo.srcObject = stream;
  sendMessage('got user media');
  if (isInitiator) {
    console.log(Date.now() + ' main 22');
    maybeStart();
  }
}

var constraints = {
  audio: true,
  video: {
    width: { min: 200, ideal: 1280, max: 1920 },
    height: { min: 100, ideal: 720, max: 1080 }
  }
};

console.log(Date.now() + ' Getting user media with constraints', constraints);

if (location.hostname !== 'localhost') {
  console.log(Date.now() + ' main 23');
  requestTurn(
    'https://computeengineondemand.appspot.com/turn?username=41784574&key=4080218913'
  );
}

function maybeStart() {
  console.log(Date.now() + ' main 24');
  console.log(Date.now() + ' >>>>>>> maybeStart() ', isStarted, localStream, isChannelReady);
  if (!isStarted && typeof localStream !== 'undefined' && isChannelReady) {
    console.log(Date.now() + ' main 26');
    console.log(Date.now() + ' >>>>>> creating peer connection');
    createPeerConnection();
	pc.addStream(localStream);
    isStarted = true;
    console.log(Date.now() + ' isInitiator', isInitiator);
    if (isInitiator) {
      console.log(Date.now() + ' main 27');
      doCall();
    }
  }
}

window.onbeforeunload = function() {
  console.log(Date.now() + ' main 28');
  sendMessage('bye');
};

/////////////////////////////////////////////////////////

function createPeerConnection() {
  console.log(Date.now() + ' main 29');
  try {
    pc = new RTCPeerConnection(null);
    pc.onicecandidate = handleIceCandidate;
    pc.onaddstream = handleRemoteStreamAdded;
    pc.onremovestream = handleRemoteStreamRemoved;
    console.log(Date.now() + ' Created RTCPeerConnnection');
  } catch (e) {
    console.log(Date.now() + ' Failed to create PeerConnection, exception: ' + e.message);
    alert('Cannot create RTCPeerConnection object.');
    return;
  }
}

function handleIceCandidate(event) {
  console.log(Date.now() + ' main 30 Event');
  console.log(Date.now() + ' icecandidate event: ', event);
  if (event.candidate) {
    sendMessage({
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate
    });
  } else {
    console.log(Date.now() + ' End of candidates.');
  }
}

function handleCreateOfferError(event) {
  console.log(Date.now() + ' main 31');
  console.log(Date.now() + ' createOffer() error: ', event);
}

function doCall() {
  console.log(Date.now() + ' main 32');
  console.log(Date.now() + ' Sending offer to peer');
  pc.createOffer(setLocalAndSendMessage, handleCreateOfferError);
}

function doAnswer() {
  console.log(Date.now() + ' main 33');
  console.log(Date.now() + ' Sending answer to peer.');  
  pc.createAnswer().then(
    setLocalAndSendMessage,
    onCreateSessionDescriptionError
  );
}

function setLocalAndSendMessage(sessionDescription) {
  console.log(Date.now() + ' main 34');
  pc.setLocalDescription(sessionDescription);
  console.log(Date.now() + ' setLocalAndSendMessage sending message', sessionDescription);
  sendMessage(sessionDescription);
}

function onCreateSessionDescriptionError(error) {
  console.log(Date.now() + ' main 35');
  trace('Failed to create session description: ' + error.toString());
}

function requestTurn(turnURL) {
  var turnExists = false;
  console.log(Date.now() + ' main 36');
  for (var i in pcConfig.iceServers) {
    if (pcConfig.iceServers[i].urls.substr(0, 5) === 'turn:') {
      console.log(Date.now() + ' main 37');
      turnExists = true;
      turnReady = true;
      break;
    }
  }
  if (!turnExists) {
    console.log(Date.now() + ' main 38');
    console.log(Date.now() + ' Getting TURN server from ', turnURL);
    // No TURN server. Get one from computeengineondemand.appspot.com:
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4 && xhr.status === 200) {
        console.log(Date.now() + ' main 39');
        var turnServer = JSON.parse(xhr.responseText);
        console.log(Date.now() + ' Got TURN server: ', turnServer);
        pcConfig.iceServers.push({
          'urls': 'turn:' + turnServer.username + '@' + turnServer.turn,
          'credential': turnServer.password
        });
        turnReady = true;
      }
    };
    xhr.open('GET', turnURL, true);
    xhr.send();
  }
}

function handleRemoteStreamAdded(event) {
  console.log(Date.now() + ' main 40 Event');
  console.log(Date.now() + ' Remote stream added.');
  remoteStream = event.stream;
  remoteVideo.srcObject = remoteStream;
}

function handleRemoteStreamRemoved(event) {
  console.log(Date.now() + ' main 41 Event');
  console.log(Date.now() + ' Remote stream removed. Event: ', event);
}

function hangup() {
  console.log(Date.now() + ' main 42');
  console.log(Date.now() + ' Hanging up.');
  stop();
  sendMessage('bye');
}

function handleRemoteHangup() {
  console.log(Date.now() + ' main 43');
  console.log(Date.now() + ' Session terminated.');
  stop();
  isInitiator = false;
}

function stop() {
  console.log(Date.now() + ' main 44');
  isStarted = false;
  pc.close();
  pc = null;
}
