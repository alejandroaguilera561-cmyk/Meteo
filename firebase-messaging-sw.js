importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyABeW98pAbkM5aFS0eu1VcFUm7wmhXjxK8",
  projectId: "meteor-16897",
  messagingSenderId: "988871805616",
  appId: "1:988871805616:web:b25d35bfcc1f81c1220975"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload){
 self.registration.showNotification(payload.notification.title,{
  body: payload.notification.body
 });
});