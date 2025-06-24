import { useState } from 'react';
import App from './App';
import SimpleAssessment from './SimpleAssessment';
import './App.css';

function MainRouter() {
  const [page, setPage] = useState<'main' | 'simple'>('simple');

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <nav style={{ width: 220, background: '#f5f5f5', padding: '2em 1em', borderRight: '1px solid #ddd' }}>
        <h2 style={{ fontSize: '1.2em', marginBottom: '1.5em' }}>Miraibo</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          <li>
            <button
              style={{ width: '100%', padding: '0.7em', background: page === 'simple' ? '#1976d2' : '#fff', color: page === 'simple' ? '#fff' : '#222', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
              onClick={() => setPage('simple')}
            >
              Assessment
            </button>
          </li>
          <li>
            <button
              style={{ width: '100%', padding: '0.7em', marginTop: '0.5em', background: page === 'main' ? '#1976d2' : '#fff', color: page === 'main' ? '#fff' : '#222', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
              onClick={() => setPage('main')}
            >
              Custom Assessment
            </button>
          </li>
        </ul>
      </nav>
      <div style={{ flex: 1, padding: '2em 1em', background: '#fafcff' }}>
        {page === 'main' ? <App /> : <SimpleAssessment />}
      </div>
    </div>
  );
}

export default MainRouter;
