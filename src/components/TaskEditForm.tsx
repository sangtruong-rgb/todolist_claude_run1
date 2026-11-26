import './TaskEditForm.css'
import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent, KeyboardEvent } from 'react'
import { MAX_TASK_TITLE_LENGTH } from '../tasks/tasks'

type TaskEditFormProps = {
  title: string
  onSave: (title: string) => boolean
  onCancel: () => void
}

const ERROR_ID = 'edit-task-error'

/** The form that replaces a row while its name is edited; Escape anywhere on the page cancels. */
function TaskEditForm({ title, onSave, onCancel }: TaskEditFormProps) {
  const [text, setText] = useState(title)
  const [showError, setShowError] = useState(false)

  useEffect(() => {
    function cancelOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', cancelOnEscape)
    return () => document.removeEventListener('keydown', cancelOnEscape)
  }, [onCancel])

  function submit(form: HTMLFormElement) {
    const saved = onSave(text)
    setShowError(!saved)
    if (!saved) form.querySelector('input')?.focus()
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    submit(event.currentTarget)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return
    if (event.nativeEvent.isComposing || event.keyCode === 229) return
    event.preventDefault()
    if (event.currentTarget.form) submit(event.currentTarget.form)
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.value.slice(0, MAX_TASK_TITLE_LENGTH)
    setText(next)
    if (next.trim() !== '') setShowError(false)
  }

  return (
    <form className="edit-task" noValidate onSubmit={handleSubmit}>
      <label className="edit-task-label">
        Tên việc
        <input
          className="edit-task-field"
          type="text"
          autoFocus
          autoComplete="off"
          maxLength={MAX_TASK_TITLE_LENGTH}
          value={text}
          aria-invalid={showError ? true : undefined}
          aria-describedby={showError ? ERROR_ID : undefined}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
      </label>
      <div className="edit-task-buttons">
        <button className="edit-task-save" type="submit">
          Lưu
        </button>
        <button className="edit-task-cancel" type="button" onClick={onCancel}>
          Huỷ
        </button>
      </div>
      {showError && (
        <p id={ERROR_ID} className="edit-task-error" role="alert">
          Hãy nhập tên việc.
        </p>
      )}
    </form>
  )
}

export default TaskEditForm
