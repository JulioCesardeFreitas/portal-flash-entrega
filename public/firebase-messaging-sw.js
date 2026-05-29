importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDd0ANM_Drgt3MD43nNK853mxRuzyGB-hU",
  authDomain: "flash-motoboy-1aacc.firebaseapp.com",
  projectId: "flash-motoboy-1aacc",
  storageBucket: "flash-motoboy-1aacc.firebasestorage.app",
  messagingSenderId: "697541075151",
  appId: "1:697541075151:web:7f63a6b663d2117d81d7ba",
  measurementId: "G-8Q7EBW1487"
});

const messaging = firebase.messaging();

// Configuração da Notificação em Segundo Plano
messaging.onBackgroundMessage((payload) => {
  console.log('Mensagem recebida com tela bloqueada:', payload);

  const notificationTitle = payload.notification.title || "Nova Corrida Flash!";
  const notificationOptions = {
    body: payload.notification.body || "Abra o app IMEDIATAMENTE para aceitar o pedido.",
    icon: '/vite.svg', 
    badge: '/vite.svg',
    vibrate: [1000, 500, 1000, 500, 1000, 500, 1000, 500, 1000], 
    tag: 'corrida-' + Date.now(), 
    renotify: true, 
    requireInteraction: true, 
    data: {
      url: '/motorista'
    }
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close(); // Fecha a notificação do sistema

  // Procura se o app do Flash Entregas já está aberto em alguma aba
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Se já estiver aberto, apenas traz para a frente (foco)
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url.includes('/') && 'focus' in client) {
          return client.focus();
        }
      }
      // Se estiver totalmente fechado, abre o app
      if (clients.openWindow) {
        return clients.openWindow('/motorista');
      }
    })
  );
});