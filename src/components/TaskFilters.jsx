import './TaskFilters.css';

function TaskFilters({ currentFilter, onFilterChange, counts }) {
    return (
        <div className="filters-container">
            <button
                className={`filter-btn ${currentFilter === 'all' ? 'active' : ''}`}
                onClick={() => onFilterChange('all')}
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="8" y1="6" x2="21" y2="6"></line>
                    <line x1="8" y1="12" x2="21" y2="12"></line>
                    <line x1="8" y1="18" x2="21" y2="18"></line>
                    <line x1="3" y1="6" x2="3.01" y2="6"></line>
                    <line x1="3" y1="12" x2="3.01" y2="12"></line>
                    <line x1="3" y1="18" x2="3.01" y2="18"></line>
                </svg>
                All
                <span className="count-badge green">{counts.all}</span>
            </button>

            <button
                className={`filter-btn ${currentFilter === 'active' ? 'active' : ''}`}
                onClick={() => onFilterChange('active')}
            >
                <div className="circle-icon"></div>
                Active
                <span className="count-badge gray">{counts.active}</span>
            </button>

            <button
                className={`filter-btn ${currentFilter === 'completed' ? 'active' : ''}`}
                onClick={() => onFilterChange('completed')}
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                Completed
                <span className="count-badge gray">{counts.completed}</span>
            </button>
        </div >
    );
}

export default TaskFilters;
