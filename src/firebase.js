// ─────────────────────────────────────────────────────────────
// PASO 1: Sustituye estos valores por los de tu proyecto Firebase
// Ve a: console.firebase.google.com → Tu proyecto → Configuración
// → "Tus aplicaciones" → SDK de configuración → Config
// ─────────────────────────────────────────────────────────────

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "PEGA_AQUI_TU_apiKey",
  authDomain: "PEGA_AQUI_TU_authDomain",
  projectId: "PEGA_AQUI_TU_projectId",
  storageBucket: "PEGA_AQUI_TU_storageBucket",
  messagingSenderId: "PEGA_AQUI_TU_messagingSenderId",
  appId: "PEGA_AQUI_TU_appId"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
