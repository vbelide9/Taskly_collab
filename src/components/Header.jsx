import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, where, documentId, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import './Header.css';

function Header({ taskCount, completedCount, currentList, onInvite, collaboratorIds }) {
    const { logout, currentUser } = useAuth();
    const { isDarkMode, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);
    const [activeUsers, setActiveUsers] = useState([]);
    const [rawUsers, setRawUsers] = useState([]);

    async function handleLogout() {
        try {
            // Set stats to offline before logging out
            if (currentUser) {
                const userRef = doc(db, 'users', currentUser.uid);
                // await updateDoc(userRef, {
                //     status: 'offline',
                //     lastSeen: null // invalidate lastSeen
                // });
            }
            await logout();
            navigate('/login');
        } catch (error) {
            console.error("Failed to log out", error);
            // Ensure we still redirect even if firestore update fails
            await logout().catch(e => console.error("Force logout", e));
            navigate('/login');
        }
    }

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const { deleteAccount } = useAuth();

    function initiateDelete() {
        setShowDeleteModal(true);
        setShowDropdown(false);
    }

    async function confirmDelete() {
        setIsDeleting(true);
        try {
            // 1. Delete User Data (Cleanup) - Best effort
            if (currentUser) {
                try {
                    await deleteDoc(doc(db, 'users', currentUser.uid));
                } catch (cleanupError) {
                    console.error("Cleanup failed:", cleanupError);
                }
            }

            // 2. Delete Auth Account
            await deleteAccount();
            navigate('/signup');
            // No alert needed, redirect is enough feedback
        } catch (error) {
            console.error("Failed to delete account", error);
            setIsDeleting(false);
            if (error.code === 'auth/requires-recent-login') {
                alert("Security: Please log out and back in to delete your account.");
                await logout();
                navigate('/login');
            } else {
                alert("Error: " + error.message);
            }
        }
    }

    // Subscribe to active users (GLOBAL presence: anyone I share a list with)
    useEffect(() => {
        if (!collaboratorIds || collaboratorIds.length === 0) {
            setRawUsers([]);
            return;
        }

        // Firestore 'in' query limit is 30.
        const safeMembers = collaboratorIds.slice(0, 30);

        const q = query(
            collection(db, 'users'),
            where(documentId(), 'in', safeMembers)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const users = snapshot.docs.map(doc => ({
                uid: doc.id,
                ...doc.data()
            }));
            setRawUsers(users);
        }, (error) => {
            console.error("Error fetching list members:", error);
        });

        return unsubscribe;
    }, [collaboratorIds]);

    // Filter Active Users (Local Interval)
    useEffect(() => {
        const checkOnlineStatus = () => {
            const now = new Date();
            const online = rawUsers.filter(user => {
                let lastSeenDate;
                if (user.lastSeen && typeof user.lastSeen.toDate === 'function') {
                    lastSeenDate = user.lastSeen.toDate();
                } else if (user.lastSeen instanceof Date) {
                    lastSeenDate = user.lastSeen;
                } else if (typeof user.lastSeen === 'number') {
                    lastSeenDate = new Date(user.lastSeen);
                } else {
                    return false;
                }

                const diffSeconds = (now - lastSeenDate) / 1000;
                // Increased threshold to 5 minutes (300s) to prevent flickering
                return diffSeconds < 300;
            });
            setActiveUsers(online);
        };

        checkOnlineStatus(); // Run immediately on data change
        const interval = setInterval(checkOnlineStatus, 10000); // Re-eval every 10s

        return () => clearInterval(interval);
    }, [rawUsers]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const userInitial = currentUser?.email ? currentUser.email[0].toUpperCase() : 'U';
    const userName = currentUser?.displayName || (currentUser?.email ? currentUser.email.split('@')[0] : 'User');

    const displayUsers = activeUsers.slice(0, 5); // Limit to 5 for UI space
    const remainingCount = activeUsers.length > 5 ? activeUsers.length - 5 : 0;

    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const inviteInputRef = useRef(null);

    // Focus input when modal opens
    useEffect(() => {
        if (showInviteModal && inviteInputRef.current) {
            inviteInputRef.current.focus();
        }
    }, [showInviteModal]);

    const handleSendInvite = (e) => {
        e.preventDefault();
        if (inviteEmail && onInvite) {
            onInvite(inviteEmail);
            setShowInviteModal(false);
            setInviteEmail('');
        }
    };

    return (
        <header className="header">
            <div className="header-top">
                <div className="logo">
                    <div className="logo-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                    <span className="logo-text">Taskly</span>
                </div>

                <div className="header-actions" ref={dropdownRef}>
                    <button
                        onClick={toggleTheme}
                        className="theme-toggle-btn"
                        id="tour-theme-toggle"
                        title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    >
                        {isDarkMode ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="5"></circle>
                                <line x1="12" y1="1" x2="12" y2="3"></line>
                                <line x1="12" y1="21" x2="12" y2="23"></line>
                                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                                <line x1="1" y1="12" x2="3" y2="12"></line>
                                <line x1="21" y1="12" x2="23" y2="12"></line>
                                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                            </svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                            </svg>
                        )}
                    </button>
                    <button
                        className="user-avatar-btn"
                        onClick={() => setShowDropdown(!showDropdown)}
                        title={userName}
                    >
                        {userInitial}
                    </button>

                    {showDropdown && (
                        <div className="dropdown-menu">
                            <div className="dropdown-header">
                                <span className="dropdown-email">{userName}</span>
                                <span style={{ fontSize: '0.7rem', color: '#9ca3af', display: 'block' }}>v1.3</span>
                            </div>
                            <div className="dropdown-divider"></div>
                            <button onClick={initiateDelete} className="dropdown-item delete-item">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 6h18"></path>
                                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                </svg>
                                Delete Account
                            </button>
                            <button onClick={handleLogout} className="dropdown-item logout-item">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                    <polyline points="16 17 21 12 16 7"></polyline>
                                    <line x1="21" y1="12" x2="9" y2="12"></line>
                                </svg>
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="header-bottom">
                <div className="avatars-section">
                    <div className="avatars">
                        {displayUsers.map((user) => (
                            <div
                                key={user.uid}
                                className="avatar"
                                style={{ backgroundColor: '#059669' }} // You could hash email to get unique colors
                                title={user.email}
                            >
                                {user.email ? user.email[0].toUpperCase() : '?'}
                            </div>
                        ))}
                        {remainingCount > 0 && (
                            <div className="avatar remaining-count">+{remainingCount}</div>
                        )}
                        <button
                            className="avatar add-member-btn"
                            id="tour-invite-btn"
                            onClick={() => setShowInviteModal(true)}
                            title="Invite Member"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                        </button>
                    </div>
                    <span className="online-status">
                        {activeUsers.length > 0 ? `${activeUsers.length} online` : 'Offline'}
                    </span>
                </div>
                <div className="task-summary">
                    <strong>{completedCount}</strong> / {taskCount} tasks
                </div>
            </div>

            {/* Invite Modal */}
            {showInviteModal && (
                <div className="modal-overlay">
                    <form className="modal-content" onSubmit={handleSendInvite}>
                        <h3 className="modal-title">Invite Member</h3>
                        <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            Enter the email address of the person you'd like to collaborate with.
                        </p>
                        <input
                            ref={inviteInputRef}
                            className="modal-input"
                            type="email"
                            placeholder="user@example.com"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            required
                        />
                        <div className="modal-actions">
                            <button
                                type="button"
                                className="modal-btn modal-btn-cancel"
                                onClick={() => {
                                    setShowInviteModal(false);
                                    setInviteEmail('');
                                }}
                            >
                                Cancel
                            </button>
                            <button type="submit" className="modal-btn modal-btn-confirm">
                                Send Invite
                            </button>
                        </div>
                    </form>
                </div>
            )}
            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3 className="modal-title" style={{ color: '#dc2626' }}>Delete Account?</h3>
                        <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
                            Are you sure you want to delete your account? This action cannot be undone and you will lose all your lists.
                        </p>
                        <div className="modal-actions">
                            <button
                                className="modal-btn modal-btn-cancel"
                                onClick={() => setShowDeleteModal(false)}
                                disabled={isDeleting}
                            >
                                Cancel
                            </button>
                            <button
                                className="modal-btn"
                                style={{ backgroundColor: '#dc2626', color: 'white' }}
                                onClick={confirmDelete}
                                disabled={isDeleting}
                            >
                                {isDeleting ? 'Deleting...' : 'Yes, Delete My Account'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}

export default Header;
