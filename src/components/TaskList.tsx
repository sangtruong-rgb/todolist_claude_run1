import './TaskList.css'
import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import type { Task } from '../tasks/tasks'
import { filterTasks, type HeldTask, type TaskFilter } from '../tasks/taskFilter'
import TaskItem from './TaskItem'

// How long a task just ticked under "Chưa xong" keeps its row; mirrors `--motion` in tokens.css.
const TICK_MOTION_MS = 200

type TaskListProps = {
  tasks: Task[]
  filter: TaskFilter
  whenNoneShown: ReactNode
  onToggle: (id: string) => void
  onRename: (id: string, title: string) => boolean
  onDelete: (id: string, byKeyboard: boolean) => void
  onNoRowToFocus: () => void
}

function motionIsOn(): boolean {
  return (
    typeof window.matchMedia !== 'function' ||
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * The tasks the filter shows, in the order given (`tasks` is every task in display order), or
 * `whenNoneShown` when it shows none. Remembers the task just marked finished (so only it
 * animates, and under "Chưa xong" keeps its row until the tick is drawn), the one task being
 * edited, and puts keyboard focus where a row's change took it away.
 */
function TaskList({
  tasks,
  filter,
  whenNoneShown,
  onToggle,
  onRename,
  onDelete,
  onNoRowToFocus,
}: TaskListProps) {
  const [justDoneId, setJustDoneId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [held, setHeld] = useState<HeldTask | null>(null)
  const rows = useRef(new Map<string, HTMLLIElement>())
  const shown = filterTasks(tasks, filter, held)

  // Forget what points at a row that is no longer shown (hidden, cleared or deleted).
  if (editingId !== null && !shown.some((task) => task.id === editingId)) setEditingId(null)
  if (justDoneId !== null && !shown.some((task) => task.id === justDoneId)) setJustDoneId(null)
  if (
    held !== null &&
    !(filter === 'active' && shown.some((task) => task.id === held.id && task.done))
  ) {
    setHeld(null)
  }

  const releaseHeldRow = useEffectEvent(() => {
    if (held === null) return
    const nextId = rowToFocus(held.id)
    flushSync(() => setHeld(null))
    focusAfterLeaving(held.id, nextId, 'input[data-task-id]')
  })

  useEffect(() => {
    if (held === null) return
    const timer = setTimeout(releaseHeldRow, TICK_MOTION_MS)
    return () => clearTimeout(timer)
  }, [held])

  function toggle(task: Task) {
    const nextId = rowToFocus(task.id)
    const finishing = !task.done
    const holdRow = filter === 'active' && finishing && motionIsOn()
    const index = filterTasks(tasks, 'active').findIndex((other) => other.id === task.id)
    setJustDoneId(finishing ? task.id : null)
    flushSync(() => {
      setHeld(holdRow ? { id: task.id, index } : null)
      onToggle(task.id)
    })
    focusAfterLeaving(task.id, nextId, 'input[data-task-id]')
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

  // Next shown row below that is not being edited, else the nearest one above.
  function rowToFocus(id: string): string | null {
    const candidates = shown.filter((task) => task.id === id || task.id !== editingId)
    const at = candidates.findIndex((task) => task.id === id)
    return (candidates[at + 1] ?? candidates[at - 1])?.id ?? null
  }

  // Focus the row `id` when it is still shown (a moved node loses focus), else its neighbour.
  function focusAfterLeaving(id: string, nextId: string | null, selector: string) {
    const target = rows.current.get(id) ?? (nextId === null ? null : rows.current.get(nextId))
    const control = target?.querySelector<HTMLElement>(selector)
    if (control) control.focus()
    else onNoRowToFocus()
  }

  function remove(id: string, byKeyboard: boolean) {
    const nextId = rowToFocus(id)
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

  if (shown.length === 0) return whenNoneShown
  return (
    <ul className="task-list">
      {shown.map((task) => (
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
