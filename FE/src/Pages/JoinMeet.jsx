import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const JoinMeet = () => {
  const { roomId } = useParams();
  const [displayName, setDisplayName] = useState('');
  const [camera, setCamera] = useState(true);
  const [mic, setMic] = useState(true);
  const navigate = useNavigate();

  const handleJoin = () => {
    if (!displayName.trim()) return alert("Please enter a display name");
    navigate(`/meet/${roomId}`, {
      state: { displayName, camera, mic }
    });
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen space-y-4">
      <h2 className="text-2xl font-semibold">Join Meet</h2>
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
        onClick={handleJoin}
      >
        Join Now
      </button>
    </div>
  );
};

export default JoinMeet;
