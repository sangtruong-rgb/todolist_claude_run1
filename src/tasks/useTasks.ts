// The task list state for the screen: loads the saved tasks once, applies the rules,
// saves after every change and reports whether the browser refuses to save.
import { useState } from 'react'
import { loadTasks, saveTasks } from './taskStorage'
import {
  addTask as addTaskToList,
  clearDoneTasks as clearDoneTasksFromList,
  deleteTask as deleteTaskFromList,
  orderTasks,
  renameTask as renameTaskInList,
  restoreTasks as restoreTasksToList,
  toggleTask as toggleTaskInList,
} from './tasks'
import type { DeletedTask, Task } from './tasks'

export type TasksState = {
  tasks: Task[]
  storageBlocked: boolean
  addTask: (title: string) => boolean
  toggleTask: (id: string) => void
  renameTask: (id: string, title: string) => boolean
  deleteTask: (id: string) => void
  clearDoneTasks: () => void
  lastDeletedTask: Task | null
  lastClearedDoneTasks: Task[] | null
  undoDelete: () => void
  forgetDeletedTask: () => void
}

// The one deletion that can still be undone: a single task, or every finished task cleared at once.
type RememberedDeletion = { deleted: DeletedTask[]; clearedDone: boolean }

/** Tasks in display order, with add, rename, toggle, delete, clear-finished and undo of the last deletion that save the whole list each time. */
export function useTasks(): TasksState {
  const [initial] = useState(loadTasks)
  const [tasksInCreationOrder, setTasksInCreationOrder] = useState(initial.tasks)
  const [storageBlocked, setStorageBlocked] = useState(!initial.canSave)

  const [lastDeletion, setLastDeletion] = useState<RememberedDeletion | null>(null)

  function replaceTasks(next: Task[]) {
    setTasksInCreationOrder(next)
    setStorageBlocked(!saveTasks(next))
  }

  function addTask(title: string): boolean {
    const next = addTaskToList(tasksInCreationOrder, title)
    if (next === null) return false
    replaceTasks(next)
    return true
  }

  function toggleTask(id: string) {
    replaceTasks(toggleTaskInList(tasksInCreationOrder, id))
  }

  function renameTask(id: string, title: string): boolean {
    const next = renameTaskInList(tasksInCreationOrder, id, title)
    if (next === null) return false
    replaceTasks(next)
    return true
  }

  function deleteTask(id: string) {
    const result = deleteTaskFromList(tasksInCreationOrder, id)
    if (result === null) return
    replaceTasks(result.tasks)
    setLastDeletion({ deleted: [result.deleted], clearedDone: false })
  }

  function clearDoneTasks() {
    const result = clearDoneTasksFromList(tasksInCreationOrder)
    if (result === null) return
    replaceTasks(result.tasks)
    setLastDeletion({ deleted: result.deleted, clearedDone: true })
  }

  function undoDelete() {
    if (lastDeletion === null) return
    replaceTasks(restoreTasksToList(tasksInCreationOrder, lastDeletion.deleted))
    setLastDeletion(null)
  }

  function forgetDeletedTask() {
    setLastDeletion(null)
  }

  return {
    tasks: orderTasks(tasksInCreationOrder),
    storageBlocked,
    addTask,
    toggleTask,
    renameTask,
    deleteTask,
    clearDoneTasks,
    lastDeletedTask:
      lastDeletion && !lastDeletion.clearedDone ? lastDeletion.deleted[0]!.task : null,
    lastClearedDoneTasks: lastDeletion?.clearedDone
      ? lastDeletion.deleted.map((entry) => entry.task)
      : null,
    undoDelete,
    forgetDeletedTask,
  }
}
