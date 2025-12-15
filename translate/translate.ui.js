import blessed from 'blessed';
import contrib from 'blessed-contrib';
import 'dotenv/config';

const rows = 20
const cols = 20

const createTargetLanguages = (grid, interfaceMap) => {
  return grid.set(0, 0, 1, 4, blessed.box, {
    label: 'Target Languages ' + `[${interfaceMap.languages.length}]`,
    style: {
      fg: 'white',
      bg: 'black',
      padding: 1,
    },
    content: interfaceMap.languages.join(', ') + ` (active: ${interfaceMap.activeLanguage})`
  })
}

const createSourceInput = (grid, interfaceMap) => {
  grid.set(0, 0, Math.round((rows - interfaceMap.candidates) / 2) - 1, 5, blessed.box, {
    label: 'Source Input',
    content: interfaceMap.originalInput
  })
}

const createSourceOutput = (grid, interfaceMap) => {
  grid.set(Math.round((rows - interfaceMap.candidates) / 2) -1 , 0, Math.round((rows - interfaceMap.candidates) / 2), 5, blessed.box, {
    label: 'Source Output',
    content: interfaceMap.out || '...no data yet',
  })
}

const createMismatchesTreeNg = (grid, interfaceMap) => {
  const itemsPerColumn = 2
  const boxHeight = 6
  const boxWidth = 5

  interfaceMap.mismatches.forEach((m, i) => {
    const col = Math.floor(i / itemsPerColumn)
    const row = i % itemsPerColumn

    grid.set(
      row * boxHeight,
      5 + col * boxWidth,
      boxHeight,
      boxWidth,
      blessed.box,
      {
        label: m.key,
        border: 'line',
        scrollable: true,
        alwaysScroll: true,
        content:
          `source:\n${m.source}\n\n` +
          `opinion: ${m.opinion}\n` +
          `opinions:\n${(m.opinions || [])
            .map((o, j) => `  [${j + 1}] ${o}`)
            .join('\n')}\n\n` +
          `translations:\n${m.translations
            .map((t, j) => `  [${j + 1}] ${t}`)
            .join('\n')}\n\n` +
          `result: ${m.result}`
      }
    )
  })
}

const createMismatchesTree = (grid, interfaceMap) => {
  const tree = grid.set(0, 5, rows, 10, contrib.tree, {
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
}

export async function createInterface(interfaceMap) {
  let screen = blessed.screen()

  var grid = new contrib.grid({ rows, cols, screen, hideBorder: false });

  // createTargetLanguages(grid, interfaceMap);
  createSourceInput(grid, interfaceMap);
  createSourceOutput(grid, interfaceMap);
  // createMismatchesTree(grid, interfaceMap);
  createMismatchesTreeNg(grid, interfaceMap);

  // Candidates box
  grid.set(rows - interfaceMap.candidates, 0, interfaceMap.candidates, cols, blessed.box, {
    label: 'Candidates' + ` [${interfaceMap.candidates}]`,
    style: {
      fg: 'white',
      bg: 'black',
      padding: 1,
    },
    content: `${Array(interfaceMap.candidates).fill(0)
      .map((_, i) => `Candidate ${i + 1}:\n\t ${interfaceMap.callsLogs[i]?.length > 0
        ? interfaceMap.callsLogs[i]?.map(log => `[[${log.reason} ${log.status} ${log.model} (${log.duration}ms)]]`).join(', ')
        : 'No calls made.'
      }`).join('\n\n')}`
  })
  screen.render()
}
