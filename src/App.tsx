import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Pemfc from './pages/Pemfc/Pemfc';
import Dashboard from './pages/Dashboard/Dashboard';
import styles from './App.module.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Pemfc />} />
        {/* 모델별 대시보드 페이지 경로 설정 */}
        <Route path="/:id/dashboard" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
