/**
 * @file state.js
 * @description Defines the global application state and initial work structures for InquiryOS.
 */

/**
 * Global application state object.
 * @namespace App
 */
export const App = {
    mode: 'student', // 'student' | 'teacher'
    user: { 
        name: '', 
        visitorId: '', 
        avatar: '' 
    },
    classCode: '',
    currentModule: 'overview',
    teacherModule: 'overview',
    iconSearchResults: [],
    iconSearchQuery: '',
    currentIconSet: 'mdi',
    availableIconSets: [],
    selectedIconCollections: [],
    simulations: [], // Global library of simulations from Concord, PhET, etc.
    viewingStudentId: null,
    isExemplarMode: false,
    isViewingExemplar: false,
    studentWorkCache: null,
    _editingAssetBank: null, // 'icon' | 'emoji'
    _emojiCategoryFilter: 'all',
    _assetSearchTimer: null,
    
    sharedData: {
        debatePosts: [],
        currentPresentation: null // { type: 'model'|'data'|'exemplar', visitorId: string, moduleId: string }
    },
    
    /**
     * Teacher-controlled settings for the class session.
     */
    teacherSettings: {
        forceModule: null,
        guidedMode: false,
        showFeedbackToStudents: true,
        exemplars: {}, // Maps moduleId -> work state
        activeDomains: ['general'], // ['life', 'physical', 'earth', 'chemistry', 'engineering']
        studentStatus: {}, // Maps visitorId -> { currentModule, status: 'not-started'|'in-progress'|'complete' }
        moduleAccess: {
            overview: true,
            questions: true, 
            models: true, 
            investigation: true, 
            analysis: true,
            math: true, 
            explanations: true, 
            argument: true, 
            communication: true
        },
        phenomenon: { 
            title: 'Ecosystems & Energy Flow', 
            description: 'A lake has experienced a sudden algae bloom, turning the water green.', 
            tags: ['Ecosystems', 'Energy'], 
            ngssStandards: [],
            media: [] // Array of { type: 'image'|'video'|'sim', url: string, thumb: string, provider: string, id: string }
        },
        keys: {
            unsplash: '',
            pexels: ''
        },
        emojiSets: {
            general: ['🌡️', '💧', '☀️', '🌱', '🦠', '🧪', '💨', '⚡', '🔋', '🧱', '⚙️', '⚖️', '🔬', '🧬', '🌍', '🔭', '🏗️', '🌉', '🔨', '📏'],
            life: ['🌲', '🌻', '🐟', '🐦', '🦋', '🐝', '🍎', '🥩', '🧠', '💀', '🦠', '🧬', '🔬', '🌿', '🍄', '🐾'],
            physical: ['🔋', '⚡', '💡', '🧲', '⚙️', '⚖️', '🔨', '📏', '🔧', '🧪', '🌡️', '🔥', '💨', '🌈', '📡', '🔋'],
            earth: ['🌍', '🌎', '🌏', '☀️', '🌙', '☁️', '⛈️', '🌪️', '🌋', '🏔️', '🌊', '🏜️', '💎', '☄️', '🛰️', '🔭'],
            engineering: ['🏗️', '🏢', '🏭', '🏠', '🌉', '⛓️', '🔗', '⚙️', '🔩', '🔧', '🔨', '🛠️', '📐', '📏', '💻', '🤖']
        },
        activeEmojiSets: ['general'],
        categories: [
            { id: 'cat_patterns', name: 'Patterns', color: '#3b82f6' },
            { id: 'cat_causes', name: 'Cause & Effect', color: '#22c55e' },
            { id: 'cat_systems', name: 'Systems', color: '#a855f7' },
            { id: 'cat_energy', name: 'Energy', color: '#f59e0b' }
        ],
        defaultCategoriesEnabled: true,
        anonymousMode: false,
        allowStudentReplies: true,
        defaultIcons: ['mdi:atom', 'mdi:leaf', 'mdi:water', 'mdi:fire', 'mdi:weather-sunny', 'mdi:flower', 'mdi:bacteria', 'mdi:flask-outline', 'mdi:microscope', 'mdi:dna', 'mdi:earth', 'mdi:mountain', 'mdi:magnet', 'mdi:battery-high', 'mdi:cog', 'mdi:human', 'mdi:heart', 'mdi:brain', 'mdi:lungs', 'mdi:skeleton', 'mdi:home', 'mdi:factory', 'mdi:car', 'mdi:bicycle', 'mdi:bus', 'mdi:train', 'mdi:airplane'],
        defaultEmojis: ['🌡️', '💧', '☀️', '🌱', '🦠', '🧪', '💨', '⚡', '🔋', '🧱', '⚙️', '⚖️', '🔬', '🧬', '🌍', '🔭', '🏗️', '🌉', '🔨', '📏'],
        showDefaultIcons: true,
        showDefaultEmojis: true,
        lessonIcons: [],
        lessonEmojis: [],
        showAllIcons: true
    },
    
    /**
     * Current student's scientific work data.
     */
    work: getInitialWorkState(),
    
    syncState: {
        lastSync: Date.now(),
        syncInterval: null
    },
    
    /**
     * State for the SEP2 Modeling practice.
     */
    modelState: {
        selectedNode: null,
        draggingNode: null,
        connecting: null,
        connectingHandle: null,
        offset: { x: 0, y: 0 },
        selectedIcon: null,
        currentTool: 'select', // 'select' | 'node' | 'pen' | 'shape' | 'note' | 'stamp' | 'explain'
        toolSticky: false,
        penColor: '#000000',
        penWidth: 3,
        shapeType: 'rectangle',
        isDrawing: false,
        currentPath: [],
        selectionStart: null,
        selectionBox: null,
        resizing: null,
        resizeStart: null,
        shapeStart: null,
        selectedItems: [], // Array of {id, type}
        transformMode: null, // 'move' | 'resize' | 'rotate'
        transformStart: null,
        transformOrigin: null,
        drawerOpen: false,
        isFullscreen: false,
        isMultiSelectMode: false,
        isToolbarPinned: false,
        pan: { x: 0, y: 0 },
        zoom: 1,
        pointers: new Map() // For multi-touch gestures
    },
    
    /**
     * State for the teacher's live monitoring and feedback viewer.
     */
    viewerState: {
        currentStudentId: null,
        viewType: null,
        addingComment: false,
        commentPosition: null,
        selectedSticker: null,
        isMonitoring: false
    },
    
    classStats: {
        notices: 0,
        wonders: 0,
        nodes: 0,
        posts: 0
    },
    
    editingCard: null,
    draggedCard: null,
    draggedRowIndex: null,
    iconPickerCallback: null
};

/**
 * Generates a fresh, empty work state object for a student.
 * @returns {Object} The initial work state.
 */
export function getInitialWorkState() {
    return {
        phenomenon: { title: '', description: '', tags: [], ngssStandards: [] },
        notices: [], 
        wonders: [], 
        ideas: [], 
        testableQuestions: [], 
        mainQuestion: '', 
        subQuestions: [],
        debatePosts: [],
        modelNodes: [], 
        modelConnections: [], 
        modelShapes: [], 
        modelNotes: [],
        modelPaths: [], 
        modelGroups: [], 
        modelComments: [], 
        modelStickers: [],
        variables: [], 
        procedureSteps: [],
        dataTable: { 
            columns: [
                { id: 'c1', name: 'Trial', type: 'text', variableId: '' }, 
                { id: 'c2', name: 'Variable 1', type: 'number', unit: '', variableId: '' }, 
                { id: 'c3', name: 'Variable 2', type: 'number', unit: '', variableId: '' }
            ], 
            rows: [{}, {}, {}],
            feedback: {} // Maps rowIndex -> sticker emoji
        },
        mathExpressions: [], 
        evidence: [], 
        claim: '', 
        reasoning: '', 
        evidenceText: '', 
        selectedEvidence: [],
        modelExplanations: [], 
        modelGeneralExplanation: '',
        poster: {}
    };
}

/**
 * NGSS Standards data store.
 * @type {Object}
 */
export const ngssData = {
    elements3D: { dimensions: [] },
    pes: { 'K-5': [], '6-8': [], '9-12': [] },
    peMap: new Map(),
    elementMap: new Map(),
    specificElementMap: new Map(),
    nameToCodeMap: new Map(),
    textToSpecificCodeMap: new Map(),
    sortedGradeLabels: [],
    allTopics: [],
    gradeToTopicsMap: {},
    loaded: false
};
