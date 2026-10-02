
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const canvas = document.querySelector('#three-bg');

// Renderer
const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));


// Scene
const scene = new THREE.Scene();

scene.background = new THREE.Color(0xffffff);

// Fog
scene.fog = new THREE.Fog(0xffffff, 10, 70);


// Camera
const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

camera.position.set(0, 5, 30);


// Lighting
const light = new THREE.HemisphereLight(
    0xffffff,
    0x444444,
    3
);

scene.add(light);


// Load GLB
const loader = new GLTFLoader();

loader.load('./model.glb', (gltf) => {
    scene.add(gltf.scene);

    // Disable texture filtering
    gltf.scene.traverse((object) => {
        if (!object.isMesh) return;

        const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];

        materials.forEach((material) => {
            for (const key in material) {
                const value = material[key];

                if (value && value.isTexture) {
                    value.magFilter = THREE.NearestFilter;
                    value.minFilter = THREE.NearestFilter;
                    value.generateMipmaps = false;
                    value.needsUpdate = true;
                }
            }
        });
    });
});


// Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
});


// Animation
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    camera.rotation.y = clock.getElapsedTime() * 0.02;

    renderer.render(scene, camera);
}

animate();

