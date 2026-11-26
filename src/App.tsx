import './App.css'
import AddTaskForm from './components/AddTaskForm'
import TaskList from './components/TaskList'
import { useTasks } from './tasks/useTasks'

/** The one screen: heading, storage warning, add form and the task list (or the empty page). */
function App() {
  const { tasks, storageBlocked, addTask, toggleTask } = useTasks()
  return (
    <main className="sheet">
      <h1>Việc của tôi</h1>
      {storageBlocked && (
        <p className="storage-warning" role="status">
          Trình duyệt đang chặn lưu dữ liệu. Việc bạn thêm sẽ mất khi đóng trang.
        </p>
      )}
      <AddTaskForm onAdd={addTask} />
      {tasks.length > 0 ? (
        <TaskList tasks={tasks} onToggle={toggleTask} />
      ) : (
        <div className="empty-page">
          <p className="empty-page-title">Trang này còn trống.</p>
          <p className="empty-page-hint">Viết việc đầu tiên vào ô phía trên rồi nhấn Thêm.</p>
        </div>
      )}
    </main>
  )
}

export default App
