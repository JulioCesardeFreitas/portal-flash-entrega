import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

const VERSAO_ATUAL = "2.0.1"; // 👈 Mude esse número toda vez que subir algo novo

const versaoSalva = localStorage.getItem('versao_app');

if (versaoSalva !== VERSAO_ATUAL) {
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('versao_app', VERSAO_ATUAL);
  
  // O comando abaixo limpa o cache e recarrega a página
  window.location.reload(true); 
}
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
      .then((registration) => {
        console.log('SW registrado com sucesso:', registration.scope);
      })
      .catch((err) => {
        console.log('Falha ao registrar o SW:', err);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)