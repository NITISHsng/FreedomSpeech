importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js");

const firebaseConfig = {
  apiKey: "AIzaSyCXSVmG9MhEpQxLNnBOIPd0Jq8FGXUfUbM",
  authDomain: "anonymous-7fe16.firebaseapp.com",
  projectId: "anonymous-7fe16",
  storageBucket: "anonymous-7fe16.firebasestorage.app",
  messagingSenderId: "106828637079",
  appId: "1:106828637079:web:9e8d39ec3d963c25a91ad2",
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Received background message ", payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/icon-192x192.png", // Replace with your icon
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
