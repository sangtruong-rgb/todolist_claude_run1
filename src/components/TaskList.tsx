import './TaskList.css'
import { useState } from 'react'
import type { Task } from '../tasks/tasks'
import TaskItem from './TaskItem'

type TaskListProps = { tasks: Task[]; onToggle: (id: string) => void }

/** The tasks in the order given; remembers the task just marked finished so only it animates. */
function TaskList({ tasks, onToggle }: TaskListProps) {
  const [justDoneId, setJustDoneId] = useState<string | null>(null)

  function toggle(task: Task) {
    setJustDoneId(task.done ? null : task.id)
    onToggle(task.id)
  }

  return (
    <ul className="task-list">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          justDone={task.id === justDoneId}
          onToggle={() => toggle(task)}
        />
      ))}
    </ul>
  )
}

export default TaskList
