import './App.css'
import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import AddTaskForm from './components/AddTaskForm'
import TaskList from './components/TaskList'
import UndoToast from './components/UndoToast'
import { useTasks } from './tasks/useTasks'

/** The one screen: heading, storage warning, add form and the task list (or the empty page). */
function App() {
  const {
    tasks,
    storageBlocked,
    addTask,
    toggleTask,
    renameTask,
    deleteTask,
    lastDeletedTask,
    undoDelete,
    forgetDeletedTask,
  } = useTasks()
  const addFieldRef = useRef<HTMLInputElement>(null)
  const [deletedByKeyboard, setDeletedByKeyboard] = useState(false)

  function deleteTaskAndNote(id: string, byKeyboard: boolean) {
    setDeletedByKeyboard(byKeyboard)
    deleteTask(id)
  }

  function restoreDeletedTask() {
    if (lastDeletedTask === null) return
    const restoredId = lastDeletedTask.id
    flushSync(undoDelete)
    const box = Array.from(document.querySelectorAll<HTMLInputElement>('input[data-task-id]')).find(
      (candidate) => candidate.dataset.taskId === restoredId,
    )
    ;(box ?? addFieldRef.current)?.focus()
  }
  return (
    <main className="sheet">
      <h1>Việc của tôi</h1>
      {storageBlocked && (
        <p className="storage-warning" role="status">
          Trình duyệt đang chặn lưu dữ liệu. Việc bạn thêm sẽ mất khi đóng trang.
        </p>
      )}
      <AddTaskForm onAdd={addTask} fieldRef={addFieldRef} />
      {tasks.length > 0 ? (
        <TaskList
          tasks={tasks}
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
      {lastDeletedTask !== null && (
        <UndoToast
          key={lastDeletedTask.id}
          message={'Đã xoá “' + lastDeletedTask.title + '”'}
          autoFocusUndo={deletedByKeyboard}
          onUndo={restoreDeletedTask}
          onExpire={forgetDeletedTask}
        />
      )}
    </main>
  )
}

export default App
