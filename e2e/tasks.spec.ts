/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const WARNING = 'Trình duyệt đang chặn lưu dữ liệu. Việc bạn thêm sẽ mất khi đóng trang.'
const ERROR = 'Hãy nhập tên việc.'
const PAPER_LIGHT = 'rgb(251, 247, 239)'
const PAPER_DARK = 'rgb(34, 31, 26)'
const INK_LIGHT = 'rgb(46, 42, 36)'
const INK_DARK = 'rgb(241, 233, 218)'
const DONE_LIGHT = 'rgb(119, 108, 93)'
const DONE_DARK = 'rgb(154, 143, 126)'
const ACCENT = 'rgb(194, 85, 45)'

function field(page: Page) {
  return page.getByRole('textbox', { name: 'Việc mới' })
}

async function addTask(page: Page, title: string) {
  await field(page).fill(title)
  await page.getByRole('button', { name: 'Thêm' }).click()
}

async function rowTitles(page: Page) {
  return page.getByRole('listitem').allTextContents()
}

async function refuseSaving(page: Page) {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('refused', 'QuotaExceededError')
    }
  })
}

test.describe('C1 first open', () => {
  test('shows the empty page', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle('Danh sách việc')
    await expect(page.getByRole('heading', { level: 1, name: 'Việc của tôi' })).toBeVisible()
    await expect(field(page)).toBeVisible()
    await expect(page.getByPlaceholder('Thêm việc mới…')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Thêm' })).toBeVisible()
    await expect(page.getByText('Trang này còn trống.')).toBeVisible()
    await expect(page.getByText('Viết việc đầu tiên vào ô phía trên rồi nhấn Thêm.')).toBeVisible()
  })
})

test('C2 adds with Enter and with the button, keeping focus in the field', async ({ page }) => {
  await page.goto('/')
  await field(page).fill('Một')
  await field(page).press('Enter')
  await expect(page.getByRole('listitem')).toHaveCount(1)
  await expect(field(page)).toHaveValue('')
  await expect(field(page)).toBeFocused()
  await field(page).fill('Hai')
  await page.getByRole('button', { name: 'Thêm' }).click()
  await expect(page.getByRole('listitem')).toHaveCount(2)
  await expect(field(page)).toBeFocused()
})

test('C3 shows the error under the field and removes it on typing', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'Việc')
  await field(page).press('Enter')
  const message = page.getByText(ERROR)
  await expect(message).toBeVisible()
  await expect(field(page)).toHaveAttribute('aria-invalid', 'true')
  await expect(field(page)).toHaveCSS('border-top-color', ACCENT)
  const fieldBox = await field(page).boundingBox()
  const messageBox = await message.boundingBox()
  const listBox = await page.getByRole('list').boundingBox()
  expect(messageBox!.y).toBeGreaterThanOrEqual(fieldBox!.y + fieldBox!.height)
  expect(messageBox!.y + messageBox!.height).toBeLessThanOrEqual(listBox!.y)
  await field(page).pressSequentially('a')
  await expect(message).toBeHidden()
  await expect(field(page)).not.toHaveAttribute('aria-invalid', 'true')
})

test('C4 keeps the first 200 typed characters', async ({ page }) => {
  await page.goto('/')
  const typed = 'abcdefghij'.repeat(20) + 'klmno'
  await field(page).pressSequentially(typed)
  await expect(field(page)).toHaveValue(typed.slice(0, 200))
})

test('C5 ticks with the keyboard, keeping focus, and with the mouse', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'Việc')
  const box = page.getByRole('checkbox', { name: 'Đã xong: Việc' })
  const title = page.getByText('Việc', { exact: true })
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  await expect(box).toBeFocused()
  await page.keyboard.press('Space')
  await expect(box).toBeChecked()
  await expect(box).toBeFocused()
  await expect(title).toHaveCSS('text-decoration-line', 'line-through')
  await expect(title).toHaveCSS('color', DONE_LIGHT)
  await page.keyboard.press('Space')
  await expect(box).not.toBeChecked()
  await expect(box).toBeFocused()
  await expect(title).toHaveCSS('text-decoration-line', 'none')
  await expect(title).toHaveCSS('color', INK_LIGHT)
  await box.click()
  await expect(box).toBeChecked()
  await box.click()
  await expect(box).not.toBeChecked()
})

test('C6 orders unfinished above finished', async ({ page }) => {
  await page.goto('/')
  for (const title of ['A', 'B', 'C']) await addTask(page, title)
  await page.getByRole('checkbox', { name: 'Đã xong: A' }).click()
  expect(await rowTitles(page)).toEqual(['B', 'C', 'A'])
  await page.getByRole('checkbox', { name: 'Đã xong: C' }).click()
  expect(await rowTitles(page)).toEqual(['B', 'A', 'C'])
  await page.getByRole('checkbox', { name: 'Đã xong: A' }).click()
  expect(await rowTitles(page)).toEqual(['A', 'B', 'C'])
})

test('C7 keeps tasks across reload and a new page', async ({ page, context }) => {
  await page.goto('/')
  await addTask(page, 'A')
  await addTask(page, 'B')
  await page.getByRole('checkbox', { name: 'Đã xong: A' }).click()
  const expectSameTasks = async (target: Page) => {
    expect(await rowTitles(target)).toEqual(['B', 'A'])
    await expect(target.getByRole('checkbox', { name: 'Đã xong: B' })).not.toBeChecked()
    await expect(target.getByRole('checkbox', { name: 'Đã xong: A' })).toBeChecked()
  }
  await page.reload()
  await expectSameTasks(page)
  await page.close()
  const reopened = await context.newPage()
  await reopened.goto('/')
  await expectSameTasks(reopened)
})

test.describe('C8 storage warning', () => {
  test('warns when saving is refused from the start', async ({ page }) => {
    await refuseSaving(page)
    await page.goto('/')
    const warning = page.getByText(WARNING)
    await expect(warning).toBeVisible()
    const warningBox = await warning.boundingBox()
    const fieldBox = await field(page).boundingBox()
    expect(warningBox!.y + warningBox!.height).toBeLessThanOrEqual(fieldBox!.y)
    await addTask(page, 'Việc')
    await page.getByRole('checkbox', { name: 'Đã xong: Việc' }).click()
    await expect(page.getByRole('checkbox', { name: 'Đã xong: Việc' })).toBeChecked()
    await page.reload()
    await expect(page.getByRole('listitem')).toHaveCount(0)
    await expect(page.getByText(WARNING)).toBeVisible()
  })

  test('follows the latest save attempt', async ({ page }) => {
    await page.addInitScript(() => {
      const realSetItem = Storage.prototype.setItem
      Storage.prototype.setItem = function (key: string, value: string) {
        if ((window as unknown as { refuseSaving?: boolean }).refuseSaving) {
          throw new DOMException('refused', 'QuotaExceededError')
        }
        realSetItem.call(this, key, value)
      }
    })
    await page.goto('/')
    await expect(page.getByText(WARNING)).toBeHidden()
    await page.evaluate(() => {
      ;(window as unknown as { refuseSaving?: boolean }).refuseSaving = true
    })
    await addTask(page, 'Một')
    await expect(page.getByText(WARNING)).toBeVisible()
    await page.evaluate(() => {
      ;(window as unknown as { refuseSaving?: boolean }).refuseSaving = false
    })
    await addTask(page, 'Hai')
    await expect(page.getByText(WARNING)).toBeHidden()
  })
})

type Motion = { row: string; type: string; duration: string }

async function recordMotion(page: Page) {
  await page.evaluate(() => {
    const log: Motion[] = []
    ;(window as unknown as { motionLog: Motion[] }).motionLog = log
    const record = (event: Event) => {
      const target = event.target as Element
      const duration =
        event instanceof AnimationEvent
          ? getComputedStyle(target).animationDuration
          : getComputedStyle(target).transitionDuration
      log.push({ row: target.closest('li')?.textContent ?? '', type: event.type, duration })
    }
    document.addEventListener('animationstart', record, true)
    document.addEventListener('transitionrun', record, true)
  })
}

async function readMotion(page: Page) {
  return page.evaluate(() => (window as unknown as { motionLog: Motion[] }).motionLog)
}

test.describe('C9 motion', () => {
  test('only marking finished moves, for 200 ms, inside that row', async ({ page }) => {
    await page.goto('/')
    await addTask(page, 'A')
    await addTask(page, 'B')
    await field(page).press('Enter')
    await recordMotion(page)
    await addTask(page, 'C')
    await page.waitForTimeout(300)
    expect(await readMotion(page)).toEqual([])
    await page.getByRole('checkbox', { name: 'Đã xong: B' }).click()
    await expect.poll(async () => (await readMotion(page)).length).toBeGreaterThanOrEqual(2)
    await page.waitForTimeout(300)
    const motion = await readMotion(page)
    for (const entry of motion) {
      expect(entry.row).toBe('B')
      expect(entry.duration).toBe('0.2s')
    }
    await page.getByRole('checkbox', { name: 'Đã xong: B' }).click()
    await page.waitForTimeout(300)
    expect((await readMotion(page)).length).toBe(motion.length)
  })

  test('reduced motion shows the end state at once', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await addTask(page, 'A')
    await recordMotion(page)
    await page.getByRole('checkbox', { name: 'Đã xong: A' }).click()
    expect(await readMotion(page)).toEqual([])
    await expect(page.getByRole('checkbox', { name: 'Đã xong: A' })).toBeChecked()
    const title = page.getByText('A', { exact: true })
    await expect(title).toHaveCSS('text-decoration-line', 'line-through')
    await expect(title).toHaveCSS('color', DONE_LIGHT)
  })
})

test.describe('C10 theme and width', () => {
  test('light', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/')
    await addTask(page, 'A')
    await page.getByRole('checkbox', { name: 'Đã xong: A' }).click()
    await expect(page.locator('body')).toHaveCSS('background-color', PAPER_LIGHT)
    await expect(page.locator('body')).toHaveCSS('color', INK_LIGHT)
    await expect(page.getByText('A', { exact: true })).toHaveCSS('color', DONE_LIGHT)
  })

  test('dark', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/')
    await addTask(page, 'A')
    await page.getByRole('checkbox', { name: 'Đã xong: A' }).click()
    await expect(page.locator('body')).toHaveCSS('background-color', PAPER_DARK)
    await expect(page.locator('body')).toHaveCSS('color', INK_DARK)
    await expect(page.getByText('A', { exact: true })).toHaveCSS('color', DONE_DARK)
  })

  test('no sideways scroll at 390 px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const scrollsSideways = () =>
      page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      )
    await page.goto('/')
    expect(await scrollsSideways()).toBe(false)
    await addTask(page, 'x'.repeat(200))
    expect(await scrollsSideways()).toBe(false)
    await page.getByRole('checkbox').click()
    expect(await scrollsSideways()).toBe(false)
  })

  test('no sideways scroll at 390 px with the warning', async ({ page }) => {
    await refuseSaving(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await addTask(page, 'x'.repeat(200))
    await expect(page.getByText(WARNING)).toBeVisible()
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      ),
    ).toBe(false)
  })
})

test.describe('C11 structure', () => {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`desktop layout, ${colorScheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme })
      await page.setViewportSize({ width: 1440, height: 900 })
      await refuseSaving(page)
      await page.goto('/')
      await field(page).press('Enter')
      const fieldBox = await field(page).boundingBox()
      const addBox = await page.getByRole('button', { name: 'Thêm' }).boundingBox()
      expect(addBox!.y).toBeCloseTo(fieldBox!.y, 0)
      const sheet = await page.getByRole('main').boundingBox()
      expect(sheet!.width).toBeLessThanOrEqual(840)
      const heading = page.getByRole('heading', { level: 1 })
      await expect(heading).toHaveCSS('font-size', '34px')
      expect(await heading.evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(/^Georgia/)
      expect(
        await page.locator('body').evaluate((el) => getComputedStyle(el).fontFamily),
      ).toContain('-apple-system')
      await expect(page.getByRole('button', { name: 'Thêm' })).toHaveCSS('background-color', ACCENT)
      await expect(page.getByRole('button', { name: 'Thêm' })).toHaveCSS(
        'color',
        'rgb(255, 255, 255)',
      )
      await expect(page.getByText(WARNING)).toHaveCSS(
        'background-color',
        colorScheme === 'light' ? 'rgb(239, 230, 214)' : 'rgb(46, 42, 35)',
      )
      const error = page.getByText(ERROR)
      await expect(error).toHaveCSS('font-size', '13px')
      await expect(error).toHaveCSS(
        'color',
        colorScheme === 'light' ? 'rgb(169, 70, 31)' : 'rgb(229, 138, 99)',
      )
    })
  }

  test('mobile layout', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    const fieldBox = await field(page).boundingBox()
    const addBox = await page.getByRole('button', { name: 'Thêm' }).boundingBox()
    expect(addBox!.y).toBeGreaterThanOrEqual(fieldBox!.y + fieldBox!.height)
    expect(addBox!.width).toBeCloseTo(fieldBox!.width, 0)
    expect(addBox!.x).toBeCloseTo(fieldBox!.x, 0)
    await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('font-size', '28px')
  })
})

test.describe('C9 motion, more cases', () => {
  test('a rejected add and un-marking move nothing', async ({ page }) => {
    await page.goto('/')
    await addTask(page, 'A')
    await page.getByRole('checkbox', { name: 'Đã xong: A' }).click()
    await page.waitForTimeout(300)
    await recordMotion(page)
    await field(page).press('Enter')
    await expect(page.getByText(ERROR)).toBeVisible()
    await page.getByRole('checkbox', { name: 'Đã xong: A' }).click()
    await expect(page.getByRole('checkbox', { name: 'Đã xong: A' })).not.toBeChecked()
    await page.waitForTimeout(300)
    expect(await readMotion(page)).toEqual([])
  })

  test('finished rows do not move when the page loads', async ({ page }) => {
    await page.goto('/')
    await addTask(page, 'A')
    await page.getByRole('checkbox', { name: 'Đã xong: A' }).click()
    await page.addInitScript(() => {
      const log: Motion[] = []
      ;(window as unknown as { motionLog: Motion[] }).motionLog = log
      const record = (event: Event) => {
        log.push({ row: '', type: event.type, duration: '' })
      }
      document.addEventListener('animationstart', record, true)
      document.addEventListener('transitionrun', record, true)
    })
    await page.reload()
    await expect(page.getByRole('checkbox', { name: 'Đã xong: A' })).toBeChecked()
    await page.waitForTimeout(300)
    expect(await readMotion(page)).toEqual([])
  })
})
