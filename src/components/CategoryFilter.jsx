import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
    SortableContext,
    rectSortingStrategy,
} from '@dnd-kit/sortable';
import { motion } from 'framer-motion';
import CategorySortableItem from './CategorySortableItem';
import './CategoryFilter.css';

function CategoryFilter({ categories, currentCategory, onSelectCategory, onAddCategory, onRenameCategory, onDeleteCategory, userExistence }) {
    const [isAdding, setIsAdding] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    const [editingCategory, setEditingCategory] = useState(null);
    const [editName, setEditName] = useState('');

    const addInputRef = useRef(null);
    const editInputRef = useRef(null);

    useEffect(() => {
        if (isAdding && addInputRef.current) {
            addInputRef.current.focus();
        }
    }, [isAdding]);

    useEffect(() => {
        if (editingCategory && editInputRef.current) {
            editInputRef.current.focus();
        }
    }, [editingCategory]);

    const handleAddSubmit = (e) => {
        e.preventDefault();
        if (newCategoryName.trim()) {
            onAddCategory(newCategoryName.trim());
            setNewCategoryName('');
            setIsAdding(false);
        } else {
            setIsAdding(false);
        }
    };

    const handleRenameSubmit = (e) => {
        e.preventDefault();
        if (editName.trim() && editName !== editingCategory) {
            onRenameCategory(editingCategory, editName.trim());
        }
        setEditingCategory(null);
        setEditName('');
    };

    const startEditing = (id, name) => {
        if (name === 'All') return;
        setEditingCategory(id);
        setEditName(name);
    };

    const { currentUser } = useAuth();

    // Split categories
    const myLists = categories.filter(cat => !cat.ownerId || cat.ownerId === currentUser.uid);
    const sharedLists = categories.filter(cat => cat.ownerId && cat.ownerId !== currentUser.uid);

    return (
        <div className="category-filter">

            {/* --- MY LISTS SECTION --- */}
            <div className="category-section" id="tour-lists-section">
                <div className="category-section-title">My Lists</div>
                <div className="category-row">
                    {/* 'All' button usually sits better with My Lists or global? 
                        Let's keep 'All' in My Lists row for now as the default view. 
                    */}
                    <button
                        className={`category-chip ${currentCategory === 'All' ? 'active' : ''}`}
                        onClick={() => onSelectCategory('All')}
                        style={{ position: 'relative' }}
                    >
                        {currentCategory === 'All' && (
                            <motion.div
                                layoutId="activePill"
                                className="active-pill-bg"
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            />
                        )}
                        <span style={{ position: 'relative', zIndex: 1 }}>All</span>
                    </button>

                    <SortableContext items={myLists.map(c => c.id)} strategy={rectSortingStrategy}>
                        {myLists.map(cat => (
                            <CategorySortableItem key={cat.id} id={cat.id}>
                                {editingCategory === cat.id ? (
                                    <form key={cat.id} onSubmit={handleRenameSubmit} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                        <input
                                            ref={editInputRef}
                                            type="text"
                                            className="category-edit-input"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            onBlur={() => {
                                                setTimeout(() => {
                                                    if (editingCategory) {
                                                        if (editName.trim() && editName !== editingCategory) {
                                                            onRenameCategory(editingCategory, editName.trim());
                                                        }
                                                        setEditingCategory(null);
                                                    }
                                                }, 200);
                                            }}
                                        />
                                        <button
                                            type="button"
                                            className="category-delete-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteCategory(cat.id);
                                                setEditingCategory(null);
                                            }}
                                            title="Delete Category"
                                        >
                                            &times;
                                        </button>
                                    </form>
                                ) : (
                                    <div
                                        className={`category-chip-wrapper ${currentCategory === cat.name ? 'active' : ''}`}
                                        style={{ position: 'relative' }}
                                    >
                                        {currentCategory === cat.name && (
                                            <motion.div
                                                layoutId="activePill"
                                                className="active-pill-bg"
                                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                            />
                                        )}
                                        <button
                                            className="category-chip-btn"
                                            onClick={() => onSelectCategory(cat.id)}
                                            onDoubleClick={() => {
                                                if (cat.name === 'All') return;
                                                startEditing(cat.id, cat.name);
                                            }}
                                            title="Double click to edit"
                                            style={{ position: 'relative', zIndex: 1 }}
                                        >
                                            {cat.name}
                                            {/* Show Users Icon if I own it but shared it? 
                                                Optional: {cat.members && cat.members.length > 1 && <Icon />} 
                                                For now keeping My Lists simple as requested "Lists I own".
                                            */}
                                        </button>
                                        <button
                                            className="category-hover-delete-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteCategory(cat.id);
                                            }}
                                            title="Delete Category"
                                            style={{ position: 'relative', zIndex: 1 }}
                                        >
                                            &times;
                                        </button>
                                    </div>
                                )}
                            </CategorySortableItem>
                        ))}
                    </SortableContext>

                    {/* Add Button only in My Lists */}
                    {isAdding ? (
                        <form onSubmit={handleAddSubmit} style={{ display: 'inline' }}>
                            <input
                                ref={addInputRef}
                                type="text"
                                className="category-add-input"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                onBlur={handleAddSubmit} // Auto-submit on click away
                                placeholder="New..."
                            />
                        </form>
                    ) : (
                        <button className="category-add-btn" onClick={() => setIsAdding(true)} id="tour-add-list-btn">
                            + New
                        </button>
                    )}
                </div>
            </div>

            {/* --- SHARED LISTS SECTION --- */}
            {sharedLists.length > 0 && (
                <div className="category-section">
                    <div className="category-section-title">Shared with Me</div>
                    <div className="category-row">
                        {/* We don't use SortableContext here if we don't want DND between sections yet, 
                             but for consistency we can wrap it or just render items. 
                             DND across sections needs a single context. For now, let's just render visuals.
                         */}
                        {sharedLists.map(cat => (
                            <div
                                key={cat.id}
                                className={`category-chip-wrapper ${currentCategory === cat.name ? 'active' : ''}`}
                                style={{ position: 'relative' }}
                            >
                                {editingCategory === cat.id ? (
                                    <form key={cat.id} onSubmit={handleRenameSubmit} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                        <input
                                            ref={editInputRef}
                                            type="text"
                                            className="category-edit-input"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            onBlur={() => {
                                                setTimeout(() => {
                                                    if (editingCategory) {
                                                        if (editName.trim() && editName !== editingCategory) {
                                                            onRenameCategory(editingCategory, editName.trim());
                                                        }
                                                        setEditingCategory(null);
                                                    }
                                                }, 200);
                                            }}
                                        />
                                        {/* Hide delete for shared lists in edit mode too, or allow 'Leave'? Keeping simpe: cancel edit */}
                                        <button
                                            type="button"
                                            className="category-delete-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingCategory(null);
                                            }}
                                            title="Cancel"
                                        >
                                            &times;
                                        </button>
                                    </form>
                                ) : (
                                    <>
                                        {currentCategory === cat.name && (
                                            <motion.div
                                                layoutId="activePill"
                                                className="active-pill-bg"
                                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                            />
                                        )}
                                        <button
                                            className="category-chip-btn"
                                            onClick={() => onSelectCategory(cat.id)}
                                            onDoubleClick={() => startEditing(cat.id, cat.name)}
                                            title={userExistence && userExistence[cat.ownerId] === false ? 'Shared by Deleted User' : `Shared by ${cat.ownerName || cat.ownerEmail || 'Unknown'} (Double click to rename)`}
                                            style={{
                                                position: 'relative',
                                                zIndex: 1,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                backgroundColor: '#e0e7ff',
                                                color: '#4338ca',
                                                paddingRight: '12px'
                                            }}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                                <circle cx="9" cy="7" r="4"></circle>
                                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                            </svg>
                                            {cat.name}
                                        </button>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div >
    );
}

export default CategoryFilter;
