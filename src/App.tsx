import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './App.css';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';

function App() {
  const [count, setCount] = useState(0)
  const { t, i18n } = useTranslation();

   // List of available languages
   console.log('Supported languages:', i18n.options);
  const languages = (i18n.options?.supportedLngs || [])?.filter(l => l !== 'cimode') || ['en', 'de', 'fr']; // fallback

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          {t('Welcome to React')} -
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>

      <button onClick={() => i18n.changeLanguage(i18n.language === 'en' ? 'de' : 'en')}>
        Switch Language
      </button>

      <button onClick={async () => await i18n.reloadResources()}>
        Reload Resources
      </button>

      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
        {languages.map((lng) => (
          <div
            key={lng}
            onClick={() => i18n.changeLanguage(lng)}
            style={{
              padding: '5px 10px',
              border: i18n.language === lng ? '2px solid blue' : '1px solid gray',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            {lng.toUpperCase()}
          </div>
        ))}
      </div>
    </>
  )
}

export default App
