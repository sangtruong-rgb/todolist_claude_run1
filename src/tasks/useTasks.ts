// The task list state for the screen: loads the saved tasks once, applies the rules,
// saves after every change and reports whether the browser refuses to save.
import { useState } from 'react'
import { loadTasks, saveTasks } from './taskStorage'
import {
  addTask as addTaskToList,
  deleteTask as deleteTaskFromList,
  orderTasks,
  renameTask as renameTaskInList,
  restoreTask as restoreTaskToList,
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
  lastDeletedTask: Task | null
  undoDelete: () => void
  forgetDeletedTask: () => void
}

/** Tasks in display order, with add, rename, toggle, delete and undo of the last delete that save the whole list each time. */
export function useTasks(): TasksState {
  const [initial] = useState(loadTasks)
  const [tasksInCreationOrder, setTasksInCreationOrder] = useState(initial.tasks)
  const [storageBlocked, setStorageBlocked] = useState(!initial.canSave)

  const [lastDeletion, setLastDeletion] = useState<DeletedTask | null>(null)

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
    setLastDeletion(result.deleted)
  }

  function undoDelete() {
    if (lastDeletion === null) return
    replaceTasks(restoreTaskToList(tasksInCreationOrder, lastDeletion))
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
    lastDeletedTask: lastDeletion?.task ?? null,
    undoDelete,
    forgetDeletedTask,
  }
}
