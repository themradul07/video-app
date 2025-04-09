import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import io from "socket.io-client";

const socket = io("http://localhost:5000");

const VideoChat = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const incomingRoomID = queryParams.get("roomID");
  const peerRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peersRef = useRef({});

  const [roomId, setRoomId] = useState(incomingRoomID || uuidv4());
  const [shareableLink, setShareableLink] = useState("");
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    setShareableLink(`${window.location.origin}/call?roomID=${roomId}`);
  }, [roomId]);

  useEffect(() => {
    if (incomingRoomID && !joined) {
      startMeeting();
    }
  }, [incomingRoomID, joined]);


  const startMeeting = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      localVideoRef.current.srcObject = stream;

      socket.emit("join-room", { roomId, userId: socket.id });
      socket.on("user-joined", handleUserJoined);
      socket.on("offer", handleOffer);
      socket.on("answer", handleAnswer);
      socket.on("ice-candidate", handleNewICECandidateMsg);
      setJoined(true);
    } catch (err) {
      console.error("Error accessing media devices:", err);
      alert("Please allow access to your camera and microphone.");
    }
  };

  useEffect(() => {
    socket.on("receive-message", ({ sender, message }) => {
      setChatMessages((prev) => [...prev, { sender, message }]);
    });
  }, []);


const handleUserJoined = async (id) => {
  if (peersRef.current[id]) return;

  const peer = createPeer(id);
  peersRef.current[id] = peer;

  localStreamRef.current.getTracks().forEach(track =>
    peer.addTrack(track, localStreamRef.current)
  );
};


  const createPeer = (userIdToCall) => {
    const peer = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });

    peer.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit("ice-candidate", { to: userIdToCall, candidate: e.candidate });
      }
    };

    peer.ontrack = (e) => {
      remoteVideoRef.current.srcObject = e.streams[0];
    };

    peer.createOffer().then((offer) => {
      peer.setLocalDescription(offer);
      socket.emit("offer", { to: userIdToCall, offer });
    });

    return peer;
  };

  const handleOffer = async ({ from, offer }) => {
    const peer = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    peerRef.current = peer;

    localStreamRef.current.getTracks().forEach(track => peer.addTrack(track, localStreamRef.current));

    peer.ontrack = (e) => {
      remoteVideoRef.current.srcObject = e.streams[0];
    };

    peer.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit("ice-candidate", { to: from, candidate: e.candidate });
      }
    };

    await peer.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    socket.emit("answer", { to: from, answer });
  };

  const handleAnswer = async ({ answer }) => {
    await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
  };

  const handleNewICECandidateMsg = async ({ candidate }) => {
    try {
      await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.error("Error adding ICE candidate", e);
    }
  };

  const toggleMic = () => {
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    audioTrack.enabled = !audioTrack.enabled;
    setMicOn(audioTrack.enabled);
  };

  const toggleCamera = () => {
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    videoTrack.enabled = !videoTrack.enabled;
    setCameraOn(videoTrack.enabled);
  };


  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-5xl bg-white shadow-xl rounded-xl flex flex-col md:flex-row">
        <div className="w-full md:w-2/3 p-4 relative bg-gray-900 rounded-xl">
          {cameraOn ? (
            <video ref={localVideoRef} autoPlay muted className="w-full h-96 rounded-xl object-cover" />
          ) : (
            <div className="w-full h-1/2 flex items-center justify-center text-white">Camera is off</div>
          )}
          <video ref={remoteVideoRef} autoPlay className="w-full h-96 mt-4 rounded-xl object-cover" />
          <div className="absolute bottom-4 left-4 flex space-x-4">
            <button onClick={toggleMic} className="bg-gray-800 text-white px-4 py-2 rounded-full">
              {micOn ? "Mute Mic" : "Unmute Mic"}
            </button>
            <button onClick={toggleCamera} className="bg-gray-800 text-white px-4 py-2 rounded-full">
              {cameraOn ? "Turn Off Camera" : "Turn On Camera"}
            </button>
          </div>
        </div>
        <div className="w-full md:w-1/3 p-6">
          <h2 className="text-xl font-semibold mb-4">Join Room</h2>
          <input
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className="w-full border border-gray-400 px-4 py-2 rounded mb-4"
          />
          <button
            onClick={startMeeting}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded mb-6"
          >
            Join
          </button>


          <h3 className="text-lg font-semibold mb-2">Share the link</h3>
          <div className="bg-gray-100 p-4 rounded flex items-center justify-between">
            <div className="text-sm text-gray-800 break-all">{shareableLink}</div>
            <button
              onClick={() => navigator.clipboard.writeText(shareableLink)}
              className="text-blue-600 hover:underline ml-2"
            >
              Copy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoChat;
