import './TaskItem.css'
import { flushSync } from 'react-dom'
import type { ChangeEvent } from 'react'
import type { Task } from '../tasks/tasks'

type TaskItemProps = { task: Task; justDone: boolean; onToggle: () => void }

/** One task row: tick box and title. `justDone` plays the 200 ms tick and fade once. */
function TaskItem({ task, justDone, onToggle }: TaskItemProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    // The row moves to its new place in the list, and a moved node loses focus: put it back.
    const box = event.currentTarget
    flushSync(onToggle)
    box.focus()
  }

  const classes = ['task-item', task.done && 'is-done', justDone && 'is-just-done']
  return (
    <li className={classes.filter(Boolean).join(' ')}>
      <span className="task-box">
        <input
          type="checkbox"
          checked={task.done}
          aria-label={'Đã xong: ' + task.title}
          onChange={handleChange}
        />
        <svg viewBox="0 0 22 22" aria-hidden="true" focusable="false">
          <path d="M6 11.5l3.5 3.5L16 8" pathLength={1} />
        </svg>
      </span>
      <span className="task-title">{task.title}</span>
    </li>
  )
}

export default TaskItem
