import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyDbebeNbh31y0_Nh1dKgBN3y1VlcGj3hns",
  authDomain: "databaseeeg.firebaseapp.com",
  databaseURL: "https://databaseeeg-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "databaseeeg",
  storageBucket: "databaseeeg.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456789"
};

const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
export const database = getDatabase(app);
export default app;