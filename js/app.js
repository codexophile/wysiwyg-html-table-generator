(function (global) {
  const state = {
    rows: 4,
    cols: 5,
    cells: [],
    selected: null,
    selSet: new Set(),
    editing: null,
    suppressInlineStyles: false,
    tableProps: {
      width: '100%',
      collapse: 'collapse',
      spacing: 0,
      caption: '',
    },
  };

  function makeCellData(r, c) {
    return {
      row: r,
      col: c,
      content: '',
      colspan: 1,
      rowspan: 1,
      isHeader: false,
      bg: '',
      fg: '',
      fontsize: '14px',
      fontweight: 'normal',
      fontstyle: 'normal',
      align: 'left',
      valign: 'top',
      width: '',
      height: '',
      padding: '6',
      borderWidth: '1',
      borderStyle: 'solid',
      borderColor: '#888888',
    };
  }

  function initTable(rows, cols) {
    state.rows = rows;
    state.cols = cols;
    state.cells = [];
    for (let r = 0; r < rows; r++) {
      state.cells.push([]);
      for (let c = 0; c < cols; c++) state.cells[r].push(makeCellData(r, c));
    }
    state.selected = null;
    state.selSet = new Set();
    state.editing = null;
    if (window.Table && typeof window.Table.renderTable === 'function')
      window.Table.renderTable();
  }

  const PRESETS = {
    simple: {},
    striped: {
      rowFn: (r, cd) => {
        if (r % 2 === 0) cd.bg = '#f5f7fa';
      },
    },
    minimal: {
      border: { width: '0', color: 'transparent' },
      header: { bg: '#f0f0f0' },
    },
    dark: { header: { bg: '#1a1a2e', fg: '#ffffff', isHeader: true } },
  };

  global.App = { state, makeCellData, initTable, PRESETS };
})(window);
