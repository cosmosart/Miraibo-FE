import { useState } from 'react';
import App from './App';
import AssessmentEn from './assessmentEn';
import AssessmentJa from './assessmentJa';
import './App.css';

function MainRouter() {
  const [page, setPage] = useState<'main' | 'simple' | 'ja'>('ja');

  return (
    <div style={{ minHeight: '100vh' }}>
      <nav style={{ width: '100%', background: '#f5f5f5', padding: '1em 0', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.2em', margin: '0 2em 0 0' }}>Miraibo</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', gap: '1em' }}>
          <li>
            <button
              style={{ padding: '0.7em 1.5em', background: page === 'ja' ? '#1976d2' : '#fff', color: page === 'ja' ? '#fff' : '#222', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
              onClick={() => setPage('ja')}
            >
              英検
            </button>
          </li>
          <li>
            <button
              style={{ padding: '0.7em 1.5em', background: page === 'simple' ? '#1976d2' : '#fff', color: page === 'simple' ? '#fff' : '#222', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
              onClick={() => setPage('simple')}
            >
              Eiken (EN)
            </button>
          </li>
          <li>
            <button
              style={{ padding: '0.7em 1.5em', background: page === 'main' ? '#1976d2' : '#fff', color: page === 'main' ? '#fff' : '#222', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
              onClick={() => setPage('main')}
            >
              Custom
            </button>
          </li>
        </ul>
      </nav>
      <div style={{ padding: '2em 1em', background: '#fafcff', minHeight: 'calc(100vh - 70px)' }}>
        {page === 'main' ? <App /> : page === 'ja' ? <AssessmentJa /> : <AssessmentEn />}
      </div>
    </div>
  );
}

export default MainRouter;
