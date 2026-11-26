import type { TaskFilter } from '../tasks/taskFilter'
import './TaskFilters.css'

type TaskFiltersProps = { filter: TaskFilter; onChoose: (filter: TaskFilter) => void }

const choices: [TaskFilter, string][] = [
  ['all', 'Tất cả'],
  ['active', 'Chưa xong'],
  ['done', 'Đã xong'],
]

/** The three filter buttons under the add field; the chosen one follows the filter prop. */
function TaskFilters({ filter, onChoose }: TaskFiltersProps) {
  return (
    <div className="task-filters" role="group" aria-label="Lọc việc">
      {choices.map(([value, label]) => (
        <button
          key={value}
          type="button"
          aria-pressed={filter === value}
          onClick={() => onChoose(value)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

export default TaskFilters
