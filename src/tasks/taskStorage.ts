// The only code that touches localStorage: saves and loads the task list and tells
// the caller whether the browser refuses to save, so the screen can warn the person.
import type { Task } from './tasks'

/** The localStorage entry that holds the whole task list. */
export const TASKS_STORAGE_KEY = 'tasks'

const STORAGE_PROBE_KEY = 'storageProbe'

export type LoadedTasks = { tasks: Task[]; canSave: boolean }

function isTask(value: unknown): value is Task {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.done === 'boolean'
  )
}

function readSavedTasks(): Task[] {
  try {
    const text = localStorage.getItem(TASKS_STORAGE_KEY)
    if (text === null) return []
    const parsed: unknown = JSON.parse(text)
    if (!Array.isArray(parsed) || !parsed.every(isTask)) return []
    return parsed.map(({ id, title, done }) => ({ id, title, done }))
  } catch {
    // Damaged or unreadable saved data counts as no saved tasks (recovery is out of scope).
    return []
  }
}

function browserAcceptsWrites(): boolean {
  try {
    localStorage.setItem(STORAGE_PROBE_KEY, '1')
    localStorage.removeItem(STORAGE_PROBE_KEY)
    return true
  } catch {
    return false
  }
}

/** Stores the whole list; returns false (never throws) when the browser refuses the write. */
export function saveTasks(tasks: readonly Task[]): boolean {
  try {
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks))
    return true
  } catch {
    // The refusal is reported to the caller through the return value.
    return false
  }
}

/** Reads the last saved list ([] when missing or unreadable) and whether saving is possible. */
export function loadTasks(): LoadedTasks {
  return { tasks: readSavedTasks(), canSave: browserAcceptsWrites() }
}
