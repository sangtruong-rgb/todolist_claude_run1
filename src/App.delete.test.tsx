import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { TASKS_STORAGE_KEY } from './tasks/taskStorage'

const WARNING = 'Trình duyệt đang chặn lưu dữ liệu. Việc bạn thêm sẽ mất khi đóng trang.'

type User = ReturnType<typeof userEvent.setup>

function seed(...tasks: { id: string; title: string; done?: boolean }[]) {
  localStorage.setItem(
    TASKS_STORAGE_KEY,
    JSON.stringify(tasks.map((task) => ({ done: false, ...task }))),
  )
}

function taskNames() {
  return screen.queryAllByRole('checkbox').map((box) => box.getAttribute('aria-label'))
}

function refuseSaving() {
  return vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('refused', 'QuotaExceededError')
  })
}

function undoButton() {
  return screen.getByRole('button', { name: 'Hoàn tác' })
}

function remove(user: User, title: string) {
  return user.click(screen.getByRole('button', { name: 'Xoá: ' + title }))
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

function threeTasks() {
  seed({ id: 'a', title: 'A' }, { id: 'b', title: 'B' }, { id: 'c', title: 'C' })
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('C6 deleting', () => {
  it('removes the row at once, shows the toast and focuses the next Xoá', async () => {
    threeTasks()
    const user = userEvent.setup()
    render(<App />)
    await remove(user, 'B')
    expect(taskNames()).toEqual(['Đã xong: A', 'Đã xong: C'])
    expect(screen.getByText('Đã xoá “B”')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Đã xoá “B”')
    expect(undoButton()).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Xoá: C' })).toHaveFocus()
  })

  it('focuses the Xoá above when the last row is deleted', async () => {
    threeTasks()
    const user = userEvent.setup()
    render(<App />)
    await remove(user, 'C')
    expect(screen.getByRole('button', { name: 'Xoá: B' })).toHaveFocus()
  })

  it('focuses the add field and shows the empty page after the only task', async () => {
    seed({ id: 'a', title: 'A' })
    const user = userEvent.setup()
    render(<App />)
    await remove(user, 'A')
    expect(screen.getByRole('textbox', { name: 'Việc mới' })).toHaveFocus()
    expect(screen.getByText('Trang này còn trống.')).toBeInTheDocument()
    expect(
      screen.getByText('Viết việc đầu tiên vào ô phía trên rồi nhấn Thêm.'),
    ).toBeInTheDocument()
  })

  it('skips a row in edit mode', async () => {
    threeTasks()
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Sửa: B' }))
    await remove(user, 'A')
    expect(screen.getByRole('button', { name: 'Xoá: C' })).toHaveFocus()
  })

  it('goes to the add field when the only other row is in edit mode', async () => {
    seed({ id: 'a', title: 'A' }, { id: 'b', title: 'B' })
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Sửa: A' }))
    await remove(user, 'B')
    expect(screen.getByRole('textbox', { name: 'Việc mới' })).toHaveFocus()
  })

  it('focuses the nearest Xoá above when the row just above is in edit mode', async () => {
    threeTasks()
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Sửa: B' }))
    await remove(user, 'C')
    expect(screen.getByRole('button', { name: 'Xoá: A' })).toHaveFocus()
  })

  it('focuses the new Hoàn tác after a second keyboard delete replaces the toast', async () => {
    threeTasks()
    const user = userEvent.setup()
    render(<App />)
    screen.getByRole('button', { name: 'Xoá: A' }).focus()
    await user.keyboard('{Enter}')
    screen.getByRole('button', { name: 'Xoá: B' }).focus()
    await user.keyboard('{Enter}')
    expect(screen.getByText('Đã xoá “B”')).toBeInTheDocument()
    expect(undoButton()).toHaveFocus()
  })

  it('moves focus to Hoàn tác after Enter on the button', async () => {
    threeTasks()
    const user = userEvent.setup()
    render(<App />)
    screen.getByRole('button', { name: 'Xoá: B' }).focus()
    await user.keyboard('{Enter}')
    expect(undoButton()).toHaveFocus()
  })

  it('moves focus to Hoàn tác after Space on the button', async () => {
    threeTasks()
    const user = userEvent.setup()
    render(<App />)
    screen.getByRole('button', { name: 'Xoá: B' }).focus()
    await user.keyboard(' ')
    expect(undoButton()).toHaveFocus()
  })

  it('shows a 200-character title in full and deletes finished tasks', async () => {
    const long = 'd'.repeat(200)
    seed({ id: 'a', title: long, done: true })
    const user = userEvent.setup()
    render(<App />)
    await remove(user, long)
    expect(screen.getByText('Đã xoá “' + long + '”')).toBeInTheDocument()
    expect(taskNames()).toEqual([])
  })
})

describe('C7 toast lifetime', () => {
  it('hides after 5 seconds and the task stays deleted after a reload', async () => {
    useFakeTimers()
    threeTasks()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const { unmount } = render(<App />)
    await remove(user, 'B')
    advance(4999)
    expect(screen.getByText('Đã xoá “B”')).toBeInTheDocument()
    advance(1)
    expect(screen.queryByText('Đã xoá “B”')).not.toBeInTheDocument()
    expect(taskNames()).toEqual(['Đã xong: A', 'Đã xong: C'])
    unmount()
    render(<App />)
    expect(taskNames()).toEqual(['Đã xong: A', 'Đã xong: C'])
  })
})

describe('C8 undo', () => {
  it('restores the task in place and focuses its tick box', async () => {
    threeTasks()
    const user = userEvent.setup()
    const { unmount } = render(<App />)
    await remove(user, 'B')
    await user.click(undoButton())
    expect(taskNames()).toEqual(['Đã xong: A', 'Đã xong: B', 'Đã xong: C'])
    expect(screen.queryByText('Đã xoá “B”')).not.toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Đã xong: B' })).toHaveFocus()
    unmount()
    render(<App />)
    expect(taskNames()).toEqual(['Đã xong: A', 'Đã xong: B', 'Đã xong: C'])
  })

  it('restores a finished task still ticked, with the keyboard', async () => {
    seed({ id: 'a', title: 'A' }, { id: 'b', title: 'B', done: true })
    const user = userEvent.setup()
    render(<App />)
    await remove(user, 'B')
    undoButton().focus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('checkbox', { name: 'Đã xong: B' })).toBeChecked()
    expect(taskNames()).toEqual(['Đã xong: A', 'Đã xong: B'])
    expect(screen.getByRole('checkbox', { name: 'Đã xong: B' })).toHaveFocus()
  })

  it('removes the task for good when the page reloads while the toast shows', async () => {
    threeTasks()
    const user = userEvent.setup()
    const { unmount } = render(<App />)
    await remove(user, 'B')
    unmount()
    render(<App />)
    expect(taskNames()).toEqual(['Đã xong: A', 'Đã xong: C'])
    expect(screen.queryByText('Đã xoá “B”')).not.toBeInTheDocument()
  })
})

describe('C9 replacing the toast', () => {
  it('shows only the newest toast with a fresh 5 seconds', async () => {
    useFakeTimers()
    threeTasks()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<App />)
    await remove(user, 'A')
    advance(3000)
    await remove(user, 'B')
    expect(screen.getAllByRole('button', { name: 'Hoàn tác' })).toHaveLength(1)
    expect(screen.getByText('Đã xoá “B”')).toBeInTheDocument()
    expect(screen.queryByText('Đã xoá “A”')).not.toBeInTheDocument()
    advance(4999)
    expect(screen.getByText('Đã xoá “B”')).toBeInTheDocument()
    advance(1)
    expect(screen.queryByText('Đã xoá “B”')).not.toBeInTheDocument()
  })

  it('undo restores only the newest deletion, also after a reload', async () => {
    threeTasks()
    const user = userEvent.setup()
    const { unmount } = render(<App />)
    await remove(user, 'A')
    await remove(user, 'B')
    await user.click(undoButton())
    expect(taskNames()).toEqual(['Đã xong: B', 'Đã xong: C'])
    unmount()
    render(<App />)
    expect(taskNames()).toEqual(['Đã xong: B', 'Đã xong: C'])
  })
})

describe('C11 storage refused', () => {
  it('deletes and undoes on screen with the warning shown', async () => {
    seed({ id: 'a', title: 'A' }, { id: 'b', title: 'B' })
    refuseSaving()
    const user = userEvent.setup()
    render(<App />)
    await remove(user, 'A')
    expect(taskNames()).toEqual(['Đã xong: B'])
    expect(screen.getByText(WARNING)).toBeInTheDocument()
    await user.click(undoButton())
    expect(taskNames()).toEqual(['Đã xong: A', 'Đã xong: B'])
    expect(screen.getByText(WARNING)).toBeInTheDocument()
  })
})
