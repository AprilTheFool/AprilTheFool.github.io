
import * as THREE from 'three/webgpu';
import {
    pass,
    posterize,
    replaceDefaultUV,
    screenSize,
    uniform
} from 'three/tsl';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { bayerDither } from 'three/addons/tsl/math/Bayer.js';
import { circle } from 'three/addons/tsl/display/Shape.js';
import {
    barrelUV,
    colorBleeding,
    scanlines,
    vignette
} from 'three/addons/tsl/display/CRT.js';

console.log('made u look :3');

document.querySelectorAll('.links a').forEach((link) => {
    const originalLabel = link.textContent ?? '';
    const characters = Array.from(originalLabel);
    const eligibleIndices = characters
        .map((character, index) => character === ' ' ? -1 : index)
        .filter((index) => index !== -1);
    const originalText = document.createElement('span');
    const scrambledText = document.createElement('span');
    const characterSpans = characters.map(() => document.createElement('span'));
    const characterResetTimers = [];
    let scrambleInterval;

    originalText.className = 'scramble-original';
    originalText.textContent = originalLabel;
    scrambledText.className = 'scramble-text';
    scrambledText.setAttribute('aria-hidden', 'true');
    scrambledText.style.setProperty('--character-count', String(characters.length));
    characterSpans.forEach((characterSpan, index) => {
        characterSpan.textContent = characters[index];
        scrambledText.append(characterSpan);
    });
    link.setAttribute('aria-label', originalLabel);
    link.replaceChildren(originalText);

    link.addEventListener('pointerenter', () => {
        if (scrambleInterval !== undefined) return;

        link.classList.add('is-scrambling');
        link.append(scrambledText);
        scrambleInterval = window.setInterval(() => {
            if (eligibleIndices.length === 0) return;

            const index = eligibleIndices[Math.floor(Math.random() * eligibleIndices.length)];
            const characterSpan = characterSpans[index];
            let randomCharacter = String.fromCharCode(
                Math.floor(Math.random() * 94) + 33
            );
            if (randomCharacter === characterSpan.textContent) {
                randomCharacter = String.fromCharCode(
                    (randomCharacter.charCodeAt(0) - 32) % 94 + 33
                );
            }
            characterSpan.textContent = randomCharacter;
            window.clearTimeout(characterResetTimers[index]);
            characterResetTimers[index] = window.setTimeout(() => {
                characterSpan.textContent = characters[index];
                characterResetTimers[index] = undefined;
            }, 50);
        }, 30);
    });

    link.addEventListener('pointerleave', () => {
        window.clearInterval(scrambleInterval);
        scrambleInterval = undefined;
        characterResetTimers.forEach((timer) => window.clearTimeout(timer));
        link.classList.remove('is-scrambling');
        scrambledText.remove();
        characterSpans.forEach((characterSpan, index) => {
            characterSpan.textContent = characters[index];
        });
    });
});

const canvas = document.querySelector('#three-bg');
const loadingScreen = document.querySelector('.loading-screen');
const loadingMessage = document.querySelector('.loading-message');
const loadingWord = document.querySelector('.loading-word');
const loadingCharacters = Array.from(loadingWord.textContent ?? '');
const loadingCharacterSpans = loadingCharacters.map((character) => {
    const span = document.createElement('span');
    span.textContent = character;
    return span;
});
const loadingCharacterResetTimers = [];
let loadingScrambleInterval;

loadingWord.replaceChildren(...loadingCharacterSpans);

function stopLoadingScramble() {
    window.clearInterval(loadingScrambleInterval);
    loadingCharacterResetTimers.forEach((timer) => window.clearTimeout(timer));
    loadingCharacterSpans.forEach((characterSpan, index) => {
        characterSpan.textContent = loadingCharacters[index];
    });
}

if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    loadingScrambleInterval = window.setInterval(() => {
        const index = Math.floor(Math.random() * loadingCharacters.length);
        const characterSpan = loadingCharacterSpans[index];
        let randomCharacter = String.fromCharCode(
            Math.floor(Math.random() * 94) + 33
        );
        if (randomCharacter === characterSpan.textContent) {
            randomCharacter = String.fromCharCode(
                (randomCharacter.charCodeAt(0) - 32) % 94 + 33
            );
        }
        characterSpan.textContent = randomCharacter;
        window.clearTimeout(loadingCharacterResetTimers[index]);
        loadingCharacterResetTimers[index] = window.setTimeout(() => {
            characterSpan.textContent = loadingCharacters[index];
            loadingCharacterResetTimers[index] = undefined;
        }, 50);
    }, 30);
}

function showLoadingError(message, error) {
    console.error(message, error);
    loadingScreen.classList.add('has-error');
    loadingScreen.classList.remove('is-hidden');
    loadingScreen.setAttribute('aria-hidden', 'false');
    loadingMessage.textContent = message;
    stopLoadingScramble();
    loadingWord.textContent = 'ERROR';
}

// Renderer
const renderer = new THREE.WebGPURenderer({
    canvas,
    antialias: false
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
try {
    await renderer.init();
} catch (error) {
    showLoadingError('Unable to initialize the 3D background.', error);
    throw error;
}


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

// Retro post-processing
const colorDepthSteps = uniform(16);
const scanlineIntensity = uniform(0);
const scanlineDensity = uniform(1);
const scanlineSpeed = uniform(0);
const vignetteIntensity = uniform(0.5);
const bleeding = uniform(0.005);
const curvature = uniform(0);
const affineDistortion = uniform(0);

const retroPipeline = new THREE.RenderPipeline(renderer);
const distortedUV = barrelUV(curvature);
const distortedDelta = circle(curvature.add(0.1).mul(10), 1)
    .mul(curvature)
    .mul(0.05);

const retro = pass(scene, camera);
retro.setResolutionScale(0.25);
retro.renderTarget.texture.magFilter = THREE.NearestFilter;
retro.renderTarget.texture.minFilter = THREE.NearestFilter;

let outputNode = retro;
outputNode = replaceDefaultUV(distortedUV, outputNode);
outputNode = colorBleeding(outputNode, bleeding.add(distortedDelta));
outputNode = bayerDither(outputNode, colorDepthSteps);
outputNode = posterize(outputNode, colorDepthSteps);
outputNode = vignette(outputNode, vignetteIntensity, 0.6);
outputNode = scanlines(
    outputNode,
    scanlineIntensity,
    screenSize.y.mul(scanlineDensity),
    scanlineSpeed
);
retroPipeline.outputNode = outputNode;


// Lighting
const light = new THREE.HemisphereLight(
    0xffffff,
    0x444444,
    1.5
);

scene.add(light);

const sun = new THREE.DirectionalLight(0xffffff, 3);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0001;
sun.shadow.normalBias = 0.02;
scene.add(sun);
scene.add(sun.target);

const sunCenter = new THREE.Vector3();
let sunOrbitRadius = 20;
let modelLoaded = false;
let firstFrameRendered = false;


// Load GLB
const loader = new GLTFLoader();

loader.load('./model.glb', (gltf) => {
    scene.add(gltf.scene);
    gltf.scene.updateMatrixWorld(true);

    const modelBounds = new THREE.Box3().setFromObject(gltf.scene);
    if (!modelBounds.isEmpty()) {
        const modelSize = modelBounds.getSize(new THREE.Vector3());
        modelBounds.getCenter(sunCenter);
        sunOrbitRadius = Math.max(modelSize.length() * 0.5, 10);

        const shadowExtent = Math.max(modelSize.x, modelSize.y, modelSize.z, 10);
        sun.shadow.camera.left = -shadowExtent;
        sun.shadow.camera.right = shadowExtent;
        sun.shadow.camera.top = shadowExtent;
        sun.shadow.camera.bottom = -shadowExtent;
        sun.shadow.camera.far = shadowExtent * 4;
        sun.shadow.camera.updateProjectionMatrix();
    }
    sun.target.position.copy(sunCenter);

    // Disable texture filtering
    gltf.scene.traverse((object) => {
        if (!object.isMesh) return;

        object.castShadow = true;
        object.receiveShadow = true;

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
    modelLoaded = true;
}, undefined, (error) => {
    showLoadingError('Unable to load the 3D background.', error);
});


// Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
});


// Animation
const timer = new THREE.Timer();
timer.connect(document);

function animate() {
    timer.update();
    const elapsedTime = timer.getElapsed();
    camera.rotation.y = elapsedTime * 0.05;

    const sunAngle = -elapsedTime * 0.05;
    sun.position.set(
        sunCenter.x + Math.cos(sunAngle) * sunOrbitRadius,
        sunCenter.y + sunOrbitRadius * 0.75,
        sunCenter.z + Math.sin(sunAngle) * sunOrbitRadius
    );

    try {
        retroPipeline.render();
    } catch (error) {
        showLoadingError('Unable to render the 3D background.', error);
        return;
    }

    if (modelLoaded && !firstFrameRendered) {
        firstFrameRendered = true;
        stopLoadingScramble();
        loadingScreen.classList.add('is-hidden');
        loadingScreen.setAttribute('aria-hidden', 'true');
    }

    requestAnimationFrame(animate);
}

animate();
