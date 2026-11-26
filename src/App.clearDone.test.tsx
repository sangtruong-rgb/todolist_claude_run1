import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { TASKS_STORAGE_KEY } from './tasks/taskStorage'

const WARNING = 'Trình duyệt đang chặn lưu dữ liệu. Việc bạn thêm sẽ mất khi đóng trang.'

function seed(...tasks: { id: string; title: string; done?: boolean }[]) {
  localStorage.setItem(
    TASKS_STORAGE_KEY,
    JSON.stringify(tasks.map((task) => ({ done: false, ...task }))),
  )
}

function seedFour() {
  seed(
    { id: 'a', title: 'A' },
    { id: 'b', title: 'B', done: true },
    { id: 'c', title: 'C' },
    { id: 'd', title: 'D', done: true },
  )
}

function names(...titles: string[]) {
  return titles.map((title) => 'Đã xong: ' + title)
}

function taskNames() {
  return screen.queryAllByRole('checkbox').map((box) => box.getAttribute('aria-label'))
}

function box(title: string) {
  return screen.getByRole('checkbox', { name: 'Đã xong: ' + title })
}

function field() {
  return screen.getByRole('textbox', { name: 'Việc mới' })
}

function clearButton(count: number) {
  return screen.getByRole('button', { name: 'Xoá việc đã xong (' + count + ')' })
}

function undoButton() {
  return screen.getByRole('button', { name: 'Hoàn tác' })
}

function filterButton(name: string) {
  return screen.getByRole('button', { name })
}

function refuseSaving() {
  return vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('refused', 'QuotaExceededError')
  })
}

// Testing Library only advances fake timers by itself when it finds a `jest` global.
function useFakeTimers() {
  vi.useFakeTimers()
  vi.stubGlobal('jest', { advanceTimersByTime: vi.advanceTimersByTime })
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('C7 clearing the finished tasks', () => {
  it('removes them at once, without a dialog, focuses the field and shows the toast', async () => {
    seedFour()
    const confirm = vi.spyOn(window, 'confirm')
    const user = userEvent.setup()
    render(<App />)
    await user.click(clearButton(2))
    expect(taskNames()).toEqual(names('A', 'C'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(confirm).not.toHaveBeenCalled()
    expect(field()).toHaveFocus()
    expect(screen.getByRole('status')).toHaveTextContent('Đã xoá 2 việc đã xong')
    expect(undoButton()).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Xoá việc đã xong/ })).not.toBeInTheDocument()
    expect(screen.getByText('2 việc chưa xong')).toBeInTheDocument()
  })

  it.each([['{Enter}'], [' ']])('keeps focus in the field after the key %j', async (key) => {
    seedFour()
    const user = userEvent.setup()
    render(<App />)
    clearButton(2).focus()
    await user.keyboard(key)
    expect(taskNames()).toEqual(names('A', 'C'))
    expect(field()).toHaveFocus()
    expect(undoButton()).not.toHaveFocus()
  })

  it('says 1 for one finished task', async () => {
    seed({ id: 'a', title: 'A', done: true })
    const user = userEvent.setup()
    render(<App />)
    await user.click(clearButton(1))
    expect(screen.getByRole('status')).toHaveTextContent('Đã xoá 1 việc đã xong')
  })

  it('removes a row still in its tick motion and keeps focus in the field', async () => {
    seedFour()
    useFakeTimers()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<App />)
    await user.click(filterButton('Chưa xong'))
    await user.click(box('A'))
    await user.click(clearButton(3))
    expect(taskNames()).toEqual(names('C'))
    expect(field()).toHaveFocus()
    advance(400)
    expect(field()).toHaveFocus()
  })

  it('stops editing a finished task, also after undo', async () => {
    seedFour()
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Sửa: B' }))
    await user.click(clearButton(2))
    expect(screen.queryByRole('textbox', { name: 'Tên việc' })).not.toBeInTheDocument()
    await user.click(undoButton())
    expect(box('B')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Tên việc' })).not.toBeInTheDocument()
  })

  it('keeps an unfinished task in edit mode', async () => {
    seedFour()
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Sửa: A' }))
    await user.click(clearButton(2))
    expect(screen.getByRole('textbox', { name: 'Tên việc' })).toBeInTheDocument()
  })
})

describe('C7 undoing a clear', () => {
  it('puts the tasks back in place under Tất cả, with focus on the first restored box', async () => {
    seedFour()
    const user = userEvent.setup()
    const { unmount } = render(<App />)
    await user.click(clearButton(2))
    await user.click(undoButton())
    expect(taskNames()).toEqual(names('A', 'C', 'B', 'D'))
    expect(box('B')).toBeChecked()
    expect(box('D')).toBeChecked()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(clearButton(2)).toBeInTheDocument()
    expect(box('B')).toHaveFocus()
    unmount()
    render(<App />)
    expect(taskNames()).toEqual(names('A', 'C', 'B', 'D'))
  })

  it('keeps Đã xong chosen and focuses the first restored box', async () => {
    seedFour()
    const user = userEvent.setup()
    render(<App />)
    await user.click(filterButton('Đã xong'))
    await user.click(clearButton(2))
    await user.click(undoButton())
    expect(filterButton('Đã xong')).toHaveAttribute('aria-pressed', 'true')
    expect(taskNames()).toEqual(names('B', 'D'))
    expect(box('B')).toHaveFocus()
  })

  it('keeps Chưa xong chosen, hides the tasks and focuses the field', async () => {
    seedFour()
    const user = userEvent.setup()
    render(<App />)
    await user.click(filterButton('Chưa xong'))
    await user.click(clearButton(2))
    await user.click(undoButton())
    expect(filterButton('Chưa xong')).toHaveAttribute('aria-pressed', 'true')
    expect(taskNames()).toEqual(names('A', 'C'))
    expect(field()).toHaveFocus()
  })

  it('focuses the field when a single deleted task is hidden by the filter', async () => {
    seedFour()
    const user = userEvent.setup()
    render(<App />)
    await user.click(filterButton('Chưa xong'))
    await user.click(screen.getByRole('button', { name: 'Xoá: A' }))
    await user.click(filterButton('Đã xong'))
    await user.click(undoButton())
    expect(field()).toHaveFocus()
  })
})

describe('C7 the toast of a clear', () => {
  it('lasts 5 seconds and the tasks stay deleted, also after a reload', async () => {
    seedFour()
    useFakeTimers()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const { unmount } = render(<App />)
    await user.click(clearButton(2))
    advance(4999)
    expect(screen.getByRole('status')).toBeInTheDocument()
    advance(1)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(taskNames()).toEqual(names('A', 'C'))
    unmount()
    render(<App />)
    expect(taskNames()).toEqual(names('A', 'C'))
  })

  it('is gone after a reload, with the tasks', async () => {
    seedFour()
    const user = userEvent.setup()
    const { unmount } = render(<App />)
    await user.click(clearButton(2))
    unmount()
    render(<App />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(taskNames()).toEqual(names('A', 'C'))
  })

  it('replaces the toast of a single deletion, and is replaced by one', async () => {
    seedFour()
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Xoá: A' }))
    expect(screen.getByRole('status')).toHaveTextContent('Đã xoá “A”')
    await user.click(clearButton(2))
    expect(screen.getAllByRole('button', { name: 'Hoàn tác' })).toHaveLength(1)
    expect(screen.getByRole('status')).toHaveTextContent('Đã xoá 2 việc đã xong')
    await user.click(undoButton())
    expect(taskNames()).toEqual(names('C', 'B', 'D'))
    await user.click(clearButton(2))
    await user.click(screen.getByRole('button', { name: 'Xoá: C' }))
    expect(screen.getByRole('status')).toHaveTextContent('Đã xoá “C”')
    await user.click(undoButton())
    expect(taskNames()).toEqual(names('C'))
  })

  it('starts a fresh 5 seconds when a newer deletion replaces it', async () => {
    seedFour()
    useFakeTimers()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<App />)
    await user.click(clearButton(2))
    advance(3000)
    await user.click(screen.getByRole('button', { name: 'Xoá: A' }))
    advance(4999)
    expect(screen.getByRole('status')).toHaveTextContent('Đã xoá “A”')
    advance(1)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('works on screen with saving refused, and shows the warning', async () => {
    seedFour()
    refuseSaving()
    const user = userEvent.setup()
    render(<App />)
    await user.click(clearButton(2))
    expect(taskNames()).toEqual(names('A', 'C'))
    expect(screen.getByText(WARNING)).toBeInTheDocument()
    await user.click(undoButton())
    expect(taskNames()).toEqual(names('A', 'C', 'B', 'D'))
  })
})

describe('C7 the Hoàn tác of a clear is not focused automatically', () => {
  it('stays unfocused after a keyboard deletion put focus on the earlier toast', async () => {
    seedFour()
    const user = userEvent.setup()
    render(<App />)
    screen.getByRole('button', { name: 'Xoá: A' }).focus()
    await user.keyboard('{Enter}')
    expect(undoButton()).toHaveFocus()
    await user.click(clearButton(2))
    expect(screen.getByRole('status')).toHaveTextContent('Đã xoá 2 việc đã xong')
    expect(undoButton()).not.toHaveFocus()
    expect(field()).toHaveFocus()
  })

  it('waits while keyboard focus is on it, then goes 5 s after focus left', async () => {
    seedFour()
    useFakeTimers()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<App />)
    await user.click(clearButton(2))
    act(() => undoButton().focus())
    advance(8000)
    expect(screen.getByRole('status')).toBeInTheDocument()
    act(() => undoButton().blur())
    advance(4999)
    expect(screen.getByRole('status')).toBeInTheDocument()
    advance(1)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
