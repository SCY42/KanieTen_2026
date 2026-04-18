import * as THREE from 'three';
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { StaticGeometryGenerator, MeshBVH } from 'three-mesh-bvh';


// ╔══════════════════════════════════════════════════════════════════════╗ //
// ║                                초기화                                ║ //
// ╚══════════════════════════════════════════════════════════════════════╝ //


// 장면 초기화
const scene = new THREE.Scene();
const textureCube = new THREE.CubeTextureLoader()
    .setPath( "cube/" )
    .load(
        [ 'east.bmp', 'west.bmp', 'up.bmp', 'down.bmp', 'north.bmp', 'south.bmp' ],
        ( texture ) => {
            scene.background = texture;
        }
    );
textureCube.mapping = THREE.CubeRefractionMapping;
// scene.background = new THREE.Color( 0xBDE3FA );
scene.fog = new THREE.Fog( 0xcccccc, 10, 150 );


// 렌더러 초기화
const renderer = new THREE.WebGLRenderer();
renderer.shadowMap.enabled = true;
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );


// 카메라 초기화
const camera = new THREE.PerspectiveCamera( 40, window.innerWidth / window.innerHeight, 1, 500 );
camera.position.set( -11, -10, 10 );


// 카메라 충돌체 초기화
const RADIUS = 3;
let collider;


// 임시 오브젝트들 (충돌 판정용)
const tempBox = new THREE.Box3();
const tempVector = new THREE.Vector3();
const tempVector2 = new THREE.Vector3();
const tempMat = new THREE.Matrix4();


// 레이캐스터 초기화
const rayCaster = new THREE.Raycaster();
const down = new THREE.Vector3( 0, -1, 0 );


// 컨트롤 초기화
const controls = new PointerLockControls( camera, renderer.domElement );
controls.pointerSpeed = 0.5;
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
    run: 0,
}

// 조작 키 다운 콜백
document.addEventListener( 'keydown', (e) => {
    switch (e.code) {
      case 'KeyW': movement.forward     = true; break;
      case 'KeyS': movement.backward    = true; break;
      case 'KeyA': movement.left        = true; break;
      case 'KeyD': movement.right       = true; break;
      case 'Space': movement.up         = true; break;
      case 'ControlLeft': movement.down = true; break;
      case 'ShiftLeft': movement.run    = 1;    break;

      case 'KeyE': zoomIn(); break;
    } requestRender();
} );

// 조작 키 업 콜백
document.addEventListener( 'keyup', (e) => {
    switch (e.code) {
      case 'KeyW': movement.forward     = false; break;
      case 'KeyS': movement.backward    = false; break;
      case 'KeyA': movement.left        = false; break;
      case 'KeyD': movement.right       = false; break;
      case 'Space': movement.up         = false; break;
      case 'ControlLeft': movement.down = false; break;
      case 'ShiftLeft': movement.run    = 0;     break;
      
      case 'KeyE': zoomOut(); break;
    } requestRender();
} );

// bgm 오브젝트
const bgm = document.getElementById( "bgm" );
const bgm_on = document.getElementById( "bgm_on" );
const bgm_off = document.getElementById( "bgm_off" );

// bgm 재생 / 정지 키 콜백
document.addEventListener( "keydown", (e) => {
    if ( e.code != "KeyM" ) return;

    if ( bgm.paused ) {
        bgm.play();
        bgm_on.style.visibility = "visible";
        bgm_off.style.visibility = "hidden";
    }
    else {
        bgm.pause();
        bgm_on.style.visibility = "hidden";
        bgm_off.style.visibility = "visible";
    }
} )

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

const pauseScreen = document.getElementById( "pauseScreen" );

// 포커스 해제 콜백
controls.addEventListener( "unlock", function() {
    pauseScreen.style.display = "grid";
} );

// 포커스 콜백
controls.addEventListener( "lock", function() {
    pauseScreen.style.display = "none";
} );


// ╔════════════════════════════════════════════════════════════════════════╗ //
// ║                             함수 이것저것                              ║ //
// ╚════════════════════════════════════════════════════════════════════════╝ //


// 움직임 여부 판정
function isMoving() {
    return Object.values( movement ).some( v => v );
}

// 매 프레임 움직임 여부 판정
setInterval( () => {
    if ( isMoving() ) requestRender();
}, 16.6 );

// 줌 인
function zoomIn() {
    camera.zoom = 2;
    controls.pointerSpeed = 0.1;
}

// 줌 아웃
function zoomOut() {
    camera.zoom = 1;
    controls.pointerSpeed = 0.5;
}


// ╔══════════════════════════════════════════════════════════════════════╗ //
// ║                              glft 로드                               ║ //
// ╚══════════════════════════════════════════════════════════════════════╝ //


// glft 로딩 매니저
const loadingProgress = document.getElementById( "loadingProgress" );
const loadingManager = new THREE.LoadingManager();
loadingManager.onProgress = function (url, itemsLoaded, itemsTotal) {
    const TOTAL = 40;
    const filled = Math.round( TOTAL * ( itemsLoaded / itemsTotal ) );
    loadingProgress.textContent = '█'.repeat(filled) + '▒'.repeat( TOTAL - filled );
}

// 땅 위에 있는 바닥들
const floors = [];

// GLTF 로드
const loader = new GLTFLoader( loadingManager );
loader.load( "scene.gltf", function ( gltf ) {
    const model = gltf.scene;

    model.traverse( ( child ) => {
        // 메쉬 그림자 활성화
        if ( child.isMesh ) {
            child.receiveShadow = true;
            child.castShadow = true;
            // console.log( child.name );
        }

        // 지정된 위치에 조명 배치
        if ( child.name.endsWith( "_lightPosObj" ) ) {
            const spotLight = new THREE.SpotLight( 0xffffff );
            spotLight.position.set( child.position.x, child.position.y, child.position.z );

            const number = child.name.slice( 0, 3 );
            const art = model.getObjectByName( number + "_art" );
            const artSize = Math.max( ...new THREE.Box3().setFromObject( art ).getSize( new THREE.Vector3() ) );
            spotLight.name = number + '_light';
            spotLight.target = art
            spotLight.intensity = 75;
            spotLight.castShadow = false;
            spotLight.penumbra = 0.5;
            spotLight.angle = Math.min( Math.PI / 2, artSize / 5 );
            scene.add( spotLight );
        }
    });

    // BVH 생성
    const gen = new StaticGeometryGenerator( gltf.scene );
    const geom = gen.generate();
    geom.boundsTree = new MeshBVH( geom );

    collider = new THREE.Mesh( geom );

    // 보조 메쉬가 안 보이도록 설정
    const stair_plane_high = model.getObjectByName( "stair_plane_high" );
    const stair_plane_med = model.getObjectByName( "stair_plane_med" );
    const stair_plane_low = model.getObjectByName( "stair_plane_low" );
    const second_floor_plane = model.getObjectByName( "second_floor_plane" );
    const wall_001 = model.getObjectByName( "wall_001" );
    const wall_002 = model.getObjectByName( "wall_002" );
    const wall_003 = model.getObjectByName( "wall_003" );
    const wall_004 = model.getObjectByName( "wall_004" );
    const wall_005 = model.getObjectByName( "wall_005" );

    stair_plane_high.visible = false;
    stair_plane_med.visible = false;
    stair_plane_low.visible = false;
    second_floor_plane.visible = false;
    wall_001.visible = false;
    wall_002.visible = false;
    wall_003.visible = false;
    wall_004.visible = false;
    wall_005.visible = false;

    // 바닥 메쉬를 배열에 추가
    floors.push( stair_plane_high, stair_plane_med, stair_plane_low, second_floor_plane );

    model.position.set( 0, 0, 0 );
    scene.add( model );

    requestRender();

}, undefined, function ( error ) {
    console.error( error );
} );


// ╔══════════════════════════════════════════════════════════════════════╗ //
// ║                              방향광 추가                             ║ //
// ╚══════════════════════════════════════════════════════════════════════╝ //


const light = new THREE.AmbientLight( 0xffffff, 0.25 );
// scene.add(light);
const dirLight = new THREE.DirectionalLight( 0xffffff, 2 );
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


const SPEED = 0.3;
const SPEED_VARIANCE = 0.3;
let result;
const HEIGHT = 6.5;
const GROUND = -16.6 + HEIGHT;
const HEIGHT_VARIANCE = 2.0;
let needsRender = true;


// 카메라 위치 업데이트
function updateCamera() {
    rayCaster.set( camera.position, down );
    result = rayCaster.intersectObjects( floors );

    if ( movement.forward )  controls.moveForward( SPEED + movement.run * SPEED_VARIANCE );
    if ( movement.backward ) controls.moveForward( -( SPEED + movement.run * SPEED_VARIANCE ) );
    if ( movement.left )     controls.moveRight( -( SPEED + movement.run * SPEED_VARIANCE ) );
    if ( movement.right )    controls.moveRight( SPEED + movement.run * SPEED_VARIANCE );
    
    if ( result[0] == null ) {
        camera.position.y = GROUND;
    } else {
        camera.position.y = result[0].point.y + HEIGHT;
    }

    if ( movement.up )       camera.position.y += HEIGHT_VARIANCE;
    if ( movement.down )     camera.position.y -= HEIGHT_VARIANCE;
}


// 충돌 처리 (ChatGPT)
function resolveCollision() {
    if (!collider) return;
  
    // 로컬 변환
    tempMat.copy(collider.matrixWorld).invert();
    const localPos = tempVector.applyMatrix4.call(
      tempVector.copy(camera.position),
      tempMat
    );
  
    // AABB
    tempBox.min.copy(localPos).addScalar( -RADIUS );
    tempBox.max.copy(localPos).addScalar( RADIUS );
  
    collider.geometry.boundsTree.shapecast({
  
      intersectsBounds: box => box.intersectsBox(tempBox),
  
      intersectsTriangle: tri => {
  
        const closest = tempVector2;
        tri.closestPointToPoint(localPos, closest);
  
        const dist = closest.distanceTo(localPos);
  
        if (dist < RADIUS) {
  
          const depth = RADIUS - dist;
          const dir = localPos.clone().sub(closest).normalize();
  
          localPos.addScaledVector(dir, depth);
        }
      }
    });
  
    // 월드 복귀
    camera.position.copy(localPos.applyMatrix4(collider.matrixWorld));
  }


// 렌더링 리퀘스트
function requestRender() {
    needsRender = true;
    requestAnimationFrame( render );
}


// 애니메이팅
function render() {
    // requestAnimationFrame(render);
    if ( !needsRender ) return;
    
    needsRender = false;
    updateCamera();
    resolveCollision();
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    console.log( "now rendering!" );
    // console.log( camera.position );
} render();