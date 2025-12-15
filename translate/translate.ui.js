import blessed from 'blessed';
import contrib from 'blessed-contrib';
import 'dotenv/config';
import { mocks } from './utils.js';

const rows = 21
const cols = 21

const sourceInput = [0, 0, 7, 5]
const sourceOutput = [7, 0, 7, 5]
const sourceReference = [14, 0, 7, 5]

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
  grid.set(...sourceInput, blessed.box, {
    label: 'Source Input',
    content: interfaceMap.originalInput || '...no data yet',
  })
}

const createSourceOutput = (grid, interfaceMap) => {
  grid.set(...sourceOutput, blessed.box, {
    label: 'Output',
    content: interfaceMap.out || '...no data yet',
  })
}

const createSourceReference = (grid, interfaceMap) => {
  grid.set(...sourceReference, blessed.box, {
    label: 'Reference',
    content: interfaceMap.reference || '...no data yet',
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
      6 + col * boxWidth,
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

const createLogsBox = (grid, interfaceMap) => {
  const coords = [rows - 4, 13, 4, 8]

  grid.set(...coords, blessed.box, {
    label: 'Logs',
    tags: true,
    style: {
      fg: 'white',
      bg: 'black',
      padding: 1,
    },
    content: interfaceMap.logs.join("\n") || '...no logs yet'
  })
}

const createCandidates = (grid, interfaceMap) => {
  const coords = [rows - 4, 5, 4, 8]

  const candidates = grid.set(...coords, blessed.box, {
    label: 'Candidates' + ` [${interfaceMap.candidates}] [active: ${interfaceMap.activeCandidates.length}] [usingMocks: ${mocks ? 'YES' : 'NO'}]`,
    tags: true,
    style: {
      fg: 'white',
      bg: 'black',
      padding: 1,
    }
  })
   candidates.setContent(`${Array(interfaceMap.candidates).fill(0)
      .map((_, i) => `[${interfaceMap.activeCandidates.includes(i) ? '{green-fg}RUN{/}' : '{red-fg}OFF{/}'}] Candidate ${i + 1}:\n> ${interfaceMap.callsLogs[i]?.length > 0
        ? interfaceMap.callsLogs[i]?.map(log => `[[${log.reason} ${log.status} ${log.model} (${log.duration}ms)]]`).join(', ')
        : 'No calls made.'
      }`).join('\n\n')}`)
}

export async function createInterface(interfaceMap) {
  let screen = blessed.screen()

  var grid = new contrib.grid({ rows, cols, screen, hideBorder: false });

  // createTargetLanguages(grid, interfaceMap);
  createSourceInput(grid, interfaceMap);
  createSourceOutput(grid, interfaceMap);
  createSourceReference(grid, interfaceMap);
  // createMismatchesTree(grid, interfaceMap);
  createMismatchesTreeNg(grid, interfaceMap);

  createCandidates(grid, interfaceMap);
  createLogsBox(grid, interfaceMap);

  screen.render()
}
