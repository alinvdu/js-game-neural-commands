import * as THREE from "three";
import * as GLTFLoader from "gltfloader";

const loader = new GLTFLoader.GLTFLoader();
let controls;
let clock;
let mixer;
let player;
let walkingAnimation;
let idleAnimation;
let modelReady = 0; // model ready after loading the model and all animations -> 2
let initializedAnimations = false;
let lastAction;
let activeAction;
let targetEl;
const targetPositionInit = 3.5;
let LAST_TRAINING_SESSION;

const startApp = () => {
  document.getElementById("tryingToConnect").style.display = "none";
};

const stopApp = () => {
  document.getElementById("tryingToConnect").style.display = "flex";
};

const connect = () => {
  const wss = new WebSocket("ws://localhost:8080");

  wss.addEventListener("open", (open) => {
    startApp();
  });

  const modes = ["MENU", "PLAY", "TRAIN"];
  let currentMode = "PLAY";
  const UPDATE_INTERVAL = 20;

  wss.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);
    if (data.internalMessage) {
      // this is just a communication stuff
      if (data.action === "SAVE_QUESTION") {
        document.getElementById("saveOrDiscard").style.display = "block";
      } else if (data.action === "FAILED") {
        document.getElementById("trainingFailed").style.display = "block";
        setTimeout(() => {
          document.getElementById("trainingFailed").style.display = "none";
          toggleMenu(true);
          resetTargetPosition();
        }, 4000);
      }
    } else {
      const firstAction = data.com[0];
      console.log("received command", firstAction);

      if (firstAction === "push") {
        setAction(walkingAnimation);
      }

      if (firstAction == "neutral") {
        setAction(idleAnimation);
      }

      if (firstAction === "backward") {
        //cube.position.z += 0.1;
      }

      if (firstAction === "left") {
        //cube.position.x -= 0.1;
      }

      if (firstAction === "right") {
        //cube.position.x += 0.1;
      }
    }
  });

  wss.addEventListener("error", () => {
    console.log("error");
    stopApp();
    setTimeout(() => {
      connect();
    });
  });

  wss.addEventListener("close", () => {
    console.log("closed");
    stopApp();
    setTimeout(() => {
      connect();
    });
  });
};

const canvas = document.querySelector("canvas.webgl");
const scene = new THREE.Scene();

const cameraOffset = new THREE.Vector3(0, 1.3, -0.8);

let sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height);
camera.position.set(cameraOffset.x, cameraOffset.y, cameraOffset.z);
camera.lookAt(0, 0.9, 0);
scene.add(camera);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
});
renderer.setSize(sizes.width, sizes.height);
renderer.render(scene, camera);

const toggleMenu = (show = true) => {
  const menu = document.getElementById("menu");

  if (show) {
    menu.style.display = "flex";
  } else {
    menu.style.display = "none";
  }
};

const toggleTraining = (show = true) => {
  const menu = document.getElementById("training");

  if (show) {
    menu.style.display = "flex";
  } else {
    menu.style.display = "none";
  }
};

const update = (timestamp) => {
  if (modelReady == 2 && !initializedAnimations) {
    initializedAnimations = true;
    // play idle animation
    setAction(idleAnimation);
  }

  if (player) {
    const cameraPosition = player.position.clone().add(cameraOffset);
    camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
    render(timestamp);
  }
  renderer.render(scene, camera);
  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);
  requestAnimationFrame(update);
};

requestAnimationFrame(update);

const init = () => {
  clock = new THREE.Clock();
  //controls = new OrbitControls.OrbitControls(camera, renderer.domElement);
  toggleMenu();
  toggleTraining(false);
};

const loadModel = () => {
  loader.load(
    // resource URL
    "/virtual/models/char.glb",
    // called when the resource is loaded
    function (gltf) {
      gltf.scene.scale.x = 0.4;
      gltf.scene.scale.y = 0.4;
      gltf.scene.scale.z = 0.4;
      scene.add(gltf.scene);
      gltf.scene; // THREE.Group
      gltf.scenes; // Array<THREE.Group>
      gltf.cameras; // Array<THREE.Camera>
      gltf.asset; // Object
      setupLight(gltf.asset);
      player = gltf.scene;
      mixer = new THREE.AnimationMixer(gltf.scene);
      idleAnimation = mixer.clipAction(gltf.animations[0]);
      modelReady++;
      loadAnimations();
    },
    // called while loading is progressing
    function (xhr) {
      console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
    },
    // called when loading has errors
    function (error) {
      console.log("An error happened", error);
    }
  );
};

const loadConstructionCone = () => {
  loader.load(
    // resource URL
    "/virtual/models/cone.gltf",
    // called when the resource is loaded
    function (gltf) {
      gltf.scene.scale.x = 0.0008;
      gltf.scene.scale.y = 0.0008;
      gltf.scene.scale.z = 0.0008;
      gltf.scene.position.z = targetPositionInit;
      scene.add(gltf.scene);
      targetEl = gltf.scene;
    },
    // called while loading is progressing
    function (xhr) {
      console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
    },
    // called when loading has errors
    function (error) {
      console.log("An error happened", error);
    }
  );
};

const setAction = (toAction) => {
  if (toAction != activeAction) {
    lastAction = activeAction;
    activeAction = toAction;
    //lastAction.stop()
    if (lastAction) {
      lastAction.fadeOut(1);
    }
    activeAction.reset();
    activeAction.fadeIn(1);
    activeAction.play();
  }
};

const loadAnimations = () => {
  loader.load(
    // resource URL
    "/virtual/models/walking.glb",
    function (gltf) {
      walkingAnimation = mixer.clipAction(gltf.animations[0]);
      modelReady++;
    },
    function (xhr) {
      console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
    },
    // called when loading has errors
    function (error) {
      console.log("An error happened", error);
    }
  );
};

const setupLight = (mainObject) => {
  //const light = new THREE.AmbientLight(0xffffff, 1.5); // soft white light
  //scene.add(light);

  const light = new THREE.PointLight(0xffffff, 0.9, 200);
  light.position.set(1.3, 0.7, 0);
  light.target = mainObject;
  scene.add(light);

  const light2 = new THREE.PointLight(0xffffff, 0.9, 200);
  light2.position.set(-0.5, 0.7, 0.2);
  light2.target = mainObject;
  scene.add(light2);

  const light3 = new THREE.PointLight(0xffffff, 0.9, 200);
  light3.position.set(-0.5, 0.7, -0.2);
  light3.target = mainObject;
  scene.add(light3);

  const ambient = new THREE.AmbientLight(0xffffff, 0.5); // soft white light
  scene.add(ambient);
};

const resetTargetPosition = () => {
  targetEl.position.z = targetPositionInit;
};

// text and related
const toggleWalkingSessionTrain = (show) => {
  if (show) {
    document.getElementById("training").style.display = "none";
    document.getElementById("walkingTrainHelper").style.display = "block";
    setTimeout(() => {
      setAction(walkingAnimation);
      toggleWalkingSessionTrain(false);
      wss.send(
        JSON.stringify({
          action: "TRAIN",
          trainType: "push",
        })
      );
      LAST_TRAINING_SESSION = "push";
      // move the object
      const movingInterval = setInterval(() => {
        targetEl.position.z -= 0.014;
      }, 30);

      setTimeout(() => {
        setAction(idleAnimation);
        clearInterval(movingInterval);
      }, 8000);
    }, 6000);
  } else {
    document.getElementById("walkingTrainHelper").style.display = "none";
  }
};

const startIdleSessionTrain = () => {
  setAction(idleAnimation);
  document.getElementById("idleTrainHelper").style.display = "block";
  toggleTraining(false);

  setTimeout(() => {
    document.getElementById("idleTrainHelper").style.display = "none";
    targetEl.visible = false;
    wss.send(
      JSON.stringify({
        action: "TRAIN",
        trainType: "idle",
      })
    );
    LAST_TRAINING_SESSION = "idle";
    setTimeout(() => {
      document.getElementById("goodJob").style.display = "block";
      targetEl.visible = true;
      setTimeout(() => {
        toggleTraining(true);
        document.getElementById("goodJob").style.display = "none";
      }, 3000);
    }, 8000);
  }, 5000);
};

const bindMenuItems = () => {
  document.getElementById("train").addEventListener("click", () => {
    toggleMenu(false);
    toggleTraining(true);
  });

  document.getElementById("walking").addEventListener("click", () => {
    toggleWalkingSessionTrain(true);
  });

  document.getElementById("idle").addEventListener("click", () => {
    startIdleSessionTrain(true);
  });

  document.getElementById("back").addEventListener("click", () => {
    toggleMenu(true);
    toggleTraining(false);
  });

  document.getElementById("play").addEventListener("click", () => {
    toggleMenu(false);
    console.log("sennding message");
    wss.send(
      JSON.stringify({
        action: "PLAY",
      })
    );
    setTimeout(() => {
      toggleMenu(true);
      setAction(idleAnimation);
      wss.send(
        JSON.stringify({
          action: "STOP_PLAY",
        })
      );
    }, 15000);
  });

  document.getElementById("YES").addEventListener("click", () => {
    wss.send(
      JSON.stringify({
        action: "RESPONSE_YES",
        trainType: LAST_TRAINING_SESSION,
      })
    );
    document.getElementById("saveOrDiscard").style.display = "none";
    toggleMenu(true);
    resetTargetPosition();
  });

  document.getElementById("NO").addEventListener("click", () => {
    wss.send(
      JSON.stringify({
        action: "RESPONSE_NO",
        trainType: LAST_TRAINING_SESSION,
      })
    );
    document.getElementById("saveOrDiscard").style.display = "none";
    toggleMenu(true);
    resetTargetPosition();
  });
};

init();
loadModel();
loadConstructionCone();
bindMenuItems();

////////////////////////////////
////////////////////
///////////

// particles
let particles;
const particleNum = 10000;
const maxRange = 1000;
const minRange = maxRange / 2;
const textureSize = 64.0;

const drawRadialGradation = (ctx, canvasRadius, canvasW, canvasH) => {
  ctx.save();
  const gradient = ctx.createRadialGradient(
    canvasRadius,
    canvasRadius,
    0,
    canvasRadius,
    canvasRadius,
    canvasRadius
  );
  gradient.addColorStop(0, "rgba(255,255,255,1.0)");
  gradient.addColorStop(0.5, "rgba(255,255,255,0.5)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvasW, canvasH);
  ctx.restore();
};

const getTexture = () => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const diameter = textureSize;
  canvas.width = diameter;
  canvas.height = diameter;
  const canvasRadius = diameter / 2;

  /* gradation circle
    ------------------------ */
  drawRadialGradation(ctx, canvasRadius, canvas.width, canvas.height);

  /* snow crystal
    ------------------------ */
  // drawSnowCrystal(ctx, canvasRadius);

  const texture = new THREE.Texture(canvas);
  //texture.minFilter = THREE.NearestFilter;
  texture.type = THREE.FloatType;
  texture.needsUpdate = true;
  return texture;
};

const render = (timeStamp) => {
  const posArr = particles.geometry.vertices;
  const velArr = particles.geometry.velocities;

  posArr.forEach((vertex, i) => {
    const velocity = velArr[i];

    const x = i * 3;
    const y = i * 3 + 1;
    const z = i * 3 + 2;

    const velX = Math.sin(timeStamp * 0.001 * velocity.x) * 0.1;
    const velZ = Math.cos(timeStamp * 0.0015 * velocity.z) * 0.1;

    vertex.x += velX;
    vertex.y += velocity.y;
    vertex.z += velZ;

    if (vertex.y < -minRange) {
      vertex.y = minRange;
    }
  });

  particles.geometry.verticesNeedUpdate = true;

  renderer.render(scene, camera);
};

const onResize = () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
};

const init2 = () => {
  /* scene
    -------------------------------------------------------------*/
  scene.fog = new THREE.Fog(0x000036, 0, minRange * 3);

  /* renderer
    -------------------------------------------------------------*/
  renderer.shadowMap.enabled = true;

  /* Snow Particles
    -------------------------------------------------------------*/
  const pointGeometry = new THREE.Geometry();
  for (let i = 0; i < particleNum; i++) {
    const x = Math.floor(Math.random() * maxRange - minRange);
    const y = Math.floor(Math.random() * maxRange - minRange);
    const z = Math.floor(Math.random() * maxRange - minRange);
    const particle = new THREE.Vector3(x, y, z);
    pointGeometry.vertices.push(particle);
    // const color = new THREE.Color(0xffffff);
    // pointGeometry.colors.push(color);
  }

  const pointMaterial = new THREE.PointsMaterial({
    size: 2,
    color: 0xccb69b,
    vertexColors: false,
    map: getTexture(),
    // blending: THREE.AdditiveBlending,
    transparent: true,
    // opacity: 0.8,
    fog: true,
    depthWrite: false,
  });

  const velocities = [];
  for (let i = 0; i < particleNum; i++) {
    const x = Math.floor(Math.random() * 6 - 3) * 0.1;
    const y = Math.floor(Math.random() * 10 + 3) * -0.05;
    const z = Math.floor(Math.random() * 6 - 3) * 0.1;
    const particle = new THREE.Vector3(x, y, z);
    velocities.push(particle);
  }

  particles = new THREE.Points(pointGeometry, pointMaterial);
  particles.geometry.velocities = velocities;
  scene.add(particles);
};

init2();
connect();
