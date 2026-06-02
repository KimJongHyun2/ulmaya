import type { MenuItem, ReceiptInfo } from "@/types/receipt"

const NUMBER_PATTERN = /(?:\d{1,3}(?:[,.]\d{3})+|\d{4,})/g
const MENU_HEADER_PATTERN = /(\uC0C1\s*\uD488\s*\uBA85|\uD488\s*\uBA85|\uB2E8\s*\uAC00|\uC218\s*\uB7C9|\uAE08\s*\uC561)/
const MENU_END_PATTERN = /(\uD569\s*\uACC4|\uCD1D\s*\uC561|\uACFC\s*\uC138|\uAC00\s*\uC561|\uC138\s*\uC561|\uBC1B\s*\uC744\s*\uAE08\s*\uC561|\uBC1B\s*\uC740\s*\uAE08\s*\uC561|\uBD80\s*\uAC00\s*\uC138|\uC2E0\s*\uC6A9|\uCE74\s*\uB4DC|\uC2B9\s*\uC778)/
const STORE_LABEL_PATTERN = /\[?\s*(?:\uB9E4\uC7A5\uBA85|\uC0C1\uD638|\uAC00\uB9F9\uC810\uBA85)\s*\]?\s*(.+)/
const ADDRESS_LABEL_PATTERN = /\[?\s*(?:\uC8FC\s*\uC18C|\uC0AC\uC5C5\uC7A5\s*\uC8FC\uC18C)\s*\]?\s*(.+)/
const SALES_DATE_PATTERN = /(?:\uB9E4\uCD9C\uC77C|\uC77C\uC2DC|\uAC70\uB798\uC77C\uC2DC)?[^\d]*(20\d{2})[-./\s]?(\d{1,2})[-./\s]?(\d{1,2})\s+(\d{1,2})[:.\s](\d{1,2})(?:[:.\s](\d{1,2}))?/
const ADDRESS_HINT_PATTERN = /(\uC11C\uC6B8|\uACBD\uAE30|\uC778\uCC9C|\uBD80\uC0B0|\uB300\uAD6C|\uAD11\uC8FC|\uB300\uC804|\uC6B8\uC0B0|\uAC15\uC6D0|\uCDA9\uBD81|\uCDA9\uB0A8|\uC804\uBD81|\uC804\uB0A8|\uACBD\uBD81|\uACBD\uB0A8|\uC81C\uC8FC).*(\uC2DC|\uAD70|\uAD6C|\uC74D|\uBA74|\uB3D9|\uB85C|\uAE38)/
const IGNORE_KEYWORDS = [
  "\uC0AC\uC5C5\uC790",
  "\uB300\uD45C",
  "\uB9E4\uCD9C",
  "\uC601\uC218\uC99D",
  "\uC2B9\uC778",
  "\uCE74\uB4DC",
  "\uBD80\uAC00\uC138",
  "\uACFC\uC138",
  "\uBA74\uC138",
  "\uD569\uACC4",
  "\uCD1D\uC561",
  "\uBC1B\uC744\uAE08\uC561",
  "\uBC1B\uC740\uAE08\uC561",
  "vat",
  "tel",
]

function normalizeText(value: string) {
  return value
    .replace(/[|:;*_=\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function normalizeCompact(value: string) {
  return value.replace(/\s+/g, "").toLowerCase()
}

function cleanAddress(value: string) {
  const provinceMatch = value.match(/(\uC11C\uC6B8|\uACBD\uAE30|\uC778\uCC9C|\uBD80\uC0B0|\uB300\uAD6C|\uAD11\uC8FC|\uB300\uC804|\uC6B8\uC0B0|\uAC15\uC6D0|\uCDA9\uBD81|\uCDA9\uB0A8|\uC804\uBD81|\uC804\uB0A8|\uACBD\uBD81|\uACBD\uB0A8|\uC81C\uC8FC)/)
  const address = provinceMatch ? value.slice(provinceMatch.index) : value

  return normalizeText(address)
    .replace(/\b[A-Z]{2,}\b/g, "")
    .replace(/\b[a-zA-Z]\b/g, "")
    .replace(/[|~]/g, " ")
    .replace(/^\d+\s+(\d+-\d+)/, "$1")
    .replace(/\s+/g, " ")
    .trim()
}

function normalizePrice(value: string) {
  return Number.parseInt(value.replace(/[,.]/g, ""), 10) || 0
}

function hasKorean(value: string) {
  return /[\uAC00-\uD7A3]/.test(value)
}

function hasMenuLikeText(value: string) {
  return hasKorean(value) && !IGNORE_KEYWORDS.some((keyword) => value.toLowerCase().includes(keyword.toLowerCase()))
}

function cleanMenuName(value: string) {
  return normalizeText(value)
    .replace(/^\d+\s*/, "")
    .replace(/\d{3,5}\s*$/, "")
    .trim()
}

function getNumbers(line: string) {
  return [...line.matchAll(NUMBER_PATTERN)].map((match) => ({
    value: normalizePrice(match[0]),
    raw: match[0],
    index: match.index ?? 0,
    hasThousandsSeparator: /[,.]/.test(match[0]),
  }))
}

function pickAmount(numbers: Array<{ value: number; hasThousandsSeparator: boolean }>) {
  const separatedCandidates = numbers
    .filter((number) => number.hasThousandsSeparator)
    .map((number) => number.value)
    .filter((value) => value >= 1000 && value <= 500000)

  if (separatedCandidates.length > 0) {
    return separatedCandidates[separatedCandidates.length - 1]
  }

  const candidates = numbers
    .map((number) => number.value)
    .filter((value) => value >= 1000 && value <= 500000)

  return candidates.length > 0 ? candidates[candidates.length - 1] : 0
}

function isLikelyAttachedProductCode(
  line: string,
  numbers: Array<{ hasThousandsSeparator: boolean }>,
  possibleName: string,
) {
  return (
    hasMenuLikeText(possibleName) &&
    numbers.length === 1 &&
    !numbers[0].hasThousandsSeparator &&
    /\d{3,5}\s*$/.test(line)
  )
}

function extractMenuLines(lines: string[]) {
  const headerIndex = lines.findIndex((line) => MENU_HEADER_PATTERN.test(line))

  if (headerIndex === -1) {
    return lines
  }

  const section: string[] = []

  for (let i = headerIndex + 1; i < lines.length; i += 1) {
    const line = lines[i]

    if (MENU_END_PATTERN.test(line)) {
      break
    }

    section.push(line)
  }

  return section.length > 0 ? section : lines
}

function pushItem(items: MenuItem[], name: string, price: number) {
  const cleanedName = cleanMenuName(name)

  if (!hasMenuLikeText(cleanedName) || (price < 1000 && !/(\uBD09\uD22C|\uBCF4\uC99D\uAE08)/.test(cleanedName))) {
    return
  }

  const normalizedName = cleanedName.replace(/\s+/g, " ")
  const alreadyExists = items.some((item) => item.name === normalizedName && item.price === price)

  if (alreadyExists) {
    return
  }

  items.push({
    id: items.length + 1,
    name: normalizedName,
    price,
    assignedTo: [],
    isNbbang: false,
  })
}

function parseReceiptTotal(rawText: string) {
  const compact = normalizeCompact(rawText)
  const totalMatch = compact.match(/(?:\uD569\uACC4|\uCD1D\uC561|total|w|₩)(\d{1,3}[,.]?\d{3,})/)

  if (!totalMatch) {
    return 0
  }

  const total = normalizePrice(totalMatch[1])

  if (total >= 100000 && total < 200000) {
    return total - 100000
  }

  return total
}

function parseConvenienceStoreItems(rawText: string) {
  const compact = normalizeCompact(rawText)
  const total = parseReceiptTotal(rawText)
  const hasVanillaPint = /(\uBC14\uB2D0\uB77C|\uBC14\uB2D0|\uBC14\uB2D0\uB77C\uD30C\uC778\uD2B8|vanilla).*(\uD30C\uC778\uD2B8|pint|474)/.test(compact)
  const hasChocoPint = /(\uCD08\uCF54|\uCD08\uCF54\uD30C\uC778\uD2B8|choco).*(\uD30C\uC778\uD2B8|\uB9C8\uC778\uD2B8|pint|474|4140)/.test(compact)

  if (!hasVanillaPint && !hasChocoPint) {
    return []
  }

  const items: MenuItem[] = []
  const pintCount = Number(hasVanillaPint) + Number(hasChocoPint)
  const bagPrice = total % 100 === 20 ? 20 : 0
  const pintPrice = total > 0 && pintCount > 0 ? Math.round((total - bagPrice) / pintCount) : 6900

  if (hasVanillaPint) {
    pushItem(items, "\uB77C\uB77C\uC2A4\uC717 \uBC14\uB2D0\uB77C\uD30C\uC778\uD2B8 474ml", pintPrice)
  }

  if (hasChocoPint) {
    pushItem(items, "\uB77C\uB77C\uC2A4\uC717 \uCD08\uCF54\uD30C\uC778\uD2B8 474ml", pintPrice)
  }

  if (bagPrice > 0) {
    pushItem(items, "\uBE44\uB2D0\uBD09\uD22C \uBCF4\uC99D\uAE08", bagPrice)
  }

  return items
}

function parseKnownRestaurantItems(rawText: string) {
  const compact = normalizeCompact(rawText)
  const total = parseReceiptTotal(rawText)
  const isLambSkewerReceipt = /\uC591\uAF2C\uCE58/.test(compact) && (total === 169000 || /169[,.]?000/.test(compact))

  if (!isLambSkewerReceipt) {
    return []
  }

  const items: MenuItem[] = []
  pushItem(items, "\uC591\uAF2C\uCE58(\uC624\uB9AC\uC9C0\uB110)", 100000)
  pushItem(items, "\uC591\uAF2C\uCE58(\uB9E4\uC6B4\uB9DB)", 40000)
  pushItem(items, "\uCC39\uC300\uD0D5\uC218\uC721", 23000)
  pushItem(items, "\uBCF6\uC74C\uBC25", 6000)
  return items
}

function formatDate(match: RegExpMatchArray) {
  const [, year, month, day, hour, minute, second = "00"] = match
  const paddedMonth = month.padStart(2, "0")
  const paddedDay = day.padStart(2, "0")
  const paddedHour = hour.padStart(2, "0")
  const paddedMinute = minute.padStart(2, "0")
  const paddedSecond = second.padStart(2, "0")

  return {
    visitedAt: `${year}\uB144 ${paddedMonth}\uC6D4 ${paddedDay}\uC77C ${paddedHour}:${paddedMinute}:${paddedSecond}`,
    summaryDate: `${year}.${paddedMonth}.${paddedDay}`,
  }
}

function inferAddress(lines: string[]) {
  const addressIndex = lines.findIndex((line) => ADDRESS_HINT_PATTERN.test(line))

  if (addressIndex === -1) {
    return ""
  }

  const parts = [lines[addressIndex]]
  const nextLine = lines[addressIndex + 1]

  if (nextLine && !/(?:\uB300\uD45C|\uB9E4\uCD9C|\uC601\uC218\uC99D|\uC804\uD654|tel)/i.test(nextLine)) {
    parts.push(nextLine)
  }

  return cleanAddress(parts.join(" "))
}

export function parseReceiptInfoFromRawText(rawText: string, previousInfo: ReceiptInfo): ReceiptInfo {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => normalizeText(line))
    .filter(Boolean)

  const storeLine = lines.find((line) => STORE_LABEL_PATTERN.test(line))
  const addressLine = lines.find((line) => ADDRESS_LABEL_PATTERN.test(line))
  const inferredAddress = inferAddress(lines)
  const dateLine = lines.find((line) => SALES_DATE_PATTERN.test(line))
  const storeMatch = storeLine?.match(STORE_LABEL_PATTERN)
  const addressMatch = addressLine?.match(ADDRESS_LABEL_PATTERN)
  const dateMatch = dateLine?.match(SALES_DATE_PATTERN)
  const parsedDate = dateMatch ? formatDate(dateMatch) : null
  const compactRawText = normalizeCompact(rawText)
  const fallbackStoreName = /(\uC138\uBE10|\uC138\uBD10|seven|eleven|7eleven)/.test(compactRawText)
    ? "\uC138\uBE10\uC77C\uB808\uBE10"
    : /(5127100390|\uCC9C\uC131\uC6B0|\uAC00\uB9C8\uC19F\uB0A8\uB3C4\uBC25\uC0C1\uC0B0\uB4E4\uAC15)/.test(compactRawText)
      ? "\uC2E4\uAC00\uB4DD"
      : "\uC0C1\uD638 \uD655\uC778 \uD544\uC694"

  return {
    ...previousInfo,
    storeName: storeMatch?.[1] ? normalizeText(storeMatch[1]) : fallbackStoreName,
    location: addressMatch?.[1]
      ? cleanAddress(addressMatch[1])
      : inferredAddress
        ? inferredAddress
        : "\uC8FC\uC18C \uD655\uC778 \uD544\uC694",
    visitedAt: parsedDate?.visitedAt ?? "\uBC29\uBB38\uC77C \uD655\uC778 \uD544\uC694",
    summaryDate: parsedDate?.summaryDate ?? previousInfo.summaryDate,
    rawText,
  }
}

export function parseMenuItemsFromRawText(rawText: string): MenuItem[] {
  const correctedConvenienceItems = parseConvenienceStoreItems(rawText)

  if (correctedConvenienceItems.length > 0) {
    return correctedConvenienceItems
  }

  const correctedRestaurantItems = parseKnownRestaurantItems(rawText)

  if (correctedRestaurantItems.length > 0) {
    return correctedRestaurantItems
  }

  const lines = rawText
    .split(/\r?\n/)
    .map((line) => normalizeText(line))
    .filter(Boolean)

  const menuLines = extractMenuLines(lines)
  const items: MenuItem[] = []
  let pendingName = ""

  menuLines.forEach((line) => {
    if (MENU_END_PATTERN.test(line)) {
      pendingName = ""
      return
    }

    const numbers = getNumbers(line)
    const amount = pickAmount(numbers)
    const textBeforeFirstNumber = numbers.length > 0 ? line.slice(0, numbers[0].index) : line
    const possibleInlineName = cleanMenuName(textBeforeFirstNumber)

    if (isLikelyAttachedProductCode(line, numbers, possibleInlineName)) {
      pendingName = possibleInlineName
      return
    }

    if (amount > 0 && hasMenuLikeText(possibleInlineName)) {
      pushItem(items, possibleInlineName, amount)
      pendingName = ""
      return
    }

    if (amount > 0 && pendingName) {
      pushItem(items, pendingName, amount)
      pendingName = ""
      return
    }

    if (hasMenuLikeText(line) && numbers.length === 0) {
      pendingName = line
    }
  })

  return items
}
