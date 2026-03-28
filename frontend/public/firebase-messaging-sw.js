// Import the scripts for the messaging service worker
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

// Generated dynamically - DO NOT EDIT MANUALLY
firebase.initializeApp({
    apiKey: "dummy-api-key-for-local-emulators",
    authDomain: "localhost",
    projectId: "capsule-valentins-day",
    storageBucket: "capsule-valentins-day.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/logo.svg',
        data: payload.data
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
