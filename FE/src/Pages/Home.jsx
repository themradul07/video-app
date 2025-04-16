import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-screen space-y-6">
      <h1 className="text-3xl font-bold">Welcome to VideoMeet</h1>
      <button
        className="bg-blue-600 text-white px-6 py-2 rounded"
        onClick={() => navigate('/create')}
      >
        Create Meet
      </button>
      <button
        className="bg-green-600 text-white px-6 py-2 rounded"
        onClick={() => alert('Join Meet coming soon')}
      >
        Join Meet
      </button>
    </div>
  );
}
