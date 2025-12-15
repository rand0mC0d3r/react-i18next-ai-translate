import blessed from 'blessed';
import contrib from 'blessed-contrib';
import 'dotenv/config';

export async function createInterface(interfaceMap) {
  let screen = blessed.screen()
  const rows = 20
  const cols = 20

  var grid = new contrib.grid({ rows, cols, screen })

  grid.set(0, 0, 1, 4, blessed.box, {
    label: 'Target Languages Now',
    content: interfaceMap.languages.join(', ') + ` (active: ${interfaceMap.activeLanguage})`
  })
  grid.set(1, 0, rows - 1, 4, blessed.box, {
    label: 'Source Input',
    content: interfaceMap.originalInput
  })
  const tree = grid.set(0, 4, rows, 6, contrib.tree, {
    label: 'Mismatches',
    vi: true,
    mouse: true,
    style: {
      fg: 'white',
      selected: {
        bg: 'blue'
      }
    }
  })
  // tree.setData(treeData)
  tree.setData({
    name: 'root',
    extended: true,
    children: interfaceMap.mismatches.map(m => ({
      name: m.key,
      extended: true,
      children: {
        'key': { name: `key: ${m.key}` },
        'source': { name: `source: ${m.source}` },
        'result': { name: `result: ${m.result}` },
        'opinion': { name: `opinion: ${m.opinion}` },
        'opinions': { name: `opinions: ${m.opinions?.join()}` },
        'translations': { name: `trandslatdions: ${m.translations.join()}` },
      }
    }))
  }
  )
  grid.set(0, 10, rows, 10, contrib.log, {
    label: 'Logs',
    content: interfaceMap.logs.join('\n'),
  })
  screen.render()
}
