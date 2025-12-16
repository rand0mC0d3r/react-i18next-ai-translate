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
  let content = '...no data yet'

  if (interfaceMap.originalInput) {
    content = Object.entries(JSON.parse(interfaceMap.originalInput)).map((item, index) => `{gray-fg}${item[0]}{/} = ${item[1]}`).join('\n')
  }

  grid.set(...sourceInput, blessed.box, {
    label: 'Source Input',
    tags: true,
    content,
  })
}

const createSourceOutput = (grid, interfaceMap) => {
  let content = '...no data yet'

  if (interfaceMap.out) {
    content = Object.entries(JSON.parse(interfaceMap.out)).map((item, index) => `{gray-fg}${item[0]}{/} = ${item[1]}`).join('\n')
  }

  grid.set(...sourceOutput, blessed.box, {
    label: 'Output',
    tags: true,
    content,
  })
}

const createSourceReference = (grid, interfaceMap) => {
  let content = '...no data yet'

  if (interfaceMap.reference) {
    content = Object.entries(JSON.parse(interfaceMap.reference)).map((item, index) => `{gray-fg}${item[0]}{/} = ${item[1]}`).join('\n')
  }

  grid.set(...sourceReference, blessed.box, {
    label: 'Reference',
    tags: true,
    content,
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
  let screen = blessed.screen({
    smartCSR: true,
    title: 'Blessed Demo',
    mouse: true,
    keys: true,
    forceMouse: true,   // ← important on Windows
    fullUnicode: true,
  })

  screen.key(['q', 'C-c', 'escape'], () => process.exit(0));

const content = blessed.box({
  parent: screen,
  top: 0,
  left: 0,
  width: 130,
  height: '90%',
  label: ' Scrollable Content ',
  border: 'line',
  scrollable: true,
  alwaysScroll: true,
  keys: true,
  vi: true,
  mouse: true,
  scrollbar: {
    ch: ' ',
    track: { bg: 'grey' },
    style: { bg: 'blue' },
  },
  content: Array.from({ length: 400 }, (_, i) =>
    `Line ${i + 1}: entropy is undefeated.`
  ).join('\n'),
});

// Button container
const buttons = blessed.box({
  parent: screen,
  bottom: 0,
  left: 0,
  width: '80%',
  height: '10%',
});

// Button helper
function makeButton({ left, text, onPress }) {
  const btn = blessed.button({
    parent: buttons,
    mouse: true,
    keys: true,
    clickable: true,     // ← add this
    shrink: true,
    padding: { left: 2, right: 2, top: 0, bottom: 0 },
    left,
    // top: 1,
    name: text,
    content: text,
    border: 'bg',
    style: {
      fg: 'white',
      bg: 'black',
      border: { fg: 'cyan' },
      focus: {
        bg: 'blue',
        border: { fg: 'white' },
      },
      hover: {
        bg: 'green',
      },
    },
  });

  btn.on('press', onPress);
  return btn;
}

// Buttons
makeButton({
  left: 0,
  text: 'Add Line',
  onPress: () => {
    content.pushLine(`New line @ ${new Date().toLocaleTimeString()}`);
    content.setScrollPerc(100);
    screen.render();
  },
});

makeButton({
  left: 13,
  text: 'Clear',
  onPress: () => {
    content.setContent('');
    screen.render();
  },
});

makeButton({
  left: 28,
  text: 'Exit',
  onPress: () => process.exit(0),
});
makeButton({
  left: 38,
  text: 'Exit',
  onPress: () => process.exit(0),
});
makeButton({
  left: 48,
  text: 'Exit',
  onPress: () => process.exit(0),
});
makeButton({
  left: 58,
  text: 'Exit',
  onPress: () => process.exit(0),
});
makeButton({
  left: 68,
  text: 'Exit',
  onPress: () => process.exit(0),
});
makeButton({
  left: 78,
  text: 'Exit',
  onPress: () => process.exit(0),
});


  makeButton({
  left: 88,
  text: 'Exit',
  onPress: () => process.exit(0),
});
makeButton({
  left: 98,
  text: 'Exit',
  onPress: () => process.exit(0),
});
makeButton({
  left: 108,
  text: 'Exit',
  onPress: () => process.exit(0),
});
makeButton({
  left: 118,
  text: 'Exit',
  onPress: () => process.exit(0),
});



// Focus order
content.focus();



// Render
screen.render();



  // var grid = new contrib.grid({
  //   rows, cols, screen,
  //   hideBorder: false,
  //   keys: true,
  //   mouse: true,
  //   scrollable: true
  // });

  // createSourceInput(grid, interfaceMap);
  // createSourceOutput(grid, interfaceMap);
  // createSourceReference(grid, interfaceMap);
  // createMismatchesTreeNg(grid, interfaceMap);
  // createMismatchesTree(grid, interfaceMap);
  // createCandidates(grid, interfaceMap);
  // createLogsBox(grid, interfaceMap);

  // screen.key(['q', 'C-c'], () => {
  //   screen.destroy()
  //   process.exit(1)
  // })

  // screen.render()
}
