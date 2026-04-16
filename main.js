import * as THREE from 'three';
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";


// ╔══════════════════════════════════════════════════════════════════════╗ //
// ║                                초기화                                ║ //
// ╚══════════════════════════════════════════════════════════════════════╝ //

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


// 레이캐스터 초기화
const rayCaster = new THREE.Raycaster();
const down = new THREE.Vector3( 0, -1, 0 );


// 컨트롤 초기화
const controls = new PointerLockControls( camera, renderer.domElement );
document.addEventListener( "click", () => {
    controls.lock();
} );


// ╔══════════════════════════════════════════════════════════════════════╗ //
// ║                                 콜백                                 ║ //
// ╚══════════════════════════════════════════════════════════════════════╝ //

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
    } requestRender();
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
    } requestRender();
});

// 창 크기 변경 콜백
const onWindowResize = function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.render( scene, camera );
    requestRender();
}; window.addEventListener( "resize", onWindowResize, false );

// 카메라 시점 조작 콜백
controls.addEventListener( "change", requestRender );


// ╔══════════════════════════════════════════════════════════════════════╗ //
// ║                              glft 로드                               ║ //
// ╚══════════════════════════════════════════════════════════════════════╝ //

// glft 로딩 매니저
const loadingManager = new THREE.LoadingManager();
loadingManager.onProgress = function (url, itemsLoaded, itemsTotal) {
    console.log(`${itemsLoaded}/${itemsTotal}`);
}

// 땅 위에 있는 지형
const objects = [];

const loader = new GLTFLoader( loadingManager );
loader.load( "scene.gltf", function ( gltf ) {
    const model = gltf.scene;

    model.traverse( ( child ) => {
        if ( child.isMesh ) {
            child.receiveShadow = true;
            child.castShadow = true;
            console.log( child.name );
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
            scene.add( spotLight );
        }
    });

    const stair_plane_high = model.getObjectByName( "stair_plane_high" );
    const stair_plane_med = model.getObjectByName( "stair_plane_med" );
    const stair_plane_low = model.getObjectByName( "stair_plane_low" );
    const second_floor_plane = model.getObjectByName( "second_floor_plane" );

    stair_plane_high.visible = false;
    stair_plane_high.material.side = THREE.DoubleSide;
    stair_plane_med.visible = false;
    stair_plane_low.visible = false;
    second_floor_plane.visible = false;

    objects.push( stair_plane_high, stair_plane_med, stair_plane_low, second_floor_plane );

    model.position.set( 0, 0, 0 );
    scene.add( model );

}, undefined, function ( error ) {
    console.error( error );
} );


// ╔══════════════════════════════════════════════════════════════════════╗ //
// ║                              방향광 추가                             ║ //
// ╚══════════════════════════════════════════════════════════════════════╝ //

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


// ╔══════════════════════════════════════════════════════════════════════╗ //
// ║                            매 프레임 렌더                            ║ //
// ╚══════════════════════════════════════════════════════════════════════╝ //

const SPEED = 0.5;
let result;
const HEIGHT = 6.5;
const GROUND = -16.6 + HEIGHT;
const HEIGHT_VARIANCE = 2.0;
let needsRender = true;

// 움직임 여부 판정
function isMoving() {
    return Object.values( movement ).some( v => v );
}

setInterval( () => {
    if ( isMoving() ) requestRender();
}, 16.6 );

// 카메라 위치 업데이트
function updateCamera() {
    rayCaster.set( camera.position, down );
    result = rayCaster.intersectObjects( objects );
    
    if (movement.forward)  controls.moveForward(SPEED);
    if (movement.backward) controls.moveForward(-SPEED);
    if (movement.left)     controls.moveRight(-SPEED);
    if (movement.right)    controls.moveRight(SPEED);
    
    if ( result[0] == null ) {
        camera.position.y = GROUND;
    } else {
        camera.position.y = result[0].point.y + HEIGHT;
    }

    if (movement.up)       camera.position.y += HEIGHT_VARIANCE;
    if (movement.down)     camera.position.y -= HEIGHT_VARIANCE;
}


function requestRender() {
    needsRender = true;
    requestAnimationFrame( render );
}


// 애니메이팅
function render() {
    // requestAnimationFrame(render);
    if ( !needsRender ) { return; }
    
    needsRender = false;
    updateCamera();
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    console.log( "now rendering!" );
} render();