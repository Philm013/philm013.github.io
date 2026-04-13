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
let _prevNeuralProgress = 0;

export function setNeuralProgress(pct) {
  const prev = _prevNeuralProgress;
  neuralProgress = Math.max(0, Math.min(100, pct));
  _prevNeuralProgress = neuralProgress;
  const loader = document.getElementById('global-loader');
  const canvas = document.getElementById('neural-net-canvas');
  const progress01 = neuralProgress / 100;
  const launchSurge = progress01 > 0.8 ? Math.pow((progress01 - 0.8) / 0.2, 1.65) : 0;
  const energy = Math.max(progress01, Math.min(1, progress01 * 0.74 + launchSurge * 0.56));
  if (loader) loader.style.setProperty('--neural-energy', energy.toFixed(3));
  if (canvas) canvas.style.opacity = String(0.22 + energy * 0.62);
  const fill = document.getElementById('loader-progress-fill');
  const text = document.getElementById('loader-progress-text');
  if (fill) {
    const isMilestone = [25, 50, 75, 100].some(m => prev < m && neuralProgress >= m);
    if (isMilestone) {
      fill.classList.add('milestone');
      neuralMilestoneFlash = 60;
      setTimeout(() => fill.classList.remove('milestone'), 700);
    }
    fill.style.width = neuralProgress + '%';
  }
  if (text) text.textContent = neuralProgress > 0 ? `${Math.round(neuralProgress)}%` : '';
}

export function startNeuralNetworkAnimation() {
  const canvas = document.getElementById('neural-net-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  neuralNodes = [];
  const NODE_COUNT = 60;
  const BASE_CONNECTION_DIST = 52;
  const MAX_CONNECTION_DIST = 212;
  let core = { x: 0, y: 0 };
  let w, h;

  function resize() {
    w = canvas.width = canvas.offsetWidth;
    h = canvas.height = canvas.offsetHeight;
    core = { x: w * 0.5, y: h * 0.42 };
  }
  resize();
  neuralResizeHandler = resize;
  window.addEventListener('resize', neuralResizeHandler);

  for (let i = 0; i < NODE_COUNT; i++) {
    neuralNodes.push({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.32, vy: (Math.random() - 0.5) * 0.32,
      r: 1.5 + Math.random() * 2,
      baseR: 1.5 + Math.random() * 2,
      active: false,
      activatedAt: 0,
      phaseOffset: (i / NODE_COUNT) * Math.PI * 2
    });
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    const t = performance.now() / 1000;
    const progress = Math.max(0, Math.min(1, neuralProgress / 100));
    const launchSurge = progress > 0.8 ? Math.pow((progress - 0.8) / 0.2, 1.6) : 0;
    const growth = Math.pow(progress, 1.25);
    const activity = 0.18 + Math.pow(progress, 1.7) * 0.82 + launchSurge * 0.55;
    const connectionDist = BASE_CONNECTION_DIST + (MAX_CONNECTION_DIST - BASE_CONNECTION_DIST) * growth + launchSurge * 44;
    const activeRatio = Math.min(1, 0.1 + growth * 0.9 + launchSurge * 0.08);
    const activeCount = Math.max(1, Math.floor(neuralNodes.length * activeRatio));
    const isMilestoneBurst = neuralMilestoneFlash > 0;
    if (neuralMilestoneFlash > 0) neuralMilestoneFlash--;

    const coreConnectionDist = 120 + 210 * growth + launchSurge * 56;
    const coreBeat = 0.82 + 0.18 * Math.sin(t * (1.25 + activity * 5.2));

    for (let i = 0; i < neuralNodes.length; i++) {
      if (i < activeCount && !neuralNodes[i].active) {
        neuralNodes[i].active = true;
        neuralNodes[i].activatedAt = t;
      }
    }

    for (const node of neuralNodes) {
      if (!node.active) continue;
      const dxCore = node.x - core.x;
      const dyCore = node.y - core.y;
      const distCore = Math.sqrt(dxCore * dxCore + dyCore * dyCore);
      if (distCore < coreConnectionDist) {
        const distAlpha = 1 - distCore / coreConnectionDist;
        const alpha = Math.min(0.95, (0.09 + 0.45 * growth + launchSurge * 0.2) * distAlpha * coreBeat);
        const hue = 204 + progress * 32;
        ctx.beginPath();
        ctx.moveTo(core.x, core.y);
        ctx.lineTo(node.x, node.y);
        ctx.strokeStyle = `hsla(${hue}, 82%, 70%, ${alpha})`;
        ctx.lineWidth = 0.5 + progress * 1.15 + launchSurge * 1.15;
        ctx.stroke();
      }
    }

    for (let i = 0; i < neuralNodes.length; i++) {
      if (!neuralNodes[i].active) continue;
      for (let j = i + 1; j < neuralNodes.length; j++) {
        if (!neuralNodes[j].active) continue;
        const dx = neuralNodes[i].x - neuralNodes[j].x;
        const dy = neuralNodes[i].y - neuralNodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < connectionDist) {
          const fadeI = Math.min(1, (t - neuralNodes[i].activatedAt) * 2);
          const fadeJ = Math.min(1, (t - neuralNodes[j].activatedAt) * 2);
          const connectionFade = Math.min(fadeI, fadeJ);
          const distAlpha = 1 - dist / connectionDist;
          const wave = 0.78 + 0.22 * Math.sin(t * (1.2 + activity * 6.5) + dist * 0.03);
          let alpha = (0.08 + 0.42 * growth) * distAlpha * connectionFade * wave;
          if (isMilestoneBurst) {
            alpha = Math.min(1, alpha * 1.9);
          }
          const hue = 205 + progress * 34;
          ctx.beginPath();
          ctx.moveTo(neuralNodes[i].x, neuralNodes[i].y);
          ctx.lineTo(neuralNodes[j].x, neuralNodes[j].y);
          ctx.strokeStyle = `hsla(${hue}, 80%, 68%, ${alpha})`;
          ctx.lineWidth = isMilestoneBurst ? (1.2 + progress * 0.8 + launchSurge * 0.9) : (0.3 + progress * 1.05 + launchSurge * 0.6);
          ctx.stroke();
        }
      }
    }

    for (let idx = 0; idx < neuralNodes.length; idx++) {
      const node = neuralNodes[idx];
      const isActive = node.active;
      const fadeIn = isActive ? Math.min(1, (t - node.activatedAt) * 2) : 0.15;
      const pulse = 0.84 + 0.16 * Math.sin(t * (1.1 + activity * 5) + node.phaseOffset + idx * 0.04);
      const baseAlpha = isActive ? (0.28 + 0.54 * growth) * fadeIn * pulse : 0.08;
      let alpha = baseAlpha;
      let r = node.baseR * (isActive ? (0.84 + 0.72 * growth) : 0.52);
      if (isMilestoneBurst && isActive) {
        alpha = Math.min(1, alpha * 1.5);
        r *= 1.32;
      }
      const hue = 206 + progress * 30;
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, 82%, 69%, ${alpha})`;
      ctx.fill();
      if (isActive && progress > 0.24) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, r * (2.0 + growth * 1.35), 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 82%, 69%, ${alpha * (0.08 + growth * 0.12)})`;
        ctx.fill();
      }

      const speed = isActive ? (0.55 + activity * 1.35 + launchSurge * 0.6) : 0.36;
      node.x += node.vx * speed;
      node.y += node.vy * speed;
      if (isActive) {
        node.vx += (core.x - node.x) * (0.000018 + growth * 0.000052 + launchSurge * 0.00003);
        node.vy += (core.y - node.y) * (0.000018 + growth * 0.000052 + launchSurge * 0.00003);
      }
      node.vx *= 0.996;
      node.vy *= 0.996;
      if (node.x < 0 || node.x > w) node.vx *= -1;
      if (node.y < 0 || node.y > h) node.vy *= -1;
    }

    const coreHue = 208 + progress * 24;
    const coreGlowR = 24 + growth * 26;
    const coreGlowAlpha = 0.12 + growth * 0.34;
    ctx.beginPath();
    ctx.arc(core.x, core.y, coreGlowR * 2.6, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${coreHue}, 85%, 72%, ${coreGlowAlpha * 0.32})`;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(core.x, core.y, coreGlowR, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${coreHue}, 90%, 76%, ${coreGlowAlpha})`;
    ctx.fill();

    if (launchSurge > 0) {
      const ringAlpha = 0.22 * launchSurge;
      const ringRadius = coreGlowR * (1.5 + launchSurge * 1.7);
      ctx.beginPath();
      ctx.arc(core.x, core.y, ringRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${coreHue + 8}, 90%, 75%, ${ringAlpha})`;
      ctx.lineWidth = 1.4 + launchSurge * 2;
      ctx.stroke();
    }

    neuralAnimId = requestAnimationFrame(draw);
  }
  draw();
}

export function stopNeuralNetworkAnimation() {
  if (neuralAnimId) { cancelAnimationFrame(neuralAnimId); neuralAnimId = null; }
  if (neuralResizeHandler) { window.removeEventListener('resize', neuralResizeHandler); neuralResizeHandler = null; }
  neuralProgress = 0;
  _prevNeuralProgress = 0;
  neuralNodes = [];
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

  const logBoot = (msg) => {
    const log = document.getElementById('global-boot-log');
    const line = document.createElement('div'); line.className = 'boot-line'; line.innerText = msg; log.prepend(line);
    if (log.children.length > 6) log.removeChild(log.lastChild);
    document.getElementById('loader-msg').innerText = msg;
  };
  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  try {
    document.getElementById('global-loader').classList.remove('hidden');
    startNeuralNetworkAnimation();
    setNeuralProgress(0);
    await requestPersistentStorage();
    updateStatus('loading', 'Initializing...');
    logBoot("☕ Waking up the brain... coffee first.");
    setNeuralProgress(5);
    await wait(800);
    logBoot("🔌 Plugging in the neurons...");
    setNeuralProgress(10);
    await wait(600);

    let modelPath;
    if (isStream && source) {
      updateStatus('loading', 'Caching...');
      logBoot("📦 Ingesting manual data stream...");
      setNeuralProgress(15);
      await wait(400);
      const blob = new Blob([source]); await ModelCacheDB.save('gemma_task', blob);
      logBoot("💾 Neural weights committed to disk. No refunds.");
      setNeuralProgress(50);
      await wait(500);
      modelPath = URL.createObjectURL(blob);
    } else {
      updateStatus('loading', 'Scanning Cache...');
      logBoot("🔍 Rummaging through local storage...");
      setNeuralProgress(15);
      await wait(700);
      let modelBlob = await ModelCacheDB.get('gemma_task');
      if (modelBlob instanceof Blob) {
        logBoot("🎉 Gemma core found! Like finding leftovers in the fridge.");
        setNeuralProgress(50);
        await wait(600);
        modelPath = URL.createObjectURL(modelBlob);
      } else {
        updateStatus('loading', 'Locating...');
        logBoot("🤷 Local cache miss. Asking the internet nicely...");
        setNeuralProgress(18);
        await wait(500);
        // Check if the model file is co-hosted on the same server
        let localAvailable = false;
        try {
          const check = await fetch(LOCAL_MODEL, { method: 'HEAD' });
          if (check.ok) {
            localAvailable = true;
            logBoot("📡 Nearby weights detected on host. Score!");
            await wait(400);
          }
        } catch { /* local model not available — proceed with remote */ }

        if (localAvailable) {
          // BUG FIX: When the model file is on the same server, pass the
          // path directly to MediaPipe instead of downloading the entire
          // file into JS memory, caching it in IndexedDB, and creating a
          // blob URL.  MediaPipe can fetch same-origin URLs natively and
          // the browser's own HTTP cache handles caching automatically.
          logBoot("✅ Using local model file directly — no download needed.");
          setNeuralProgress(50);
          await wait(400);
          modelPath = LOCAL_MODEL;
        } else {
          // Model is not available locally — show rescue options
          logBoot("📦 Model not found locally. Manual action required.");
          document.getElementById('loader-rescue').classList.add('visible');
          updateStatus('error', 'Model Required');
          return;
        }
      }
    }

    updateStatus('loading', 'Linking...');
    logBoot("🧮 Allocating WebGPU buffers... hold tight.");
    setNeuralProgress(60);
    await wait(800);
    const { FilesetResolver, LlmInference } = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai");
    const f = await FilesetResolver.forGenAiTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai/wasm");

    updateStatus('loading', 'Booting...');
    logBoot("🧬 Inflating neural layers... almost sentient.");
    setNeuralProgress(75);
    await wait(700);
    logBoot("⚡ Connecting synapses... don't blink.");
    setNeuralProgress(85);
    await wait(500);

    State.inference = await LlmInference.createFromOptions(f, {
      baseOptions: { modelAssetPath: modelPath, delegate: navigator.gpu ? "GPU" : "CPU" },
      maxTokens: getSettingsValues().maxTokens, temperature: getSettingsValues().temperature
    });

    logBoot("🚀 Inference engine is hot. Let's go!");
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
      logBoot("⚠️ WebGPU is not available on this device.");
      updateStatus('error', 'No WebGPU');
      document.getElementById('global-loader').classList.add('hidden');
      document.getElementById('chat-container').innerHTML = `
        <div style="text-align:center;padding:60px 20px;color:var(--ollama-stone)">
          <div style="font-size:2rem;margin-bottom:12px">⚠️</div>
          <h2 style="color:var(--ollama-near-black);margin-bottom:12px">WebGPU Not Available</h2>
          <p style="max-width:400px;margin:0 auto;line-height:1.6">This app requires WebGPU to run the AI model in your browser. Please use Chrome 113+, Edge 113+, or a WebGPU-compatible browser on a device with a compatible GPU.</p>
        </div>`;
    } else {
      logBoot("💀 CRITICAL FAILURE: BRAIN NOT FOUND");
      updateStatus('error', 'Brain Failure');
      document.getElementById('loader-rescue').classList.add('visible');
    }
  }
}

// ── Server-Mode Boot ─────────────────────────────────────
// Connects to the local Node.js backend instead of loading the model
// in-browser. The server keeps inference on the same machine with an
// embedded GGUF runtime.
export async function initServer() {
  const logBoot = (msg) => {
    const log = document.getElementById('global-boot-log');
    const line = document.createElement('div'); line.className = 'boot-line'; line.innerText = msg; log.prepend(line);
    if (log.children.length > 6) log.removeChild(log.lastChild);
    document.getElementById('loader-msg').innerText = msg;
  };
  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  try {
    document.getElementById('global-loader').classList.remove('hidden');
    startNeuralNetworkAnimation();
    setNeuralProgress(0);
    updateStatus('loading', 'Connecting...');
    logBoot("🌐 Connecting to local server backend...");
    setNeuralProgress(20);
    await wait(600);

    const res = await fetch(`${SERVER_API}/status`);
    if (!res.ok) throw new Error(`Server responded with ${res.status}`);
    const info = await res.json();

    const providerLabel = info.provider ? `${info.provider}: ` : '';
    logBoot(`✅ Local server online — ${providerLabel}${info.model}`);
    setNeuralProgress(80);
    await wait(400);

    State.serverMode = true;
    State.serverModel = info.model || '';
    State.modelReady = true;

    logBoot("🚀 Local server inference ready. Let's go!");
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
    logBoot("⚠️ Could not reach the local server backend.");
    updateStatus('error', 'Server Offline');
    document.getElementById('loader-rescue').classList.add('visible');
    document.getElementById('global-loader').classList.add('hidden');
  }
}
