import React from 'react';
import { CollaborativeEditor } from './CollaborativeEditor.jsx';

export function Workspace({ boardInfo, onClose }) {
    return (
        <div id="workspace" className="layer">
            <CollaborativeEditor
                boardId={boardInfo.id}
                isHost={boardInfo.isHost}
                initialSnapshot={boardInfo.snapshot}
                onClose={onClose}
            />
        </div>
    );
}