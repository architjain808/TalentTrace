import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from "react-native";

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
const analytics = Platform.OS === 'web' ? getAnalytics(app) : null;

let auth;
if (Platform.OS === 'web') {
    auth = getAuth(app);
} else {
    auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage)
    });
}

const db = getFirestore(app);

export { app, auth, db, analytics };