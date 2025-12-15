import blessed from 'blessed';
import contrib from 'blessed-contrib';
import 'dotenv/config';

export async function createInterface(interfaceMap) {
  let screen = blessed.screen()
  const rows = 20
  const cols = 20

  var grid = new contrib.grid({ rows, cols, screen, hideBorder: false });

  grid.set(0, 0, 1, 4, blessed.box, {
    label: 'Target Languages ' + `[${interfaceMap.languages.length}]`,
    style: {
      fg: 'white',
      bg: 'black',
      padding: 1,
    },
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
        'source': { name: `source: ${m.source}` },

        'opinion': { name: `opinion: ${m.opinion}` },
        'opinions': { name: `opinions: ${m.opinions?.join()}` },

        'translations': {
          name: `translations: ${m.translations.length}`,
          extended: true,
          children: m.translations.reduce((acc, t, i) => {
            acc[`t${i + 1}`] = { name: t };
            return acc;
          }, {})
        },
        'result': { name: `result: ${m.result}` },
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
