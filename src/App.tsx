import './App.css'
import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import AddTaskForm from './components/AddTaskForm'
import TaskFilters from './components/TaskFilters'
import TaskList from './components/TaskList'
import UndoToast from './components/UndoToast'
import type { Task } from './tasks/tasks'
import type { TaskFilter } from './tasks/taskFilter'
import { useTasks } from './tasks/useTasks'

const FILTER_EMPTY_MESSAGES: Record<TaskFilter, string> = {
  all: '',
  active: 'Không còn việc nào chưa xong.',
  done: 'Chưa có việc nào xong.',
}

function deletionToastKey(single: Task | null, cleared: Task[] | null): string {
  if (single !== null) return single.id
  return 'clear:' + (cleared ?? []).map((task) => task.id).join(',')
}

/**
 * The one screen: heading, count of unfinished tasks, storage warning, add form, filter buttons,
 * the task list (or the message for an empty filter or the empty page) and the clear button.
 */
function App() {
  const {
    tasks,
    storageBlocked,
    addTask,
    toggleTask,
    renameTask,
    deleteTask,
    clearDoneTasks,
    lastDeletedTask,
    lastClearedDoneTasks,
    undoDelete,
    forgetDeletedTask,
  } = useTasks()
  const addFieldRef = useRef<HTMLInputElement>(null)
  const [filter, setFilter] = useState<TaskFilter>('all')
  const [deletedByKeyboard, setDeletedByKeyboard] = useState(false)

  function deleteTaskAndNote(id: string, byKeyboard: boolean) {
    setDeletedByKeyboard(byKeyboard)
    deleteTask(id)
  }

  function addTaskAndShowIt(title: string): boolean {
    const added = addTask(title)
    if (added && filter === 'done') setFilter('all')
    return added
  }

  function clearDone() {
    setDeletedByKeyboard(false)
    flushSync(clearDoneTasks)
    addFieldRef.current?.focus()
  }

  function restoreDeletedTask() {
    const restored = lastDeletedTask ? [lastDeletedTask] : (lastClearedDoneTasks ?? [])
    const restoredIds = new Set(restored.map((task) => task.id))
    flushSync(undoDelete)
    const box = Array.from(document.querySelectorAll<HTMLInputElement>('input[data-task-id]')).find(
      (candidate) => restoredIds.has(candidate.dataset.taskId ?? ''),
    )
    ;(box ?? addFieldRef.current)?.focus()
  }

  const unfinishedCount = tasks.filter((task) => !task.done).length
  const finishedCount = tasks.length - unfinishedCount
  const toastMessage = lastDeletedTask
    ? 'Đã xoá “' + lastDeletedTask.title + '”'
    : 'Đã xoá ' + (lastClearedDoneTasks?.length ?? 0) + ' việc đã xong'

  return (
    <main className="sheet">
      <h1>Việc của tôi</h1>
      <p className="task-count">{unfinishedCount} việc chưa xong</p>
      {storageBlocked && (
        <p className="storage-warning" role="status">
          Trình duyệt đang chặn lưu dữ liệu. Việc bạn thêm sẽ mất khi đóng trang.
        </p>
      )}
      <AddTaskForm onAdd={addTaskAndShowIt} fieldRef={addFieldRef} />
      <TaskFilters filter={filter} onChoose={setFilter} />
      {tasks.length > 0 ? (
        <TaskList
          tasks={tasks}
          filter={filter}
          whenNoneShown={
            <div className="empty-page">
              <p className="empty-page-title">{FILTER_EMPTY_MESSAGES[filter]}</p>
            </div>
          }
          onToggle={toggleTask}
          onRename={renameTask}
          onDelete={deleteTaskAndNote}
          onNoRowToFocus={() => addFieldRef.current?.focus()}
        />
      ) : (
        <div className="empty-page">
          <p className="empty-page-title">Trang này còn trống.</p>
          <p className="empty-page-hint">Viết việc đầu tiên vào ô phía trên rồi nhấn Thêm.</p>
        </div>
      )}
      {finishedCount > 0 && (
        <div className="clear-done">
          <button type="button" className="task-action" onClick={clearDone}>
            Xoá việc đã xong ({finishedCount})
          </button>
        </div>
      )}
      {(lastDeletedTask !== null || lastClearedDoneTasks !== null) && (
        <UndoToast
          key={deletionToastKey(lastDeletedTask, lastClearedDoneTasks)}
          message={toastMessage}
          autoFocusUndo={lastDeletedTask !== null && deletedByKeyboard}
          onUndo={restoreDeletedTask}
          onExpire={forgetDeletedTask}
        />
      )}
    </main>
  )
}

export default App
