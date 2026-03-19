import React, { useState, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { Tldraw, useEditor, createShapeId, BaseBoxShapeUtil, HTMLContainer, track, StateNode } from 'tldraw';

/**
 * Custom Tool for Research Notes
 */
class ResearchNoteTool extends StateNode {
	static id = 'research-note';
	static initial = 'idle';

	onPointerDown() {
		const { x, y } = this.editor.inputs.currentPagePoint;
		this.editor.createShape({
			type: 'research-note',
			x,
			y,
			props: { label: 'New Note' },
		});
		this.editor.setCurrentTool('select');
	}
}

/**
 * Custom ResearchNote shape util.
 */
class ResearchNoteUtil extends BaseBoxShapeUtil {
	static type = 'research-note';

	getDefaultProps() {
		return {
			w: 200,
			h: 150,
			label: 'New Note',
			quote: '',
			thoughts: '',
			color: '#0ea5e9',
		};
	}

	component(shape) {
		return (
			<HTMLContainer
				id={shape.id}
				style={{
					pointerEvents: 'all',
					backgroundColor: 'white',
					border: '1px solid #e2e8f0',
					borderRadius: '12px',
					display: 'flex',
					flexDirection: 'column',
					overflow: 'hidden',
					boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
				}}
			>
				<div 
					style={{
						height: '8px',
						backgroundColor: shape.props.color,
						width: '100%',
					}}
				/>
				<div style={{ padding: '12px', flexGrow: 1 }}>
					<div style={{ fontWeight: '900', fontSize: '13px', marginBottom: '4px' }}>
						{shape.props.label}
					</div>
					{shape.props.quote && (
						<div style={{ fontStyle: 'italic', fontSize: '11px', color: '#64748b', borderLeft: '2px solid #e2e8f0', paddingLeft: '8px', marginBottom: '4px' }}>
							"{shape.props.quote}"
						</div>
					)}
				</div>
			</HTMLContainer>
		);
	}

	indicator(shape) {
		return <rect width={shape.props.w} height={shape.props.h} />;
	}
}

/**
 * Custom SourceCard shape util.
 */
class SourceCardUtil extends BaseBoxShapeUtil {
	static type = 'source-card';

	getDefaultProps() {
		return {
			w: 220,
			h: 100,
			title: 'Source Title',
			url: '',
			domain: '',
		};
	}

	component(shape) {
		return (
			<HTMLContainer
				id={shape.id}
				style={{
					pointerEvents: 'all',
					backgroundColor: '#f8fafc',
					border: '2px solid #0ea5e9',
					borderRadius: '16px',
					display: 'flex',
					flexDirection: 'column',
					overflow: 'hidden',
					boxShadow: '0 4px 12px rgba(14, 165, 233, 0.1)',
				}}
			>
				<div style={{ padding: '12px' }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
						<div style={{ width: '24px', height: '24px', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyCenter: 'center' }}>
							<span className="iconify" data-icon="solar:link-bold-duotone" style={{ color: '#0ea5e9', fontSize: '14px' }}></span>
						</div>
						<div style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', trackingWidest: '0.1em', color: '#0ea5e9' }}>
							{shape.props.domain || 'External Source'}
						</div>
					</div>
					<div style={{ fontWeight: '800', fontSize: '12px', color: '#0f172a', lineHeight: '1.4' }}>
						{shape.props.title}
					</div>
				</div>
			</HTMLContainer>
		);
	}

	indicator(shape) {
		return <rect width={shape.props.w} height={shape.props.h} rx={16} ry={16} />;
	}
}

const customShapes = [ResearchNoteUtil, SourceCardUtil];
const customTools = [ResearchNoteTool];

/**
 * Custom Research Toolbar
 */
const ResearchToolbar = track(() => {
    const editor = useEditor();
    const currentToolId = editor.getCurrentToolId();

    const tools = [
        { id: 'select', icon: 'solar:cursor-bold-duotone', label: 'Select' },
        { id: 'research-note', icon: 'solar:notes-bold-duotone', label: 'Add Note' },
        { id: 'arrow', icon: 'solar:arrow-right-up-bold-duotone', label: 'Connect' },
        { id: 'eraser', icon: 'solar:eraser-bold-duotone', label: 'Erase' },
    ];

    return (
        <div className="custom-research-toolbar">
            {tools.map((tool) => (
                <button
                    key={tool.id}
                    className={`tool-item ${currentToolId === tool.id ? 'active' : ''}`}
                    onClick={() => editor.setCurrentTool(tool.id)}
                    title={tool.label}
                >
                    <span className="iconify" data-icon={tool.icon}></span>
                </button>
            ))}
        </div>
    );
});

/**
 * ResearchCanvas component - The main tldraw-based workspace.
 */
function ResearchCanvas() {
    return (
        <div className="tldraw-container w-full h-full" style={{ touchAction: 'none' }}>
            <Tldraw 
                shapeUtils={customShapes}
                tools={customTools}
                hideUi={true}
                onMount={(editor) => {
                    window.tldrawEditor = editor;
                    
                    // Basic configuration
                    editor.user.updateUserPreferences({ name: 'Researcher' });
                    
                    // Intercept events for custom flows
                    editor.on('event', (info) => {
                        if (info.name === 'double_click' && info.target === 'canvas') {
                            const { x, y } = editor.inputs.currentPagePoint;
                            if (window.onCanvasDoubleClick) {
                                window.onCanvasDoubleClick({ x, y });
                            }
                        }
                        if (info.name === 'double_click' && info.target === 'shape') {
                            if (window.onNodeDoubleClick) {
                                window.onNodeDoubleClick(editor.getShape(info.shape.id));
                            }
                        }
                    });

                    // Sync selection
                    editor.sideEffects.registerBeforeChangeHandler('instance_page_state', (prev, next) => {
                        if (prev.selectedShapeIds !== next.selectedShapeIds) {
                            if (window.onNodeSelect) {
                                const selectedShapes = next.selectedShapeIds.map(id => editor.getShape(id)).filter(Boolean);
                                window.onNodeSelect(selectedShapes);
                            }
                        }
                        return next;
                    });
                }}
            >
                <ResearchToolbar />
            </Tldraw>
        </div>
    );
}

// Global initialization function
window.initResearchCanvas = (containerId) => {
    const root = ReactDOM.createRoot(document.getElementById(containerId));
    root.render(React.createElement(ResearchCanvas));
    return root;
};
