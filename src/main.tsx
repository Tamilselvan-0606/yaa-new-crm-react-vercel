import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { purgeLegacyBusinessData } from './utils/legacyLocalData';

// Older versions saved business data in the browser and showed it from there; remove it before anything renders.
purgeLegacyBusinessData();

createRoot(document.getElementById('root')!).render(
  <App />
);
