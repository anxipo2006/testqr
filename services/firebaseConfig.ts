
import firebase from "firebase/compat/app";
import "firebase/compat/firestore";
import "firebase/compat/analytics";

// Cấu hình Firebase từ yêu cầu của bạn
const firebaseConfig = {
  apiKey: "AIzaSyCDtSJOvvOcakG3ZzxAZcC8wwCHBJoSIxE",
  authDomain: "qrcheck-4db34.firebaseapp.com",
  projectId: "qrcheck-4db34",
  storageBucket: "qrcheck-4db34.firebasestorage.app",
  messagingSenderId: "187674911175",
  appId: "1:187674911175:web:714ea8a1ce52f38070f9e2",
  measurementId: "G-4PL87N83M7"
};

// Khởi tạo Firebase (Singleton)
if (!firebase.apps.length) {
  const app = firebase.initializeApp(firebaseConfig);
  // Khởi tạo Analytics nếu chạy ở môi trường browser
  if (typeof window !== 'undefined') {
    firebase.analytics();
  }
}

// Export Firestore instance để dùng chung toàn app
export const db = firebase.firestore();
