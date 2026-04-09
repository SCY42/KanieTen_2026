import * as THREE from 'three';
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

// import Nearby from "nearby-js/Nearby.js";


// 장면 초기화
const scene = new THREE.Scene();
scene.background = new THREE.Color( 0xBDE3FA );
scene.fog = new THREE.Fog( 0xcccccc, 10, 150 );


// 렌더러 초기화
const renderer = new THREE.WebGLRenderer();
renderer.shadowMap.enabled = true;
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );


// 카메라 초기화
const camera = new THREE.PerspectiveCamera( 40, window.innerWidth / window.innerHeight, 1, 500 );
const cameraBox = new THREE.BoxGeometry( 0.5, 1.5, 0.5 );
camera.position.set( 0, 1.3, 0 );


// 컨트롤 초기화
const controls = new PointerLockControls( camera, renderer.domElement );
document.addEventListener( "click", () => {
    controls.lock();
} );


// // Nearby 초기화
// let nearby = new Nearby( 1000, 1000, 1000, 10 );


// 움직임 오브젝트
const movement = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
}

// 조작 키 다운 콜백
document.addEventListener('keydown', (event) => {
    switch (event.code) {
      case 'KeyW': movement.forward  = true; break;
      case 'KeyS': movement.backward = true; break;
      case 'KeyA': movement.left     = true; break;
      case 'KeyD': movement.right    = true; break;
      case 'Space': movement.up = true; break;
      case 'ControlLeft': movement.down = true; break;
    }
});

// 조작 키 업 콜백
document.addEventListener('keyup', (event) => {
    switch (event.code) {
      case 'KeyW': movement.forward     = false; break;
      case 'KeyS': movement.backward    = false; break;
      case 'KeyA': movement.left        = false; break;
      case 'KeyD': movement.right       = false; break;
      case 'Space': movement.up         = false; break;
      case 'ControlLeft': movement.down = false; break;
    }
});


// 창 크기 변경 콜백
const onWindowResize = function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.render( scene, camera );
}; window.addEventListener( "resize", onWindowResize, false );


// glft 로딩 매니저
const loadingManager = new THREE.LoadingManager();
loadingManager.onProgress = function (url, itemsLoaded, itemsTotal) {
    console.log(`${itemsLoaded}/${itemsTotal}`);
}

const lightGroup = new THREE.Group();

// glft 로드
const loader = new GLTFLoader( loadingManager );
loader.load( "scene.gltf", function ( gltf ) {
    const model = gltf.scene;

    // 모델 깊이 관련 문제 해결
    model.traverse( ( child ) => {
        if ( child.isMesh ) {
            child.receiveShadow = true;
            child.castShadow = true;
        }

        if ( child.name.endsWith( "_lightPosObj" ) ) {
            const spotLight = new THREE.SpotLight( 0xffffff );
            spotLight.position.set( child.position.x, child.position.y, child.position.z );

            const number = child.name.slice( 0, 3 );
            const art = model.getObjectByName( number + "_art" );
            const artSize = Math.max( ...new THREE.Box3().setFromObject( art ).getSize( new THREE.Vector3() ) );
            spotLight.name = number + '_light';
            spotLight.target = art
            spotLight.intensity = 50;
            spotLight.castShadow = false;
            spotLight.penumbra = 0.5;
            spotLight.angle = Math.min( Math.PI / 2, artSize / 5 );

            // spotLight.shadow.camera.near = 0;
            // spotLight.shadow.camera.far = 5;
            // spotLight.shadow.camera.left = -5;
            // spotLight.shadow.camera.right = 5;
            // spotLight.shadow.camera.top = 5;
            // spotLight.shadow.camera.bottom = -5;

            // let box = nearby.createBox( spotLight.position.x, spotLight.position.y, spotLight.position.z, 1, 1, 1 );
            // let obj = nearby.createObject( number + "_lightBox", box )
            // nearby.insert( obj );
            
            // scene.add( spotLight );
            // console.log( `added spotlight ${ child.name.slice( 0, 3 ) }` );
            // scene.add( new THREE.SpotLightHelper( spotLight ) );
            lightGroup.add( spotLight );
        }
    });

    // model.scale.set( 0.1, 0.1, 0.1 );
    model.position.set( 0, 0, 0 );
    scene.add( model );
    scene.add( lightGroup );
    // scene.add( new THREE.AxesHelper( 10 ) );
}, undefined, function ( error ) {
    console.error( error );
} );


// 초기 렌더
// const light = new THREE.AmbientLight( 0xffffff, 0.75 );
// scene.add(light);
const dirLight = new THREE.DirectionalLight( 0x87CEFA, 3 );
dirLight.shadow.normalBias = 1;
dirLight.shadow.radius = 5;
dirLight.castShadow = true;
dirLight.shadow.camera.near = 40;
dirLight.shadow.camera.far = 350;
dirLight.shadow.camera.left = -80;
dirLight.shadow.camera.right = 80;
dirLight.shadow.camera.top = 80;
dirLight.shadow.camera.bottom = -80;
dirLight.shadow.mapSize.x = 4096;
dirLight.shadow.mapSize.y = 4096;
dirLight.translateX( 80 );
dirLight.translateY( 16 );
dirLight.translateZ( 80 );
const dirLightTarget = new THREE.Object3D();
scene.add( dirLightTarget );
dirLight.target = dirLightTarget;
scene.add( dirLight );

// 컨트롤러 관련 파라미터
const SPEED = 0.5;


// let nearbyResult;

// 매 프레임
function animate() {
    requestAnimationFrame(animate);

    if (movement.forward)  controls.moveForward(SPEED);
    if (movement.backward) controls.moveForward(-SPEED);
    if (movement.left)     controls.moveRight(-SPEED);
    if (movement.right)    controls.moveRight(SPEED);
    if (movement.up)       camera.position.add(new THREE.Vector3(0, SPEED, 0));
    if (movement.down)     camera.position.add(new THREE.Vector3(0, -SPEED, 0));

    // console.log( camera.position.distanceTo( lights[0].position ) );
    // for ( let i = 0; i < lights.length; i++ ) {
    //     if ( camera.position.distanceTo( lights[i].position ) <= 30 ) {
    //         lights[i].castShadow = true;
    //     } else {
    //         lights[i].castShadow = false;
    //     }
    // }

    // nearbyResult = nearby.query( camera.position.x, camera.position.y, camera.position.z );
    // for ( let obj of nearbyResult.keys() ) {
    //     const light = scene.getObjectByName( obj.id.slice( 0, 3 ) + "_light" );
    //     light.castShadow = true;
    // }

    // controls.update();
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
} animate();