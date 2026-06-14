import type { MenuItem, ReceiptInfo } from "@/types/receipt"

const PRICE_RE = /\d{1,3}(?:[,.]\d{3})+|\d{4,}/g

const HEADER_RE = /(상품명|품명|메뉴|단가|수량|금액)/
const END_RE = /(합계|총액|총금액|결제금액|받을금액|받은금액|과세|부가세|봉사료|카드|승인)/

const DATE_RE = /20\d{2}[-./]\d{1,2}[-./]\d{1,2}/
const PHONE_RE = /\d{2,4}[-)]?\d{3,4}[-]?\d{4}/
const ADDRESS_RE = /(서울|경기|인천|부산|대구|광주|대전|울산|충북|충남|전북|전남|경북|경남|제주).*(시|군|구|동|로|길)/

const META_RE =
  /(상호|매장명|가맹점|사업자|대표|주소|전화|계산일자|영수증|주문번호|카드|승인|고객용|결제|합계|총금액|총액|소계|과세|부가세|봉사료|매출|금액|단가|수량|품명|상품명|요청사항|찾아오는길|초인종|문앞|오른쪽|올라오셔서|됩니다|경기|오산시|한신대길|양산동|랩실|aisc)/

const FOOD_HINT_RE =
  /(돈까스|돈가스|도련님|제육|덮밥|마요|치킨|불고기|함박|스테이크|국밥|찌개|탕|면|라면|우동|냉면|김밥|볶음밥|비빔밥|떡볶이|튀김|만두|수육|양꼬치|탕수육|피자|파스타|버거|샐러드|커피|라떼|아메리카노|주스|음료|콜라|사이다|배달료|사리|추가)/

function normalize(value: string) {
  return value
    .replace(/[|:;*_=\-]+/g, " ")
    .replace(/[₩\\]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function compact(value: string) {
  return value.replace(/\s+/g, "").toLowerCase()
}

function getLines(rawText: string) {
  return rawText
    .split(/\r?\n/)
    .map(normalize)
    .filter(Boolean)
}

function toPrice(value: string) {
  return Number.parseInt(value.replace(/[,.]/g, ""), 10) || 0
}

function getPrices(line: string) {
  return [...line.matchAll(PRICE_RE)]
    .map((m) => ({
      raw: m[0],
      value: toPrice(m[0]),
      index: m.index ?? 0,
      end: (m.index ?? 0) + m[0].length,
      comma: /[,.]/.test(m[0]),
    }))
    .filter((p) => p.value >= 1000 && p.value <= 500000)
}

function pickPrice(line: string, totalAmount = 0) {
  const prices = getPrices(line)
  if (prices.length === 0) return 0

  const commaPrices = prices.filter((p) => p.comma)
  const picked = commaPrices.length > 0 ? commaPrices.at(-1)!.value : prices.at(-1)!.value

  if (totalAmount > 0 && picked > totalAmount && picked >= 50000) {
    const corrected = Math.round(picked / 10)
    if (corrected >= 1000 && corrected <= totalAmount) return corrected
  }

  return picked
}

function isAmountOnlyLine(line: string) {
  const prices = getPrices(line)
  const stripped = line.replace(/[,\s원]/g, "")
  return prices.length === 1 && /^\d+$/.test(stripped)
}

function cleanMenuName(value: string) {
  return normalize(value)
    .replace(/^(상품명|품명|메뉴|수량|단가|금액)\s*/g, "")
    .replace(/^\d+\s*/g, "")
    .replace(/\d{1,3}(?:[,.]\d{3})+\s*원?$/g, "")
    .replace(/\d{4,}\s*원?$/g, "")
    .replace(/\b(ea|qty|cnt)\b/gi, "")
    .trim()
}

function isHardMetaLine(line: string) {
  const c = compact(line)

  if (!line) return true
  if (/^\d+$/.test(c)) return true
  if (DATE_RE.test(line)) return true
  if (PHONE_RE.test(line)) return true
  if (ADDRESS_RE.test(line)) return true
  if (END_RE.test(line)) return true

  return false
}

function isMenuName(line: string, inMenuSection: boolean) {
  const name = cleanMenuName(line)
  const c = compact(name)

  if (!/[가-힣]/.test(name)) return false
  if (name.length < 2) return false
  if (/^\d+$/.test(c)) return false
  if (isHardMetaLine(name)) return false

  if (FOOD_HINT_RE.test(c)) return true

  if (inMenuSection && !META_RE.test(c)) return true

  return false
}

function pushItem(items: MenuItem[], name: string, price: number) {
  const cleaned = cleanMenuName(name)

  if (!cleaned) return
  if (price < 1000 || price > 500000) return

  const exists = items.some((item) => compact(item.name) === compact(cleaned))
  if (exists) return

  items.push({
    id: items.length + 1,
    name: cleaned,
    price,
    assignedTo: [],
    isNbbang: false,
  })
}

function parseReceiptTotal(rawText: string) {
  const lines = getLines(rawText)
  const totalLine = lines
    .filter((line) => /(총\s*금액|총액|합계|결제\s*금액|받을\s*금액|받은\s*금액)/.test(line))
    .at(-1)

  return totalLine ? pickPrice(totalLine) : 0
}

function getMenuSection(lines: string[]) {
  const headerIndex = lines.findIndex((line) => HEADER_RE.test(line))

  if (headerIndex === -1) {
    return lines.map((line) => ({ line, inMenuSection: false }))
  }

  const result: Array<{ line: string; inMenuSection: boolean }> = []

  for (let i = headerIndex + 1; i < lines.length; i += 1) {
    const line = lines[i]

    if (END_RE.test(line)) break

    result.push({
      line,
      inMenuSection: true,
    })
  }

  return result.length > 0 ? result : lines.map((line) => ({ line, inMenuSection: false }))
}

export function parseMenuItemsFromRawText(rawText: string): MenuItem[] {
  const lines = getLines(rawText)
  const totalAmount = parseReceiptTotal(rawText)
  const sectionLines = getMenuSection(lines)

  const items: MenuItem[] = []
  const pendingNames: string[] = []

  for (const { line, inMenuSection } of sectionLines) {
    if (isHardMetaLine(line)) {
      continue
    }

    if (!inMenuSection && META_RE.test(compact(line)) && !FOOD_HINT_RE.test(compact(line))) {
      continue
    }

    const prices = getPrices(line)
    const price = pickPrice(line, totalAmount)

    if (isAmountOnlyLine(line)) {
      const name = pendingNames.shift()
      if (name) pushItem(items, name, price)
      continue
    }

    if (prices.length > 0 && price > 0) {
      const firstPrice = prices[0]
      const beforePrice = cleanMenuName(line.slice(0, firstPrice.index))
      const afterPrice = cleanMenuName(line.slice(firstPrice.end))

      if (isMenuName(beforePrice, inMenuSection)) {
        pushItem(items, beforePrice, price)
        continue
      }

      if (isMenuName(afterPrice, inMenuSection)) {
        pushItem(items, afterPrice, price)
        continue
      }

      const pendingName = pendingNames.shift()
      if (pendingName) {
        pushItem(items, pendingName, price)
      }

      continue
    }

    if (isMenuName(line, inMenuSection)) {
      pendingNames.push(cleanMenuName(line))
    }
  }

  return items.map((item, index) => ({
    ...item,
    id: index + 1,
  }))
}

export function parseReceiptInfoFromRawText(rawText: string, previousInfo: ReceiptInfo): ReceiptInfo {
  const lines = getLines(rawText)

  const storeLine = lines.find((line) => /(상호|매장명|가맹점명)/.test(line))
  const dateLine = lines.find((line) => DATE_RE.test(line))
  const totalAmount = parseReceiptTotal(rawText)

  const storeName = storeLine
    ? normalize(storeLine.replace(/상호|매장명|가맹점명/g, "").replace(/[：:]/g, ""))
    : previousInfo.storeName || "상호 확인 필요"

  const dateMatch = dateLine?.match(/(20\d{2})[-./](\d{1,2})[-./](\d{1,2})/)

  return {
    ...previousInfo,
    storeName: storeName || "상호 확인 필요",
    location: previousInfo.location || "주소 확인 필요",
    visitedAt: dateLine || previousInfo.visitedAt || "방문일 확인 필요",
    summaryDate: dateMatch
      ? `${dateMatch[1]}.${dateMatch[2].padStart(2, "0")}.${dateMatch[3].padStart(2, "0")}`
      : previousInfo.summaryDate,
    rawText,
    totalAmount: totalAmount || previousInfo.totalAmount,
  }
}