import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { TASKS_STORAGE_KEY } from './tasks/taskStorage'

const WARNING = 'Trình duyệt đang chặn lưu dữ liệu. Việc bạn thêm sẽ mất khi đóng trang.'
const BLANK_ERROR = 'Hãy nhập tên việc.'

type User = ReturnType<typeof userEvent.setup>

function field() {
  return screen.getByRole('textbox', { name: 'Việc mới' })
}

function editField() {
  return screen.getByRole('textbox', { name: 'Tên việc' })
}

function refuseSaving() {
  return vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('refused', 'QuotaExceededError')
  })
}

function taskNames() {
  return screen.queryAllByRole('checkbox').map((box) => box.getAttribute('aria-label'))
}

async function addTasks(user: User, ...titles: string[]) {
  for (const title of titles) {
    await user.type(field(), title)
    await user.click(screen.getByRole('button', { name: 'Thêm' }))
  }
}

function seed(...tasks: { id: string; title: string; done?: boolean }[]) {
  localStorage.setItem(
    TASKS_STORAGE_KEY,
    JSON.stringify(tasks.map((task) => ({ done: false, ...task }))),
  )
}

afterEach(() => vi.restoreAllMocks())

describe('C1 row buttons', () => {
  it('shows Sửa and Xoá on finished and unfinished rows', () => {
    seed({ id: 'a', title: 'A', done: true }, { id: 'b', title: 'B' })
    render(<App />)
    for (const title of ['A', 'B']) {
      expect(screen.getByRole('button', { name: 'Sửa: ' + title })).toHaveTextContent(/^Sửa$/)
      expect(screen.getByRole('button', { name: 'Xoá: ' + title })).toHaveTextContent(/^Xoá$/)
    }
  })

  it('tabs from the tick box to Sửa then Xoá', async () => {
    seed({ id: 'a', title: 'A', done: true }, { id: 'b', title: 'B' })
    const user = userEvent.setup()
    render(<App />)
    screen.getByRole('checkbox', { name: 'Đã xong: B' }).focus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Sửa: B' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Xoá: B' })).toHaveFocus()
  })

  it('has no row buttons on the empty page', () => {
    render(<App />)
    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Thêm' })).toBeInTheDocument()
  })
})

describe('C2 opening edit mode', () => {
  it('replaces the row with a focused field, Lưu and Huỷ', async () => {
    seed({ id: 'a', title: 'A' }, { id: 'b', title: 'B' }, { id: 'c', title: 'C' })
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Sửa: B' }))
    expect(editField()).toHaveValue('B')
    expect(editField()).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Lưu' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Huỷ' })).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'Đã xong: B' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sửa: B' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Xoá: B' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    expect(screen.getAllByRole('listitem')[1]).toContainElement(editField())
    expect(taskNames()).toEqual(['Đã xong: A', 'Đã xong: C'])
  })

  it('opens with Enter on the focused Sửa button', async () => {
    seed({ id: 'b', title: 'B' })
    const user = userEvent.setup()
    render(<App />)
    screen.getByRole('button', { name: 'Sửa: B' }).focus()
    await user.keyboard('{Enter}')
    expect(editField()).toHaveFocus()
  })

  it('edits one task at a time and drops the unsaved change', async () => {
    seed({ id: 'a', title: 'A' }, { id: 'b', title: 'B' })
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Sửa: B' }))
    await user.type(editField(), 'xyz')
    await user.click(screen.getByRole('button', { name: 'Sửa: A' }))
    expect(screen.getAllByRole('textbox', { name: 'Tên việc' })).toHaveLength(1)
    expect(editField()).toHaveValue('A')
    expect(screen.getByRole('checkbox', { name: 'Đã xong: B' })).toBeInTheDocument()
  })

  it('does not save the dropped change of the row left behind, also after a reload', async () => {
    seed({ id: 'a', title: 'A' }, { id: 'b', title: 'B' })
    const user = userEvent.setup()
    const { unmount } = render(<App />)
    await user.click(screen.getByRole('button', { name: 'Sửa: B' }))
    await user.type(editField(), 'xyz')
    await user.click(screen.getByRole('button', { name: 'Sửa: A' }))
    unmount()
    render(<App />)
    expect(taskNames()).toEqual(['Đã xong: A', 'Đã xong: B'])
  })

  it('stays open while ticking, deleting another task, adding and undoing', async () => {
    seed({ id: 'a', title: 'A' }, { id: 'b', title: 'B' }, { id: 'c', title: 'C' })
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Sửa: B' }))
    await user.type(editField(), '2')
    await user.click(screen.getByRole('checkbox', { name: 'Đã xong: A' }))
    expect(editField()).toHaveValue('B2')
    await user.click(screen.getByRole('button', { name: 'Xoá: C' }))
    expect(editField()).toHaveValue('B2')
    await user.type(field(), 'D')
    await user.click(screen.getByRole('button', { name: 'Thêm' }))
    expect(editField()).toHaveValue('B2')
    await user.click(screen.getByRole('button', { name: 'Hoàn tác' }))
    expect(editField()).toHaveValue('B2')
  })
})

describe('C3 saving', () => {
  it('saves the trimmed name with the button and focuses Sửa', async () => {
    seed({ id: 'a', title: 'A' }, { id: 'b', title: 'B' }, { id: 'c', title: 'C' })
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Sửa: B' }))
    await user.clear(editField())
    await user.type(editField(), '  Mới  ')
    await user.click(screen.getByRole('button', { name: 'Lưu' }))
    expect(taskNames()).toEqual(['Đã xong: A', 'Đã xong: Mới', 'Đã xong: C'])
    expect(screen.getByRole('button', { name: 'Sửa: Mới' })).toHaveFocus()
    expect(screen.queryByRole('textbox', { name: 'Tên việc' })).not.toBeInTheDocument()
  })

  it('saves with Enter', async () => {
    seed({ id: 'b', title: 'B' })
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Sửa: B' }))
    await user.type(editField(), 'x{Enter}')
    expect(screen.getByRole('button', { name: 'Sửa: Bx' })).toHaveFocus()
  })

  it('keeps a finished task finished and in place, and survives a reload', async () => {
    seed({ id: 'a', title: 'A' }, { id: 'b', title: 'B', done: true })
    const user = userEvent.setup()
    const { unmount } = render(<App />)
    await user.click(screen.getByRole('button', { name: 'Sửa: B' }))
    await user.type(editField(), '!{Enter}')
    expect(screen.getByRole('checkbox', { name: 'Đã xong: B!' })).toBeChecked()
    expect(taskNames()).toEqual(['Đã xong: A', 'Đã xong: B!'])
    unmount()
    render(<App />)
    expect(taskNames()).toEqual(['Đã xong: A', 'Đã xong: B!'])
  })

  it('ignores Enter while an input method is composing', async () => {
    seed({ id: 'b', title: 'B' })
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Sửa: B' }))
    await user.type(editField(), 'e')
    fireEvent.keyDown(editField(), { key: 'Enter', isComposing: true })
    fireEvent.keyDown(editField(), { key: 'Enter', keyCode: 229 })
    expect(editField()).toHaveValue('Be')
    expect(editField()).not.toHaveAttribute('aria-invalid')
    expect(screen.queryByText(BLANK_ERROR)).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'Đã xong: Be' })).not.toBeInTheDocument()
    fireEvent.keyDown(editField(), { key: 'Enter' })
    expect(screen.getByRole('checkbox', { name: 'Đã xong: Be' })).toBeInTheDocument()
  })
})

describe('C4 cancelling', () => {
  async function startEditing(user: User) {
    seed({ id: 'a', title: 'A' }, { id: 'b', title: 'B' })
    const view = render(<App />)
    await user.click(screen.getByRole('button', { name: 'Sửa: B' }))
    await user.type(editField(), 'zz')
    return view
  }

  it('Huỷ restores the old title and focuses Sửa, also after a reload', async () => {
    const user = userEvent.setup()
    const { unmount } = await startEditing(user)
    await user.click(screen.getByRole('button', { name: 'Huỷ' }))
    expect(screen.getByRole('checkbox', { name: 'Đã xong: B' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sửa: B' })).toHaveFocus()
    unmount()
    render(<App />)
    expect(taskNames()).toEqual(['Đã xong: A', 'Đã xong: B'])
  })

  it('Escape in the edit field cancels', async () => {
    const user = userEvent.setup()
    await startEditing(user)
    await user.keyboard('{Escape}')
    expect(screen.getByRole('checkbox', { name: 'Đã xong: B' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sửa: B' })).toHaveFocus()
  })

  it('Escape in the add field cancels', async () => {
    const user = userEvent.setup()
    await startEditing(user)
    await user.click(field())
    await user.keyboard('{Escape}')
    expect(screen.getByRole('checkbox', { name: 'Đã xong: B' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sửa: B' })).toHaveFocus()
  })

  it('Escape with nothing focused cancels', async () => {
    const user = userEvent.setup()
    await startEditing(user)
    act(() => (document.activeElement as HTMLElement).blur())
    fireEvent.keyDown(document.body, { key: 'Escape' })
    expect(screen.getByRole('button', { name: 'Sửa: B' })).toHaveFocus()
  })

  it('Escape with no row in edit mode does nothing', async () => {
    seed({ id: 'a', title: 'A' })
    const user = userEvent.setup()
    render(<App />)
    await user.keyboard('{Escape}')
    expect(taskNames()).toEqual(['Đã xong: A'])
    expect(screen.getByRole('button', { name: 'Sửa: A' })).not.toHaveFocus()
  })
})

describe('C5 blank name', () => {
  async function openB(user: User) {
    seed({ id: 'a', title: 'A' }, { id: 'b', title: 'B' })
    const view = render(<App />)
    await user.click(screen.getByRole('button', { name: 'Sửa: B' }))
    return view
  }

  it('rejects an empty save with the message as the description', async () => {
    const user = userEvent.setup()
    await openB(user)
    await user.clear(editField())
    await user.click(screen.getByRole('button', { name: 'Lưu' }))
    expect(editField()).toHaveAttribute('aria-invalid', 'true')
    expect(editField()).toHaveAccessibleDescription(BLANK_ERROR)
    expect(screen.getByRole('alert')).toHaveTextContent(BLANK_ERROR)
    await user.click(screen.getByRole('button', { name: 'Huỷ' }))
    expect(screen.getByRole('checkbox', { name: 'Đã xong: B' })).toBeInTheDocument()
  })

  it('keeps spaces typed, keeps the error on more spaces, clears it on a letter', async () => {
    const user = userEvent.setup()
    await openB(user)
    await user.clear(editField())
    await user.type(editField(), '  {Enter}')
    expect(editField()).toHaveValue('  ')
    expect(editField()).toHaveAttribute('aria-invalid', 'true')
    await user.type(editField(), ' ')
    expect(screen.getByText(BLANK_ERROR)).toBeInTheDocument()
    await user.type(editField(), 'q')
    expect(screen.queryByText(BLANK_ERROR)).not.toBeInTheDocument()
    expect(editField()).not.toHaveAttribute('aria-invalid')
  })

  it('limits the field to 200 characters', async () => {
    const user = userEvent.setup()
    await openB(user)
    expect(editField()).toHaveAttribute('maxlength', '200')
    await user.clear(editField())
    await user.click(editField())
    await user.paste('x'.repeat(250))
    expect(editField()).toHaveValue('x'.repeat(200))
    await user.click(screen.getByRole('button', { name: 'Lưu' }))
    expect(
      screen.getByRole('checkbox', { name: 'Đã xong: ' + 'x'.repeat(200) }),
    ).toBeInTheDocument()
  })

  it('describes each field by its own message when both errors show', async () => {
    const user = userEvent.setup()
    await openB(user)
    await user.click(screen.getByRole('button', { name: 'Thêm' }))
    await user.clear(editField())
    await user.click(screen.getByRole('button', { name: 'Lưu' }))
    expect(field()).toHaveAccessibleDescription(BLANK_ERROR)
    expect(editField()).toHaveAccessibleDescription(BLANK_ERROR)
    expect(screen.getAllByRole('alert')).toHaveLength(2)
    expect(field().getAttribute('aria-describedby')).not.toBe(
      editField().getAttribute('aria-describedby'),
    )
  })
})

describe('C11 storage refused', () => {
  it('renames on screen and shows the warning', async () => {
    seed({ id: 'b', title: 'B' })
    refuseSaving()
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Sửa: B' }))
    await user.type(editField(), 'x{Enter}')
    expect(screen.getByRole('checkbox', { name: 'Đã xong: Bx' })).toBeInTheDocument()
    expect(screen.getByText(WARNING)).toBeInTheDocument()
  })
})

describe('add form still works beside rows', () => {
  it('adds a task and shows its buttons', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addTasks(user, 'Mới')
    expect(screen.getByRole('button', { name: 'Sửa: Mới' })).toBeInTheDocument()
  })
})
