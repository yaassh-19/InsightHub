// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {GoogleAuthProvider,getAuth, signInWithPopup} from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB0YyVy5_uVAvnuDr90A593ygwgibMormY",
  authDomain: "quillio-blog-website.firebaseapp.com",
  projectId: "quillio-blog-website",
  storageBucket: "quillio-blog-website.appspot.com",
  messagingSenderId: "1028753692665",
  appId: "1:1028753692665:web:e74e761eb1a01cb2b7cf28"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const provider = new GoogleAuthProvider();

const auth = getAuth();

export const authWithGoogle = async () => {
    let user = null;

    await signInWithPopup(auth,provider)
    .then((result) => {
        user = result.user
    })
    .catch((err) => {
        console.log(err)
    })
    return user;
}