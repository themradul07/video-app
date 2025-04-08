import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

const VideoChat = ({ roomId, username }) => {
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerRef = useRef();
  const localStreamRef = useRef();
  const screenTrackRef = useRef();

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sharingScreen, setSharingScreen] = useState(false);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      localVideoRef.current.srcObject = stream;
      localStreamRef.current = stream;

      socket.emit("join-room", {
        roomId,
        userId: socket.id,
        username: username || "Guest",
      });
    });

    socket.on("user-connected", ({ socketId }) => handleUserJoined(socketId));
    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleNewICECandidateMsg);

    return () => {
      socket.disconnect();
      if (peerRef.current) peerRef.current.close();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [roomId, username]);

  const handleUserJoined = (id) => {
    const peer = createPeer(id);
    localStreamRef.current.getTracks().forEach((track) => peer.addTrack(track, localStreamRef.current));
    peerRef.current = peer;
  };

  const createPeer = (userIdToCall) => {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    peer.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit("ice-candidate", { to: userIdToCall, candidate: e.candidate });
      }
    };

    peer.ontrack = (e) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = e.streams[0];
      }
    };

    peer
      .createOffer()
      .then((offer) => {
        peer.setLocalDescription(offer);
        socket.emit("offer", { to: userIdToCall, offer });
      })
      .catch((err) => console.error("Error creating offer:", err));

    return peer;
  };

  const handleOffer = async ({ from, offer }) => {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    peerRef.current = peer;

    localStreamRef.current.getTracks().forEach((track) => peer.addTrack(track, localStreamRef.current));

    peer.ontrack = (e) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = e.streams[0];
      }
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
    await peerRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
  };

  const handleNewICECandidateMsg = async ({ candidate }) => {
    try {
      await peerRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.error("Error adding received ICE candidate", e);
    }
  };

  const toggleMic = () => {
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setMicOn(audioTrack.enabled);
    }
  };

  const toggleCamera = () => {
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setCamOn(videoTrack.enabled);
    }
  };

  const toggleScreenShare = async () => {
    if (!sharingScreen) {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];

      if (peerRef.current) {
        const sender = peerRef.current.getSenders().find((s) => s.track.kind === "video");
        if (sender) sender.replaceTrack(screenTrack);
      }

      screenTrack.onended = () => {
        stopScreenShare();
      };

      localVideoRef.current.srcObject = screenStream;
      screenTrackRef.current = screenTrack;
      setSharingScreen(true);
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = () => {
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (peerRef.current) {
      const sender = peerRef.current.getSenders().find((s) => s.track.kind === "video");
      if (sender) sender.replaceTrack(videoTrack);
    }
    localVideoRef.current.srcObject = localStreamRef.current;
    setSharingScreen(false);
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h2 className="text-xl font-bold">Video Chat Room: {roomId}</h2>
      <div className="flex flex-wrap justify-center gap-4">
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="rounded-xl w-64 h-48 border shadow"
        />
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="rounded-xl w-64 h-48 border shadow"
        />
      </div>

      <div className="mt-4 flex gap-4">
        <button
          onClick={toggleMic}
          className={`px-4 py-2 rounded-full text-white ${micOn ? "bg-green-600" : "bg-red-600"}`}
        >
          {micOn ? "Mic On 🎙" : "Mic Off 🔇"}
        </button>

        <button
          onClick={toggleCamera}
          className={`px-4 py-2 rounded-full text-white ${camOn ? "bg-green-600" : "bg-red-600"}`}
        >
          {camOn ? "Camera On 📷" : "Camera Off 🚫"}
        </button>

        <button
          onClick={toggleScreenShare}
          className={`px-4 py-2 rounded-full text-white ${sharingScreen ? "bg-yellow-500" : "bg-blue-600"}`}
        >
          {sharingScreen ? "Stop Sharing 🛑" : "Share Screen 🖥"}
        </button>
      </div>
    </div>
  );
};

export default VideoChat;
