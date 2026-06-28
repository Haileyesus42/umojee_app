import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App';
import './assets/css/style.css';
import './assets/css/satoshi.css';
import 'jsvectormap/dist/css/jsvectormap.css';
import 'flatpickr/dist/flatpickr.min.css';
import store from './store';
import { Provider } from 'react-redux';
import Cookies from 'universal-cookie';
import { ToasterProvider } from './lib/toast-provider';

export const cookies = new Cookies();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <Provider store={store}>
    <ToasterProvider />
    <Router>
      <App />
    </Router>
  </Provider>,
);
