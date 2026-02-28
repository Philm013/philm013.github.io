#!/bin/bash
cat << 'INNER_EOF' >> MarkedUp/css/styles.css

/* Settings Modal Overhaul */
.settings-modal {
    width: 800px !important;
    max-width: 95vw !important;
    height: 80vh !important;
    max-height: 800px !important;
    display: flex;
    flex-direction: row;
    padding: 0;
    overflow: hidden;
}

.settings-sidebar {
    width: 220px;
    background: var(--bg-card);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    padding: 20px 0;
}

.settings-header-title {
    padding: 0 20px 16px;
    font-size: 18px;
    font-weight: 700;
    color: var(--text);
    border-bottom: 1px solid var(--border);
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
}

.settings-nav {
    flex: 1;
    overflow-y: auto;
    padding: 0 12px;
}

.settings-nav-item {
    padding: 10px 16px;
    border-radius: 8px;
    color: var(--text-muted);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    gap: 10px;
}

.settings-nav-item:hover {
    background: var(--bg-hover);
    color: var(--text);
}

.settings-nav-item.active {
    background: var(--accent-dim);
    color: var(--accent);
    font-weight: 600;
}

.settings-content-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: var(--bg-panel);
}

.settings-content {
    flex: 1;
    overflow-y: auto;
    padding: 30px;
}

.settings-section {
    display: none;
    animation: fadeIn 0.3s;
}

.settings-section.active {
    display: block;
}

.settings-section-title {
    font-size: 20px;
    font-weight: 700;
    margin-bottom: 24px;
    color: var(--text);
    border-bottom: 1px solid var(--border);
    padding-bottom: 12px;
}

.settings-footer {
    padding: 16px 24px;
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    background: var(--bg-card);
}

/* Settings Form Elements */
.color-picker-group {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 8px;
}

.color-picker-group input[type="color"] {
    width: 40px;
    height: 40px;
    padding: 0;
    border: 1px solid var(--border);
    border-radius: 8px;
    cursor: pointer;
    background: none;
}

.color-picker-group input[type="text"] {
    flex: 1;
    max-width: 120px;
}

.danger-zone {
    border: 1px solid var(--danger);
    border-radius: 12px;
    padding: 20px;
    background: rgba(239, 68, 68, 0.05);
    margin-top: 32px;
}

.danger-zone h4 {
    color: var(--danger);
    margin-bottom: 8px;
}

.danger-zone p {
    color: var(--text-dim);
    margin-bottom: 16px;
    font-size: 13px;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
}

.stats-grid .stat-card {
    background: var(--bg-base);
    padding: 16px;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 768px) {
    .settings-modal {
        flex-direction: column;
        height: 90vh !important;
        max-height: none !important;
        border-radius: 16px 16px 0 0;
        align-self: flex-end;
        margin-top: auto;
    }
    
    .settings-sidebar {
        width: 100%;
        border-right: none;
        border-bottom: 1px solid var(--border);
        padding: 16px 0 0;
    }
    
    .settings-nav {
        display: flex;
        overflow-x: auto;
        padding: 0 16px 8px;
        -webkit-overflow-scrolling: touch;
    }
    
    .settings-nav-item {
        flex-shrink: 0;
        margin-bottom: 0;
        margin-right: 8px;
        white-space: nowrap;
    }
    
    .settings-content {
        padding: 20px 16px;
    }
}
INNER_EOF
