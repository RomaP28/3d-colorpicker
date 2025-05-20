import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
scene.background = null;

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1, 8);

const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// ✅ Свет добавляется в сцену (НЕ в модель)
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);

const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);

// Загрузка модели
const loader = new GLTFLoader();
let model;

const rainbowMaterial = new THREE.ShaderMaterial({
	vertexShader: `
    varying vec3 vPosition;
    varying vec2 vUv;
    void main() {
      vPosition = position;
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
	fragmentShader: `
    varying vec3 vPosition;
    varying vec2 vUv;

    // Функция для преобразования HSL → RGB
    vec3 hsl2rgb(float h, float s, float l) {
      float c = (1.0 - abs(2.0 * l - 1.0)) * s;
      float x = c * (1.0 - abs(mod(h * 6.0, 2.0) - 1.0));
      float m = l - c / 2.0;
      vec3 rgb;

      if (h < 1.0/6.0) rgb = vec3(c, x, 0.0);
      else if (h < 2.0/6.0) rgb = vec3(x, c, 0.0);
      else if (h < 3.0/6.0) rgb = vec3(0.0, c, x);
      else if (h < 4.0/6.0) rgb = vec3(0.0, x, c);
      else if (h < 5.0/6.0) rgb = vec3(x, 0.0, c);
      else rgb = vec3(c, 0.0, x);

      return rgb + vec3(m);
    }

    void main() {
      float hue = vUv.x; // горизонтально по UV
      vec3 color = hsl2rgb(hue, 1.0, 0.5); // насыщенность и яркость фиксированы
      gl_FragColor = vec4(color, 1.0);
    }
  `,
	side: THREE.DoubleSide,
});

loader.load('globe.glb', function (gltf) {
	gltf.scene.traverse((child) => {
		if (child.isMesh) {
			child.material = rainbowMaterial;
		}
	});
	scene.add(gltf.scene);
}, undefined, function (error) {
	console.error(error);
});

// Анимация
function animate() {
	controls.update();
	renderer.render(scene, camera);
	
	getCenterPixelColor(); // ← обновляем фон сайта
}
renderer.setAnimationLoop(animate);


function getCenterPixelColor() {
	const gl = renderer.getContext();
	const pixelBuffer = new Uint8Array(4); // RGBA
	
	// Считать пиксель в центре окна
	const x = Math.floor(renderer.domElement.width / 2);
	const y = Math.floor(renderer.domElement.height / 2);
	
	gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixelBuffer);
	
	const r = pixelBuffer[0];
	const g = pixelBuffer[1];
	const b = pixelBuffer[2];
	
	// Установить цвет фона страницы
	document.body.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
}