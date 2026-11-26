import './TaskItem.css'
import { flushSync } from 'react-dom'
import type { ChangeEvent, MouseEvent } from 'react'
import type { Task } from '../tasks/tasks'
import TaskEditForm from './TaskEditForm'

type TaskItemProps = {
  task: Task
  justDone: boolean
  editing: boolean
  rowRef: (row: HTMLLIElement | null) => void
  onToggle: () => void
  onEdit: () => void
  onSave: (title: string) => boolean
  onCancel: () => void
  onDelete: (byKeyboard: boolean) => void
}

/** One task row: tick box, title, Sửa and Xoá; while `editing` it holds the edit form instead. */
function TaskItem({
  task,
  justDone,
  editing,
  rowRef,
  onToggle,
  onEdit,
  onSave,
  onCancel,
  onDelete,
}: TaskItemProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    // The row moves to its new place in the list, and a moved node loses focus: put it back.
    const box = event.currentTarget
    flushSync(onToggle)
    box.focus()
  }

  function handleDelete(event: MouseEvent<HTMLButtonElement>) {
    // A click with detail 0 comes from Enter or Space, not from a mouse or a finger.
    onDelete(event.detail === 0)
  }

  if (editing) {
    return (
      <li ref={rowRef} className="task-item is-editing">
        <TaskEditForm title={task.title} onSave={onSave} onCancel={onCancel} />
      </li>
    )
  }

  const classes = ['task-item', task.done && 'is-done', justDone && 'is-just-done']
  return (
    <li ref={rowRef} className={classes.filter(Boolean).join(' ')}>
      <span className="task-box">
        <input
          type="checkbox"
          checked={task.done}
          data-task-id={task.id}
          aria-label={'Đã xong: ' + task.title}
          onChange={handleChange}
        />
        <svg viewBox="0 0 22 22" aria-hidden="true" focusable="false">
          <path d="M6 11.5l3.5 3.5L16 8" pathLength={1} />
        </svg>
      </span>
      <span className="task-title">{task.title}</span>
      <span className="task-actions">
        <button
          type="button"
          className="task-action task-edit"
          aria-label={'Sửa: ' + task.title}
          onClick={onEdit}
        >
          Sửa
        </button>
        <button
          type="button"
          className="task-action task-delete"
          aria-label={'Xoá: ' + task.title}
          onClick={handleDelete}
        >
          Xoá
        </button>
      </span>
    </li>
  )
}

export default TaskItem
