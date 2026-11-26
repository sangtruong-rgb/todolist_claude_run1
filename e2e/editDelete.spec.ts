/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

const WARNING = 'Trình duyệt đang chặn lưu dữ liệu. Việc bạn thêm sẽ mất khi đóng trang.'
const ERROR = 'Hãy nhập tên việc.'

const THEMES = {
  light: {
    paper: 'rgb(251, 247, 239)',
    ink: 'rgb(46, 42, 36)',
    muted: 'rgb(122, 111, 96)',
    rule: 'rgb(227, 215, 195)',
  },
  dark: {
    paper: 'rgb(34, 31, 26)',
    ink: 'rgb(241, 233, 218)',
    muted: 'rgb(179, 167, 147)',
    rule: 'rgb(58, 53, 45)',
  },
} as const
const ACCENT = 'rgb(194, 85, 45)'
const ACCENT_TEXT = { light: 'rgb(169, 70, 31)', dark: 'rgb(229, 138, 99)' } as const
const WHITE = 'rgb(255, 255, 255)'
const TRANSPARENT = 'rgba(0, 0, 0, 0)'

function field(page: Page) {
  return page.getByRole('textbox', { name: 'Việc mới' })
}

function editField(page: Page) {
  return page.getByRole('textbox', { name: 'Tên việc' })
}

async function addTask(page: Page, title: string) {
  await field(page).fill(title)
  await page.getByRole('button', { name: 'Thêm' }).click()
}

async function refuseSaving(page: Page) {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('refused', 'QuotaExceededError')
    }
  })
}

async function style(locator: Locator, property: string) {
  return locator.evaluate((el, name) => getComputedStyle(el).getPropertyValue(name), property)
}

async function box(locator: Locator) {
  const found = await locator.boundingBox()
  if (found === null) throw new Error('element has no box')
  return found
}

async function tickLabels(page: Page) {
  return page
    .getByRole('checkbox')
    .evaluateAll((boxes) => boxes.map((b) => b.getAttribute('aria-label')))
}

async function recordMotion(page: Page) {
  await page.evaluate(() => {
    const log: { target: string; name: string }[] = []
    ;(window as unknown as { motionLog: typeof log }).motionLog = log
    document.addEventListener(
      'animationstart',
      (event) => {
        const target = event.target as Element
        log.push({
          target: target.className.toString(),
          name: (event as AnimationEvent).animationName,
        })
      },
      true,
    )
  })
}

async function readMotion(page: Page) {
  return page.evaluate(
    () => (window as unknown as { motionLog: { target: string; name: string }[] }).motionLog,
  )
}

test.describe('C1 row buttons', () => {
  test('are visible without hovering on finished and unfinished rows', async ({ page }) => {
    await page.goto('/')
    await addTask(page, 'A')
    await addTask(page, 'B')
    await page.getByRole('checkbox', { name: 'Đã xong: A' }).check()
    for (const title of ['A', 'B']) {
      await expect(page.getByRole('button', { name: 'Sửa: ' + title })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Xoá: ' + title })).toBeVisible()
    }
  })

  test('work with the keyboard: Tab then Enter and Space', async ({ page }) => {
    await page.goto('/')
    await addTask(page, 'A')
    await addTask(page, 'B')
    await page.getByRole('checkbox', { name: 'Đã xong: A' }).focus()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Sửa: A' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(editField(page)).toBeFocused()
    await page.keyboard.press('Escape')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Space')
    await expect(page.getByText('Đã xoá “A”')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Hoàn tác' })).toBeFocused()
  })

  test.describe('by touch', () => {
    test.use({ hasTouch: true })

    test('tap opens edit mode and deletes', async ({ page }) => {
      await page.goto('/')
      await addTask(page, 'A')
      await addTask(page, 'B')
      await page.getByRole('button', { name: 'Sửa: A' }).tap()
      await expect(editField(page)).toBeVisible()
      await page.getByRole('button', { name: 'Huỷ' }).tap()
      await page.getByRole('button', { name: 'Xoá: A' }).tap()
      await expect(page.getByText('Đã xoá “A”')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Xoá: B' })).toBeFocused()
    })
  })
})

test.describe('C2 to C4 editing', () => {
  test('focuses the field, saves with Enter and Lưu, and keeps the name after a reload', async ({
    page,
  }) => {
    await page.goto('/')
    await addTask(page, 'A')
    await page.getByRole('button', { name: 'Sửa: A' }).click()
    await expect(editField(page)).toBeFocused()
    await expect(page.getByRole('checkbox', { name: 'Đã xong: A' })).toHaveCount(0)
    await editField(page).fill('  A1  ')
    await editField(page).press('Enter')
    await expect(page.getByRole('button', { name: 'Sửa: A1' })).toBeFocused()
    await page.getByRole('button', { name: 'Sửa: A1' }).click()
    await editField(page).fill('A2')
    await page.getByRole('button', { name: 'Lưu' }).click()
    await expect(page.getByRole('button', { name: 'Sửa: A2' })).toBeFocused()
    await page.reload()
    expect(await tickLabels(page)).toEqual(['Đã xong: A2'])
  })

  test('Escape pressed in the add field cancels and focuses Sửa', async ({ page }) => {
    await page.goto('/')
    await addTask(page, 'A')
    await page.getByRole('button', { name: 'Sửa: A' }).click()
    await editField(page).fill('changed')
    await field(page).click()
    await page.keyboard.press('Escape')
    await expect(editField(page)).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Sửa: A' })).toBeFocused()
    await page.reload()
    expect(await tickLabels(page)).toEqual(['Đã xong: A'])
  })
})

test.describe('C5 blank name', () => {
  test('shows the message under the field and above the next row, then hides it', async ({
    page,
  }) => {
    await page.goto('/')
    await addTask(page, 'A')
    await addTask(page, 'B')
    await page.getByRole('button', { name: 'Sửa: A' }).click()
    await editField(page).fill('')
    await page.getByRole('button', { name: 'Lưu' }).click()
    const message = page.getByRole('alert').filter({ hasText: ERROR })
    await expect(message).toBeVisible()
    expect(await style(editField(page), 'border-top-color')).toBe(ACCENT)
    expect(await style(editField(page), 'border-bottom-color')).toBe(ACCENT)
    const fieldBox = await box(editField(page))
    const messageBox = await box(message)
    const nextRow = await box(page.getByRole('checkbox', { name: 'Đã xong: B' }))
    expect(messageBox.y).toBeGreaterThanOrEqual(fieldBox.y + fieldBox.height)
    expect(messageBox.y + messageBox.height).toBeLessThanOrEqual(nextRow.y)
    await editField(page).pressSequentially('x')
    await expect(message).toHaveCount(0)
  })
})

test.describe('C6 and C8 deleting and undoing', () => {
  test('no dialog; keyboard focuses Hoàn tác, mouse focuses the next Xoá; undo restores place and focus', async ({
    page,
  }) => {
    let dialogs = 0
    page.on('dialog', () => dialogs++)
    await page.goto('/')
    for (const title of ['A', 'B', 'C']) await addTask(page, title)
    await page.getByRole('button', { name: 'Xoá: B' }).click()
    await expect(page.getByRole('button', { name: 'Xoá: C' })).toBeFocused()
    await page.getByRole('button', { name: 'Hoàn tác' }).click()
    expect(await tickLabels(page)).toEqual(['Đã xong: A', 'Đã xong: B', 'Đã xong: C'])
    await expect(page.getByRole('checkbox', { name: 'Đã xong: B' })).toBeFocused()
    await page.getByRole('button', { name: 'Xoá: B' }).focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('button', { name: 'Hoàn tác' })).toBeFocused()
    expect(dialogs).toBe(0)
  })

  test('a reload right after deleting leaves the row absent and no toast', async ({ page }) => {
    await page.goto('/')
    await addTask(page, 'A')
    await addTask(page, 'B')
    await page.getByRole('button', { name: 'Xoá: A' }).click()
    await page.reload()
    expect(await tickLabels(page)).toEqual(['Đã xong: B'])
    await expect(page.getByRole('button', { name: 'Hoàn tác' })).toHaveCount(0)
  })

  test('after an undo and a reload the row is present', async ({ page }) => {
    await page.goto('/')
    await addTask(page, 'A')
    await addTask(page, 'B')
    await page.getByRole('button', { name: 'Xoá: A' }).click()
    await page.getByRole('button', { name: 'Hoàn tác' }).click()
    await page.reload()
    expect(await tickLabels(page)).toEqual(['Đã xong: A', 'Đã xong: B'])
  })

  test('restoring a finished task and leaving edit mode replay no tick animation', async ({
    page,
  }) => {
    await page.goto('/')
    await addTask(page, 'A')
    await addTask(page, 'B')
    await page.getByRole('checkbox', { name: 'Đã xong: A' }).check()
    await page.waitForTimeout(400)
    await recordMotion(page)
    await page.getByRole('button', { name: 'Xoá: A' }).click()
    await page.getByRole('button', { name: 'Hoàn tác' }).click()
    await page.getByRole('button', { name: 'Sửa: A' }).click()
    await page.getByRole('button', { name: 'Huỷ' }).click()
    await page.waitForTimeout(400)
    const names = (await readMotion(page)).filter((entry) => !entry.target.includes('undo-toast'))
    expect(names).toEqual([])
  })
})

test.describe('C7 and C9 toast lifetime', () => {
  test('disappears after 5 seconds once the pointer is away, and stays while hovered', async ({
    page,
  }) => {
    await page.clock.install()
    await page.goto('/')
    await addTask(page, 'A')
    await page.getByRole('button', { name: 'Xoá: A' }).click()
    const toast = page.getByRole('status').filter({ hasText: 'Đã xoá “A”' })
    await toast.hover()
    await page.clock.runFor(8000)
    await expect(toast).toBeVisible()
    await page.mouse.move(5, 5)
    await page.clock.runFor(4900)
    await expect(toast).toBeVisible()
    await page.clock.runFor(200)
    await expect(toast).toHaveCount(0)
  })

  test('a newer deletion replaces the toast and undo restores only it', async ({ page }) => {
    await page.goto('/')
    for (const title of ['A', 'B', 'C']) await addTask(page, title)
    await page.getByRole('button', { name: 'Xoá: A' }).click()
    await page.getByRole('button', { name: 'Xoá: B' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Đã xoá' })).toHaveCount(1)
    await page.getByRole('button', { name: 'Hoàn tác' }).click()
    await page.reload()
    expect(await tickLabels(page)).toEqual(['Đã xong: B', 'Đã xong: C'])
  })
})

test.describe('C10 toast motion', () => {
  test('slides in over 0.2s and rests at full opacity', async ({ page }) => {
    await page.goto('/')
    await addTask(page, 'A')
    await page.getByRole('button', { name: 'Xoá: A' }).click()
    const toast = page.getByRole('status').filter({ hasText: 'Đã xoá' })
    await expect(toast).toBeVisible()
    expect(await style(toast, 'animation-duration')).toBe('0.2s')
    expect(await style(toast, 'animation-name')).not.toBe('none')
    await expect.poll(() => style(toast, 'opacity')).toBe('1')
  })

  test.describe('with reduced motion', () => {
    test.use({ reducedMotion: 'reduce' })

    test('shows at once without animation', async ({ page }) => {
      await page.goto('/')
      await addTask(page, 'A')
      await recordMotion(page)
      await page.getByRole('button', { name: 'Xoá: A' }).click()
      const toast = page.getByRole('status').filter({ hasText: 'Đã xoá' })
      await expect(toast).toBeVisible()
      expect(await style(toast, 'animation-name')).toBe('none')
      expect(await readMotion(page)).toEqual([])
    })
  })
})

test.describe('C11 storage refused', () => {
  test('rename, delete and undo work and the warning shows', async ({ page }) => {
    await refuseSaving(page)
    await page.goto('/')
    await addTask(page, 'A')
    await page.getByRole('button', { name: 'Sửa: A' }).click()
    await editField(page).fill('A1')
    await page.getByRole('button', { name: 'Lưu' }).click()
    await expect(page.getByRole('checkbox', { name: 'Đã xong: A1' })).toBeVisible()
    await page.getByRole('button', { name: 'Xoá: A1' }).click()
    await expect(page.getByText('Đã xoá “A1”')).toBeVisible()
    await page.getByRole('button', { name: 'Hoàn tác' }).click()
    await expect(page.getByRole('checkbox', { name: 'Đã xong: A1' })).toBeVisible()
    await expect(page.getByText(WARNING)).toBeVisible()
  })
})

const VIEWPORTS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '390', width: 390, height: 844 },
] as const

for (const viewport of VIEWPORTS) {
  for (const scheme of ['light', 'dark'] as const) {
    const colours = THEMES[scheme]
    test.describe(`C12 look at ${viewport.name} ${scheme}`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height })
        await page.emulateMedia({ colorScheme: scheme })
        await page.goto('/')
      })

      test('row buttons', async ({ page }) => {
        const long = 'w'.repeat(200)
        await addTask(page, long)
        await addTask(page, 'B')
        await page.getByRole('checkbox', { name: 'Đã xong: B' }).check()
        for (const title of [long, 'B']) {
          const edit = page.getByRole('button', { name: 'Sửa: ' + title })
          const remove = page.getByRole('button', { name: 'Xoá: ' + title })
          for (const button of [edit, remove]) {
            expect(await style(button, 'color')).toBe(colours.muted)
            expect(await style(button, 'font-size')).toBe('14px')
            expect(await style(button, 'background-color')).toBe(TRANSPARENT)
            expect(await style(button, 'text-decoration-line')).toBe('none')
          }
          const editBox = await box(edit)
          const removeBox = await box(remove)
          expect(editBox.x).toBeLessThan(removeBox.x)
          expect(editBox.height).toBe(36)
        }
        const row = page
          .getByRole('listitem')
          .filter({ has: page.getByRole('button', { name: 'Sửa: B' }) })
        const rowBox = await box(row)
        const title = await box(row.locator('.task-title'))
        const removeBox = await box(page.getByRole('button', { name: 'Xoá: B' }))
        if (viewport.width > 720) {
          expect(removeBox.y + removeBox.height / 2).toBeLessThan(title.y + title.height + 18)
          expect(removeBox.x).toBeGreaterThan(title.x + title.width - 1)
        } else {
          expect(removeBox.y).toBeGreaterThanOrEqual(title.y + title.height)
          expect(
            Math.abs(removeBox.x + removeBox.width - 8 - (rowBox.x + rowBox.width)),
          ).toBeLessThanOrEqual(1)
          const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
          expect(scrollWidth).toBeLessThanOrEqual(viewport.width)
        }
      })

      test('edit row and its invalid state', async ({ page }) => {
        await addTask(page, 'A')
        await page.getByRole('button', { name: 'Sửa: A' }).click()
        const input = editField(page)
        const save = page.getByRole('button', { name: 'Lưu' })
        const cancel = page.getByRole('button', { name: 'Huỷ' })
        await expect(page.getByRole('checkbox')).toHaveCount(0)
        expect(await style(input, 'height')).toBe('44px')
        expect(await style(input, 'font-size')).toBe('13px')
        expect(await style(input, 'color')).toBe(colours.muted)
        const label = page.getByText('Tên việc', { exact: true })
        expect(await style(label, 'font-size')).toBe('13px')
        expect(await style(label, 'color')).toBe(colours.muted)
        expect(await style(save, 'background-color')).toBe(ACCENT)
        expect(await style(save, 'border-top-color')).toBe(ACCENT)
        expect(await style(save, 'color')).toBe(WHITE)
        expect(await style(save, 'height')).toBe('36px')
        expect(await style(cancel, 'background-color')).toBe(TRANSPARENT)
        expect(await style(cancel, 'border-top-color')).toBe(colours.rule)
        expect(await style(cancel, 'color')).toBe(colours.ink)
        expect(await style(cancel, 'height')).toBe('36px')
        const inputBox = await box(input)
        const saveBox = await box(save)
        const cancelBox = await box(cancel)
        expect(saveBox.x).toBeLessThan(cancelBox.x)
        if (viewport.width > 720) {
          expect(saveBox.x).toBeGreaterThanOrEqual(inputBox.x + inputBox.width)
          expect(
            Math.abs(saveBox.y + saveBox.height - (inputBox.y + inputBox.height)),
          ).toBeLessThanOrEqual(1)
        } else {
          expect(saveBox.y).toBeGreaterThanOrEqual(inputBox.y + inputBox.height)
          expect(saveBox.x).toBeLessThan(inputBox.x + 20)
        }
        await input.fill('')
        await save.click()
        const message = page.getByRole('alert').filter({ hasText: ERROR })
        expect(await style(input, 'border-left-color')).toBe(ACCENT)
        expect(await style(input, 'border-bottom-color')).toBe(ACCENT)
        expect(await style(message, 'font-size')).toBe('13px')
        expect(await style(message, 'color')).toBe(ACCENT_TEXT[scheme])
        const messageBox = await box(message)
        expect(messageBox.y).toBeGreaterThanOrEqual(saveBox.y + saveBox.height - 1)
      })

      test('toast', async ({ page }) => {
        await addTask(page, 'A')
        await page.getByRole('button', { name: 'Xoá: A' }).click()
        const toast = page.getByRole('status').filter({ hasText: 'Đã xoá' })
        await expect(toast).toBeVisible()
        await page.waitForTimeout(400)
        expect(await style(toast, 'background-color')).toBe(colours.ink)
        expect(await style(toast, 'color')).toBe(colours.paper)
        const toastBox = await box(toast)
        expect(Math.abs(toastBox.x + toastBox.width / 2 - viewport.width / 2)).toBeLessThanOrEqual(
          1,
        )
        expect(Math.abs(viewport.height - 24 - (toastBox.y + toastBox.height))).toBeLessThanOrEqual(
          1,
        )
        expect(toastBox.width).toBeLessThanOrEqual(viewport.width - 32)
        const undo = page.getByRole('button', { name: 'Hoàn tác' })
        expect(await style(undo, 'font-weight')).toBe('700')
        expect(await style(undo, 'text-decoration-line')).toBe('underline')
        expect(await style(undo, 'color')).toBe(colours.paper)
      })
    })
  }
}
