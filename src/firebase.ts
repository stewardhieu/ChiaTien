import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Cấu hình từ biến môi trường
const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID
};

// 1. Khởi tạo App
const app = initializeApp(firebaseConfig);

// 2. Khởi tạo Auth & Google Provider (Để App.tsx dùng được 'auth')
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// 3. Khởi tạo Database (Để App.tsx dùng được 'db')
const db = getFirestore(app);

// 4. Xuất khẩu các biến này ra ngoài
export { auth, provider, db };
export default app;