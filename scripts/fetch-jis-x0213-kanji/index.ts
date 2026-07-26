import { writeFileSync } from 'node:fs'
import { unzipSync } from 'fflate'

// kIRG_JSource（UAX #38: Unicode Han Database）のうち、JIS X 0213 第1〜第4水準に該当する接頭辞
// J0=X0208水準1-2, J3/J3A/J13/J13A=水準3, J4/J14/JA3/JA4=水準4
// J1単体・JA単体・JARIB・JH・JK・JMJはJIS X 0213ではなく別の規格・データベース（順にJIS X 0212、1993年ベンダー統一漢字集合、ARIB STD-B24、Hanyo-Denshi、国字コレクション、文字情報基盤）由来の文字なので対象外
const INCLUDE_PREFIXES = [
  'J0-',
  'J3-',
  'J3A-',
  'J13-',
  'J13A-',
  'J4-',
  'J14-',
  'JA3-',
  'JA4-',
]

const res = await fetch('https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip')
const zipBytes = new Uint8Array(await res.arrayBuffer())
const unzipped = unzipSync(zipBytes, {
  filter: (file) => file.name === 'Unihan_IRGSources.txt',
})
const irgSourcesText = new TextDecoder().decode(unzipped['Unihan_IRGSources.txt'])

const codePoints: number[] = []

for (const line of irgSourcesText.split('\n')) {
  if (line.startsWith('#')) continue
  const [codePointText, fieldName, fieldValue] = line.split('\t')
  if (fieldName !== 'kIRG_JSource') continue
  if (!INCLUDE_PREFIXES.some((prefix) => fieldValue.startsWith(prefix))) continue
  codePoints.push(parseInt(codePointText.slice(2), 16))
}

writeFileSync(
  new URL('./kanji.json', import.meta.url),
  JSON.stringify(codePoints),
)

console.log('Kanji:', codePoints.length)
