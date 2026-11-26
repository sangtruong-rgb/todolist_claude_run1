// Which tasks a filter shows. Pure rules, no browser access.
import type { Task } from './tasks'

/** Which tasks the list shows: all of them, only the unfinished, or only the finished. */
export type TaskFilter = 'all' | 'active' | 'done'

/** A task just marked finished that keeps its row under 'active' while its tick is drawn. */
export type HeldTask = { id: string; index: number }

/**
 * The tasks a filter shows, in the order given. Under 'active', a held finished task keeps
 * its row so the tick can be seen before it leaves.
 */
export function filterTasks(
  tasks: readonly Task[],
  filter: TaskFilter,
  held?: HeldTask | null,
): Task[] {
  if (filter === 'all') return [...tasks]
  if (filter === 'done') return tasks.filter((task) => task.done)
  const unfinished = tasks.filter((task) => !task.done)
  const heldTask = held ? tasks.find((task) => task.id === held.id && task.done) : undefined
  if (!held || !heldTask) return unfinished
  unfinished.splice(Math.max(0, Math.min(held.index, unfinished.length)), 0, heldTask)
  return unfinished
}
