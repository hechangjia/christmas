import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// 1. 场景设置
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050510, 0.002); // 添加雾效增加氛围
scene.background = new THREE.Color(0x050510);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 15);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true; // 开启阴影
document.body.appendChild(renderer.domElement);

// 控制器
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// 2. 创建圣诞树
const treeGroup = new THREE.Group();
scene.add(treeGroup);

// 树叶材质
const leavesMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x0f5f0f, 
    roughness: 0.8 
});

// 创建树的层级 (圆锥体)
const createTreeLayer = (radius, height, yPos) => {
    const geometry = new THREE.ConeGeometry(radius, height, 32);
    const cone = new THREE.Mesh(geometry, leavesMaterial);
    cone.position.y = yPos;
    cone.castShadow = true;
    cone.receiveShadow = true;
    return cone;
};

// 堆叠圆锥体
treeGroup.add(createTreeLayer(4, 4, 2));
treeGroup.add(createTreeLayer(3, 3.5, 4.5));
treeGroup.add(createTreeLayer(2, 3, 6.5));
treeGroup.add(createTreeLayer(1, 2, 8.2));

// 树干
const trunkGeometry = new THREE.CylinderGeometry(0.8, 1, 3, 16);
const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x5c4033 });
const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
trunk.position.y = 0; // 底部
trunk.castShadow = true;
treeGroup.add(trunk);

// 树顶星星
const starGeometry = new THREE.OctahedronGeometry(0.5, 0);
const starMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const star = new THREE.Mesh(starGeometry, starMaterial);
star.position.y = 9.3;
treeGroup.add(star);

// 添加一点自发光让星星更亮
const starLight = new THREE.PointLight(0xffff00, 2, 10);
starLight.position.set(0, 9.3, 0);
treeGroup.add(starLight);

// 3. 装饰彩灯 (随机分布的小球)
const bulbGeometry = new THREE.SphereGeometry(0.15, 8, 8);
const bulbColors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00];

for (let i = 0; i < 40; i++) {
    const color = bulbColors[Math.floor(Math.random() * bulbColors.length)];
    const material = new THREE.MeshPhongMaterial({ 
        color: color, 
        emissive: color, // 让灯泡自发光
        emissiveIntensity: 0.5 
    });
    const bulb = new THREE.Mesh(bulbGeometry, material);
    
    // 简单的螺旋算法放置灯泡
    const angle = i * 0.5;
    const y = 1 + (i / 40) * 8; // 高度分布
    const radius = 3.5 - (y / 9) * 3.5; // 半径随高度减小
    
    bulb.position.set(
        Math.cos(angle) * radius,
        y,
        Math.sin(angle) * radius
    );
    treeGroup.add(bulb);
}

// 4. 地面
const groundGeometry = new THREE.PlaneGeometry(100, 100);
const groundMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff }); // 雪地
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -1.5;
ground.receiveShadow = true;
scene.add(ground);

// 5. 雪花粒子系统
const snowGeometry = new THREE.BufferGeometry();
const snowCount = 1000;
const posArray = new Float32Array(snowCount * 3);

for(let i = 0; i < snowCount * 3; i++) {
    posArray[i] = (Math.random() - 0.5) * 50;
}

snowGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
const snowMaterial = new THREE.PointsMaterial({
    size: 0.1,
    color: 0xffffff,
    transparent: true,
    opacity: 0.8
});
const snowMesh = new THREE.Points(snowGeometry, snowMaterial);
scene.add(snowMesh);

// 6. 灯光
const ambientLight = new THREE.AmbientLight(0x404040, 2); // 环境光
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 2);
dirLight.position.set(10, 20, 10);
dirLight.castShadow = true;
scene.add(dirLight);

// 7. 动画循环
function animate() {
    requestAnimationFrame(animate);
    
    // 树缓缓旋转
    treeGroup.rotation.y += 0.005;
    
    // 星星旋转
    star.rotation.y -= 0.02;
    star.rotation.z -= 0.01;

    // 下雪动画
    const positions = snowMesh.geometry.attributes.position.array;
    for(let i = 1; i < positions.length; i+=3) {
        positions[i] -= 0.05; // Y轴下降
        if (positions[i] < -2) {
            positions[i] = 15; // 超出边界回到顶部
        }
    }
    snowMesh.geometry.attributes.position.needsUpdate = true;

    controls.update();
    renderer.render(scene, camera);
}

// 窗口大小调整
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
