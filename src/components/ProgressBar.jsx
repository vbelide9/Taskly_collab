import './ProgressBar.css';

function ProgressBar({ progress }) {
    return (
        <div className="progress-container">
            <div className="progress-header">
                <span className="progress-label">Progress</span>
                <span className="progress-value">{progress}% complete</span>
            </div>
            <div className="progress-track">
                <div
                    className="progress-fill"
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
        </div>
    );
}

export default ProgressBar;
