// firebaseConfig.ts
import { FirebaseApp, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
// 必要に応じて他のサービスを追加できます
// import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDXWQXjzJ9KgYQXS3OCXXmbPZeaXWcE_DQ",
  authDomain: "your-app.firebaseapp.com",
  projectId: "shusikanri",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:1026929341433:ios:a0ad16546b2345d4024328",
};

// Firebase 初期化（アプリ全体で一度だけ実行）
const app: FirebaseApp = initializeApp(firebaseConfig);

// 各サービスのインスタンスを作成
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);

export { app, auth, db };
