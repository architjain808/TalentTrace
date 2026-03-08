// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyAedh14rfWyuuJWpImM0H-XQB5HMPsL4Jo",
    authDomain: "talent-trace-firebase.firebaseapp.com",
    projectId: "talent-trace-firebase",
    storageBucket: "talent-trace-firebase.firebasestorage.app",
    messagingSenderId: "206742647317",
    appId: "1:206742647317:web:4bcee9f95f98c4854d141c",
    measurementId: "G-ZQQ2K5KQ35"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);