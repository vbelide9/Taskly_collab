import { useState, useEffect } from 'react';
import './TaskInput.css';

function TaskInput({ onAdd, categories = ['General', 'Work', 'Personal'], defaultCategory }) {
    const [text, setText] = useState('');
    const [category, setCategory] = useState(defaultCategory || categories[0]);

    // Update local state when defaultCategory changes (e.g. user switches tabs)
    useEffect(() => {
        if (defaultCategory) {
            setCategory(defaultCategory);
        }
    }, [defaultCategory]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (text.trim()) {
            console.log('TaskInput submitting:', text, category); // Debug log
            onAdd(text, category);
            setText('');
            // Keep same category selected
        }
    };

    return (
        <form className="task-input-container" onSubmit={handleSubmit} id="tour-task-input">
            {categories.length > 0 && (
                <select
                    className="category-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                >
                    {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
            )}
            <input
                type="text"
                placeholder="Add a new task..."
                className="task-input"
                value={text}
                onChange={(e) => setText(e.target.value)}
            />
            <button type="submit" className="add-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add
            </button>
        </form>
    );
}

export default TaskInput;
