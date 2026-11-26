import './AddTaskForm.css'
import { useState } from 'react'
import type { ChangeEvent, FormEvent, KeyboardEvent, RefObject } from 'react'
import { MAX_TASK_TITLE_LENGTH } from '../tasks/tasks'

type AddTaskFormProps = {
  onAdd: (title: string) => boolean
  fieldRef: RefObject<HTMLInputElement | null>
}

const ERROR_ID = 'new-task-error'

/** Field and button that add a task; shows the empty-name error and keeps the cursor in the field. */
function AddTaskForm({ onAdd, fieldRef }: AddTaskFormProps) {
  const [text, setText] = useState('')
  const [showError, setShowError] = useState(false)

  function submit() {
    const added = onAdd(text)
    if (added) setText('')
    setShowError(!added)
    fieldRef.current?.focus()
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    submit()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return
    if (event.nativeEvent.isComposing || event.keyCode === 229) return
    event.preventDefault()
    submit()
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.value.slice(0, MAX_TASK_TITLE_LENGTH)
    setText(next)
    if (next.trim() !== '') setShowError(false)
  }

  return (
    <form className="add-task" noValidate onSubmit={handleSubmit}>
      <input
        ref={fieldRef}
        className="add-task-field"
        type="text"
        aria-label="Việc mới"
        placeholder="Thêm việc mới…"
        maxLength={MAX_TASK_TITLE_LENGTH}
        autoComplete="off"
        value={text}
        aria-invalid={showError ? true : undefined}
        aria-describedby={showError ? ERROR_ID : undefined}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      <button className="add-task-button" type="submit">
        Thêm
      </button>
      {showError && (
        <p id={ERROR_ID} className="add-task-error" role="alert">
          Hãy nhập tên việc.
        </p>
      )}
    </form>
  )
}

export default AddTaskForm
