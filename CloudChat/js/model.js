// ── Model Loading & Neural Animation ──────────────────────────
import { LOCAL_MODEL, SERVER_API, State, getSettingsValues } from './config.js';
import { ModelCacheDB, requestPersistentStorage } from './storage.js';
import { updateStatus, updateSendButtons } from './ui.js';

// ── Neural Network Background Animation ─────────────────
let neuralAnimId = null;
let neuralResizeHandler = null;
let neuralProgress = 0;
let neuralMilestoneFlash = 0;
let neuralNodes = [];
let neuralConnections = [];
let _prevNeuralProgress = 0;

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - clamp01(value), 3);
}

function updateLoaderCopy(phase, detail = phase) {
  const phaseEl = document.getElementById('loader-phase');
  const messageEl = document.getElementById('loader-msg');
  if (phaseEl) phaseEl.textContent = phase;
  if (messageEl) messageEl.innerText = detail;
}

function updateRescueCopy(title, detail) {
  const titleEl = document.getElementById('loader-rescue-title');
  const detailEl = document.getElementById('loader-rescue-desc');
  if (titleEl) titleEl.textContent = title;
  if (detailEl) detailEl.textContent = detail;
}

function logLoaderEvent(phase, detail = phase) {
  updateLoaderCopy(phase, detail);
  const log = document.getElementById('global-boot-log');
  if (!log) return;

  const line = document.createElement('div');
  line.className = 'boot-line';

  const phaseEl = document.createElement('span');
  phaseEl.className = 'boot-line-phase';
  phaseEl.textContent = phase;

  const detailEl = document.createElement('span');
  detailEl.className = 'boot-line-detail';
  detailEl.textContent = detail;

  line.append(phaseEl, detailEl);
  log.prepend(line);
  if (log.children.length > 4) log.removeChild(log.lastChild);
}

function updateLoaderTelemetry() {
  const progress = clamp01(neuralProgress / 100);
  const onlineNodes = neuralNodes.length
    ? neuralNodes.filter(node => progress >= node.threshold).length
    : Math.round(1 + progress * 30);
  const activeConnections = neuralConnections.length
    ? neuralConnections.filter(connection => progress >= connection.threshold).length
    : Math.round(progress * 40);
  const activity = Math.round(12 + Math.pow(progress, 1.18) * 88);

  const nodesEl = document.getElementById('loader-nodes-value');
  const linksEl = document.getElementById('loader-links-value');
  const activityEl = document.getElementById('loader-activity-value');
  if (nodesEl) nodesEl.textContent = `${onlineNodes}/${Math.max(neuralNodes.length, 31)}`;
  if (linksEl) linksEl.textContent = `${activeConnections}/${Math.max(neuralConnections.length, 40)}`;
  if (activityEl) activityEl.textContent = `${activity}%`;
}

export function setNeuralProgress(pct) {
  const prev = _prevNeuralProgress;
  neuralProgress = Math.max(0, Math.min(100, pct));
  _prevNeuralProgress = neuralProgress;
  const loader = document.getElementById('global-loader');
  const canvas = document.getElementById('neural-net-canvas');
  const progress01 = neuralProgress / 100;
  const surge = progress01 > 0.82 ? Math.pow((progress01 - 0.82) / 0.18, 1.55) : 0;
  const energy = Math.max(progress01 * 0.72, Math.min(1, progress01 * 0.78 + surge * 0.46));
  if (loader) loader.style.setProperty('--neural-energy', energy.toFixed(3));
  if (canvas) canvas.style.opacity = String(0.28 + energy * 0.4);

  const fill = document.getElementById('loader-progress-fill');
  const text = document.getElementById('loader-progress-text');
  if (fill) {
    const isMilestone = [20, 45, 70, 100].some(milestone => prev < milestone && neuralProgress >= milestone);
    if (isMilestone) {
      fill.classList.add('milestone');
      neuralMilestoneFlash = 34;
      setTimeout(() => fill.classList.remove('milestone'), 650);
    }
    fill.style.width = `${neuralProgress}%`;
  }
  if (text) text.textContent = neuralProgress > 0 ? `${Math.round(neuralProgress)}% synchronized` : '0%';
  updateLoaderTelemetry();
}

export function startNeuralNetworkAnimation() {
  if (neuralAnimId || neuralResizeHandler) stopNeuralNetworkAnimation();
  const canvas = document.getElementById('neural-net-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const coreEl = document.querySelector('#global-loader .neural-core');

  let core = { x: 0, y: 0 };
  let w = 0;
  let h = 0;

  const updateCore = () => {
    if (!coreEl) {
      core = { x: w * 0.5, y: h * 0.44 };
      return;
    }
    const canvasRect = canvas.getBoundingClientRect();
    const coreRect = coreEl.getBoundingClientRect();
    core = {
      x: Math.max(0, Math.min(w, (coreRect.left + coreRect.width * 0.5) - canvasRect.left)),
      y: Math.max(0, Math.min(h, (coreRect.top + coreRect.height * 0.5) - canvasRect.top))
    };
  };

  const connectNodes = (seen, from, to, threshold) => {
    const a = Math.min(from, to);
    const b = Math.max(from, to);
    const key = `${a}:${b}`;
    if (seen.has(key)) return;
    seen.add(key);
    neuralConnections.push({
      from,
      to,
      threshold,
      phaseOffset: Math.random(),
      spark: Math.random() > 0.35
    });
  };

  const buildNetwork = () => {
    neuralNodes = [];
    neuralConnections = [];
    updateCore();

    const minDim = Math.min(w, h);
    const seen = new Set();
    const rings = [
      { count: 6, radius: minDim * 0.2, threshold: 0.12, offset: -Math.PI / 2 },
      { count: 10, radius: minDim * 0.32, threshold: 0.34, offset: -Math.PI / 2 + Math.PI / 10 },
      { count: 14, radius: minDim * 0.43, threshold: 0.62, offset: -Math.PI / 2 + Math.PI / 14 }
    ];

    neuralNodes.push({
      ring: 0,
      threshold: 0.02,
      anchorAngle: -Math.PI / 2,
      anchorRadius: 0,
      wobble: 0,
      orbitSpeed: 0,
      radiusSpeed: 0,
      phaseOffset: 0,
      renderX: core.x,
      renderY: core.y
    });

    const ringIndices = [];
    for (const ring of rings) {
      const indices = [];
      for (let i = 0; i < ring.count; i++) {
        const angle = ring.offset + (i / ring.count) * Math.PI * 2;
        indices.push(neuralNodes.length);
        neuralNodes.push({
          ring: ringIndices.length + 1,
          threshold: ring.threshold,
          anchorAngle: angle,
          anchorRadius: ring.radius,
          wobble: 2.2 + ringIndices.length * 1.6 + Math.random() * 1.8,
          orbitSpeed: 0.26 + Math.random() * 0.22 + ringIndices.length * 0.04,
          radiusSpeed: 0.38 + Math.random() * 0.24,
          phaseOffset: Math.random() * Math.PI * 2,
          renderX: core.x + Math.cos(angle) * ring.radius,
          renderY: core.y + Math.sin(angle) * ring.radius
        });
      }
      ringIndices.push(indices);
    }

    for (const nodeIndex of ringIndices[0]) connectNodes(seen, 0, nodeIndex, 0.08);

    for (let i = 0; i < ringIndices[0].length; i++) {
      connectNodes(seen, ringIndices[0][i], ringIndices[0][(i + 1) % ringIndices[0].length], 0.18);
      connectNodes(seen, ringIndices[0][i], ringIndices[1][(i * 2) % ringIndices[1].length], 0.24);
      connectNodes(seen, ringIndices[0][i], ringIndices[1][(i * 2 + 1) % ringIndices[1].length], 0.28);
    }

    for (let i = 0; i < ringIndices[1].length; i++) {
      connectNodes(seen, ringIndices[1][i], ringIndices[1][(i + 1) % ringIndices[1].length], 0.38);
      connectNodes(seen, ringIndices[1][i], ringIndices[2][Math.floor((i / ringIndices[1].length) * ringIndices[2].length)], 0.54);
      connectNodes(seen, ringIndices[1][i], ringIndices[2][(Math.floor((i / ringIndices[1].length) * ringIndices[2].length) + 1) % ringIndices[2].length], 0.58);
    }

    for (let i = 0; i < ringIndices[2].length; i++) {
      connectNodes(seen, ringIndices[2][i], ringIndices[2][(i + 2) % ringIndices[2].length], 0.76);
    }

    updateLoaderTelemetry();
  };

  const resize = () => {
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildNetwork();
  };

  resize();
  neuralResizeHandler = resize;
  window.addEventListener('resize', neuralResizeHandler);

  const draw = () => {
    updateCore();
    ctx.clearRect(0, 0, w, h);

    const time = performance.now() / 1000;
    const progress = clamp01(neuralProgress / 100);
    const surge = progress > 0.82 ? Math.pow((progress - 0.82) / 0.18, 1.55) : 0;
    const signal = 0.18 + Math.pow(progress, 1.35) * 0.82 + surge * 0.18;
    const milestoneIntensity = neuralMilestoneFlash > 0 ? neuralMilestoneFlash / 34 : 0;
    if (neuralMilestoneFlash > 0) neuralMilestoneFlash--;

    const ambient = ctx.createRadialGradient(core.x, core.y, 0, core.x, core.y, Math.min(w, h) * 0.54);
    ambient.addColorStop(0, `rgba(124, 167, 255, ${0.1 + signal * 0.16})`);
    ambient.addColorStop(0.45, `rgba(124, 167, 255, ${0.02 + signal * 0.05})`);
    ambient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = ambient;
    ctx.fillRect(0, 0, w, h);

    for (const node of neuralNodes) {
      if (node.ring === 0) {
        node.renderX = core.x;
        node.renderY = core.y;
        continue;
      }
      const activation = easeOutCubic((progress - node.threshold + 0.08) / 0.22);
      const orbitAngle = node.anchorAngle + Math.sin(time * node.orbitSpeed + node.phaseOffset) * (0.05 + node.ring * 0.008);
      const radius = node.anchorRadius + Math.sin(time * node.radiusSpeed + node.phaseOffset) * (node.wobble * (0.4 + activation * 0.6));
      node.renderX = core.x + Math.cos(orbitAngle) * radius;
      node.renderY = core.y + Math.sin(orbitAngle) * radius;
    }

    for (const connection of neuralConnections) {
      const fade = easeOutCubic((progress - connection.threshold) / 0.16);
      if (fade <= 0) continue;
      const from = neuralNodes[connection.from];
      const to = neuralNodes[connection.to];
      const wave = 0.78 + 0.22 * Math.sin(time * (1.6 + signal * 2.8) + connection.phaseOffset * Math.PI * 2);
      const alpha = Math.min(0.62, (0.09 + fade * 0.24 + signal * 0.12) * wave + milestoneIntensity * 0.06);

      ctx.beginPath();
      ctx.moveTo(from.renderX, from.renderY);
      ctx.lineTo(to.renderX, to.renderY);
      ctx.strokeStyle = `rgba(108, 145, 230, ${alpha})`;
      ctx.lineWidth = 0.8 + fade * 0.9 + surge * 0.45;
      ctx.stroke();

      if (!connection.spark || fade < 0.22) continue;
      const travel = (time * (0.16 + signal * 0.24) + connection.phaseOffset) % 1;
      const pulseX = from.renderX + (to.renderX - from.renderX) * travel;
      const pulseY = from.renderY + (to.renderY - from.renderY) * travel;
      const pulseRadius = 1.8 + fade * 1.6 + milestoneIntensity * 0.8;

      ctx.beginPath();
      ctx.arc(pulseX, pulseY, pulseRadius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(101, 211, 215, ${0.24 + fade * 0.44})`;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(pulseX, pulseY, pulseRadius * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(111, 145, 255, ${0.03 + fade * 0.08})`;
      ctx.fill();
    }

    for (const node of neuralNodes) {
      const activation = node.ring === 0 ? 1 : easeOutCubic((progress - node.threshold) / 0.18);
      const pulse = 0.84 + 0.16 * Math.sin(time * (0.9 + signal * 3.2) + node.phaseOffset);
      const alpha = node.ring === 0
        ? 1
        : Math.min(0.9, 0.08 + activation * 0.64 * pulse + milestoneIntensity * 0.08);
      const radius = node.ring === 0
        ? 9 + signal * 3.5
        : 1.9 + node.ring * 0.55 + activation * 1.3;

      ctx.beginPath();
      ctx.arc(node.renderX, node.renderY, radius * (node.ring === 0 ? 2.8 : 2.2 + activation), 0, Math.PI * 2);
      ctx.fillStyle = node.ring === 0
        ? `rgba(122, 167, 255, ${0.12 + signal * 0.16})`
        : `rgba(122, 167, 255, ${0.02 + activation * 0.06})`;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(node.renderX, node.renderY, radius, 0, Math.PI * 2);
      ctx.fillStyle = node.ring === 0
        ? `rgba(103, 202, 214, ${0.88 + signal * 0.12})`
        : `rgba(105, 149, 241, ${alpha})`;
      ctx.fill();
    }

    if (milestoneIntensity > 0) {
      const rippleRadius = 42 + progress * 86 + (1 - milestoneIntensity) * 28;
      ctx.beginPath();
      ctx.arc(core.x, core.y, rippleRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(111, 145, 255, ${milestoneIntensity * 0.18})`;
      ctx.lineWidth = 1.2 + milestoneIntensity;
      ctx.stroke();
    }

    neuralAnimId = requestAnimationFrame(draw);
  };

  draw();
}

export function stopNeuralNetworkAnimation() {
  if (neuralAnimId) { cancelAnimationFrame(neuralAnimId); neuralAnimId = null; }
  if (neuralResizeHandler) { window.removeEventListener('resize', neuralResizeHandler); neuralResizeHandler = null; }
  neuralProgress = 0;
  _prevNeuralProgress = 0;
  neuralNodes = [];
  neuralConnections = [];
}

// ── Core Inference Boot ──────────────────────────────────
export async function initGemma(source = null, isStream = false) {
  // ── WebGPU gate ─────────────────────────────────────────
  // The check result is stored on window by the inline bootstrap script.
  if (!window.webGPUAvailable) {
    document.getElementById('chat-container').innerHTML = `
      <div style="text-align:center;padding:60px 20px;color:var(--ollama-stone)">
        <div style="font-size:2rem;margin-bottom:12px">⚠️</div>
        <h2 style="color:var(--ollama-near-black);margin-bottom:12px">WebGPU Not Available</h2>
        <p style="max-width:400px;margin:0 auto;line-height:1.6">This app requires WebGPU to run the AI model in your browser. Please use Chrome 113+, Edge 113+, or a WebGPU-compatible browser on a device with a compatible GPU.</p>
      </div>`;
    updateStatus('error', 'No WebGPU');
    return;
  }

  const logBoot = (phase, detail = phase) => logLoaderEvent(phase, detail);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  try {
    document.getElementById('global-loader').classList.remove('hidden');
    document.getElementById('loader-rescue').classList.remove('visible');
    updateRescueCopy('Model required', 'Local inference needs the Gemma task file before the network can finish connecting.');
    const bootLog = document.getElementById('global-boot-log');
    if (bootLog) bootLog.innerHTML = '';
    startNeuralNetworkAnimation();
    setNeuralProgress(0);
    await requestPersistentStorage();
    updateStatus('loading', 'Initializing...');
    logBoot('Preparing environment', 'Allocating local storage and opening the private inference workspace.');
    setNeuralProgress(5);
    await wait(800);
    logBoot('Establishing pathways', 'Bringing the first neural routes online.');
    setNeuralProgress(10);
    await wait(600);

    let modelPath;
    if (isStream && source) {
      updateStatus('loading', 'Caching...');
      logBoot('Receiving model file', 'Integrating the supplied model stream into local storage.');
      setNeuralProgress(15);
      await wait(400);
      const blob = new Blob([source]); await ModelCacheDB.save('gemma_task', blob);
      logBoot('Weights stored', 'The model file is now available for future sessions.');
      setNeuralProgress(50);
      await wait(500);
      modelPath = URL.createObjectURL(blob);
    } else {
      updateStatus('loading', 'Scanning Cache...');
      logBoot('Checking local memory', 'Looking for a model that is already cached on this device.');
      setNeuralProgress(15);
      await wait(700);
      let modelBlob = await ModelCacheDB.get('gemma_task');
      if (modelBlob instanceof Blob) {
        logBoot('Cached model found', 'A local model is ready to attach to the runtime.');
        setNeuralProgress(50);
        await wait(600);
        modelPath = URL.createObjectURL(modelBlob);
      } else {
        updateStatus('loading', 'Locating...');
        logBoot('Seeking model source', 'No cached model was found, so the loader is checking nearby sources.');
        setNeuralProgress(18);
        await wait(500);
        // Check if the model file is co-hosted on the same server
        let localAvailable = false;
        try {
          const check = await fetch(LOCAL_MODEL, { method: 'HEAD' });
          if (check.ok) {
            localAvailable = true;
            logBoot('Host model detected', 'A local model file is available on the current host.');
            await wait(400);
          }
        } catch { /* local model not available — proceed with remote */ }

        if (localAvailable) {
          // BUG FIX: When the model file is on the same server, pass the
          // path directly to MediaPipe instead of downloading the entire
          // file into JS memory, caching it in IndexedDB, and creating a
          // blob URL.  MediaPipe can fetch same-origin URLs natively and
          // the browser's own HTTP cache handles caching automatically.
          logBoot('Attaching model', 'Using the host model directly so the runtime can begin immediately.');
          setNeuralProgress(50);
          await wait(400);
          modelPath = LOCAL_MODEL;
        } else {
          // Model is not available locally — show rescue options
          logBoot('Model required', 'Download the model or provide a local .task file to continue.');
          updateRescueCopy('Model required', 'Local inference needs the Gemma task file before the network can finish connecting.');
          document.getElementById('loader-rescue').classList.add('visible');
          updateStatus('error', 'Model Required');
          return;
        }
      }
    }

    updateStatus('loading', 'Linking...');
    logBoot('Binding runtime', 'Creating the MediaPipe runtime and reserving compute buffers.');
    setNeuralProgress(60);
    await wait(800);
    const { FilesetResolver, LlmInference } = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai");
    const f = await FilesetResolver.forGenAiTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai/wasm");

    updateStatus('loading', 'Booting...');
    logBoot('Activating layers', 'Warming the model and shaping its inference graph.');
    setNeuralProgress(75);
    await wait(700);
    logBoot('Firing synapses', 'Synchronizing the final pathways before the chat comes online.');
    setNeuralProgress(85);
    await wait(500);

    State.inference = await LlmInference.createFromOptions(f, {
      baseOptions: { modelAssetPath: modelPath, delegate: navigator.gpu ? "GPU" : "CPU" },
      maxTokens: getSettingsValues().maxTokens, temperature: getSettingsValues().temperature
    });

    logBoot('Network ready', 'Neural pathways are synchronized and ready for input.');
    setNeuralProgress(100);
    await wait(400);
    State.modelReady = true; updateStatus('online', 'Ready');
    document.getElementById('chat-input').disabled = false;
    document.getElementById('chat-input').placeholder = "Ask anything...";
    updateSendButtons();
    document.getElementById('loader-rescue').classList.remove('visible');
    document.getElementById('global-loader').classList.add('hidden');
    stopNeuralNetworkAnimation();
  } catch (e) {
    console.error(e);
    stopNeuralNetworkAnimation();
    const isWebGPUError = /WebGPU|GPU adapter|navigator\.gpu/i.test(e?.message || '');
    if (isWebGPUError) {
      logBoot('WebGPU unavailable', 'This browser or device cannot provide the GPU features required for local inference.');
      updateStatus('error', 'No WebGPU');
      document.getElementById('global-loader').classList.add('hidden');
      document.getElementById('chat-container').innerHTML = `
        <div style="text-align:center;padding:60px 20px;color:var(--ollama-stone)">
          <div style="font-size:2rem;margin-bottom:12px">⚠️</div>
          <h2 style="color:var(--ollama-near-black);margin-bottom:12px">WebGPU Not Available</h2>
          <p style="max-width:400px;margin:0 auto;line-height:1.6">This app requires WebGPU to run the AI model in your browser. Please use Chrome 113+, Edge 113+, or a WebGPU-compatible browser on a device with a compatible GPU.</p>
        </div>`;
    } else {
      logBoot('Initialization paused', 'The neural network could not finish connecting.');
      updateRescueCopy('Initialization paused', 'Download the model or provide a local .task file to continue the setup flow.');
      updateStatus('error', 'Setup Paused');
      document.getElementById('loader-rescue').classList.add('visible');
    }
  }
}

// ── Server-Mode Boot ─────────────────────────────────────
// Connects to the local Node.js backend instead of loading the model
// in-browser. The server keeps inference on the same machine with an
// embedded GGUF runtime.
export async function initServer() {
  const logBoot = (phase, detail = phase) => logLoaderEvent(phase, detail);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  try {
    document.getElementById('global-loader').classList.remove('hidden');
    document.getElementById('loader-rescue').classList.remove('visible');
    updateRescueCopy('Model required', 'Local inference needs the Gemma task file before the network can finish connecting.');
    const bootLog = document.getElementById('global-boot-log');
    if (bootLog) bootLog.innerHTML = '';
    startNeuralNetworkAnimation();
    setNeuralProgress(0);
    updateStatus('loading', 'Connecting...');
    logBoot('Server handshake', 'Opening a connection to the local inference server.');
    setNeuralProgress(20);
    await wait(600);

    const res = await fetch(`${SERVER_API}/status`);
    if (!res.ok) throw new Error(`Server responded with ${res.status}`);
    const info = await res.json();

    const providerLabel = info.provider ? `${info.provider}: ` : '';
    logBoot('Server online', `Connected to ${providerLabel}${info.model}.`);
    setNeuralProgress(80);
    await wait(400);

    State.serverMode = true;
    State.serverModel = info.model || '';
    State.modelReady = true;

    logBoot('Network ready', 'The local server is ready to handle requests.');
    setNeuralProgress(100);
    await wait(300);

    updateStatus('online', 'Local Server');
    document.getElementById('chat-input').disabled = false;
    document.getElementById('chat-input').placeholder = "Ask anything...";
    updateSendButtons();
    document.getElementById('loader-rescue').classList.remove('visible');
    document.getElementById('global-loader').classList.add('hidden');
    stopNeuralNetworkAnimation();
  } catch (e) {
    console.error('Local server connection failed:', e);
    stopNeuralNetworkAnimation();
    logBoot('Server unavailable', 'The local server could not be reached from this device.');
    updateRescueCopy('Server unavailable', 'Start the local server or fall back to a local model file to continue.');
    updateStatus('error', 'Server Offline');
    document.getElementById('loader-rescue').classList.add('visible');
  }
}
