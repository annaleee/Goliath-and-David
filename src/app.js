// Copyright 2021 Google LLC

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

//     https://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set,child,push,update, get } from "firebase/database";

import { Loader } from '@googlemaps/js-api-loader';
import * as THREE from 'three';
import { TetrahedronGeometry } from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';

//firebase const 
const firebaseConfig = {
  apiKey: "AIzaSyApcHpdlW5VifJFoqbshR3j74m3ogIdEDY",
  authDomain: "hackathon-2816a.firebaseapp.com",
  projectId: "hackathon-2816a",
  storageBucket: "hackathon-2816a.appspot.com",
  messagingSenderId: "226534986492",
  appId: "1:226534986492:web:c439976929f1a53c183d79",
  measurementId: "G-ZC1XSE2RPG",
  databaseURL: "https://hackathon-2816a-default-rtdb.firebaseio.com/",
};

const mapOptions = {
  "tilt": 0,//2:70 1:90
  "heading":0,//2:0
  "zoom": 14,//2:20 1:14
  "center": { lat: 40.79160, lng: -73.95753 },
  "mapId": "b32e4cbb22db8560",
  "backgroundColor":"#000000",
  "disableDefaultUI":true,
  "zoomControl":false,
  "overviewMapControl":false,
  "scaleControl":false,
  "scrollwheel":false,
  //记得取消双击able
  "disableDoubleClickZoom": true

}


// 所有的状态
//房间号
var roomcode = 0
//1是goliath，2是david，0是未定
var player_state = 1
//0是未定，1是win，2是lose
var win_or_lose = 0
//第一第二个坐标是初始位置，3-8个坐标代表的是latitude和height的范围
var positions = []

var velocity = 0.00001
var cloud_num = 0;
var positions_clouds = new Array(2);
positions_clouds[0] = new Array(11*13).fill(0);
positions_clouds[1] = new Array(11*13).fill(0);

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const resultPage = document.getElementById("resultPage");
const winText = document.getElementById("winText");
//设置固定参数
const apiOptions = {
  apiKey: 'AIzaSyDiuVfKT-rz3Hk6Q2CA0afarDIR9N0010o',
  version: "beta"
};
//initialize david

var radius = 50, 
segments = 16, 
rings = 16; 
// material覆盖在geometry上，生成mesh 
const sphereMaterial = new THREE.MeshBasicMaterial( { color: 0xffff00 } );
const sphere = new THREE.Mesh( 
new THREE.SphereGeometry( 
radius, 
segments, 
rings), 
sphereMaterial); 

async function initMap() {    
  const mapDiv = document.getElementById("map");
  const apiLoader = new Loader(apiOptions);
  await apiLoader.load();
  if(player_state==2){
    mapOptions.tilt = 70;
    mapOptions.zoom = 20;
  }
  return new google.maps.Map(mapDiv, mapOptions);
}
function initWebGLOverlayView(map) {  
  let scene, renderer, camera,loader;
  const webGLOverlayView = new google.maps.WebGLOverlayView();
  
  webGLOverlayView.onAdd = () => {   
    // set up the scene
    scene = new THREE.Scene();
    // set up the camera
    camera = new THREE.PerspectiveCamera(10, window.innerWidth / window.innerHeight, 0.1, 1000 );
    // set up the light
    const ambientLight = new THREE.AmbientLight( 0xffffff,1.5 ); // soft white light
    scene.add(ambientLight)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.25);
    directionalLight.position.set(0.5, -1, 0.5);
    scene.add(directionalLight);
    //如果player mode = 1，则在相机positions周围范围内设置一堆云
    //如果player mode = 1，则上传position 和heading到firebase
    //如果player mode = 2，则上传相机位置和 heading到firebase
    if(player_state==1){
        var postData = {
    "goliath-lat": mapOptions.center.lat,
    'goliath-lng': mapOptions.center.lng,
    'goliath-heading': 0,
  };
        var updates={};
        updates['/rooms/' + roomcode.toString()] = postData;
        update(ref(db), updates);

      //生成一堆云
      scene.add(sphere);
      const loader = new GLTFLoader();
      loader.load( 'cloud/scene.gltf', function ( gltf ) {
        gltf.scene.scale.set(100,100,100);
        var cloudModel = gltf.scene;
        for(var i = -5; i <= 5;i++){
          for(var j = -6; j <= 6;j++){
            if(i==0&&j==0){
              positions_clouds[0][cloud_num] = Math.random()*300;
              positions_clouds[1][cloud_num] = Math.random()*200;
              continue;
            }
            var cloud = cloudModel.clone();
            cloud.position.set(Math.random()*300+1000*i,Math.random()*200+500*j,0);
            scene.add(cloud)
          }
        }
      }, undefined, function ( error ) {
        console.error( error );
      } );
      }else{
        var postData = {
    "david-lat": camera.position.x,
    'david-lng': camera.position.y,
  };
        var updates={};
        updates['/rooms/' + roomcode.toString()] = postData;
        update(ref(db), updates);
      }
    
  }
  
  webGLOverlayView.onContextRestored = ({gl, transformer}) => {    
    //渲染模型
    //if player mode = 2，则查firebase，更新david的位置
    // if player mode = 1, 则查询firebase，判断是否在goliath视野范围里
    //如果在视野范围里，做点动画提示
    // create the three.js renderer, using the
    // maps's WebGL rendering context.
    renderer = new THREE.WebGLRenderer({
      canvas: gl.canvas,
      context: gl,
      alpha:true,
      ...gl.getContextAttributes(),
    });
    renderer.setClearColor(0x000000,0);
    renderer.autoClear = false;
    renderer.setAnimationLoop(async () => {
        if(player_state==2){
          mapOptions.center.lat+=velocity*Math.cos(Math.PI*mapOptions.heading/180);
          mapOptions.center.lng+=velocity*Math.sin(Math.PI*mapOptions.heading/180);
          var postData = {
    "david-lat": camera.position.x,
    'david-lng': camera.position.y,
  };
        var updates={};
        updates['/rooms/' + roomcode.toString()] = postData;
        update(ref(db), updates);
        get(child(ref(db),`rooms/${roomcode}`)).then((snapshot)=>{
          if (snapshot.exists()) {
            if(snapshot.val()["win_or_lose"]==1){
                resultPage.disabled = false;
                resultPage.hidden = false;
                win_or_lose = 1;
                winText.innerHTML = 'YOU LOSE'
              }
          } else {
            console.log("No data available");
          }
        }).catch((error) => {
  console.error(error);
});
        }else{
          get(child(ref(db),`rooms/${roomcode}`)).then((snapshot)=>{
          if (snapshot.exists()) {
            console.log(snapshot.val())
            sphere.position.set(snapshot.val()["david-lat"],snapshot.val()["david-lng"],0);
              if(snapshot.val()["win_or_lose"]==2){
                resultPage.disabled = false;
                resultPage.hidden = false;
                win_or_lose = 2;
                winText.innerHTML = `You Lost`
              }
          } else {
            console.log("No data available");
          }
        }).catch((error) => {
  console.error(error);
});
        }
      
        map.moveCamera({
          "heading": mapOptions.heading,
          "center":mapOptions.center,
        });  
    }); 
    
    // 如果有gift，那么用这个wait to move the camera until the 3D model loads   
    
    // loader.manager.onLoad = () => {        
    //   //           
    //   //       
    //  }
  }

  webGLOverlayView.onDraw = ({gl, transformer}) => {
    // update camera matrix to ensure the model is georeferenced correctly on the map
    //这里指的是three.js场景的高度
    const latLngAltitudeLiteral = {
        lat: mapOptions.center.lat,
        lng: mapOptions.center.lng,
        altitude: 0
    }

    const matrix = transformer.fromLatLngAltitude(latLngAltitudeLiteral);
    camera.projectionMatrix = new THREE.Matrix4().fromArray(matrix);
    webGLOverlayView.requestRedraw();  
    
    renderer.render(scene, camera); 

    // always reset the GL state
    renderer.resetState();
    
  }
  //添加点击事件，如果player mode = 1，那么点到什么物体什么物体就会消失
mapPage.addEventListener('click',async (e)=>{
  console.log(sphere.position)
  var mouse = new THREE.Vector2((e.clientX/window.innerWidth)*2-1,-(e.clientY/window.innerHeight)*2+1);
  var raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse,camera);
  var intersects = raycaster.intersectObjects(scene.children,true);
  
  var flag = false;
  var ball_flag=false;
  for(var i = 0;i <cloud_num;i++){
    if(mouse.x< positions_clouds[0][i]+4000&&mouse.x> positions_clouds[0][i]-4000&&mouse.y> positions_clouds[1][i]-2000&&mouse.y< positions_clouds[1][i]+2000){
      flag = true;
    }
    if(sphere.position.x< positions_clouds[0][i]+2000&&sphere.position.x> positions_clouds[0][i]-2000&&sphere.position.y> positions_clouds[1][i]-1000&&sphere.position.y< positions_clouds[1][i]+1000){
      ball_flag = true;
    }
  }
  if(intersects.length>0){
    console.log("you click something");
  }
  if(flag&&intersects.length > 0){
    var object = intersects[0].object;
    console.log("you hit something");
    positions_clouds[0][cloud_num] = object.position.x;
    positions_clouds[1][cloud_num] = object.position.y;
    num++;
    object.position.set(20000,20000,0);
  }
  if(ball_flag&&sphere.position.x<mouse.x+1000&&sphere.position.x>mouse.x-1000&&sphere.position.y<mouse.y+1000&&sphere.position.y>mouse.y-1000){
    win_or_lose = 1;
    resultPage.disabled = false;
    resultPage.hidden = false;
    var postData = {
    "win_or_lose": 1,
  };
        var updates={};
        updates['/rooms/' + roomcode.toString()] = postData;
        update(ref(db), updates);
      resultPage.disabled = false;
      resultPage.hidden = false;
      winText.innerHTML = `YOU WIN!`
  }
},false);
  webGLOverlayView.setMap(map);
}

var mouseX = 0;
var r = 10/(2*Math.PI);

function initMousePosition(e) {
    mouseX = getMousePos(e || window.event);
}
function getMousePos(event) {
    var e = event || window.event;
    var scrollX = document.documentElement.scrollLeft || document.body.scrollLeft;
    var scrollY = document.documentElement.scrollTop || document.body.scrollTop;
    var x = e.pageX || e.clientX + scrollX;
    var y = e.pageY || e.clientY + scrollY;
    return { 'x': x, 'y': y };
}
function handleMousemove(e) {
    var e = e || window.event;
    // 获取鼠标x坐标
    var newMouseX = getMousePos(e).x;
    // 若值无效，更新坐标然后返回
    if (Number.isNaN((newMouseX - mouseX) / r)) { mouseX = newMouseX; return; }
    // 更新视角以及坐标位置
    mapOptions.heading += (newMouseX - mouseX) / r;
    mouseX = newMouseX;
}




//workflow区域
//load各种dom用来状态切换
const buttonPlay = document.getElementById("beginner-play");
const beginnerPage = document.getElementById("beginner");
const mapPage = document.getElementById("gamePage");
const selectPage = document.getElementById("create-or-join");
const create = document.getElementById("beginner-create");
const join = document.getElementById("beginner-join");
const howToPlay = document.getElementById("beginner-instructions");
const instructionPage = document.getElementById("instructions");
const closeInstruction = document.getElementById("close-instructions");
const startPage = document.getElementById("prepare-start");
const roomText = document.getElementById("session-code-text");
const startDavid = document.getElementById("start-button");
const prepareGoliath = document.getElementById("prepare-page");
const codeInput = document.getElementById("enter-code");
const submitCode = document.getElementById("submit-button");
const feedbackText = document.getElementById("feedback-text");
const GuessCity = document.getElementById("guess");
const DataList = document.getElementById("datalist");
var checktext='';
var checkcity = '';
buttonPlay.addEventListener("click",()=>{
  selectPage.hidden = false;
  selectPage.disabled = false;
});
howToPlay.addEventListener("click",()=>{
  instructionPage.hidden = false;
  instructionPage.disabled = false;
});
closeInstruction.addEventListener("click",()=>{
  instructionPage.hidden = true;
  instructionPage.disabled = true;
});
create.addEventListener("click",()=>{
  beginnerPage.hidden = true;
  beginnerPage.disabled = true;
  startPage.style.display = "flex";
  //startPage.disabled = false;
  for(var i = 0;i < 5;i++){
    roomcode = roomcode*10 +Math.floor(Math.random()*10);
}
  roomText.innerHTML = roomcode.toString();
    set(ref(db,`rooms/${roomcode}`),{
      "david-lat":0,
      "david-lng":0,
      "goliath-lat":0,
      "goliath-lng":0,
      "goliath-heading":0,
      "win_or_lose":0,
    })
  });
join.addEventListener("click",()=>{
  beginnerPage.hidden = true;
  beginnerPage.disabled = true;
  prepareGoliath.hidden = false;
  prepareGoliath.disabled = false;
  (async () => {        
  const map = await initMap();
  initWebGLOverlayView(map);    
})();
})
startDavid.addEventListener("click",()=>{
    startPage.style.display = "none";

  player_state = 2;
  mapPage.hidden = false;
  mapPage.disabled = false;
  GuessCity.hidden = false;
  GuessCity.disabled = false;
  (async () => {        
  const map = await initMap();
  initWebGLOverlayView(map);    
})();
})
codeInput.addEventListener("change",(e)=>{
  checktext = e.value;
})

submitCode.addEventListener("click", ()=>{
  codeInput.value = "";
  get(child(ref(db),`rooms/${roomcode}`)).then((snapshot)=>{
    if(snapshot.exists()){
      player_state = 1;
    prepareGoliath.disabled = true;
    prepareGoliath.hidden = true;
    mapPage.hidden = false;
    mapPage.disabled = false;
    }else{
      feedbackText.innerHTML = "Fail to connect, Please check your room number"
    }
  })
});
// 如果player mode = 2，则按下space可以向前获取加速度
// 如果player mode = 1，则没这个功能
mapPage.addEventListener("keydown", event=>{
  if(player_state==2&&(event.key=="ArrowUp"||event.key=="w")){
    velocity+=0.000001
    console.log("sdsd")
  }else if(player_state==2&&(event.key=="ArrowDown"||event.key=="s")){
    if(velocity<0.000001){
      velocity = 0;
    }else{
      velocity-=0.000001;
    }
    console.log("sdsd")
  }else if(event.key=="a"||event.key=="ArrowLeft"){
    mapOptions.heading-=2;
  }else if(event.key=="d"||event.key=="ArrowRight"){
    mapOptions.heading+=2;
  }
  // }
});
document.addEventListener("keydown",async e=>{
  fetch("https://maps.googleapis.com/maps/api/place/autocomplete/json?input="+GuessCity.value+"&types=geocode&key=AIzaSyCCkrU7iEqxQceYnPwaukMA630qCLOG7_A").then((resp)=>
resp.json()).then((data)=>{
  data.results.predictions.forEach((prediction)=>{
    DataList.innerHTML+=`<option value='${prediction.structured_formatting.main_text}'>${prediction.structured_formatting.main_text}</option>`;
  })}).catch(function(error) {
  console.log(error);
});
  if(e.key=="Enter"&&player_state==2){
    console.log(GuessCity.value)
    
    if(GuessCity.value==="New York"){
      win_or_lose = 2;
        var updates={};
        updates['/rooms/' + roomcode.toString()+'/win_or_lose'] = 2;
        update(ref(db), updates);
      resultPage.disabled = false;
      resultPage.hidden = false;
      winText.innerHTML = `YOU WIN!`
    }
    }
})
// 添加鼠标移动时事件，对于两个player mode，鼠标移动都可以改变heading
mapPage.addEventListener('mousemove', (e)=>{if(player_state==2){handleMousemove(e)}}, false);
// 添加鼠标进入页面时初始化鼠标位置
mapPage.addEventListener('mouseenter', (e)=>{if(player_state==2){initMousePosition(e)}}, false);


//如果点到了david，那么游戏结束，开始进入判定

//beginner页面切换到游戏界面

