import {
    SortableContext,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import TaskSortableItem from './TaskSortableItem';
import './TaskList.css';

function TaskList({ tasks, onToggle, onDelete, onEdit, userExistence }) {
    if (tasks.length === 0) {
        return <div className="empty-state">No tasks found</div>;
    }

    return (
        <SortableContext
            items={tasks.map(t => t.id)}
            strategy={verticalListSortingStrategy}
        >
            <div className="task-list">
                {tasks.map(task => (
                    <TaskSortableItem
                        key={task.id}
                        task={task}
                        onToggle={() => onToggle(task.id)}
                        onDelete={() => onDelete(task.id)}
                        onEdit={(newText) => onEdit(task.id, newText)}
                        userExistence={userExistence}
                    />
                ))}
            </div>
        </SortableContext>
    );
}

export default TaskList;
