import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const WARNING = 'Trình duyệt đang chặn lưu dữ liệu. Việc bạn thêm sẽ mất khi đóng trang.'
const ERROR = 'Hãy nhập tên việc.'

function field() {
  return screen.getByRole('textbox', { name: 'Việc mới' })
}

function refuseSaving() {
  return vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('refused', 'QuotaExceededError')
  })
}

function taskNames() {
  return screen.queryAllByRole('checkbox').map((box) => box.getAttribute('aria-label'))
}

async function addTasks(user: ReturnType<typeof userEvent.setup>, ...titles: string[]) {
  for (const title of titles) {
    await user.type(field(), title)
    await user.click(screen.getByRole('button', { name: 'Thêm' }))
  }
}

afterEach(() => vi.restoreAllMocks())

describe('C1 first open', () => {
  it('shows the empty page', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: 'Việc của tôi' })).toBeInTheDocument()
    expect(field()).toHaveAttribute('placeholder', 'Thêm việc mới…')
    expect(screen.getByText('Trang này còn trống.')).toBeInTheDocument()
    expect(
      screen.getByText('Viết việc đầu tiên vào ô phía trên rồi nhấn Thêm.'),
    ).toBeInTheDocument()
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
    expect(screen.queryByText(WARNING)).not.toBeInTheDocument()
    expect(screen.queryByText(ERROR)).not.toBeInTheDocument()
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Thêm',
      'Tất cả',
      'Chưa xong',
      'Đã xong',
    ])
  })
})

describe('C2 adding', () => {
  it('adds with the button, trimmed, and keeps the cursor in the field', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(field(), '  Mua sữa  ')
    await user.click(screen.getByRole('button', { name: 'Thêm' }))
    const box = screen.getByRole('checkbox', { name: 'Đã xong: Mua sữa' })
    expect(box).not.toBeChecked()
    expect(field()).toHaveValue('')
    expect(field()).toHaveFocus()
    expect(screen.queryByText('Trang này còn trống.')).not.toBeInTheDocument()
  })

  it('adds with Enter exactly once', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(field(), 'Một')
    fireEvent.keyDown(field(), { key: 'Enter' })
    expect(taskNames()).toEqual(['Đã xong: Một'])
    expect(field()).toHaveValue('')
    expect(field()).toHaveFocus()
    await user.type(field(), 'Hai{Enter}')
    expect(taskNames()).toEqual(['Đã xong: Một', 'Đã xong: Hai'])
  })

  it('ignores Enter while an input method is composing', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(field(), 'vie')
    fireEvent.keyDown(field(), { key: 'Enter', isComposing: true })
    fireEvent.keyDown(field(), { key: 'Enter', keyCode: 229 })
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
    expect(field()).toHaveValue('vie')
    expect(screen.queryByText(ERROR)).not.toBeInTheDocument()
    fireEvent.keyDown(field(), { key: 'Enter' })
    expect(taskNames()).toEqual(['Đã xong: vie'])
  })
})

describe('C3 empty name', () => {
  it('rejects an empty field and clears the error when a letter is typed', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Thêm' }))
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
    expect(field()).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText(ERROR)).toBeInTheDocument()
    expect(field()).toHaveAccessibleDescription(ERROR)
    await user.type(field(), 'a')
    expect(field()).not.toHaveAttribute('aria-invalid', 'true')
    expect(screen.queryByText(ERROR)).not.toBeInTheDocument()
  })

  it('rejects spaces with Enter, keeps them, and keeps the error until a letter', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(field(), '   ')
    fireEvent.keyDown(field(), { key: 'Enter' })
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
    expect(field()).toHaveValue('   ')
    expect(field()).toHaveAttribute('aria-invalid', 'true')
    await user.type(field(), ' ')
    expect(screen.getByText(ERROR)).toBeInTheDocument()
    expect(field()).toHaveAttribute('aria-invalid', 'true')
    await user.type(field(), 'a')
    expect(screen.queryByText(ERROR)).not.toBeInTheDocument()
    expect(field()).not.toHaveAttribute('aria-invalid', 'true')
  })

  it('leaves no error after a valid add that follows an error', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Thêm' }))
    await user.type(field(), 'Việc{Enter}')
    expect(taskNames()).toEqual(['Đã xong: Việc'])
    expect(screen.queryByText(ERROR)).not.toBeInTheDocument()
    expect(field()).not.toHaveAttribute('aria-invalid', 'true')
  })
})

describe('C4 length limit', () => {
  it('keeps the first 200 characters of a pasted string', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(field()).toHaveAttribute('maxlength', '200')
    const long = 'x'.repeat(199) + 'yz' + 'w'.repeat(49)
    await user.click(field())
    await user.paste(long)
    expect(field()).toHaveValue(long.slice(0, 200))
    await user.type(field(), 'q')
    expect(field()).toHaveValue(long.slice(0, 200))
    await user.click(screen.getByRole('button', { name: 'Thêm' }))
    expect(taskNames()).toEqual(['Đã xong: ' + long.slice(0, 200)])
  })
})

describe('C5 ticking', () => {
  it('ticks and un-ticks with the mouse', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addTasks(user, 'Việc')
    const box = screen.getByRole('checkbox', { name: 'Đã xong: Việc' })
    await user.click(box)
    expect(box).toBeChecked()
    await user.click(box)
    expect(box).not.toBeChecked()
  })

  it('keeps focus on the box after Space', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addTasks(user, 'Việc')
    for (let presses = 0; presses < 5; presses++) await user.tab()
    const box = screen.getByRole('checkbox', { name: 'Đã xong: Việc' })
    expect(box).toHaveFocus()
    await user.keyboard(' ')
    expect(box).toBeChecked()
    expect(box).toHaveFocus()
    await user.keyboard(' ')
    expect(box).not.toBeChecked()
    expect(box).toHaveFocus()
  })
})

describe('C6 order', () => {
  it('puts unfinished above finished, each in the order added', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addTasks(user, 'A', 'B', 'C')
    await user.click(screen.getByRole('checkbox', { name: 'Đã xong: A' }))
    expect(taskNames()).toEqual(['Đã xong: B', 'Đã xong: C', 'Đã xong: A'])
    await user.click(screen.getByRole('checkbox', { name: 'Đã xong: C' }))
    expect(taskNames()).toEqual(['Đã xong: B', 'Đã xong: A', 'Đã xong: C'])
    await user.click(screen.getByRole('checkbox', { name: 'Đã xong: A' }))
    expect(taskNames()).toEqual(['Đã xong: A', 'Đã xong: B', 'Đã xong: C'])
    expect(screen.getAllByRole('checkbox').map((box) => (box as HTMLInputElement).checked)).toEqual(
      [false, false, true],
    )
  })
})

describe('C7 persistence', () => {
  it('shows the same tasks after a reload', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App />)
    await addTasks(user, 'A', 'B')
    await user.click(screen.getByRole('checkbox', { name: 'Đã xong: A' }))
    unmount()
    render(<App />)
    expect(taskNames()).toEqual(['Đã xong: B', 'Đã xong: A'])
    expect(screen.getByRole('checkbox', { name: 'Đã xong: B' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Đã xong: A' })).toBeChecked()
  })
})

describe('C8 storage warning', () => {
  it('warns above the field when saving is refused at open and clears after a save', async () => {
    const user = userEvent.setup()
    const refusal = refuseSaving()
    render(<App />)
    const warning = screen.getByText(WARNING)
    expect(warning.compareDocumentPosition(field()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    await addTasks(user, 'Việc')
    await user.click(screen.getByRole('checkbox', { name: 'Đã xong: Việc' }))
    expect(screen.getByRole('checkbox', { name: 'Đã xong: Việc' })).toBeChecked()
    expect(screen.getByText(WARNING)).toBeInTheDocument()
    refusal.mockRestore()
    await addTasks(user, 'Khác')
    expect(screen.queryByText(WARNING)).not.toBeInTheDocument()
  })

  it('warns when a later save fails and clears after a successful save', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(screen.queryByText(WARNING)).not.toBeInTheDocument()
    const refusal = refuseSaving()
    await addTasks(user, 'Việc')
    expect(taskNames()).toEqual(['Đã xong: Việc'])
    expect(screen.getByText(WARNING)).toBeInTheDocument()
    refusal.mockRestore()
    await user.click(screen.getByRole('checkbox', { name: 'Đã xong: Việc' }))
    expect(screen.queryByText(WARNING)).not.toBeInTheDocument()
  })
})
