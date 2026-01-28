import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import './TaskItem.css';

function TaskItem({ task, onToggle, onDelete, onEdit, ...props }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(task.text);
    const inputRef = useRef(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    const handleDoubleClick = () => {
        if (!task.completed) {
            setIsEditing(true);
            setEditText(task.text);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editText.trim()) {
            onEdit(editText.trim());
        } else {
            setEditText(task.text); // Revert if empty
        }
        setIsEditing(false);
    };

    const { currentUser } = useAuth();
    const isMine = currentUser && task.createdBy === currentUser.uid;

    return (
        <div className={`task-item ${task.completed ? 'completed' : ''}`}>
            {/* ... (rest of render) ... */}
            <div className="task-left">
                {/* ... check circle ... */}
                <motion.button
                    className="check-circle"
                    onClick={onToggle}
                    whileTap={{ scale: 0.9 }}
                >
                    {task.completed && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <motion.polyline
                                points="20 6 9 17 4 12"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 0.2 }}
                            />
                        </svg>
                    )}
                </motion.button>
                <div className="task-content">
                    {/* ... editing logic ... */}
                    {isEditing ? (
                        <form onSubmit={handleSubmit}>
                            <input
                                ref={inputRef}
                                type="text"
                                className="task-edit-input"
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                onBlur={handleSubmit}
                            />
                        </form>
                    ) : (
                        <span
                            className="task-text"
                            onDoubleClick={handleDoubleClick}
                            title="Double click to edit"
                        >
                            {task.text}
                        </span>
                    )}
                    <div className="task-meta-row">
                        {/* Remove 'General' tag as requested or fix it? User complained about 'General' tag. 
                            We are in a list, so tag might be redundant or should be List Name? 
                            Since it's a specific list dashboard, maybe remove category badge entirely? 
                            User said: "Why do I see 3 Personal categories... Why 'General' tag?"
                            Let's remove the category badge to clean up UI as lists ARE categories now.
                        */}
                        <span className="task-meta">
                            {task.completed
                                ? `Completed by ${(currentUser && task.completedBy === currentUser.uid) ? 'You' : (task.completedByName || 'Unknown')}`
                                : `Added by ${isMine ? 'You' : (props.userExistence && props.userExistence[task.createdBy] === false ? 'Deleted User' : (task.attributedTo || 'Unknown'))}`
                            }
                        </span>
                    </div>
                </div>
            </div>

            <button className="delete-btn" onClick={onDelete} title="Delete Task">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            </button>
        </div>
    );
}

export default TaskItem;
