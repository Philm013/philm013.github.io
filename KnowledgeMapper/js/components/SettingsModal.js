import React, { useState, useEffect } from 'react';

function SettingsModal({ isOpen, onClose, onSave }) {
    const [geminiKeys, setGeminiKeys] = useState('');
    const [availableModels, setAvailableModels] = useState([]);
    const [toolModel, setToolModel] = useState('');
    const [contentModel, setContentModel] = useState('');
    
    // Prompt States
    const [systemPrompt, setSystemPrompt] = useState('');
    const [researchPrompt, setResearchPrompt] = useState('');
    
    const [isLoadingModels, setIsLoadingModels] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const savedKeys = JSON.parse(localStorage.getItem('gemini_api_keys') || '[]');
            setGeminiKeys(savedKeys.join(', '));
            setToolModel(localStorage.getItem('tool_model') || 'gemini-2.0-flash');
            setContentModel(localStorage.getItem('content_model') || 'gemini-1.5-pro');
            
            // Load custom prompts or defaults
            setSystemPrompt(localStorage.getItem('custom_system_prompt') || '');
            setResearchPrompt(localStorage.getItem('custom_research_prompt') || '');
            
            if (savedKeys.length > 0) {
                fetchModels(savedKeys[0]);
            }
        }
    }, [isOpen]);

    const fetchModels = async (key) => {
        setIsLoadingModels(true);
        try {
            if (window.aiHelper) {
                const models = await window.aiHelper.listModels(key);
                setAvailableModels(models.map(m => m.name.replace('models/', '')));
            }
        } catch (e) {
            console.error("Failed to fetch models", e);
        } finally {
            setIsLoadingModels(false);
        }
    };

    const handleSave = () => {
        const keysArray = geminiKeys.split(',').map(k => k.trim()).filter(k => k.length > 5);
        localStorage.setItem('gemini_api_keys', JSON.stringify(keysArray));
        if (keysArray.length > 0) localStorage.setItem('gemini_key', keysArray[0]);
        
        localStorage.setItem('tool_model', toolModel);
        localStorage.setItem('content_model', contentModel);
        
        localStorage.setItem('custom_system_prompt', systemPrompt);
        localStorage.setItem('custom_research_prompt', researchPrompt);

        if (onSave) onSave();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md transition-opacity" role="dialog" aria-modal="true" aria-labelledby="settings-title">
            <div className="bg-white border border-slate-200 w-full max-w-3xl rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 id="settings-title" className="text-2xl font-[900] text-slate-900 flex items-center gap-3">
                        <div className="p-2 bg-sky-500 rounded-xl text-white shadow-lg shadow-sky-200" aria-hidden="true">
                            <span className="iconify w-6 h-6" data-icon="solar:settings-bold-duotone"></span>
                        </div>
                        AI Preferences
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-xl hover:bg-slate-100" aria-label="Close settings">
                        <span className="iconify w-8 h-8" data-icon="solar:close-circle-bold-duotone" aria-hidden="true"></span>
                    </button>
                </div>
                
                <div className="p-8 overflow-y-auto max-h-[75vh] space-y-10 scroll-container">
                    {/* API Keys */}
                    <section aria-labelledby="section-api">
                        <h3 id="section-api" className="text-xs font-[800] text-sky-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <div className="w-1.5 h-4 bg-sky-500 rounded-full" aria-hidden="true"></div>
                            API Configuration
                        </h3>
                        <div className="space-y-6">
                            <div>
                                <label htmlFor="api-keys-input" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Google Gemini API Keys (Rotated)</label>
                                <textarea 
                                    id="api-keys-input"
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm text-slate-900 font-mono focus:border-sky-500 focus:bg-white transition-all outline-none"
                                    rows="2"
                                    value={geminiKeys}
                                    onBlur={() => geminiKeys && fetchModels(geminiKeys.split(',')[0].trim())}
                                    onChange={e => setGeminiKeys(e.target.value)}
                                    placeholder="Paste your API keys here..."
                                />
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="tool-model-input" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Chat & Logic Model</label>
                                    <div className="relative">
                                        <select id="tool-model-input" value={toolModel} onChange={e => setToolModel(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:border-sky-500 focus:bg-white transition-all outline-none appearance-none cursor-pointer">
                                            {availableModels.length > 0 ? (
                                                availableModels.map(m => <option key={m} value={m}>{m}</option>)
                                            ) : (
                                                <option value={toolModel}>{toolModel}</option>
                                            )}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" aria-hidden="true">
                                            {isLoadingModels ? <span className="iconify animate-spin" data-icon="solar:refresh-bold"></span> : <span className="iconify" data-icon="solar:alt-arrow-down-bold"></span>}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="content-model-input" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Research & Synthesis Model</label>
                                    <div className="relative">
                                        <select id="content-model-input" value={contentModel} onChange={e => setContentModel(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:border-sky-500 focus:bg-white transition-all outline-none appearance-none cursor-pointer">
                                            {availableModels.length > 0 ? (
                                                availableModels.map(m => <option key={m} value={m}>{m}</option>)
                                            ) : (
                                                <option value={contentModel}>{contentModel}</option>
                                            )}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" aria-hidden="true">
                                            {isLoadingModels ? <span className="iconify animate-spin" data-icon="solar:refresh-bold"></span> : <span className="iconify" data-icon="solar:alt-arrow-down-bold"></span>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Prompt Engineering */}
                    <section aria-labelledby="section-prompts">
                        <h3 id="section-prompts" className="text-xs font-[800] text-purple-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <div className="w-1.5 h-4 bg-purple-500 rounded-full" aria-hidden="true"></div>
                            Prompt Engineering
                        </h3>
                        
                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between items-end mb-2 ml-1">
                                    <label htmlFor="system-prompt-input" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Main System Prompt (Coach Identity)</label>
                                    <span className="text-[9px] text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded-full" aria-label="Available variables">Available: &#123;&#123;NODES&#125;&#125;</span>
                                </div>
                                <textarea 
                                    id="system-prompt-input"
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm text-slate-700 leading-relaxed focus:border-purple-500 focus:bg-white transition-all outline-none"
                                    rows="4"
                                    value={systemPrompt}
                                    onChange={e => setSystemPrompt(e.target.value)}
                                    placeholder="Leave empty to use default Expert Research Coach personality..."
                                />
                            </div>

                            <div>
                                <div className="flex justify-between items-end mb-2 ml-1">
                                    <label htmlFor="research-prompt-input" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Synthesis Prompt (Notecard Generation)</label>
                                    <span className="text-[9px] text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded-full" aria-label="Available variables">Available: &#123;&#123;TOPIC&#125;&#125;, &#123;&#123;CONTEXT&#125;&#125;</span>
                                </div>
                                <textarea 
                                    id="research-prompt-input"
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm text-slate-700 leading-relaxed focus:border-purple-500 focus:bg-white transition-all outline-none"
                                    rows="4"
                                    value={researchPrompt}
                                    onChange={e => setResearchPrompt(e.target.value)}
                                    placeholder="Leave empty to use default research synthesis logic..."
                                />
                            </div>
                        </div>
                    </section>

                    {/* Shortcodes Guide */}
                    <div className="bg-slate-50 rounded-3xl p-6 border-2 border-slate-100">
                        <h4 className="text-[10px] font-[900] text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span className="iconify w-4 h-4 text-sky-500" data-icon="solar:info-circle-bold-duotone"></span>
                            Shortcode Reference
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex items-start gap-3">
                                <code className="bg-white border border-slate-200 px-2 py-1 rounded-lg text-sky-600 font-bold text-[10px] flex-shrink-0">&#123;&#123;TOPIC&#125;&#125;</code>
                                <span className="text-[11px] text-slate-500 leading-tight">The specific label of the current node being researched.</span>
                            </div>
                            <div className="flex items-start gap-3">
                                <code className="bg-white border border-slate-200 px-2 py-1 rounded-lg text-purple-600 font-bold text-[10px] flex-shrink-0">&#123;&#123;CONTEXT&#125;&#125;</code>
                                <span className="text-[11px] text-slate-500 leading-tight">Descriptions of parent and root topics for relational focus.</span>
                            </div>
                            <div className="flex items-start gap-3">
                                <code className="bg-white border border-slate-200 px-2 py-1 rounded-lg text-emerald-600 font-bold text-[10px] flex-shrink-0">&#123;&#123;NODES&#125;&#125;</code>
                                <span className="text-[11px] text-slate-500 leading-tight">A list of all current node labels in the mind map.</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-8 py-6 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                    <button onClick={handleSave} className="bg-sky-500 hover:bg-sky-600 text-white font-[900] py-4 px-10 rounded-2xl transition-all shadow-xl shadow-sky-200 active:scale-95 flex items-center gap-3">
                        <span className="iconify w-5 h-5" data-icon="solar:check-circle-bold-duotone"></span>
                        Save AI Config
                    </button>
                </div>
            </div>
        </div>
    );
}

window.SettingsModal = SettingsModal;
