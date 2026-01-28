import { useState, useEffect } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import {
    collection,
    query,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    setDoc,
    orderBy,
    getDoc,
    where,
    arrayUnion,
    getDocs,
    serverTimestamp
} from 'firebase/firestore';
import { driver } from "driver.js";
// driver.css imported in main.jsx
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

import Header from './Header';
import TaskInput from './TaskInput';
import TaskFilters from './TaskFilters';
import TaskList from './TaskList';
import ProgressBar from './ProgressBar';
import CategoryFilter from './CategoryFilter';

function Dashboard() {
    const { currentUser } = useAuth();
    const [lists, setLists] = useState([]);
    const [selectedList, setSelectedList] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [filter, setFilter] = useState('all');
    const [errorMessage, setErrorMessage] = useState('');
    const [loading, setLoading] = useState(true);

    // Fetch Lists
    useEffect(() => {
        if (!currentUser) return;

        const qSafe = query(
            collection(db, 'lists'),
            where('members', 'array-contains', currentUser.uid)
        );

        const unsubscribe = onSnapshot(qSafe, async (snapshot) => {
            if (snapshot.empty) {
                try {
                    const newListRef = doc(collection(db, 'lists'));
                    await setDoc(newListRef, {
                        name: 'Personal',
                        members: [currentUser.uid],
                        ownerId: currentUser.uid,
                        ownerEmail: currentUser.email,
                        createdAt: Date.now()
                    });
                } catch (e) {
                    console.error("Error creating default list", e);
                }
            } else {
                const fetchedLists = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                // Sort by createdAt
                fetchedLists.sort((a, b) => a.createdAt - b.createdAt);

                setLists(fetchedLists);

                // Self-Healing: Update missing ownerEmail/ownerName for my lists
                const userName = currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'User');

                fetchedLists.forEach(list => {
                    if (list.ownerId === currentUser.uid) {
                        const needsUpdate = !list.ownerEmail || !list.ownerName;
                        if (needsUpdate) {
                            console.log("Self-healing: Updating owner info for list", list.id);
                            updateDoc(doc(db, 'lists', list.id), {
                                ownerEmail: currentUser.email,
                                ownerName: userName
                            }).catch(e => console.error("Error healing list:", e));
                        }
                    }
                });

                // Select first list if none selected or selected one deleted
                if (!selectedList || !fetchedLists.find(l => l.id === selectedList.id)) {
                    setSelectedList(fetchedLists[0]);
                } else {
                    // Update the selected list object (e.g. name change)
                    const updatedSelected = fetchedLists.find(l => l.id === selectedList.id);
                    if (updatedSelected) setSelectedList(updatedSelected);
                }
            }
        }, (error) => {
            console.error("Error fetching lists:", error);
        });

        return unsubscribe;
    }, [currentUser]);

    const [invites, setInvites] = useState([]);

    // Fetch Incoming Invites
    useEffect(() => {
        if (!currentUser || !currentUser.email) return;

        const q = query(
            collection(db, 'invites'),
            where('toEmail', '==', currentUser.email)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const incoming = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setInvites(incoming);
        }, (error) => {
            console.error("Error fetching invites:", error);
        });
        return unsubscribe;
    }, [currentUser]);

    const [taskRetry, setTaskRetry] = useState(0);

    // Fetch Tasks for Selected List
    useEffect(() => {
        if (!currentUser || !selectedList) {
            setTasks([]);
            return;
        }

        const q = query(collection(db, 'lists', selectedList.id, 'tasks'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const taskData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTasks(taskData);
            setLoading(false);
            // Reset retry count on success
            if (taskRetry > 0) setTaskRetry(0);
        }, (error) => {
            console.error("Error fetching tasks:", error);
            if (error.code === 'permission-denied' && taskRetry < 3) {
                console.log(`Permission error (race condition). Retrying... (${taskRetry + 1}/3)`);
                setTimeout(() => setTaskRetry(prev => prev + 1), 1000);
            }
            setLoading(false);
        });
        return unsubscribe;
    }, [currentUser, selectedList, taskRetry]);

    // Check for Deleted Users (Existence Check)
    const [userExistence, setUserExistence] = useState({});

    useEffect(() => {
        const checkUsers = async () => {
            // Collect Unique IDs
            const uidsToCheck = new Set();

            // From lists (owners)
            lists.forEach(l => {
                if (l.ownerId) uidsToCheck.add(l.ownerId);
            });

            // From tasks (creators)
            tasks.forEach(t => {
                if (t.createdBy) uidsToCheck.add(t.createdBy);
            });

            // Filter out already checked IDs if you want, but for now just check all to be safe/simple
            // or just check ones we don't know about? 
            // Let's re-verify all relevant ones to handle real-time deletions eventually, 
            // though this only runs on tasks/lists modify.

            const uids = Array.from(uidsToCheck);
            if (uids.length === 0) return;

            // Firestore 'in' limit is 10. If we have > 10 distinct authors, we need to batch or loop.
            // For MVP/Demo: we'll just check them one by one or in batches. 
            // Actually, 'documentId()' check is good. 

            const newExistence = { ...userExistence };
            const missingUids = uids.filter(uid => newExistence[uid] === undefined);

            if (missingUids.length === 0) return;

            // Batch fetch missing
            // Since there might be many, let's just do individual getDoc for simplicity in this assistant scope 
            // unless we expect huge volume. `getDocs(query(collection(db, 'users'), where(documentId(), 'in', batch)))` 
            // is better but requires batching logic.

            // Let's use a simple Promise.all with getDoc for the missing ones.

            await Promise.all(missingUids.map(async (uid) => {
                try {
                    const snap = await getDoc(doc(db, 'users', uid));
                    newExistence[uid] = snap.exists();
                } catch (e) {
                    console.error("Error checking user existence:", uid, e);
                    newExistence[uid] = false; // Assume missing on error? Or keep undefined? False is safer for "Deleted"
                }
            }));

            setUserExistence(newExistence);
        };

        checkUsers();
    }, [tasks, lists]);

    const inviteUser = async (email) => {
        console.log("inviteUser called with:", email, selectedList);

        if (!email) return;
        if (!selectedList) {
            alert("Error: No list selected. Cannot invite.");
            return;
        }

        try {
            const q = query(collection(db, 'users'), where('email', '==', email));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                const msg = "User not found! They must have signed in to this app at least once.";
                setErrorMessage(msg);
                alert(msg);
                return;
            }

            const targetUser = querySnapshot.docs[0];
            const targetUid = targetUser.id;

            if (selectedList.members.includes(targetUid)) {
                alert("User is already a member.");
                return;
            }

            await addDoc(collection(db, 'invites'), {
                toEmail: email,
                fromEmail: currentUser.email,
                fromUid: currentUser.uid,
                listId: selectedList.id,
                listName: selectedList.name,
                createdAt: Date.now()
            });

            alert(`Invite sent to ${email}! They will see it when they log in.`);

        } catch (error) {
            console.error("Error sending invite:", error);
            setErrorMessage("Failed to send invite.");
            alert("Failed to send invite: " + error.message);
        }
    };

    const acceptInvite = async (invite) => {
        try {
            await updateDoc(doc(db, 'lists', invite.listId), {
                members: arrayUnion(currentUser.uid)
            });

            await deleteDoc(doc(db, 'invites', invite.id));

            alert(`You joined ${invite.listName}!`);

        } catch (error) {
            console.error("Error accepting invite:", error);
            alert("Failed to accept invite. The list might have been deleted.");
        }
    };

    const rejectInvite = async (invite) => {
        try {
            await deleteDoc(doc(db, 'invites', invite.id));
        } catch (error) {
            console.error("Error rejecting invite:", error);
        }
    };

    // Presence Tracking
    useEffect(() => {
        if (!currentUser) return;
        const userRef = doc(db, 'users', currentUser.uid);
        setDoc(userRef, {
            email: currentUser.email,
            lastSeen: serverTimestamp(),
            status: 'online'
        }, { merge: true });
    }, [currentUser]);

    // Onboarding Tour
    useEffect(() => {
        if (!currentUser) return;

        const checkTour = async () => {
            const userRef = doc(db, 'users', currentUser.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists() || !userSnap.data().hasSeenTour) {
                // Determine if mobile (simplistic check) to adjust position if needed, 
                // but driver.js handles responsive well.

                const driverObj = driver({
                    showProgress: true,
                    steps: [
                        {
                            element: '.header',
                            popover: {
                                title: 'Welcome to Taskly App!',
                                description: 'Let\'s take a quick tour to help you get started.',
                                side: "bottom",
                                align: 'start'
                            }
                        },
                        {
                            element: '#tour-lists-section',
                            popover: {
                                title: 'Your Lists',
                                description: 'Here are all your lists. You can see Personal lists and lists Shared with you.',
                                side: "right",
                                align: 'start'
                            }
                        },
                        {
                            element: '#tour-add-list-btn',
                            popover: {
                                title: 'Create New Lists',
                                description: 'Click here to create a new list for Work, Groceries, or anything else.',
                                side: "bottom",
                                align: 'start'
                            }
                        },
                        {
                            element: '#tour-task-input',
                            popover: {
                                title: 'Add Tasks',
                                description: 'Type your task here and press Enter to add it to the selected list.',
                                side: "bottom",
                                align: 'start'
                            }
                        },
                        {
                            element: '#tour-invite-btn',
                            popover: {
                                title: 'Collaborate',
                                description: 'Invite friends by email to work on this list together!',
                                side: "bottom",
                                align: 'start'
                            }
                        },
                        {
                            element: '#tour-theme-toggle',
                            popover: {
                                title: 'Dark Mode',
                                description: 'Switch between light and dark themes here.',
                                side: "bottom",
                                align: 'start'
                            }
                        }
                    ],
                    onDestroyed: async () => {
                        // Mark as seen when tour is closed or finished
                        await setDoc(doc(db, 'users', currentUser.uid), { hasSeenTour: true }, { merge: true });
                    }
                });

                driverObj.drive();
            }
        };

        // Small delay to ensure UI is mounted
        const timer = setTimeout(() => {
            checkTour();
        }, 1000);

        return () => clearTimeout(timer);
    }, [currentUser]);

    // Dnd Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );
    const handleDragEnd = () => { };

    // --- List Operations ---

    const createList = async (name) => {
        if (!name) return;
        try {
            const userName = currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'User');
            await addDoc(collection(db, 'lists'), {
                name: name,
                members: [currentUser.uid],
                ownerId: currentUser.uid,
                ownerEmail: currentUser.email,
                ownerName: userName,
                createdAt: Date.now()
            });
        } catch (error) {
            console.error("Error creating list:", error);
            setErrorMessage("Failed to create list");
        }
    };

    const renameList = async (listId, newName) => {
        if (!listId || !newName) return;
        try {
            await updateDoc(doc(db, 'lists', listId), { name: newName });
        } catch (error) {
            console.error("Error renaming list:", error);
            setErrorMessage("Failed to rename list");
        }
    };

    const deleteList = async (listId) => {
        if (lists.length <= 1) {
            setErrorMessage("You must have at least one list.");
            setTimeout(() => setErrorMessage(''), 3000);
            return;
        }

        try {
            await deleteDoc(doc(db, 'lists', listId));
        } catch (error) {
            console.error("Error deleting list:", error);
            setErrorMessage("Failed to delete list");
        }
    };

    // --- Task Operations ---

    const addTask = async (text) => {
        if (!selectedList) {
            alert("No list selected!");
            return;
        }
        try {
            const userName = currentUser.displayName || currentUser.email.split('@')[0];
            console.log('Adding task:', text, 'to list:', selectedList); // Debug log
            if (!selectedList.id) {
                console.error("Selected list has no ID:", selectedList);
                alert("Error: Selected list is invalid.");
                return;
            }
            await addDoc(collection(db, 'lists', selectedList.id, 'tasks'), {
                text,
                attributedTo: userName,
                completed: false,
                createdAt: Date.now(),
                createdBy: currentUser.uid
            });
        } catch (error) {
            console.error("Error adding task:", error);
            setErrorMessage("Failed to add task: " + error.message);
            alert("Failed to add task: " + error.message);
        }
    };

    const editTask = async (id, newText) => {
        if (!selectedList) return;
        try {
            await updateDoc(doc(db, 'lists', selectedList.id, 'tasks', id), { text: newText });
        } catch (error) { console.error(error); }
    };

    const toggleTask = async (id) => {
        if (!selectedList) return;
        const task = tasks.find(t => t.id === id);
        if (task) {
            try {
                const newCompleted = !task.completed;
                const updateData = { completed: newCompleted };

                if (newCompleted) {
                    updateData.completedBy = currentUser.uid;
                    updateData.completedByName = currentUser.displayName || currentUser.email.split('@')[0];
                    updateData.completedAt = Date.now();
                } else {
                    updateData.completedBy = null;
                    updateData.completedByName = null;
                    updateData.completedAt = null;
                }

                await updateDoc(doc(db, 'lists', selectedList.id, 'tasks', id), updateData);
            } catch (error) { console.error(error); }
        }
    };

    const deleteTask = async (id) => {
        if (!selectedList) return;
        try {
            await deleteDoc(doc(db, 'lists', selectedList.id, 'tasks', id));
        } catch (error) { console.error(error); }
    };

    const filteredTasks = tasks.filter(task => {
        if (filter === 'active' && task.completed) return false;
        if (filter === 'completed' && !task.completed) return false;
        return true;
    });

    const progress = tasks.length ? Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100) : 0;

    const categoryNames = lists.map(l => l.name);

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="container">
                {invites.length > 0 && (
                    <div className="invites-section" style={{ marginBottom: '1rem' }}>
                        {invites.map(invite => (
                            <div key={invite.id} className="invite-card" style={{
                                backgroundColor: '#f0fdf4',
                                border: '1px solid #86efac',
                                padding: '1rem',
                                borderRadius: '8px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '0.5rem'
                            }}>
                                <span>
                                    <strong>{invite.fromEmail}</strong> invited you to <strong>{invite.listName}</strong>
                                </span>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        onClick={() => acceptInvite(invite)}
                                        style={{
                                            backgroundColor: '#16a34a', color: 'white', border: 'none',
                                            padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer'
                                        }}
                                    >
                                        Accept
                                    </button>
                                    <button
                                        onClick={() => rejectInvite(invite)}
                                        style={{
                                            backgroundColor: '#ef4444', color: 'white', border: 'none',
                                            padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer'
                                        }}
                                    >
                                        Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Aggregate all collaborators across all lists for global presence */}
                {(() => {
                    const allCollaborators = Array.from(new Set(
                        lists.flatMap(list => list.members || [])
                    ));
                    return (
                        <Header
                            taskCount={tasks.length}
                            completedCount={tasks.filter(t => t.completed).length}
                            currentList={selectedList}
                            collaboratorIds={allCollaborators}
                            onInvite={inviteUser}
                        />
                    );
                })()}

                <CategoryFilter
                    categories={lists}
                    currentCategory={selectedList?.name || ''}
                    onSelectCategory={(id) => {
                        const l = lists.find(li => li.id === id);
                        if (l) setSelectedList(l);
                    }}
                    onAddCategory={createList}
                    onRenameCategory={renameList}
                    onDeleteCategory={deleteList}
                    userExistence={userExistence}
                />

                {errorMessage && (
                    <div className="error-message" style={{
                        backgroundColor: '#fee2e2', color: '#b91c1c', padding: '1rem',
                        borderRadius: '12px', marginBottom: '1rem', textAlign: 'center', fontWeight: '500'
                    }}>
                        {errorMessage}
                    </div>
                )}

                <div className="main-content">
                    <TaskInput
                        onAdd={(text) => addTask(text)}
                        categories={[]}
                        defaultCategory={null}
                    />

                    <TaskFilters currentFilter={filter} onFilterChange={setFilter} counts={{
                        all: tasks.length,
                        active: tasks.filter(t => !t.completed).length,
                        completed: tasks.filter(t => t.completed).length
                    }} />

                    <TaskList
                        tasks={filteredTasks}
                        onToggle={toggleTask}
                        onDelete={deleteTask}
                        onEdit={editTask}
                        userExistence={userExistence}
                    />
                    <ProgressBar progress={progress} />
                </div>
            </div>
        </DndContext>
    );
}

export default Dashboard;
