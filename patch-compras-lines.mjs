// patch-compras-lines.mjs — replaces description input with inventory selector in ComprasTab
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const FILE  = resolve(__dir, 'app', '(dashboard)', 'finance', 'page.tsx')
const NL = '\r\n'

let src = readFileSync(FILE, 'utf8')
let n = 0

function patch(label, old, neo) {
  if (!src.includes(old)) {
    console.error(`[FAIL] Not found: ${label}`)
    console.error('  looking for: ' + JSON.stringify(old.slice(0, 80)))
    process.exit(1)
  }
  src = src.replace(old, neo)
  n++
  console.log(`[OK] ${label}`)
}

// ─── 1. Update table headers ──────────────────────────────────────────────────
patch(
  'table headers',
  `{['Descripción','Cuenta','Item Inv.','Cant.','P. Unit.','Desc.','Subtotal',''].map(h => (`,
  `{['Producto','Cuenta','Cant.','P. Unit.','Desc.','Subtotal',''].map(h => (`
)

// ─── 2. Replace description <td> with combined selector + optional input ──────
// Old: a simple input for free-text description
const OLD_DESC_TD =
  `<td style={{ padding: '6px 8px' }}>\r\n` +
  `                          <input value={line.description}\r\n` +
  `                            onChange={e => updatePurchaseLine(i, 'description', e.target.value)}\r\n` +
  `                            placeholder="Producto"\r\n` +
  `                            style={{ width: 120, padding: '6px 8px', background: '#1a1a1e', border: '1px solid #2a2a30', borderRadius: 6, color: '#f0ede8', fontSize: 12, outline: 'none', fontFamily: 'Outfit,sans-serif' }} />\r\n` +
  `                        </td>`

const NEW_DESC_TD =
  `<td style={{ padding: '6px 8px' }}>\r\n` +
  `                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>\r\n` +
  `                            <select\r\n` +
  `                              value={line.inventory_item_id}\r\n` +
  `                              onChange={e => {\r\n` +
  `                                const item = inventoryItems.find((it: any) => it.id === e.target.value)\r\n` +
  `                                updatePurchaseLine(i, 'inventory_item_id', e.target.value)\r\n` +
  `                                updatePurchaseLine(i, 'description', item?.product_name || item?.name || '')\r\n` +
  `                              }}\r\n` +
  `                              style={{ width: 180, padding: '6px 8px', background: '#1a1a1e', border: '1px solid #2a2a30', borderRadius: 6, color: '#f0ede8', fontSize: 12, outline: 'none', fontFamily: 'Outfit,sans-serif' }}>\r\n` +
  `                              <option value="">Seleccionar producto...</option>\r\n` +
  `                              {inventoryItems.map((item: any) => (\r\n` +
  `                                <option key={item.id} value={item.id}>\r\n` +
  `                                  {item.product_name || item.name}{' '}({item.stock || 0} {item.unit || 'u'})\r\n` +
  `                                </option>\r\n` +
  `                              ))}\r\n` +
  `                            </select>\r\n` +
  `                            {line.inventory_item_id && (\r\n` +
  `                              <input\r\n` +
  `                                value={line.description}\r\n` +
  `                                onChange={e => updatePurchaseLine(i, 'description', e.target.value)}\r\n` +
  `                                placeholder="Descripción adicional"\r\n` +
  `                                style={{ width: 180, padding: '4px 8px', background: '#0d0d0f', border: '1px solid #2a2a30', borderRadius: 6, color: '#888', fontSize: 11, outline: 'none', boxSizing: 'border-box', fontFamily: 'Outfit,sans-serif' }} />\r\n` +
  `                            )}\r\n` +
  `                          </div>\r\n` +
  `                        </td>`

patch('description td → inventory selector', OLD_DESC_TD, NEW_DESC_TD)

// ─── 3. Remove the separate inventory_item_id <td> ───────────────────────────
const OLD_INV_TD =
  `<td style={{ padding: '6px 8px' }}>\r\n` +
  `                          <select value={line.inventory_item_id}\r\n` +
  `                            onChange={e => updatePurchaseLine(i, 'inventory_item_id', e.target.value)}\r\n` +
  `                            style={{ width: 120, padding: '6px 8px', background: '#1a1a1e', border: '1px solid #2a2a30', borderRadius: 6, color: '#f0ede8', fontSize: 11, outline: 'none', fontFamily: 'Outfit,sans-serif' }}>\r\n` +
  `                            <option value="">Sin item</option>\r\n` +
  `                            {inventoryItems.map((item: any) => <option key={item.id} value={item.id}>{item.product_name || item.name}</option>)}\r\n` +
  `                          </select>\r\n` +
  `                        </td>`

patch('remove separate inventory_item_id td', OLD_INV_TD, '')

writeFileSync(FILE, src, 'utf8')
console.log(`\nDone — ${n} patches applied.`)
