import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import VideoChat from './Pages/VideoChat';
import MeetRoom from './Pages/MeetRoom';

function App() {

  return (
     <Router>
      <Routes>
        <Route path="/" element={<VideoChat />} />
        <Route path="/call" element={<MeetRoom />} />
      </Routes>
    </Router>
  )
}

export default App
