/**
 * @file TemplateService.js
 * @description Provides a library of pre-defined project blueprints (SaaS, Portfolio, etc.) to accelerate initial development.
 */

/**
 * Service for managing and applying boilerplate templates to new projects.
 */
export class TemplateService {
    /**
     * Creates a new TemplateService instance.
     * @param {FileSystem} fileSystem - The project VFS.
     */
    constructor(fileSystem) {
        this.fs = fileSystem;
        /** @type {Array<Object>} List of available project templates. */
        this.templates = [
            {
                id: 'saas-landing',
                name: 'SaaS Landing',
                description: 'High-conversion SaaS layout with sticky header, hero, and pricing.',
                icon: 'fa-solid fa-rocket',
                html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SaaS Template</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="bg-white text-slate-900 font-sans">
    <header class="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div class="container mx-auto px-6 py-4 flex justify-between items-center">
            <div class="text-2xl font-black text-indigo-600 tracking-tighter">Nexus.</div>
            <nav class="hidden md:flex space-x-8 font-semibold text-sm text-slate-500">
                <a href="#" class="hover:text-indigo-600 transition">Features</a>
                <a href="#" class="hover:text-indigo-600 transition">Pricing</a>
            </nav>
            <button class="bg-indigo-600 text-white px-6 py-2.5 rounded-full font-bold text-sm shadow-lg hover:shadow-indigo-600/30 transition">
                Get Started
            </button>
        </div>
    </header>
    <main class="pt-40 pb-20 px-6 text-center max-w-5xl mx-auto">
        <h1 class="text-5xl md:text-7xl font-extrabold text-slate-900 mb-6 tracking-tight leading-tight">
            Build faster with <span class="text-indigo-600">Nexus.</span>
        </h1>
        <p class="text-lg md:text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            The all-in-one platform to build, deploy, and scale your web applications without the headache.
        </p>
        <div class="flex flex-col sm:flex-row justify-center gap-4">
            <button class="bg-indigo-600 text-white px-8 py-4 rounded-full text-lg font-bold shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition transform hover:-translate-y-1">
                Start Free Trial
            </button>
        </div>
    </main>
</body>
</html>`
            },
            {
                id: 'portfolio',
                name: 'Minimal Portfolio',
                description: 'Clean, typography-focused portfolio for creatives.',
                icon: 'fa-solid fa-camera-retro',
                html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Portfolio</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 font-serif">
    <main class="max-w-4xl mx-auto px-6 py-20">
        <header class="mb-20 flex justify-between items-end border-b border-slate-800 pb-10">
            <div>
                <h1 class="text-6xl font-black mb-4 tracking-tighter">Creator.</h1>
                <p class="text-xl text-slate-500 italic">Frontend Engineer & Designer.</p>
            </div>
            <nav class="font-sans text-[10px] tracking-widest uppercase flex space-x-6 text-slate-400">
                <a href="#" class="hover:text-white">Work</a>
                <a href="#" class="hover:text-white">Contact</a>
            </nav>
        </header>
        <section class="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div class="group cursor-pointer">
                <div class="aspect-video bg-slate-800 rounded-2xl mb-6 overflow-hidden border border-slate-800 group-hover:border-indigo-500/50 transition-all"></div>
                <h3 class="text-xl font-bold mb-2">Project Alpha</h3>
                <p class="font-sans text-sm text-slate-500">React • Design</p>
            </div>
        </section>
    </main>
</body>
</html>`
            },
            {
                id: 'dashboard',
                name: 'App Dashboard',
                description: 'Responsive sidebar dashboard layout.',
                icon: 'fa-solid fa-table-columns',
                html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="bg-slate-50 flex h-screen overflow-hidden">
    <aside class="w-64 bg-slate-900 text-white flex flex-col">
        <div class="p-6 text-xl font-bold border-b border-slate-800">Admin</div>
        <nav class="flex-1 p-4 space-y-2">
            <a href="#" class="block p-3 rounded hover:bg-slate-800 bg-indigo-600">Dashboard</a>
            <a href="#" class="block p-3 rounded hover:bg-slate-800 text-slate-400">Users</a>
        </nav>
    </aside>
    <main class="flex-1 overflow-auto p-8">
                        <h1 class="text-2xl font-bold mb-6">Overview</h1>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h3 class="text-slate-500 text-sm font-bold uppercase mb-2">Revenue</h3>
                        <div class="text-3xl font-black">$24,500</div>
                    </div>
                </div>
            </main>
        </body>
        </html>`
                    },
                    {
                        id: 'docs',
                        name: 'Documentation',
                        description: 'Sidebar-based docs layout with content navigation.',
                        icon: 'fa-solid fa-book',
                        html: `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Docs - Nexus</title>
            <script src="https://cdn.tailwindcss.com?plugins=typography"></script>
        </head>
        <body class="bg-white text-slate-900">
            <div class="flex flex-col md:flex-row min-h-screen">
                <aside class="w-full md:w-64 bg-slate-50 border-r border-slate-200 p-6">
                    <div class="text-xl font-bold mb-8">Nexus Docs</div>
                    <nav class="space-y-4 text-sm">
                        <div>
                            <div class="font-bold text-slate-400 uppercase text-[10px] mb-2">Getting Started</div>
                            <a href="#" class="block text-indigo-600 font-semibold">Introduction</a>
                            <a href="#" class="block text-slate-600 hover:text-indigo-600">Installation</a>
                        </div>
                    </nav>
                </aside>
                <main class="flex-1 p-6 md:p-16 max-w-4xl prose prose-indigo">
                    <h1>Introduction</h1>
                    <p class="lead">Welcome to the Nexus documentation. Learn how to build projects faster.</p>
                    <hr>
                    <h2>Quick Start</h2>
                    <p>To get started, follow these simple steps...</p>
                    <pre class="bg-slate-900 text-white p-4 rounded-lg"><code>npx create-nexus-app my-project</code></pre>
                </main>
            </div>
        </body>
        </html>`
                    },
                    {
                        id: 'blog',
                        name: 'Magazine Blog',
                        description: 'Modern content-focused grid for articles.',
                        icon: 'fa-solid fa-newspaper',
                        html: `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Nexus Blog</title>
            <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-slate-50">
            <nav class="bg-white border-b p-6 text-center">
                <div class="text-2xl font-serif italic font-black">Nexus Journal</div>
            </nav>
            <main class="max-w-6xl mx-auto p-6 md:p-12">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <article class="md:col-span-2 bg-white rounded-3xl overflow-hidden shadow-sm border group cursor-pointer">
                        <div class="aspect-video bg-indigo-100"></div>
                        <div class="p-8">
                            <span class="text-indigo-600 font-bold text-xs uppercase">Featured</span>
                            <h2 class="text-3xl font-bold mt-2 mb-4 group-hover:text-indigo-600 transition">The future of autonomous IDEs</h2>
                            <p class="text-slate-500">Exploring how AI is reshaping the way we think about local development environments...</p>
                        </div>
                    </article>
                    <div class="space-y-8">
                        <article class="bg-white p-6 rounded-3xl border">
                            <h3 class="font-bold mb-2">Web development in 2026</h3>
                            <p class="text-sm text-slate-500">A brief summary of the latest trends...</p>
                        </article>
                    </div>
                </div>
            </main>
        </body>
        </html>`
                    },
                    {
                        id: 'linktree',
                        name: 'Link-in-Bio',
                        description: 'Simple, mobile-first social links page.',
                        icon: 'fa-solid fa-link',
                        html: `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Links</title>
            <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-gradient-to-b from-slate-900 to-black text-white min-h-screen flex flex-col items-center px-6 py-20">
            <div class="w-24 h-24 bg-indigo-500 rounded-full mb-6 ring-4 ring-indigo-500/20 shadow-2xl"></div>
            <h1 class="text-2xl font-bold mb-2">@nexus_dev</h1>
            <p class="text-slate-400 mb-10 text-center max-w-xs">Building the future of software engineering, one component at a time.</p>
            
            <div class="w-full max-w-sm space-y-4">
                <a href="#" class="block w-full p-4 bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur-lg rounded-2xl text-center font-bold transition">GitHub Project</a>
                <a href="#" class="block w-full p-4 bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur-lg rounded-2xl text-center font-bold transition">Documentation</a>
                <a href="#" class="block w-full p-4 bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur-lg rounded-2xl text-center font-bold transition">Contact Me</a>
            </div>
        </body>
        </html>`
                    }
                ];
            }

    /**
     * Returns the list of all hardcoded templates.
     * @returns {Array<Object>}
     */
    getTemplates() {
        return this.templates;
    }

    /**
     * Applies a specific template to the project by writing its HTML to 'index.html'.
     * @param {string} id - The template ID.
     * @returns {Promise<string|null>} The HTML content if successful.
     */
    async applyTemplate(id) {
        const tpl = this.templates.find(t => t.id === id);
        if (tpl) {
            await this.fs.writeFile('index.html', tpl.html);
            return tpl.html;
        }
        return null;
    }
}
