// The task list state for the screen: loads the saved tasks once, applies the rules,
// saves after every change and reports whether the browser refuses to save.
import { useState } from 'react'
import { loadTasks, saveTasks } from './taskStorage'
import { addTask as addTaskToList, orderTasks, toggleTask as toggleTaskInList } from './tasks'
import type { Task } from './tasks'

export type TasksState = {
  tasks: Task[]
  storageBlocked: boolean
  addTask: (title: string) => boolean
  toggleTask: (id: string) => void
}

/** Tasks in display order, with add and toggle that save the whole list each time. */
export function useTasks(): TasksState {
  const [initial] = useState(loadTasks)
  const [tasksInCreationOrder, setTasksInCreationOrder] = useState(initial.tasks)
  const [storageBlocked, setStorageBlocked] = useState(!initial.canSave)

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

  return { tasks: orderTasks(tasksInCreationOrder), storageBlocked, addTask, toggleTask }
}
