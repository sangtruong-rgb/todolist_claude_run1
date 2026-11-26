// The task rules: adding, renaming, toggling, deleting, restoring and the display order. Pure, no browser access.
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

/** A task taken out of the list and the index it had in the creation-order list. */
export type DeletedTask = { task: Task; index: number }

/** Gives the task a new trimmed title, or returns null when the title is blank; an unknown id changes nothing. */
export function renameTask(tasks: readonly Task[], id: string, title: string): Task[] | null {
  const trimmedTitle = title.trim()
  if (trimmedTitle === '') return null
  return tasks.map((task) => (task.id === id ? { ...task, title: trimmedTitle } : task))
}

/** Takes the task out of the list and remembers its place so it can be restored; null for an unknown id. */
export function deleteTask(
  tasks: readonly Task[],
  id: string,
): { tasks: Task[]; deleted: DeletedTask } | null {
  const index = tasks.findIndex((task) => task.id === id)
  const task = tasks[index]
  if (task === undefined) return null
  return { tasks: tasks.filter((_, position) => position !== index), deleted: { task, index } }
}

/** Puts a deleted task back at its old index in creation order, or at the end when the list is now shorter. */
export function restoreTask(tasks: readonly Task[], deleted: DeletedTask): Task[] {
  return [...tasks.slice(0, deleted.index), deleted.task, ...tasks.slice(deleted.index)]
}

/** Takes every finished task out of the list and remembers their places; null when none is finished. */
export function clearDoneTasks(
  tasks: readonly Task[],
): { tasks: Task[]; deleted: DeletedTask[] } | null {
  const deleted = tasks.flatMap((task, index) => (task.done ? [{ task, index }] : []))
  if (deleted.length === 0) return null
  return { tasks: tasks.filter((task) => !task.done), deleted }
}

/** Puts every deleted task back, in ascending index order, each at its old index or at the end when the list is shorter. */
export function restoreTasks(tasks: readonly Task[], deleted: readonly DeletedTask[]): Task[] {
  return [...deleted]
    .sort((first, second) => first.index - second.index)
    .reduce<Task[]>((list, entry) => restoreTask(list, entry), [...tasks])
}

/** Display order (C6): unfinished tasks above finished ones, each group in creation order. */
export function orderTasks(tasks: readonly Task[]): Task[] {
  return [...tasks.filter((task) => !task.done), ...tasks.filter((task) => task.done)]
}
