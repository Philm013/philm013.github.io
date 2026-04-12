// ── Web Search Providers & Shared Helpers ─────────────────────
export const SearchProviders = {
  async brave(query, apiKey) {
    const res = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`, { headers: { 'Accept': 'application/json', 'X-Subscription-Token': apiKey } });
    if (!res.ok) throw new Error('Brave error ' + res.status);
    const data = await res.json();
    return (data.web?.results || []).slice(0, 5).map(r => ({ title: r.title, url: r.url, snippet: r.description || '' }));
  },
  async tavily(query, apiKey) {
    const res = await fetch('https://api.tavily.com/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ api_key: apiKey, query, search_depth: 'basic', max_results: 5 }) });
    if (!res.ok) throw new Error('Tavily error ' + res.status);
    const data = await res.json();
    return (data.results || []).map(r => ({ title: r.title, url: r.url, snippet: r.content || '' }));
  },
  async searxng(query, instanceUrl) {
    const base = instanceUrl.replace(/\/+$/, '');
    const res = await fetch(`${base}/search?q=${encodeURIComponent(query)}&format=json&categories=general`);
    if (!res.ok) throw new Error('SearXNG error ' + res.status);
    const data = await res.json();
    return (data.results || []).slice(0, 5).map(r => ({ title: r.title, url: r.url, snippet: r.content || '' }));
  },
};

export function getSearchConfig() {
  return { provider: document.getElementById('search-provider').value, apiKey: document.getElementById('search-api-key').value, searxngUrl: document.getElementById('searxng-url').value };
}

export function isSearchConfigured() {
  const { provider, apiKey, searxngUrl } = getSearchConfig();
  if (provider === 'none') return false;
  return provider === 'searxng' ? !!searxngUrl : !!apiKey;
}

export function getMediaConfig() {
  return {
    unsplashKey: document.getElementById('unsplash-api-key').value || localStorage.getItem('lm_unsplash_key') || '',
    pexelsKey: document.getElementById('pexels-api-key').value || localStorage.getItem('lm_pexels_key') || '',
  };
}

export function isMediaConfigured() {
  const { unsplashKey, pexelsKey } = getMediaConfig();
  return !!(unsplashKey || pexelsKey);
}

export async function fetchAndExtract(url) {
  let html;
  try { const res = await fetch(url, { signal: AbortSignal.timeout(8000) }); html = await res.text(); }
  catch { try { const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(10000) }); html = await res.text(); }
  catch (e) { return { error: `Fetch failed: ${e.message}`, url }; } }
  const text = html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 3500);
  return { content: text, url };
}

export async function geocodeLocation(location) {
  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`;
  const geoRes = await fetch(geoUrl, { signal: AbortSignal.timeout(8000) });
  if (!geoRes.ok) throw new Error('Geocoding failed: ' + geoRes.status);
  const geoData = await geoRes.json();
  if (!geoData.results || !geoData.results.length) throw new Error(`Could not find location: "${location}"`);
  const place = geoData.results[0];
  return {
    lat: place.latitude, lon: place.longitude,
    name: `${place.name}${place.admin1 ? ', ' + place.admin1 : ''}${place.country ? ', ' + place.country : ''}`,
    shortName: `${place.name}${place.country ? ', ' + place.country : ''}`
  };
}

export function wmoDescription(code) {
  const map = {0:'Clear sky',1:'Mainly clear',2:'Partly cloudy',3:'Overcast',45:'Foggy',48:'Icy fog',
    51:'Light drizzle',53:'Moderate drizzle',55:'Dense drizzle',61:'Slight rain',63:'Moderate rain',
    65:'Heavy rain',71:'Slight snow',73:'Moderate snow',75:'Heavy snow',77:'Snow grains',
    80:'Slight showers',81:'Moderate showers',82:'Violent showers',85:'Slight snow showers',
    86:'Heavy snow showers',95:'Thunderstorm',96:'Thunderstorm with slight hail',99:'Thunderstorm with heavy hail'};
  return map[code] || 'Unknown';
}
