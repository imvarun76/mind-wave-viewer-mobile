import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  databaseURL: "https://databaseeeg-default-rtdb.asia-southeast1.firebasedatabase.app",
  storageBucket: "databaseeeg.appspot.com",
};

const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
export const database = getDatabase(app);
export default app;