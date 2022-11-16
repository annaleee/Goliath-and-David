import { initializeApp, getApps } from "firebase/app";
import { 
  initializeFirestore, collection, getDocs, query, orderBy, limit,
  where, doc, addDoc, getDoc, onSnapshot
} from "firebase/firestore";
import { Loader } from '@googlemaps/js-api-loader';
import * as THREE from 'three';
import { TetrahedronGeometry } from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
//value of firebases
const firebaseConfig = {
  apiKey: "AIzaSyApcHpdlW5VifJFoqbshR3j74m3ogIdEDY",
  authDomain: "hackathon-2816a.firebaseapp.com",
  projectId: "hackathon-2816a",
  storageBucket: "hackathon-2816a.appspot.com",
  messagingSenderId: "226534986492",
  appId: "1:226534986492:web:c439976929f1a53c183d79",
  measurementId: "G-ZC1XSE2RPG"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

//get all of the elements
const startButton = document.getElementById("start-button");
const mapPage = document.getElementById("gamePage");
const preparePage = document.getElementById("prepare-page");
const roomText = document.getElementById("session-code-text");

var roomCode =0;
for(var i = 0;i < 5;i++){
    roomCode = roomCode*10 +Math.floor(Math.random()*10);
}

roomText.innerHTML = str(roomCode);
