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
  const BASE_CONNECTION_DIST = 80;
  const MAX_CONNECTION_DIST = 200;
  let w, h;

  function resize() {
    w = canvas.width = canvas.offsetWidth;
    h = canvas.height = canvas.offsetHeight;
  }
  resize();
  neuralResizeHandler = resize;
  window.addEventListener('resize', neuralResizeHandler);

  for (let i = 0; i < NODE_COUNT; i++) {
    neuralNodes.push({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
      r: 1.5 + Math.random() * 2,
      baseR: 1.5 + Math.random() * 2,
      active: false,
      activatedAt: 0,
      pulsePhase: Math.random() * Math.PI * 2
    });
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    const t = performance.now() / 1000;
    const progress = neuralProgress / 100;
    const connectionDist = BASE_CONNECTION_DIST + (MAX_CONNECTION_DIST - BASE_CONNECTION_DIST) * progress;
    const activeCount = Math.floor(neuralNodes.length * Math.max(0.15, progress));
    const isMilestoneBurst = neuralMilestoneFlash > 0;
    if (neuralMilestoneFlash > 0) neuralMilestoneFlash--;

    for (let i = 0; i < neuralNodes.length; i++) {
      if (i < activeCount && !neuralNodes[i].active) {
        neuralNodes[i].active = true;
        neuralNodes[i].activatedAt = t;
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
          let alpha = 0.35 * distAlpha * connectionFade * (0.3 + 0.7 * progress);
          if (isMilestoneBurst) {
            alpha = Math.min(1, alpha * 2.5);
          }
          const hue = 210 + progress * 30;
          ctx.beginPath();
          ctx.moveTo(neuralNodes[i].x, neuralNodes[i].y);
          ctx.lineTo(neuralNodes[j].x, neuralNodes[j].y);
          ctx.strokeStyle = `hsla(${hue}, 70%, 65%, ${alpha})`;
          ctx.lineWidth = isMilestoneBurst ? 1.2 : (0.4 + 0.6 * progress);
          ctx.stroke();
        }
      }
    }

    for (const node of neuralNodes) {
      const isActive = node.active;
      const fadeIn = isActive ? Math.min(1, (t - node.activatedAt) * 2) : 0.15;
      const pulse = Math.sin(t * 2 + node.pulsePhase) * 0.3 + 0.7;
      const baseAlpha = isActive ? (0.4 + 0.4 * progress) * fadeIn * pulse : 0.12;
      let alpha = baseAlpha;
      let r = node.baseR * (isActive ? (0.8 + 0.4 * progress) : 0.6);
      if (isMilestoneBurst && isActive) {
        alpha = Math.min(1, alpha * 2);
        r *= 1.5;
      }
      const hue = 210 + progress * 30;
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, 70%, 65%, ${alpha})`;
      ctx.fill();
      if (isActive && progress > 0.3) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, r * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 70%, 65%, ${alpha * 0.15})`;
        ctx.fill();
      }
      const speed = isActive ? 1 + progress * 0.5 : 0.5;
      node.x += node.vx * speed;
      node.y += node.vy * speed;
      if (node.x < 0 || node.x > w) node.vx *= -1;
      if (node.y < 0 || node.y > h) node.vy *= -1;
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
        } catch (_e) { /* local model not available — proceed with remote */ }

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
// Connects to the Node.js backend instead of loading the model in-browser.
// The server runs Gemma 4 inference via the Google AI (Gemini) SDK.
// Gemma 4 Model Card: https://ai.google.dev/gemma/docs/core/model_card_4
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
    logBoot("🌐 Connecting to server backend...");
    setNeuralProgress(20);
    await wait(600);

    const res = await fetch(`${SERVER_API}/status`);
    if (!res.ok) throw new Error(`Server responded with ${res.status}`);
    const info = await res.json();

    logBoot(`✅ Server online — model: ${info.model}`);
    setNeuralProgress(80);
    await wait(400);

    State.serverMode = true;
    State.serverModel = info.model || '';
    State.modelReady = true;

    logBoot("🚀 Server inference ready. Let's go!");
    setNeuralProgress(100);
    await wait(300);

    updateStatus('online', 'Server');
    document.getElementById('chat-input').disabled = false;
    document.getElementById('chat-input').placeholder = "Ask anything...";
    updateSendButtons();
    document.getElementById('loader-rescue').classList.remove('visible');
    document.getElementById('global-loader').classList.add('hidden');
    stopNeuralNetworkAnimation();
  } catch (e) {
    console.error('Server connection failed:', e);
    stopNeuralNetworkAnimation();
    logBoot("⚠️ Could not reach the server backend.");
    updateStatus('error', 'Server Offline');
    document.getElementById('loader-rescue').classList.add('visible');
    document.getElementById('global-loader').classList.add('hidden');
  }
}
