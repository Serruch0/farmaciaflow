import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBaUffEO5agx4zNt_iZ6eWUOMjtVl2YyPY",
  authDomain: "farmaciaflow.firebaseapp.com",
  projectId: "farmaciaflow",
  storageBucket: "farmaciaflow.firebasestorage.app",
  messagingSenderId: "903420291242",
  appId: "1:903420291242:web:7c4d08d2ac8d150ffd08d3"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);