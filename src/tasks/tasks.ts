// The task rules: adding, toggling and the display order. Pure, no browser access.
// A task list is always kept in creation order; the display order is derived from it.

/** One item of the todo list. */
export type Task = { id: string; title: string; done: boolean }

/** Longest title the input field accepts; the rules below do not shorten titles. */
export const MAX_TASK_TITLE_LENGTH = 200

/** Appends a new unfinished task with the trimmed title, or returns null when the title is blank. */
export function addTask(tasks: readonly Task[], title: string): Task[] | null {
  const trimmedTitle = title.trim()
  if (trimmedTitle === '') return null
  return [...tasks, { id: crypto.randomUUID(), title: trimmedTitle, done: false }]
}

/** Flips the done state of the task with this id; an unknown id changes nothing. */
export function toggleTask(tasks: readonly Task[], id: string): Task[] {
  return tasks.map((task) => (task.id === id ? { ...task, done: !task.done } : task))
}

/** Display order (C6): unfinished tasks above finished ones, each group in creation order. */
export function orderTasks(tasks: readonly Task[]): Task[] {
  return [...tasks.filter((task) => !task.done), ...tasks.filter((task) => task.done)]
}
