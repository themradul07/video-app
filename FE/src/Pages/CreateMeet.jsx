import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function CreateMeet() {
  const [displayName, setDisplayName] = useState('');
  const [camera, setCamera] = useState(true);
  const [mic, setMic] = useState(true);
  const [roomCode, setRoomCode] = useState('');
  const navigate = useNavigate();

  const handleCreate = async () => {
    try {
      const res = await axios.post('http://localhost:5000/api/meet/create', {
        display_name: displayName,
        camera_enabled: camera,
        mic_enabled: mic,
      });
      const code = res.data.room_code;
      setRoomCode(code);

      // Delay a bit before navigating (optional)
      setTimeout(() => navigate(`/meet/${code}`, {
        state: {
          displayName,
          camera,
          mic,
        },
      }), 3000);
    } catch (err) {
      console.error('Error creating meet:', err);
    }
  };


  return (
    <div className="flex flex-col items-center justify-center h-screen space-y-4">
      <h2 className="text-2xl font-semibold">Create Meet</h2>
      <input
        type="text"
        placeholder="Enter display name"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        className="border px-4 py-2 rounded"
      />
      <div className="space-x-4">
        <label>
          <input type="checkbox" checked={camera} onChange={() => setCamera(!camera)} />
          Camera
        </label>
        <label>
          <input type="checkbox" checked={mic} onChange={() => setMic(!mic)} />
          Mic
        </label>
      </div>
      <button
        className="bg-blue-600 text-white px-6 py-2 rounded"
        onClick={handleCreate}
      >
        Create and Join
      </button>

      
    </div>
  );
}
