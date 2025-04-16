import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './Pages/Home';
import CreateMeet from './Pages/CreateMeet';
import MeetRoom from './Pages/MeetRoom';
import JoinMeet from './Pages/JoinMeet';

function App() {
  return (
    <Router>
      <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/create" element={<CreateMeet />} />
      <Route path="/meet/:roomId" element={<MeetRoom />} />
      <Route path="/join/:roomId" element={<JoinMeet />} />
      </Routes>
    </Router>
  );
}

export default App;
