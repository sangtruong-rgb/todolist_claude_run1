import './TaskList.css'
import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import type { Task } from '../tasks/tasks'
import TaskItem from './TaskItem'

type TaskListProps = {
  tasks: Task[]
  onToggle: (id: string) => void
  onRename: (id: string, title: string) => boolean
  onDelete: (id: string, byKeyboard: boolean) => void
  onNoRowToFocus: () => void
}

/**
 * The tasks in the order given. Remembers the task just marked finished (so only it animates)
 * and the one task being edited, and puts keyboard focus back where a row's change took it away.
 */
function TaskList({ tasks, onToggle, onRename, onDelete, onNoRowToFocus }: TaskListProps) {
  const [justDoneId, setJustDoneId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const rows = useRef(new Map<string, HTMLLIElement>())

  function toggle(task: Task) {
    setJustDoneId(task.done ? null : task.id)
    onToggle(task.id)
  }

  function startEditing(id: string) {
    setJustDoneId(null)
    setEditingId(id)
  }

  function focusButton(id: string, selector: string) {
    rows.current.get(id)?.querySelector<HTMLButtonElement>(selector)?.focus()
  }

  function leaveEditing(id: string, rename?: (title: string) => boolean, title = ''): boolean {
    let left = true
    flushSync(() => {
      if (rename) left = rename(title)
      if (left) setEditingId(null)
    })
    if (left) focusButton(id, '.task-edit')
    return left
  }

  // Next row below that shows a Xoá button, else the nearest one above (rows being edited have none).
  function rowToFocusAfterDeleting(id: string): string | null {
    const showing = tasks.filter((task) => task.id === id || task.id !== editingId)
    const at = showing.findIndex((task) => task.id === id)
    return (showing[at + 1] ?? showing[at - 1])?.id ?? null
  }

  function remove(id: string, byKeyboard: boolean) {
    const nextId = rowToFocusAfterDeleting(id)
    const nextButton =
      nextId === null
        ? null
        : rows.current.get(nextId)?.querySelector<HTMLButtonElement>('.task-delete')
    setJustDoneId(null)
    flushSync(() => onDelete(id, byKeyboard))
    if (byKeyboard) return
    if (nextButton) nextButton.focus()
    else onNoRowToFocus()
  }

  return (
    <ul className="task-list">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          justDone={task.id === justDoneId}
          editing={task.id === editingId}
          rowRef={(row) => {
            if (row) rows.current.set(task.id, row)
            else rows.current.delete(task.id)
          }}
          onToggle={() => toggle(task)}
          onEdit={() => startEditing(task.id)}
          onSave={(title) => leaveEditing(task.id, (next) => onRename(task.id, next), title)}
          onCancel={() => leaveEditing(task.id)}
          onDelete={(byKeyboard) => remove(task.id, byKeyboard)}
        />
      ))}
    </ul>
  )
}

export default TaskList
