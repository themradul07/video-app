import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import VideoChat from './Pages/VideoChat';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<VideoChat />} />
        <Route path="/call" element={<VideoChat />} />
      </Routes>
    </Router>
  );
}

export default App;
