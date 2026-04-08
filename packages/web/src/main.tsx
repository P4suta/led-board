/* @refresh reload */
import { render } from 'solid-js/web';
import { App } from './App';
import './styles/tokens.css';
import './styles/reset.css';
import './styles/app.css';

const root = document.getElementById('root');
if (root === null) {
  throw new Error('Root element #root not found in index.html');
}

// Best-effort: request persistent storage so settings survive eviction.
if ('storage' in navigator && 'persist' in navigator.storage) {
  void navigator.storage.persist().catch(() => {
    /* user denied or unsupported — silent */
  });
}

render(() => <App />, root);
