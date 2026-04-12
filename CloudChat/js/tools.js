// ── Tool Registry, Skills & Skill Loader ──────────────────────
import { embedAndStore, searchMemory, getAllChunks, deleteChunk } from './rag.js';
import { SearchProviders, getSearchConfig, getMediaConfig, fetchAndExtract, geocodeLocation, wmoDescription } from './search.js';
import { showToast } from './ui.js';

export const SKILL_REGISTRY = {
  calculate:     'skills/built-in/calculate-math/scripts/index.html',
  store_memory:  'skills/built-in/store-memory/scripts/index.html',
  search_memory: 'skills/built-in/search-memory/scripts/index.html',
  delete_memory: 'skills/built-in/delete-memory/scripts/index.html',
  set_reminder:  'skills/built-in/set-reminder/scripts/index.html',
  web_search:    'skills/built-in/web-search/scripts/index.html',
  fetch_page:    'skills/built-in/fetch-page/scripts/index.html',
  interactive_map: 'skills/built-in/interactive-map/scripts/index.html',
  query_wikipedia: 'skills/built-in/query-wikipedia/scripts/index.html',
  search_media:  'skills/built-in/search-media/scripts/index.html',
  calculate_hash: 'skills/built-in/calculate-hash/scripts/index.html',
  mood_tracker:  'skills/built-in/mood-tracker/scripts/index.html',
  generate_qr_code: 'skills/built-in/qr-code/scripts/index.html',
  text_spinner:  'skills/built-in/text-spinner/scripts/index.html',
  weather_forecast:   'skills/featured/weather-forecast/scripts/index.html',
  historical_weather: 'skills/featured/historical-weather/scripts/index.html',
  marine_weather:     'skills/featured/marine-weather/scripts/index.html',
  explore_public_apis:'skills/featured/api-explorer/scripts/index.html',
  useless_fact:       'skills/featured/useless-facts/scripts/index.html',
  trivia_question:    'skills/featured/trivia-quest/scripts/index.html',
  batch_processor:    'skills/featured/batch-processor/scripts/index.html',
  document_ingester:  'skills/featured/document-ingester/scripts/index.html',
  rag_chat:           'skills/featured/rag-chat/scripts/index.html',
  mood_music:         'skills/featured/mood-music/scripts/index.html',
  restaurant_roulette:'skills/featured/restaurant-roulette/scripts/index.html',
  virtual_piano:      'skills/featured/virtual-piano/scripts/index.html',
};

export const SKILL_DOC_REGISTRY = {
  calculate: 'skills/built-in/calculate-math/SKILL.md',
  get_current_time: 'skills/built-in/get-current-time/SKILL.md',
  store_memory: 'skills/built-in/store-memory/SKILL.md',
  search_memory: 'skills/built-in/search-memory/SKILL.md',
  list_memories: 'skills/built-in/list-memories/SKILL.md',
  delete_memory: 'skills/built-in/delete-memory/SKILL.md',
  set_reminder: 'skills/built-in/set-reminder/SKILL.md',
  web_search: 'skills/built-in/web-search/SKILL.md',
  fetch_page: 'skills/built-in/fetch-page/SKILL.md',
  interactive_map: 'skills/built-in/interactive-map/SKILL.md',
  query_wikipedia: 'skills/built-in/query-wikipedia/SKILL.md',
  search_media: 'skills/built-in/search-media/SKILL.md',
  weather_forecast: 'skills/featured/weather-forecast/SKILL.md',
  historical_weather: 'skills/featured/historical-weather/SKILL.md',
  marine_weather: 'skills/featured/marine-weather/SKILL.md',
  explore_public_apis: 'skills/featured/api-explorer/SKILL.md',
  useless_fact: 'skills/featured/useless-facts/SKILL.md',
  trivia_question: 'skills/featured/trivia-quest/SKILL.md',
  calculate_hash: 'skills/built-in/calculate-hash/SKILL.md',
  mood_tracker: 'skills/built-in/mood-tracker/SKILL.md',
  generate_qr_code: 'skills/built-in/qr-code/SKILL.md',
  text_spinner: 'skills/built-in/text-spinner/SKILL.md',
  batch_processor: 'skills/featured/batch-processor/SKILL.md',
  document_ingester: 'skills/featured/document-ingester/SKILL.md',
  rag_chat: 'skills/featured/rag-chat/SKILL.md',
  mood_music: 'skills/featured/mood-music/SKILL.md',
  restaurant_roulette: 'skills/featured/restaurant-roulette/SKILL.md',
  virtual_piano: 'skills/featured/virtual-piano/SKILL.md',
};

let toolSkillDocsLoaded = false;

export function parseSkillDoc(markdownText) {
  const out = { description: '', instructions: '' };
  const fm = markdownText.match(/^---\n([\s\S]*?)\n---/);
  if (fm) {
    const descriptionLine = fm[1].match(/^description:\s*(.+)$/m);
    if (descriptionLine) out.description = descriptionLine[1].trim().replace(/^['"]|['"]$/g, '');
  }
  const instructionsMatch = markdownText.match(/## Instructions\s*([\s\S]*?)(?:\n##\s+|\n###\s+|$)/i);
  if (instructionsMatch) {
    out.instructions = instructionsMatch[1].replace(/\r/g, '').trim().replace(/\n{3,}/g, '\n\n');
  }
  return out;
}

export async function ensureToolSkillDocsLoaded() {
  if (toolSkillDocsLoaded) return;
  const entries = Object.entries(SKILL_DOC_REGISTRY);
  await Promise.all(entries.map(async ([toolName, docPath]) => {
    try {
      const res = await fetch(docPath, { cache: 'no-store' });
      if (!res.ok) return;
      const text = await res.text();
      const parsed = parseSkillDoc(text);
      if (TOOL_REGISTRY[toolName]) {
        if (parsed.description) TOOL_REGISTRY[toolName].skillDescription = parsed.description;
        if (parsed.instructions) TOOL_REGISTRY[toolName].skillInstructions = parsed.instructions.slice(0, 500);
      }
    } catch (_e) {
      // Non-fatal: tools still work with inline metadata.
    }
  }));
  toolSkillDocsLoaded = true;
}

export function runSkill(scriptPath, data, secret) {
  return new Promise((resolve) => {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;border:0';
    iframe.sandbox = 'allow-scripts allow-same-origin';
    document.body.appendChild(iframe);
    const timeout = setTimeout(() => {
      document.body.removeChild(iframe);
      resolve({ error: 'Skill timed out after 15 s: ' + scriptPath });
    }, 15000);
    iframe.onload = async () => {
      try {
        const fn = iframe.contentWindow && iframe.contentWindow['ai_edge_gallery_get_result'];
        if (typeof fn !== 'function') {
          throw new Error('ai_edge_gallery_get_result not found in skill: ' + scriptPath);
        }
        const raw = await fn(JSON.stringify(data), secret || '');
        clearTimeout(timeout);
        document.body.removeChild(iframe);
        resolve(typeof raw === 'string' ? JSON.parse(raw) : raw);
      } catch (e) {
        clearTimeout(timeout);
        if (document.body.contains(iframe)) document.body.removeChild(iframe);
        resolve({ error: 'Skill execution error: ' + e.message });
      }
    };
    iframe.src = scriptPath;
  });
}

export async function executeSkillIfAvailable(toolName, args, secret = '') {
  const path = SKILL_REGISTRY[toolName];
  if (!path) return null;
  return runSkill(path, args || {}, secret);
}


export const TOOL_REGISTRY = {
  calculate: {
    description: 'Evaluate a mathematical expression and return the numeric result.',
    parameters: { type: 'object', properties: { expression: { type: 'string', description: 'A numeric expression using +, -, *, /, (, ), %, e.g. "15 / 100 * 240"' } }, required: ['expression'] },
    async execute(a) {
      const viaSkill = await executeSkillIfAvailable('calculate', a);
      if (viaSkill && !viaSkill.error) return viaSkill;
      // Inline fallback: strip non-numeric chars, then use Function() constructor.
      // Function() is used instead of eval() because it executes in the global scope
      // rather than the local scope, reducing the risk of accessing closure variables.
      // The character whitelist below ensures only safe math operators are evaluated.
      try {
        const sanitized = String(a.expression).replace(/[^0-9+\-*/.()% ]/g, '');
        // eslint-disable-next-line no-new-func
        return { result: Function('"use strict"; return (' + sanitized + ')')() };
      } catch(e) { return { error: e.message }; }
    }
  },
  get_current_time: {
    description: 'Return the current local date and time.',
    parameters: { type: 'object', properties: {} },
    // Inline: no external dependency, returns device clock directly
    async execute() { return { datetime: new Date().toLocaleString() }; }
  },
  store_memory: {
    description: 'Save a fact, preference, or note to persistent on-device memory.',
    parameters: { type: 'object', properties: { content: { type: 'string', description: 'Text to remember' }, category: { type: 'string', description: 'One of: fact, preference, person, event, note, document' } }, required: ['content'] },
    // Skill-first (for parity with skill package), then canonical IndexedDB storage.
    async execute(a) {
      const viaSkill = await executeSkillIfAvailable('store_memory', a);
      const c = await embedAndStore(a.content, a.category || 'fact', 'assistant');
      return { stored: true, count: c, skill: viaSkill && !viaSkill.error ? 'ok' : 'fallback' };
    }
  },
  search_memory: {
    description: 'Search stored memories using a semantic query and return the top matches.',
    parameters: { type: 'object', properties: { query: { type: 'string', description: 'Keywords or question to search for' } }, required: ['query'] },
    // Inline: uses app-internal searchMemory() which performs vector similarity search
    async execute(a) { const r = await searchMemory(a.query, 5); return { found: r.length > 0, memories: r.map(m => ({ text: m.text, source: m.source })) }; }
  },
  list_memories: {
    description: 'List all stored memories, returning counts and unique source names.',
    parameters: { type: 'object', properties: {}, required: [] },
    // Inline: reads from IndexedDB via getAllChunks(); no embedding required
    async execute() {
      const chunks = await getAllChunks();
      if (!chunks.length) return { message: 'No memories stored.' };
      const sources = [...new Set(chunks.map(c => c.source))];
      return { total_chunks: chunks.length, unique_sources: sources };
    }
  },
  delete_memory: {
    description: 'Delete stored memories that match the given query.',
    parameters: { type: 'object', properties: { query: { type: 'string', description: 'Keywords identifying which memories to remove' } }, required: ['query'] },
    // Inline: uses searchMemory() for matching, then deleteChunk() per result
    async execute(a) {
      await executeSkillIfAvailable('delete_memory', { query: a.query, confirm: true });
      const results = await searchMemory(a.query, 10);
      for (const r of results) await deleteChunk(r.id);
      return { deleted: results.length };
    }
  },
  set_reminder: {
    description: 'Set a reminder that triggers after a delay in minutes.',
    parameters: { type: 'object', properties: { message: { type: 'string', description: 'Reminder text to show later' }, delayMinutes: { type: 'number', description: 'Minutes from now to trigger reminder' } }, required: ['message', 'delayMinutes'] },
    async execute(a) {
      const viaSkill = await executeSkillIfAvailable('set_reminder', a);
      if (viaSkill && !viaSkill.error) return viaSkill;

      const delay = Math.max(0.1, Number(a.delayMinutes || 1));
      const message = String(a.message || '').trim();
      if (!message) return { error: 'No reminder message provided.' };
      const fireAt = new Date(Date.now() + delay * 60000).toLocaleTimeString();
      setTimeout(() => {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('CloudChat Reminder', { body: message });
        } else {
          showToast(`Reminder: ${message}`);
        }
      }, delay * 60000);
      return { result: 'Reminder set.', message, firesAt: fireAt, delayMinutes: delay };
    }
  },
  web_search: {
    description: 'Search the web for up-to-date information using the configured search provider.',
    requiresWeb: true,
    parameters: { type: 'object', properties: { query: { type: 'string', description: 'Concise keyword search query (3–8 words)' } }, required: ['query'] },
    // Inline: reads search provider config from app settings (Brave / Tavily / SearXNG)
    async execute(a) {
      const config = getSearchConfig();
      if (config.provider === 'none') return { error: 'Search disabled. Configure a search provider in settings.' };
      const viaSkill = await executeSkillIfAvailable(
        'web_search',
        { query: a.query, provider: config.provider, searxngUrl: config.searxngUrl },
        config.provider === 'searxng' ? '' : config.apiKey
      );
      if (viaSkill && !viaSkill.error) return viaSkill;
      const results = await (
        config.provider === 'brave'   ? SearchProviders.brave(a.query, config.apiKey) :
        config.provider === 'tavily'  ? SearchProviders.tavily(a.query, config.apiKey) :
        SearchProviders.searxng(a.query, config.searxngUrl)
      );
      return { results };
    }
  },
  fetch_page: {
    description: 'Fetch the readable text content from a URL.',
    parameters: { type: 'object', properties: { url: { type: 'string', description: 'Full URL to fetch (must start with https:// or http://)' } }, required: ['url'] },
    // Inline: uses app-internal fetchAndExtract() which handles CORS proxying
    async execute(a) {
      const viaSkill = await executeSkillIfAvailable('fetch_page', a);
      if (viaSkill && !viaSkill.error) return viaSkill;
      return fetchAndExtract(a.url);
    }
  },
  interactive_map: {
    description: 'Show a map view for a location, optionally searching for specific places nearby (e.g. restaurants, shops, landmarks).',
    parameters: { type: 'object', properties: { location: { type: 'string', description: 'Location string like city, address, or place name' }, search_query: { type: 'string', description: 'Optional search term for places to find at the location (e.g. "donut shops", "restaurants", "gas stations")' } }, required: ['location'] },
    async execute(a) {
      const viaSkill = await executeSkillIfAvailable('interactive_map', a);
      if (viaSkill && !viaSkill.error) return viaSkill;
      const loc = String(a.location || '').trim();
      if (!loc) return { error: 'No location provided.' };
      const search = String(a.search_query || '').trim();
      // Build the embed query: include search term if provided
      const embedQuery = search ? `${search} near ${loc}` : loc;
      const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(embedQuery)}&output=embed`;
      // Build Google Maps URLs API links for richer user interaction
      const searchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(embedQuery)}`;
      const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(loc)}`;
      return {
        webview: { iframe: true, url: embedUrl },
        map_links: { search: searchUrl, directions: directionsUrl },
        location: loc,
        search_query: search || null
      };
    }
  },
  query_wikipedia: {
    description: 'Query Wikipedia summary for a topic.',
    parameters: { type: 'object', properties: { topic: { type: 'string', description: 'Broad topic to search on Wikipedia' }, lang: { type: 'string', description: 'Two-letter language code, e.g., en, es, fr' } }, required: ['topic'] },
    async execute(a) {
      const payload = { topic: a.topic, lang: a.lang || 'en' };
      const viaSkill = await executeSkillIfAvailable('query_wikipedia', payload);
      if (viaSkill && !viaSkill.error) return viaSkill;

      const lang = String(a.lang || 'en').trim();
      const topic = String(a.topic || '').trim();
      if (!topic) return { error: 'No topic provided.' };
      const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`;
      const res = await fetch(url);
      if (!res.ok) return { error: `Wikipedia request failed (${res.status})` };
      const data = await res.json();
      return { title: data.title || topic, result: data.extract || 'No summary available.' };
    }
  },
  search_media: {
    description: 'Search for images or videos on any topic using Unsplash or Pexels. Use when the user asks for photos, pictures, images, videos, wallpapers, or visual content.',
    requiresWeb: true,
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Descriptive search query for the desired images or videos' },
        type: { type: 'string', enum: ['image', 'video'], description: 'Type of media: "image" or "video". Defaults to "image".' },
        provider: { type: 'string', enum: ['unsplash', 'pexels'], description: 'Media provider. Defaults to whichever has a key configured.' },
        count: { type: 'number', description: 'Number of results (1-10). Defaults to 4.' },
        orientation: { type: 'string', enum: ['landscape', 'portrait', 'squarish'], description: 'Image orientation filter (optional).' }
      },
      required: ['query']
    },
    async execute(a) {
      const mediaConfig = getMediaConfig();
      if (!mediaConfig.unsplashKey && !mediaConfig.pexelsKey) {
        return { error: 'No media API keys configured. Add an Unsplash or Pexels API key in Settings → Image & Video Search.' };
      }
      const secret = JSON.stringify({ unsplashKey: mediaConfig.unsplashKey, pexelsKey: mediaConfig.pexelsKey });
      const viaSkill = await executeSkillIfAvailable(
        'search_media',
        { query: a.query, type: a.type || 'image', provider: a.provider || '', count: a.count || 4, orientation: a.orientation || '' },
        secret
      );
      if (viaSkill && !viaSkill.error) return viaSkill;
      return { error: 'Media search skill not available.' };
    }
  },
  weather_forecast: {
    description: 'Get current weather conditions and a 7-day forecast for any city or location. Uses the free Open-Meteo API — no API key required.',
    parameters: { type: 'object', properties: { location: { type: 'string', description: 'City name or location, e.g. "Paris", "New York", "Tokyo"' } }, required: ['location'] },
    async execute(a) {
      const viaSkill = await executeSkillIfAvailable('weather_forecast', { location: a.location });
      if (viaSkill && !viaSkill.error) return viaSkill;
      // Inline fallback: Open-Meteo Forecast API
      try {
        const loc = String(a.location || '').trim();
        if (!loc) return { error: 'No location provided.' };
        const geo = await geocodeLocation(loc);
        const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${geo.lat}&longitude=${geo.lon}` +
          `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,precipitation` +
          `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code,wind_speed_10m_max` +
          `&timezone=auto&forecast_days=7`;
        const forecastRes = await fetch(forecastUrl, { signal: AbortSignal.timeout(8000) });
        if (!forecastRes.ok) throw new Error('Forecast fetch failed: ' + forecastRes.status);
        const data = await forecastRes.json();
        const current = data.current;
        const daily = data.daily;
        const forecast = daily.time.map((date, i) => ({
          date, condition: wmoDescription(daily.weather_code[i]),
          high: `${daily.temperature_2m_max[i]}°C`, low: `${daily.temperature_2m_min[i]}°C`,
          precipitation: `${daily.precipitation_sum[i]}mm`, maxWind: `${daily.wind_speed_10m_max[i]} km/h`
        }));
        return {
          result: {
            location: geo.name, coordinates: { lat: geo.lat.toFixed(4), lon: geo.lon.toFixed(4) },
            current: {
              condition: wmoDescription(current.weather_code), temperature: `${current.temperature_2m}°C`,
              humidity: `${current.relative_humidity_2m}%`, wind: `${current.wind_speed_10m} km/h`,
              precipitation: `${current.precipitation}mm`
            },
            forecast
          }
        };
      } catch (e) { return { error: viaSkill?.error || e.message }; }
    }
  },
  historical_weather: {
    description: 'Get historical weather data (temperature extremes, precipitation) for a location and date range. Uses the free Open-Meteo archive API — no API key required.',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'City name or location' },
        start_date: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
        end_date: { type: 'string', description: 'End date in YYYY-MM-DD format' }
      },
      required: ['location', 'start_date', 'end_date']
    },
    async execute(a) {
      const viaSkill = await executeSkillIfAvailable('historical_weather', { location: a.location, start_date: a.start_date, end_date: a.end_date });
      if (viaSkill && !viaSkill.error) return viaSkill;
      // Inline fallback: Open-Meteo Archive API
      try {
        const loc = String(a.location || '').trim();
        const startDate = String(a.start_date || '').trim();
        const endDate = String(a.end_date || '').trim();
        if (!loc) return { error: 'No location provided.' };
        if (!startDate || !endDate) return { error: 'start_date and end_date are required (YYYY-MM-DD format).' };
        const geo = await geocodeLocation(loc);
        const archiveUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${geo.lat}&longitude=${geo.lon}` +
          `&start_date=${startDate}&end_date=${endDate}` +
          `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&timezone=auto`;
        const archiveRes = await fetch(archiveUrl, { signal: AbortSignal.timeout(10000) });
        if (!archiveRes.ok) throw new Error('Archive API failed: ' + archiveRes.status);
        const data = await archiveRes.json();
        const d = data.daily;
        if (!d || !d.time || !d.time.length) return { error: 'No historical data available for the specified date range.' };
        const maxTemps = d.temperature_2m_max.filter(v => v !== null);
        const minTemps = d.temperature_2m_min.filter(v => v !== null);
        const precip = d.precipitation_sum.filter(v => v !== null);
        const hottest = { value: Math.max(...maxTemps), date: d.time[d.temperature_2m_max.indexOf(Math.max(...maxTemps))] };
        const coldest = { value: Math.min(...minTemps), date: d.time[d.temperature_2m_min.indexOf(Math.min(...minTemps))] };
        const totalPrecip = precip.reduce((s, v) => s + v, 0).toFixed(1);
        const avgMax = (maxTemps.reduce((s, v) => s + v, 0) / maxTemps.length).toFixed(1);
        const avgMin = (minTemps.reduce((s, v) => s + v, 0) / minTemps.length).toFixed(1);
        const step = Math.max(1, Math.floor(d.time.length / 10));
        const sample = d.time.filter((_, i) => i % step === 0).slice(0, 10).map((date) => {
          const idx = d.time.indexOf(date);
          return { date, high: `${d.temperature_2m_max[idx]}°C`, low: `${d.temperature_2m_min[idx]}°C`, precipitation: `${d.precipitation_sum[idx]}mm` };
        });
        return {
          result: {
            location: geo.shortName, period: { start: startDate, end: endDate, days: d.time.length },
            summary: {
              averageHigh: `${avgMax}°C`, averageLow: `${avgMin}°C`,
              hottestDay: { date: hottest.date, temp: `${hottest.value}°C` },
              coldestDay: { date: coldest.date, temp: `${coldest.value}°C` },
              totalPrecipitation: `${totalPrecip}mm`
            },
            sample
          }
        };
      } catch (e) { return { error: viaSkill?.error || e.message }; }
    }
  },
  marine_weather: {
    description: 'Get marine/ocean weather data (wave height, wave period, swell direction) for a coastal or sea location. Uses the free Open-Meteo Marine API — no API key required.',
    parameters: { type: 'object', properties: { location: { type: 'string', description: 'Coastal city, beach, or sea area name' } }, required: ['location'] },
    async execute(a) {
      const viaSkill = await executeSkillIfAvailable('marine_weather', { location: a.location });
      if (viaSkill && !viaSkill.error) return viaSkill;
      // Inline fallback: Open-Meteo Marine API
      try {
        const loc = String(a.location || '').trim();
        if (!loc) return { error: 'No location provided.' };
        const geo = await geocodeLocation(loc);
        const compassDir = (deg) => {
          if (deg == null) return 'N/A';
          const dirs = ['N','NE','E','SE','S','SW','W','NW'];
          return dirs[Math.round(deg / 45) % 8];
        };
        const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${geo.lat}&longitude=${geo.lon}` +
          `&current=wave_height,wave_direction,wave_period,swell_wave_height,swell_wave_direction` +
          `&daily=wave_height_max,swell_wave_height_max&timezone=auto&forecast_days=7`;
        const marineRes = await fetch(marineUrl, { signal: AbortSignal.timeout(8000) });
        if (!marineRes.ok) return { error: `Marine data not available for "${geo.shortName}". This API only works for coastal/ocean locations.` };
        const data = await marineRes.json();
        const current = data.current || {};
        const daily = data.daily || {};
        const forecast = (daily.time || []).map((date, i) => ({
          date, maxWaveHeight: `${daily.wave_height_max?.[i] ?? 'N/A'}m`,
          maxSwellHeight: `${daily.swell_wave_height_max?.[i] ?? 'N/A'}m`
        }));
        return {
          result: {
            location: geo.shortName, coordinates: { lat: geo.lat.toFixed(4), lon: geo.lon.toFixed(4) },
            current: {
              waveHeight: `${current.wave_height ?? 'N/A'}m`, waveDirection: compassDir(current.wave_direction),
              wavePeriod: `${current.wave_period ?? 'N/A'}s`, swellHeight: `${current.swell_wave_height ?? 'N/A'}m`,
              swellDirection: compassDir(current.swell_wave_direction)
            },
            forecast
          }
        };
      } catch (e) { return { error: viaSkill?.error || e.message }; }
    }
  },
  explore_public_apis: {
    description: 'Browse and search thousands of free public APIs by category or keyword. Great for developers looking for APIs to use in projects.',
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'API category (e.g. "Animals", "Finance", "Music", "Sports", "Weather")' },
        keyword: { type: 'string', description: 'Keyword to search API names and descriptions' }
      },
      required: []
    },
    async execute(a) {
      const viaSkill = await executeSkillIfAvailable('explore_public_apis', { category: a.category || '', keyword: a.keyword || '' });
      if (viaSkill && !viaSkill.error) return viaSkill;
      // Inline fallback: publicapis.org with CORS proxy fallback
      try {
        const category = String(a.category || '').trim();
        const keyword = String(a.keyword || '').trim().toLowerCase();
        let apiUrl = 'https://api.publicapis.org/entries';
        if (category) apiUrl += `?category=${encodeURIComponent(category)}`;
        let data;
        try {
          const res = await fetch(apiUrl, { signal: AbortSignal.timeout(8000) });
          if (!res.ok) throw new Error('Primary endpoint failed');
          data = await res.json();
        } catch {
          // CORS fallback: api.allorigins.win is a public CORS proxy.
          // Used only as a fallback when the primary endpoint fails from the browser.
          // NOTE: Third-party proxies can potentially inspect traffic; only use for non-sensitive public API data.
          const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(apiUrl)}`;
          const res2 = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) });
          if (!res2.ok) throw new Error('API Explorer fetch failed: ' + res2.status);
          data = await res2.json();
        }
        let entries = data.entries || [];
        if (keyword) {
          entries = entries.filter(e =>
            (e.API || '').toLowerCase().includes(keyword) ||
            (e.Description || '').toLowerCase().includes(keyword) ||
            (e.Category || '').toLowerCase().includes(keyword)
          );
        }
        const results = entries.slice(0, 10).map(e => ({
          name: e.API, description: e.Description, category: e.Category,
          link: e.Link, auth: e.Auth || 'None', https: e.HTTPS
        }));
        if (!results.length) return { result: { message: 'No APIs found matching your search.', total: 0, results: [] } };
        return { result: { total_found: entries.length, showing: results.length, results } };
      } catch (e) { return { error: viaSkill?.error || e.message }; }
    }
  },
  useless_fact: {
    description: 'Fetch a random fun and surprising "useless" fact or trivia. No API key required.',
    parameters: { type: 'object', properties: {}, required: [] },
    async execute() {
      const viaSkill = await executeSkillIfAvailable('useless_fact', {});
      if (viaSkill && !viaSkill.error) return viaSkill;
      // Inline fallback: uselessfacts API with static list fallback
      try {
        const res = await fetch('https://uselessfacts.jsph.pl/random.json?language=en', { signal: AbortSignal.timeout(8000) });
        if (!res.ok) throw new Error('Useless facts API failed');
        const data = await res.json();
        return { result: { fact: data.text || data.fact || 'No fact available.', source: 'uselessfacts.jsph.pl' } };
      } catch {
        const facts = [
          "Honey never spoils. Archaeologists have found 3000-year-old honey in Egyptian tombs that was still edible.",
          "A group of flamingos is called a 'flamboyance'.",
          "Bananas are berries, but strawberries are not.",
          "The Eiffel Tower can grow more than 6 inches in summer due to thermal expansion.",
          "Octopuses have three hearts and blue blood.",
          "A day on Venus is longer than a year on Venus.",
          "Wombat feces are cube-shaped.",
          "The human nose can detect over 1 trillion different scents.",
          "Cleopatra lived closer in time to the Moon landing than to the building of the Great Pyramid.",
          "There are more possible iterations of a game of chess than there are atoms in the observable universe."
        ];
        return { result: { fact: facts[Math.floor(Math.random() * facts.length)], source: 'curated' } };
      }
    }
  },
  trivia_question: {
    description: 'Start an interactive trivia session with multiple questions from the Open Trivia Database. Renders a gamified quiz widget with score tracking, live reactions, and celebratory effects. No API key required.',
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'number', description: 'Category ID (9=General Knowledge, 17=Science & Nature, 21=Sports, 23=History, 27=Animals). Omit for random.' },
        difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'], description: 'Difficulty level. Omit for any.' },
        amount: { type: 'number', description: 'Number of questions (1-15). Default is 5.' }
      },
      required: []
    },
    async execute(a) {
      const viaSkill = await executeSkillIfAvailable('trivia_question', { category: a.category || null, difficulty: a.difficulty || '', amount: a.amount || 5 });
      if (viaSkill && !viaSkill.error) return viaSkill;
      // Inline fallback: Open Trivia Database API
      try {
        const amount = Math.max(1, Math.min(15, parseInt(a.amount, 10) || 5));
        const category = a.category ? `&category=${parseInt(a.category, 10)}` : '';
        const diffLower = String(a.difficulty || '').toLowerCase();
        const difficulty = ['easy', 'medium', 'hard'].includes(diffLower)
          ? `&difficulty=${diffLower}` : '';
        const url = `https://opentdb.com/api.php?amount=${amount}&type=multiple${category}${difficulty}&encode=url3986`;
        const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (!res.ok) throw new Error('Open Trivia DB failed: ' + res.status);
        const data = await res.json();
        if (data.response_code !== 0 || !data.results || !data.results.length) {
          return { error: 'No trivia questions available for these parameters. Try different settings.' };
        }
        const decode = (s) => decodeURIComponent(s);
        const questions = data.results.map(q => {
          const allAnswers = [...q.incorrect_answers.map(decode), decode(q.correct_answer)].sort(() => Math.random() - 0.5);
          const letters = ['A', 'B', 'C', 'D'];
          return {
            category: decode(q.category),
            difficulty: q.difficulty,
            question: decode(q.question),
            choices: allAnswers.map((ans, i) => ({ letter: letters[i], text: ans })),
            correctIndex: allAnswers.indexOf(decode(q.correct_answer))
          };
        });
        return {
          result: {
            type: 'trivia_session',
            totalQuestions: questions.length,
            questions,
            instructions: 'An interactive trivia session widget has been rendered in the chat. The user can play directly by clicking answer buttons. React to their performance after they finish!'
          }
        };
      } catch (e) { return { error: viaSkill?.error || e.message }; }
    }
  },
  // ── Additional Skills ─────────────────────────────────────
  calculate_hash: {
    description: 'Calculate the SHA-1 hash of a given text string.',
    parameters: { type: 'object', properties: { text: { type: 'string', description: 'The text to hash' } }, required: ['text'] },
    async execute(a) {
      const viaSkill = await executeSkillIfAvailable('calculate_hash', { text: a.text });
      if (viaSkill && !viaSkill.error) return viaSkill;
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(String(a.text || ''));
        const hashBuffer = await crypto.subtle.digest('SHA-1', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return { result: { hash: hashHex, algorithm: 'SHA-1', input: a.text } };
      } catch (e) { return { error: e.message }; }
    }
  },
  mood_tracker: {
    description: 'Log and track daily mood on a 1-10 scale with optional comments. Retrieves mood history for analysis.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['log', 'history'], description: '"log" to record a mood entry, "history" to retrieve past entries' },
        score: { type: 'number', description: 'Mood score from 1 (very bad) to 10 (excellent). Required for "log" action.' },
        comment: { type: 'string', description: 'Optional note about why you feel this way' }
      },
      required: ['action']
    },
    async execute(a) {
      const viaSkill = await executeSkillIfAvailable('mood_tracker', a);
      if (viaSkill && !viaSkill.error) return viaSkill;
      return { error: viaSkill?.error || 'Mood tracker skill could not be loaded.' };
    }
  },
  generate_qr_code: {
    description: 'Generate a QR code image for a given URL or text.',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'The URL or text to encode in the QR code' },
        size: { type: 'number', description: 'QR code size in pixels (default 200)' }
      },
      required: ['text']
    },
    async execute(a) {
      const viaSkill = await executeSkillIfAvailable('generate_qr_code', a);
      if (viaSkill && !viaSkill.error) return viaSkill;
      return { error: viaSkill?.error || 'QR code skill could not be loaded.' };
    }
  },
  text_spinner: {
    description: 'Display styled text on screen with animation effects.',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'The text to display' },
        label: { type: 'string', description: 'Display label or style for the text' }
      },
      required: ['text']
    },
    async execute(a) {
      const viaSkill = await executeSkillIfAvailable('text_spinner', a);
      if (viaSkill && !viaSkill.error) return viaSkill;
      return { error: viaSkill?.error || 'Text spinner skill could not be loaded.' };
    }
  },
  batch_processor: {
    description: 'Execute a sequence of prompts in order, where each step can reference the previous result using {{previous}}. Useful for multi-step workflows.',
    parameters: {
      type: 'object',
      properties: {
        prompts: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of prompt strings to execute sequentially. Use {{previous}} to reference the prior step output.'
        }
      },
      required: ['prompts']
    },
    async execute(a) {
      const viaSkill = await executeSkillIfAvailable('batch_processor', a);
      if (viaSkill && !viaSkill.error) return viaSkill;
      return { error: viaSkill?.error || 'Batch processor skill could not be loaded.' };
    }
  },
  document_ingester: {
    description: 'Ingest a document (PDF, DOCX, or TXT) into local memory by chunking its text for later retrieval.',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'The full text content of the document to ingest' },
        source: { type: 'string', description: 'Source name or filename for the document' },
        chunk_size: { type: 'number', description: 'Number of characters per chunk (default 500)' }
      },
      required: ['text']
    },
    async execute(a) {
      const viaSkill = await executeSkillIfAvailable('document_ingester', a);
      if (viaSkill && !viaSkill.error) return viaSkill;
      return { error: viaSkill?.error || 'Document ingester skill could not be loaded.' };
    }
  },
  rag_chat: {
    description: 'Search previously ingested documents using semantic similarity and return relevant passages for answering questions.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The question or search query to find relevant document passages' },
        top_k: { type: 'number', description: 'Number of top results to return (default 3)' }
      },
      required: ['query']
    },
    async execute(a) {
      const viaSkill = await executeSkillIfAvailable('rag_chat', a);
      if (viaSkill && !viaSkill.error) return viaSkill;
      return { error: viaSkill?.error || 'RAG chat skill could not be loaded.' };
    }
  },
  mood_music: {
    description: 'Generate or find music based on a mood or genre description.',
    parameters: {
      type: 'object',
      properties: {
        mood: { type: 'string', description: 'Mood or feeling (e.g. "happy", "relaxing", "energetic")' },
        genre: { type: 'string', description: 'Music genre (e.g. "jazz", "pop", "classical")' }
      },
      required: ['mood']
    },
    async execute(a) {
      const viaSkill = await executeSkillIfAvailable('mood_music', a);
      if (viaSkill && !viaSkill.error) return viaSkill;
      return { error: viaSkill?.error || 'Mood music skill could not be loaded.' };
    }
  },
  restaurant_roulette: {
    description: 'ONLY use when the user explicitly wants a random restaurant picker or spin-the-wheel game. Shows an interactive roulette wheel to randomly select one restaurant. Do NOT use for general questions about restaurants, listings, or recommendations — answer those directly.',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'City or area to find restaurants in (REQUIRED — must be extracted from the user message)' },
        cuisine: { type: 'string', description: 'Preferred cuisine type (optional)' }
      },
      required: ['location']
    },
    async execute(a) {
      const viaSkill = await executeSkillIfAvailable('restaurant_roulette', a);
      if (viaSkill && !viaSkill.error) return viaSkill;
      return { error: viaSkill?.error || 'Restaurant roulette skill could not be loaded.' };
    }
  },
  virtual_piano: {
    description: 'Open an interactive virtual piano keyboard that can be played in the browser.',
    parameters: {
      type: 'object',
      properties: {
        note: { type: 'string', description: 'Optional specific note to play (e.g. "C4", "A3")' }
      },
      required: []
    },
    async execute(a) {
      const viaSkill = await executeSkillIfAvailable('virtual_piano', a || {});
      if (viaSkill && !viaSkill.error) return viaSkill;
      return { error: viaSkill?.error || 'Virtual piano skill could not be loaded.' };
    }
  }
};
