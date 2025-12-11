import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// 引入后期处理模块
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// --- 1. 场景与相机 ---
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050510, 0.0025);
scene.background = new THREE.Color(0x050510);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 6, 18);

const renderer = new THREE.WebGLRenderer({ antialias: false }); // 后期处理建议关闭默认抗锯齿
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.ReinhardToneMapping;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI / 2 - 0.1; // 防止钻到地底下

// --- 2. 后期处理 (辉光效果) ---
const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
bloomPass.threshold = 0.2; // 亮度阈值
bloomPass.strength = 1.2;  // 辉光强度 (梦幻关键)
bloomPass.radius = 0.5;    // 辉光半径

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// --- 3. 构建圣诞树 ---
const treeGroup = new THREE.Group();
scene.add(treeGroup);

// 材质：稍微调亮一点，反射光线
const leavesMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x0f5f0f, 
    roughness: 0.4,
    metalness: 0.1
});

const createTreeLayer = (radius, height, yPos) => {
    const geometry = new THREE.ConeGeometry(radius, height, 64);
    const cone = new THREE.Mesh(geometry, leavesMaterial);
    cone.position.y = yPos;
    cone.castShadow = true;
    cone.userData = { isTree: true }; // 标记用于点击检测
    return cone;
};

// 树层
treeGroup.add(createTreeLayer(4, 4.5, 2));
treeGroup.add(createTreeLayer(3.2, 3.8, 4.8));
treeGroup.add(createTreeLayer(2.2, 3.2, 7.0));
treeGroup.add(createTreeLayer(1.2, 2.2, 8.8));

// 树干
const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 1.2, 3, 16),
    new THREE.MeshStandardMaterial({ color: 0x3d2817 })
);
trunk.position.y = 0;
treeGroup.add(trunk);

// 星星
const star = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.6, 0),
    new THREE.MeshBasicMaterial({ color: 0xffdd00 })
);
star.position.y = 10;
treeGroup.add(star);
// 星星发光点
const starLight = new THREE.PointLight(0xffaa00, 3, 15);
starLight.position.set(0, 10, 0);
treeGroup.add(starLight);

// --- 4. 装饰灯泡 (色彩更丰富) ---
const bulbGeometry = new THREE.SphereGeometry(0.12, 16, 16);
const bulbColors = [0xff0000, 0x00ff00, 0x00aaff, 0xffff00, 0xff00ff];

for (let i = 0; i < 60; i++) {
    const color = bulbColors[Math.floor(Math.random() * bulbColors.length)];
    const material = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 3.0, // 配合 Bloom 效果
        roughness: 0.1
    });
    const bulb = new THREE.Mesh(bulbGeometry, material);
    
    // 螺旋分布
    const angle = i * 0.45;
    const y = 1.5 + (i / 60) * 8.5;
    const radius = 3.6 - (y / 10.5) * 3.6;
    
    bulb.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    
    // 给灯泡加一点随机闪烁逻辑
    bulb.userData = { 
        phase: Math.random() * Math.PI * 2, 
        speed: 0.02 + Math.random() * 0.05,
        baseIntensity: 3.0
    };
    
    treeGroup.add(bulb);
}

// --- 5. 地面与粒子 ---
const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 0.8, metalness: 0.2 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -1.5;
scene.add(ground);

// 粒子雪花
const snowGeometry = new THREE.BufferGeometry();
const snowCount = 2000;
const posArray = new Float32Array(snowCount * 3);
for(let i = 0; i < snowCount * 3; i++) posArray[i] = (Math.random() - 0.5) * 60;
snowGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
const snowMaterial = new THREE.PointsMaterial({
    size: 0.15, color: 0xffffff, transparent: true, opacity: 0.8,
    blending: THREE.AdditiveBlending // 发光混合
});
const snowMesh = new THREE.Points(snowGeometry, snowMaterial);
scene.add(snowMesh);

// --- 6. 光照 ---
scene.add(new THREE.AmbientLight(0x222244, 1)); // 偏蓝环境光
const dirLight = new THREE.DirectionalLight(0xffaaee, 1.5); // 暖色主光
dirLight.position.set(5, 10, 5);
scene.add(dirLight);

// --- 7. 交互：点击添加卡片 ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let tempClickPosition = null;

// 卡片精灵材质生成器
function createTextTexture(message) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 128;
    
    // 背景
    ctx.fillStyle = 'rgba(255, 255, 230, 0.9)';
    ctx.roundRect(0, 0, 256, 128, 15);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#d4af37'; // 金边
    ctx.stroke();

    // 文字
    ctx.font = '24px Arial';
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // 简单的换行处理
    const words = message.split('');
    let line = '';
    let y = 64;
    if(message.length > 10) {
        ctx.fillText(message.substring(0, 10), 128, 50);
        ctx.fillText(message.substring(10, 20) + (message.length>20?"...":""), 128, 80);
    } else {
        ctx.fillText(message, 128, 64);
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

window.addEventListener('click', onMouseClick);

function onMouseClick(event) {
    if (event.target.closest('#message-modal') || event.target.closest('#music-controls')) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    // 只检测树叶部分
    const intersects = raycaster.intersectObjects(treeGroup.children);

    if (intersects.length > 0) {
        const obj = intersects[0].object;
        if (obj.userData.isTree) {
            tempClickPosition = intersects[0].point; // 记录点击位置
            document.getElementById('message-modal').classList.remove('hidden');
        }
    }
}

// 挂载卡片逻辑
document.getElementById('add-card-btn').addEventListener('click', () => {
    const msg = document.getElementById('msg-input').value;
    if (!msg || !tempClickPosition) return;

    const texture = createTextTexture(msg);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    
    sprite.position.copy(tempClickPosition);
    // 让卡片稍微飘出来一点
    sprite.position.add(sprite.position.clone().normalize().multiplyScalar(0.5));
    sprite.scale.set(1.5, 0.75, 1);
    
    treeGroup.add(sprite);

    document.getElementById('msg-input').value = '';
    document.getElementById('message-modal').classList.add('hidden');
});

document.getElementById('close-modal').addEventListener('click', () => {
    document.getElementById('message-modal').classList.add('hidden');
});


// --- 8. 音乐自定义逻辑 ---
const musicUpload = document.getElementById('music-upload');
const bgm = document.getElementById('bgm');
const playBtn = document.getElementById('play-btn');

playBtn.addEventListener('click', () => {
    if (bgm.paused) {
        bgm.play();
        playBtn.textContent = "暂停";
    } else {
        bgm.pause();
        playBtn.textContent = "播放";
    }
});

musicUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const url = URL.createObjectURL(file);
        bgm.src = url;
        bgm.play();
        playBtn.textContent = "暂停";
    }
});


// --- 9. 动画循环 ---
function animate() {
    requestAnimationFrame(animate);

    // 树木自转
    treeGroup.rotation.y += 0.002;
    star.rotation.y -= 0.01;

    // 灯泡闪烁
    treeGroup.children.forEach(child => {
        if(child.geometry && child.geometry.type === 'SphereGeometry' && child.userData.phase) {
            child.userData.phase += child.userData.speed;
            const intensity = child.userData.baseIntensity + Math.sin(child.userData.phase) * 1.5;
            child.material.emissiveIntensity = Math.max(0, intensity);
        }
    });

    // 雪花下落
    const positions = snowMesh.geometry.attributes.position.array;
    for(let i = 1; i < positions.length; i+=3) {
        positions[i] -= 0.08;
        if (positions[i] < -2) positions[i] = 30;
    }
    snowMesh.geometry.attributes.position.needsUpdate = true;

    controls.update();
    // 使用 composer 替代 renderer 进行渲染
    composer.render();
}

// 窗口适配
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

animate();
