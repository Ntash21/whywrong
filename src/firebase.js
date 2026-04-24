import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBbpawY-gNky5pLp5BDnjwEuuSTVFTS6PE",
  authDomain: "whywrong-db1f3.firebaseapp.com",
  projectId: "whywrong-db1f3",
  storageBucket: "whywrong-db1f3.firebasestorage.app",
  messagingSenderId: "505322311729",
  appId: "1:505322311729:web:9a9797790c9aff2cd88510"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
