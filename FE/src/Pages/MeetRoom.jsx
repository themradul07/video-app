import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import io from "socket.io-client";

const socket = io("http://localhost:5000");

const MeetRoom = () => {
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const roomIdFromURL = params.get("roomID");

    const [roomId, setRoomId] = useState(roomIdFromURL || "");
    const [joined, setJoined] = useState(false);
    const [micOn, setMicOn] = useState(true);
    const [cameraOn, setCameraOn] = useState(true);

    const localVideoRef = useRef();
    const remoteVideoRef = useRef();
    const peerRef = useRef();
    const localStreamRef = useRef();

    const handleJoinClick = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            console.log("Stream obtained:", stream);
            localVideoRef.current.srcObject = stream;
            localStreamRef.current = stream;

            socket.emit("join-room", {
                roomId,
                userId: socket.id,
                username: "Guest" + Math.floor(Math.random() * 1000),
            });

            setJoined(true);
        } catch (error) {
            console.error("Permission denied or device not available", error);
            alert("Please allow access to your camera and microphone.");
        }
    };

    useEffect(() => {
        if (!joined) return;

        const peer = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });

        peerRef.current = peer;

        // Add local stream tracks
        localStreamRef.current.getTracks().forEach((track) => {
            peer.addTrack(track, localStreamRef.current);
        });

        // Handle receiving remote tracks
        peer.ontrack = (event) => {
            console.log("Received remote track:", event.streams[0]);
            remoteVideoRef.current.srcObject = event.streams[0];
        };

        // Send ICE candidates
        peer.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit("signal", {
                    to: peerRef.current.remoteSocketId,
                    from: socket.id,
                    signal: { candidate: event.candidate },
                });
            }
        };

        // Handle signaling
        socket.on("user-connected", async ({ socketId }) => {
            console.log("User connected:", socketId);
            peerRef.current.remoteSocketId = socketId;

            const offer = await peer.createOffer();
            await peer.setLocalDescription(offer);

            socket.emit("signal", {
                to: socketId,
                from: socket.id,
                signal: { sdp: offer },
            });
        });

        socket.on("signal", async ({ from, signal }) => {
            peerRef.current.remoteSocketId = from;

            if (signal.sdp) {
                await peer.setRemoteDescription(new RTCSessionDescription(signal.sdp));

                if (signal.sdp.type === "offer") {
                    const answer = await peer.createAnswer();
                    await peer.setLocalDescription(answer);
                    socket.emit("signal", {
                        to: from,
                        from: socket.id,
                        signal: { sdp: answer },
                    });
                }
            }

            if (signal.candidate) {
                try {
                    await peer.addIceCandidate(new RTCIceCandidate(signal.candidate));
                } catch (e) {
                    console.error("Error adding received ICE candidate", e);
                }
            }
        });

        socket.emit("join-room", {
            roomId,
            userId: socket.id,
            username: "Guest" + Math.floor(Math.random() * 1000),
        });


        return () => {
            peer.close();
            socket.off("user-connected");
            socket.off("signal");
            socket.off("join-room");
        };
    }, [joined]);

    const handleToggleMic = () => {
        const stream = localStreamRef.current;
        if (!stream) return console.warn("Local stream not available yet");

        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            setMicOn(audioTrack.enabled);
        }
    };

    const handleToggleCamera = () => {
        const stream = localStreamRef.current;
        if (!stream) return console.warn("Local stream not available yet");

        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            setCameraOn(videoTrack.enabled);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            {!joined ? (
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl grid grid-cols-1 md:grid-cols-2">
                    <div className="bg-gray-900 rounded-l-2xl flex flex-col items-center justify-center p-6">
                        {cameraOn ? (
                            <video ref={localVideoRef} autoPlay muted className="rounded-xl w-full" />
                        ) : (
                            <div className="text-white text-xl">Camera is off</div>
                        )}
                        <div className="flex mt-4 space-x-4">
                            <button onClick={handleToggleMic} className="bg-white p-2 rounded-full">
                                {micOn ? "🎙️" : "🔇"}
                            </button>
                            <button onClick={handleToggleCamera} className="bg-white p-2 rounded-full">
                                {cameraOn ? "📷" : "🚫"}
                            </button>

                        </div>
                    </div>

                    <div className="p-6 flex flex-col justify-center">
                        <h2 className="text-2xl font-semibold mb-4">Join Room</h2>
                        <input
                            type="text"
                            value={roomId}
                            onChange={(e) => setRoomId(e.target.value)}
                            placeholder="Enter Room ID or paste link"
                            className="border border-gray-400 p-2 rounded w-full mb-4"
                        />
                        <button
                            onClick={handleJoinClick}
                            className="bg-blue-600 text-white py-2 rounded w-full hover:bg-blue-700"
                        >
                            Join
                        </button>

                        {roomId && (
                            <div className="mt-6">
                                <h3 className="font-medium mb-2">Share the link</h3>
                                <div className="bg-gray-100 p-3 rounded flex justify-between items-center">
                                    <div className="text-gray-600 text-sm">
                                        {`${window.location.origin}/call?roomID=${roomId}`}
                                    </div>
                                    <button
                                        onClick={() => navigator.clipboard.writeText(`${window.location.origin}/call?roomID=${roomId}`)}
                                        className="text-blue-600 hover:text-blue-800"
                                    >📋</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="bg-white p-6 rounded-2xl shadow-lg w-full max-w-3xl">
                    <h2 className="text-2xl font-semibold mb-4">Meeting Room</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <video ref={localVideoRef} autoPlay muted className="w-full rounded-xl border" />
                        <video ref={remoteVideoRef} autoPlay className="w-full rounded-xl border" />
                    </div>
                </div>
            )}
        </div>
    );
};

export default MeetRoom;
