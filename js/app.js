(function (global) {
  const STORAGE_KEY = 'wysiwyg-html-table-generator-state-v1';

  const DEFAULT_TABLE_PROPS = {
    width: '100%',
    collapse: 'collapse',
    spacing: 0,
    caption: '',
  };

  const state = {
    rows: 4,
    cols: 5,
    cells: [],
    selected: null,
    selSet: new Set(),
    editing: null,
    suppressInlineStyles: false,
    preserveNoStyles: true,
    tableProps: { ...DEFAULT_TABLE_PROPS },
  };

  function clampInt(value, min, max, fallback) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
  }

  function normalizeTableProps(props) {
    return {
      ...DEFAULT_TABLE_PROPS,
      ...(props && typeof props === 'object' ? props : {}),
    };
  }

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
      fontsize: '',
      fontweight: '',
      fontstyle: '',
      align: '',
      valign: '',
      width: '',
      height: '',
      padding: '',
      borderWidth: '',
      borderStyle: '',
      borderColor: '',
    };
  }

  function normalizeCellData(source, r, c, rows, cols) {
    const cell = makeCellData(r, c);
    if (!source || typeof source !== 'object') return cell;
    cell.content = source.content == null ? '' : String(source.content);
    cell.colspan = clampInt(source.colspan, 1, cols - c, 1);
    cell.rowspan = clampInt(source.rowspan, 1, rows - r, 1);
    cell.isHeader = !!source.isHeader;
    [
      'bg',
      'fg',
      'fontsize',
      'fontweight',
      'fontstyle',
      'align',
      'valign',
      'width',
      'height',
      'padding',
      'borderWidth',
      'borderStyle',
      'borderColor',
    ].forEach(key => {
      if (source[key] == null) return;
      cell[key] = String(source[key]);
    });
    return cell;
  }

  function buildCells(rows, cols, sourceCells) {
    const cells = [];
    for (let r = 0; r < rows; r++) {
      cells.push([]);
      for (let c = 0; c < cols; c++) {
        cells[r].push(
          normalizeCellData(sourceCells?.[r]?.[c], r, c, rows, cols),
        );
      }
    }
    return cells;
  }

  function resetTransientState() {
    state.selected = null;
    state.selSet = new Set();
    state.editing = null;
  }

  function initTable(rows, cols) {
    state.rows = rows;
    state.cols = cols;
    state.cells = buildCells(rows, cols);
    resetTransientState();
    if (window.Table && typeof window.Table.renderTable === 'function')
      window.Table.renderTable();
  }

  function createPersistedSnapshot() {
    return {
      version: 1,
      rows: state.rows,
      cols: state.cols,
      cells: state.cells,
      tableProps: state.tableProps,
      preserveNoStyles: state.preserveNoStyles,
    };
  }

  function saveState() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(createPersistedSnapshot()),
      );
    } catch (err) {
      console.warn('saveState', err);
    }
  }

  function loadPersistedState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const snapshot = JSON.parse(raw);
      if (!snapshot || typeof snapshot !== 'object') return false;

      const rows = clampInt(snapshot.rows, 1, 20, 4);
      const cols = clampInt(snapshot.cols, 1, 12, 5);

      state.rows = rows;
      state.cols = cols;
      state.cells = buildCells(rows, cols, snapshot.cells);
      state.tableProps = normalizeTableProps(snapshot.tableProps);
      state.preserveNoStyles =
        snapshot.preserveNoStyles === false ? false : true;
      resetTransientState();
      return true;
    } catch (err) {
      console.warn('loadPersistedState', err);
      return false;
    }
  }

  function bootstrapTable() {
    if (!loadPersistedState()) initTable(4, 5);
    else if (window.Table && typeof window.Table.renderTable === 'function') {
      window.Table.renderTable();
    }
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

  global.App = {
    state,
    makeCellData,
    initTable,
    PRESETS,
    saveState,
    loadPersistedState,
    bootstrapTable,
  };
})(window);
