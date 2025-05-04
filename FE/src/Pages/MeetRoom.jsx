import React, { useEffect, useRef, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import Peer from 'simple-peer/simplepeer.min.js';

const MeetRoom = () => {
  const { roomId } = useParams();
  const location = useLocation(); // displayName, camera, mic
  const { displayName, camera, mic } = location.state || {};
  const [showInviteModal, setShowInviteModal] = useState(true);
  const [peers, setPeers] = useState([]);
  const [participants, setParticipants] = useState([]);
  const userVideo = useRef();
  const peersRef = useRef([]);
  const socketRef = useRef();
  const streamRef = useRef();
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteMediaStates, setRemoteMediaStates] = useState({});

  const toggleMic = () => {
    const audioTrack = streamRef.current?.getAudioTracks()[0];
    const videoTrack = streamRef.current?.getVideoTracks()[0];

    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMicOn(audioTrack.enabled);

      // ✅ Emit update to others
      socketRef.current?.emit('media-toggle', {
        userId: socketRef.current.id,
        mic: audioTrack.enabled,
        camera: videoTrack?.enabled ?? false,
        screenSharing: isScreenSharing
      });
    }
  };

  const toggleCamera = () => {
    const videoTrack = streamRef.current?.getVideoTracks()[0];
    const audioTrack = streamRef.current?.getAudioTracks()[0];
  
    const isCurrentlyOn = videoTrack?.enabled ?? false;
    const newCameraState = !isCurrentlyOn;
  
    if (videoTrack) {
      videoTrack.enabled = newCameraState;
    }
  
    setIsCameraOn(newCameraState);
  
    socketRef.current?.emit('media-toggle', {
      userId: socketRef.current.id,
      mic: audioTrack?.enabled ?? false,
      camera: newCameraState,
      screenSharing: isScreenSharing,
    });
  };
  


  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];

        // Replace video track in peer connections
        peersRef.current.forEach(({ peer }) => {
          const sender = peer._pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        });

        // Replace video track in our own stream
        const oldTrack = streamRef.current.getVideoTracks()[0];
        streamRef.current.removeTrack(oldTrack);
        streamRef.current.addTrack(screenTrack);

        if (userVideo.current) {
          userVideo.current.srcObject = streamRef.current;
        }

        screenTrack.onended = () => {
          stopScreenShare();
        };

        setIsScreenSharing(true);
        const audioTrack = streamRef.current?.getAudioTracks()[0];
        const videoTrack = streamRef.current?.getVideoTracks()[0];

        socketRef.current?.emit('media-toggle', {
          userId: socketRef.current.id,
          mic: audioTrack?.enabled ?? false,
          camera: videoTrack?.enabled ?? false,
          screenSharing: true,
        });
      } catch (err) {
        console.error("Error sharing screen:", err);
      }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = async () => {
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({ video: isCameraOn });
      const videoTrack = videoStream.getVideoTracks()[0];

      // Replace video track in peer connections
      peersRef.current.forEach(({ peer }) => {
        const sender = peer._pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(videoTrack);
      });

      // Replace video track in our own stream
      const oldTrack = streamRef.current.getVideoTracks()[0];
      streamRef.current.removeTrack(oldTrack);
      streamRef.current.addTrack(videoTrack);

      if (userVideo.current) {
        userVideo.current.srcObject = streamRef.current;
      }

      setIsScreenSharing(false);
      socketRef.current?.emit('media-toggle', {
        userId: socketRef.current.id,
        mic: audioTrack.enabled,
        camera: videoTrack.enabled, // ✅ real-time
        screenSharing: false
      });
    } catch (err) {
      console.error("Failed to revert to camera after screen share:", err);
    }
  };

  const createPeer = (userToSignal, callerID, stream) => {
    console.log(`Creating peer for ${userToSignal} with stream tracks:`,
      stream ? stream.getTracks().map(t => t.kind).join(', ') : 'no stream');

    const existingPeer = peersRef.current.find(p => p.peerID === userToSignal);
    if (existingPeer) {
      console.warn(`Peer already exists for user ${userToSignal}`);
      return existingPeer.peer; // Return existing peer instead of null
    }

    try {
      const peer = new Peer({
        initiator: true,
        trickle: false,
        stream,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:3478' },
            // { urls: 'stun:stun.voip.a телефон.de' }
            { urls: 'stun:stun.voip.aql.com' },
            // {
            //   urls: 'turn:0.tcp.in.ngrok.io:18481?transport=tcp',
            //   username: 'testuser',
            //   credential: 'testpassword'
            // },
          ],
        },
      });


      peer.on('signal', signal => {
        console.log('📤 Sending signal to:', userToSignal);
        socketRef.current.emit('sending-signal', {
          userToSignal,
          callerID,
          signal,
        });
      });

      return peer;
    } catch (error) {
      console.error("Error creating peer:", error);
      return null;
    }
  };

  const addPeer = (incomingSignal, callerID, stream) => {
    console.log('Adding peer...', callerID);

    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:3478' },
          // { urls: 'stun:stun.voip.a телефон.de' }
          { urls: 'stun:stun.voip.aql.com' },
          // {
          //   urls: 'turn:0.tcp.in.ngrok.io:18481?transport=tcp',
          //   username: 'testuser',
          //   credential: 'testpassword'
          // },
        ],
      },
    });

    peer.on('signal', signal => {
      console.log('📤 Returning signal to:', callerID);
      socketRef.current.emit('returning-signal', { signal, callerID });
    });

    peer.signal(incomingSignal);
    return peer;
  };

  useEffect(() => {
    if (!displayName) {
      alert('Missing user info!');
      return;
    }

    const audioTrack = streamRef.current?.getAudioTracks()[0];
    const videoTrack = streamRef.current?.getVideoTracks()[0];

    navigator.mediaDevices.getUserMedia({
      video: camera,
      audio: mic,
    }).then(stream => {
      console.log("Got local stream", stream);
      streamRef.current = stream;
      const clonedStream = stream.clone();
      if (userVideo.current) {
        userVideo.current.srcObject = stream;
      }

      // Initialize socket connection
      if (!socketRef.current) {
        socketRef.current = io(`${import.meta.env.VITE_BASE_URL}`);

        socketRef.current.on('ice-candidate', ({ candidate, targetId }) => {
          console.log(`Received ICE candidate for ${targetId}`);
          const peerObject = peersRef.current.find(p => p.peerID === targetId);

          if (peerObject?.peer?.signal) {
            try {
              const iceCandidate = new RTCIceCandidate(candidate);
              peerObject.peer.addIceCandidate(iceCandidate);
              console.log("✅ Added ICE candidate for", targetId);
            } catch (error) {
              console.error("❌ ICE candidate error:", error);
            }
          } else {
            console.warn("Peer not found for ICE candidate", targetId);
          }
        });

        socketRef.current.on("connect", () => {
          console.log("Connected to socket:", socketRef.current.id);

          // 🟩 Emit join-room event
          socketRef.current.emit('join-room', {
            roomId,
            userId: socketRef.current.id,
            displayName,
            isCameraOn: videoTrack?.enabled ?? false,
            isMicOn: audioTrack?.enabled ?? false
          });

          socketRef.current?.emit('media-toggle', {
            userId: socketRef.current.id,
            mic: audioTrack?.enabled ?? false,
            camera: videoTrack?.enabled ?? false,
            screenSharing: true,
          });          
        });

        socketRef.current.on('media-toggle', ({ userId, mic, camera, screenSharing }) => {
          console.log(`📡 Media status from ${userId}: mic=${mic}, camera=${camera}, screen=${screenSharing}`);
          setRemoteMediaStates(prev => ({
            ...prev,
            [userId]: { mic, camera, screenSharing }
          }));
          if (userId === socketRef.current.id) {
            const localAudioTrack = streamRef.current?.getAudioTracks()[0];
            const localVideoTrack = streamRef.current?.getVideoTracks()[0];

            if (localAudioTrack) localAudioTrack.enabled = mic;
            if (localVideoTrack) localVideoTrack.enabled = camera;
          }
        });

        socketRef.current.on('all-users', users => {
          console.log("Received all-users", users);
          if (users.length === 0) return;
          const peers = [];
          setParticipants(users);

          users.forEach(user => {
            if (user.userId === socketRef.current.id) return;
            console.log('Creating peer with stream:', stream);
            const peer = createPeer(user.userId, socketRef.current.id, stream.clone());
            peersRef.current.push({
              peerID: user.userId,
              peer,
              displayName: user.displayName,
            });
            peers.push({ peer, displayName: user.displayName });
          });

          setPeers(peers);
        });

        socketRef.current.on('user-joined', payload => {
          const { callerID, displayName, isCameraOn, isMicOn } = payload;
        
          // Add duplicate check
          if (peersRef.current.some(p => p.peerID === callerID)) return;
        
          const peer = createPeer(callerID, socketRef.current.id, streamRef.current);
        
          if (!peer) {
            console.error("Peer creation failed for", callerID);
            return;
          }
        
          peersRef.current.push({
            peerID: callerID,
            peer,
            displayName,
            isCameraOn,
            isMicOn
          });
        
          // Functional update to avoid stale state
          setPeers(prev => [...prev, { peer, displayName, isCameraOn, isMicOn }]);
        });
        

        socketRef.current.on('sending-signal', payload => {
          // Check if peer already exists
          if (peersRef.current.some(p => p.peerID === payload.callerID)) return;

          const peer = addPeer(payload.signal, payload.callerID, streamRef.current);

          // Null check
          if (!peer) return;

          peersRef.current.push({
            peerID: payload.callerID,
            peer,
            displayName: payload.displayName,
          });

          // Batch state updates
          setPeers(prev => [...prev, { peer, displayName: payload.displayName }]);
        });

        socketRef.current.on('user-left', ({ userId }) => {
          const peerObj = peersRef.current.find(p => p.peerID === userId);
          if (peerObj) {
            peerObj.peer.destroy();
            peersRef.current = peersRef.current.filter(p => p.peerID !== userId);
            setPeers(prev => prev.filter(p => p.peer !== peerObj.peer));
            setRemoteMediaStates(prev => {
              const newState = { ...prev };
              delete newState[userId];
              return newState;
            });
          }
        });

        socketRef.current.on('receiving-returned-signal', payload => {
          console.log("📥 Got returning signal", payload);
          const item = peersRef.current.find(p => p.peerID === payload.id);
          if (item) {
            item.peer.signal(payload.signal);
            if (payload.displayName) {
              item.displayName = payload.displayName;
              setPeers(prevPeers => {
                return prevPeers.map(p => {
                  if (p.peer === item.peer) {
                    return { ...p, displayName: payload.displayName };
                  }
                  return p;
                });
              });
            }
          }
        });

      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      peersRef.current.forEach(({ peer }) => peer.destroy());
      setPeers([]);
      setParticipants([]);
      setRemoteMediaStates({});
    };
  }, [displayName, camera, mic, roomId]);


  return (
    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 min-h-screen bg-gray-100">
      {/* Self Video */}
      <div className="relative w-full aspect-video rounded overflow-hidden bg-black">
        <video
          muted
          ref={userVideo}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-2 left-2 bg-black/60 text-white text-sm px-2 py-1 rounded">
          {displayName || 'You'}

          <div className="flex gap-4 justify-center mt-4">
            <button onClick={toggleMic} className="px-4 py-2 bg-gray-700 text-white rounded">
              {isMicOn ? 'Mute Mic' : 'Unmute Mic'}
            </button>
            <button onClick={toggleCamera} className="px-4 py-2 bg-gray-700 text-white rounded">
              {isCameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
            </button>
            <button onClick={toggleScreenShare} className="px-4 py-2 bg-blue-600 text-white rounded">
              {isScreenSharing ? 'Stop Screen Share' : 'Start Screen Share'}
            </button>
          </div>

        </div>

      </div>

      {/* Peers */}
      {peers.map((peerObj, index) => (
        <Video key={index} peer={peerObj.peer} name={peerObj.displayName} />
      ))}

      {showInviteModal && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="bg-white shadow-xl border rounded-xl p-4 w-72 relative">
            <button
              onClick={() => setShowInviteModal(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
            <p className="font-semibold mb-2">Invite Link</p>
            <input
              type="text"
              value={`${window.location.origin}/join/${roomId}`}
              readOnly
              className="w-full p-2 border rounded mb-2 text-sm"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/join/${roomId}`);
                alert('Link copied to clipboard!');
              }}
              className="bg-blue-500 text-white text-sm px-3 py-1 rounded w-full"
            >
              Copy to Clipboard
            </button>
          </div>
        </div>
      )}

    </div>


  );
};

const Video = ({ peer, name }) => {
  const ref = useRef();
  const [hasStream, setHasStream] = useState(false);

  useEffect(() => {
    // Function to set video stream and update state
    const setVideoStream = (stream) => {
      if (ref.current) {
        ref.current.srcObject = stream;
        setHasStream(true);
      }
    };

    // Handler for new streams
    const handleStream = (stream) => {
      console.log("🔁 Received remote stream", stream);
      setVideoStream(stream);
    };

    // Check if peer already has streams (might already have stream)
    if (peer.streams && peer.streams.length > 0) {
      console.log("Using existing peer stream:", peer.streams[0].id);
      setVideoStream(peer.streams[0]);
    }

    peer.on('stream', handleStream);

    // Add event listener for when video starts playing
    const videoElement = ref.current;
    if (videoElement) {
      const handleCanPlay = () => setHasStream(true);
      videoElement.addEventListener('canplay', handleCanPlay);

      // If already has data, update state immediately
      if (videoElement.readyState >= 2) {
        setHasStream(true);
      }

      return () => {
        videoElement.removeEventListener('canplay', handleCanPlay);
        peer.off('stream', handleStream);
      };
    }

    return () => peer.off('stream', handleStream);
  }, [peer]);



  return (
    <div className="relative w-full aspect-video rounded overflow-hidden bg-black">
      <video
        ref={ref}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
        onLoadedData={() => setHasStream(true)}
      />
      <div className="absolute bottom-2 left-2 bg-black/60 text-white text-sm px-2 py-1 rounded">
        {name}
      </div>
      {!hasStream && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-black/70 text-white px-3 py-1 rounded">
            Connecting...
          </div>
        </div>
      )}
    </div>
  );
};



export default MeetRoom;