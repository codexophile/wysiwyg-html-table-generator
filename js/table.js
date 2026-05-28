(function (global) {
  const { state } = global.App;
  const { cellKey, formatHtml, q } = global.Utils;

  function isCellVisible(r, c) {
    const cell = state.cells[r]?.[c];
    if (!cell) return false;
    for (let pr = 0; pr < state.rows; pr++)
      for (let pc = 0; pc < state.cols; pc++) {
        const other = state.cells[pr][pc];
        if (pr === r && pc === c) continue;
        if (
          pr <= r &&
          r < pr + other.rowspan &&
          pc <= c &&
          c < pc + other.colspan
        )
          return false;
      }
    return true;
  }

  function updateHtmlOutput() {
    const tbl = q('#tbl-container table');
    const outEl = q('#html-out');
    if (!outEl) return;
    if (!tbl) {
      outEl.textContent = '';
      return;
    }
    try {
      let html = tbl.outerHTML
        .replace(/<div class="resize-handle"[^>]*><\/div>/g, '')
        .replace(/\s*contenteditable="[^"]*"/g, '')
        .replace(/ data-row="[^"]*"/g, '')
        .replace(/ data-col="[^"]*"/g, '')
        .replace(/ class="[^"]*"/g, '');
      outEl.textContent = formatHtml(html);
    } catch (err) {
      console.error('updateHtmlOutput', err);
      outEl.textContent = '';
    }
  }

  function renderTable() {
    const cont = document.getElementById('tbl-container');
    if (!cont) return;
    const tbl = document.createElement('table');
    const tp = state.tableProps;
    if (!state.preserveNoStyles) {
      tbl.style.cssText = `width:${tp.width || 'auto'};border-collapse:${tp.collapse};${tp.collapse === 'separate' ? 'border-spacing:' + tp.spacing + 'px' : ''}`;
    }

    if (tp.caption) {
      const cap = tbl.createCaption();
      cap.textContent = tp.caption;
    }

    for (let r = 0; r < state.rows; r++) {
      const tr = tbl.insertRow();
      for (let c = 0; c < state.cols; c++) {
        if (!isCellVisible(r, c)) continue;
        const cd = state.cells[r][c];
        const tag = cd.isHeader ? 'th' : 'td';
        const cell = document.createElement(tag);
        cell.textContent = cd.content;
        if (cd.colspan > 1) cell.colSpan = cd.colspan;
        if (cd.rowspan > 1) cell.rowSpan = cd.rowspan;
        if (!state.preserveNoStyles) {
          if (cd.align) cell.style.textAlign = cd.align;
          if (cd.valign) cell.style.verticalAlign = cd.valign;
          if (cd.fontsize) cell.style.fontSize = cd.fontsize;
          if (cd.fontweight) cell.style.fontWeight = cd.fontweight;
          if (cd.fontstyle) cell.style.fontStyle = cd.fontstyle;
          if (cd.bg) cell.style.background = cd.bg;
          if (cd.fg) cell.style.color = cd.fg;
          if (cd.padding) cell.style.padding = `${cd.padding}px`;
          if (cd.width) cell.style.width = cd.width;
          if (cd.height) cell.style.height = `${cd.height}px`;
          if (cd.borderWidth) cell.style.borderWidth = `${cd.borderWidth}px`;
          if (cd.borderStyle) cell.style.borderStyle = cd.borderStyle;
          if (cd.borderColor) cell.style.borderColor = cd.borderColor;
        }
        cell.dataset.row = r;
        cell.dataset.col = c;

        const key = cellKey(r, c);
        if (state.selSet.has(key)) cell.classList.add('in-selection');
        if (
          state.selected &&
          state.selected[0] === r &&
          state.selected[1] === c
        )
          cell.classList.add('selected');
        if (state.editing && state.editing[0] === r && state.editing[1] === c) {
          cell.classList.add('editing');
          cell.contentEditable = true;
          cell.focus();
        }

        const rh = document.createElement('div');
        rh.className = 'resize-handle';
        rh.dataset.row = r;
        rh.dataset.col = c;
        cell.appendChild(rh);
        tr.appendChild(cell);
      }
    }
    cont.innerHTML = '';
    cont.appendChild(tbl);
    attachEvents(tbl);
    updateHtmlOutput();
    if (window.UI && typeof window.UI.updateSidePanel === 'function') {
      window.UI.updateSidePanel();
    }
  }

  // Drag / resize state belongs to this module
  let dragSelecting = false,
    dragStart = null,
    resizingCol = null,
    resizeStartX = 0,
    resizeStartW = 0;

  function attachEvents(tbl) {
    if (!tbl) return;
    tbl.querySelectorAll('td,th').forEach(cell => {
      const r = +cell.dataset.row,
        c = +cell.dataset.col;
      cell.addEventListener('mousedown', e => {
        if (e.target.classList.contains('resize-handle')) return;
        if (state.editing) stopEditing();
        if (e.shiftKey && state.selected) {
          const [sr, sc] = state.selected;
          const r0 = Math.min(sr, r),
            r1 = Math.max(sr, r),
            c0 = Math.min(sc, c),
            c1 = Math.max(sc, c);
          state.selSet = new Set();
          for (let rr = r0; rr <= r1; rr++)
            for (let cc = c0; cc <= c1; cc++) state.selSet.add(cellKey(rr, cc));
          renderTable();
          return;
        }
        dragSelecting = true;
        dragStart = [r, c];
        state.selected = [r, c];
        state.selSet = new Set([cellKey(r, c)]);
        renderTable();
        if (window.UI) window.UI.updateSidePanel();
      });
      cell.addEventListener('dblclick', e => {
        if (!e.target.classList.contains('resize-handle')) startEditing(r, c);
      });
      cell.addEventListener('mousemove', e => {
        if (dragSelecting && dragStart) {
          const r0 = Math.min(dragStart[0], r),
            r1 = Math.max(dragStart[0], r),
            c0 = Math.min(dragStart[1], c),
            c1 = Math.max(dragStart[1], c);
          state.selSet = new Set();
          for (let rr = r0; rr <= r1; rr++)
            for (let cc = c0; cc <= c1; cc++) state.selSet.add(cellKey(rr, cc));
          renderTable();
        }
      });
    });

    tbl.querySelectorAll('.resize-handle').forEach(rh => {
      rh.addEventListener('mousedown', e => {
        e.stopPropagation();
        e.preventDefault();
        const c = +rh.dataset.col;
        // User is beginning a column resize — enable inline styles
        if (window.UI && typeof window.UI.enableInlineStyles === 'function')
          window.UI.enableInlineStyles();
        resizingCol = c;
        resizeStartX = e.clientX;
        const cell = rh.closest('td,th');
        resizeStartW = cell.offsetWidth;
      });
    });

    document.addEventListener('mouseup', () => {
      dragSelecting = false;
      dragStart = null;
      if (resizingCol !== null) resizingCol = null;
    });
    document.addEventListener('mousemove', e => {
      if (resizingCol !== null) {
        const dx = e.clientX - resizeStartX;
        const nw = Math.max(40, resizeStartW + dx);
        for (let r = 0; r < state.rows; r++)
          if (isCellVisible(r, resizingCol))
            state.cells[r][resizingCol].width = nw + 'px';
        renderTable();
      }
    });
  }

  function startEditing(r, c) {
    state.editing = [r, c];
    renderTable();
    const tbl = document.querySelector('#tbl-container table');
    const cell = tbl.querySelector(`[data-row="${r}"][data-col="${c}"]`);
    if (cell) {
      cell.focus();
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(cell);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  function stopEditing() {
    if (!state.editing) return;
    const [r, c] = state.editing;
    const tbl = document.querySelector('#tbl-container table');
    const cell = tbl?.querySelector(`[data-row="${r}"][data-col="${c}"]`);
    if (cell) {
      let txt = cell.innerText;
      txt = txt.replace(/\n+$/, '');
      state.cells[r][c].content = txt;
      cell.contentEditable = 'false';
    }
    state.editing = null;
    renderTable();
    if (window.UI) window.UI.updateSidePanel();
  }

  function getSelCells() {
    return [...state.selSet]
      .map(k => {
        const [r, c] = k.split(',').map(Number);
        return state.cells[r]?.[c];
      })
      .filter(Boolean);
  }

  function findVisibleCellInRowCoveringCol(row, col) {
    for (let startCol = col; startCol >= 0; startCol--) {
      const cell = state.cells[row]?.[startCol];
      if (!cell) continue;
      if (isCellVisible(row, startCol) && startCol + cell.colspan > col)
        return cell;
    }
    return null;
  }

  function findVisibleCellInColCoveringRow(col, row) {
    for (let startRow = row; startRow >= 0; startRow--) {
      const cell = state.cells[startRow]?.[col];
      if (!cell) continue;
      if (isCellVisible(startRow, col) && startRow + cell.rowspan > row)
        return cell;
    }
    return null;
  }

  function applyToSelected(prop, val) {
    getSelCells().forEach(cd => {
      cd[prop] = val;
    });
    renderTable();
  }

  function mergeSelected() {
    if (state.selSet.size < 2) {
      alert('Select at least 2 cells to merge.');
      return;
    }
    const coords = [...state.selSet].map(k => k.split(',').map(Number));
    const rs = coords.map(c => c[0]),
      cs = coords.map(c => c[1]);
    const r0 = Math.min(...rs),
      r1 = Math.max(...rs),
      c0 = Math.min(...cs),
      c1 = Math.max(...cs);
    for (let r = r0; r <= r1; r++)
      for (let c = c0; c <= c1; c++) {
        if (!isCellVisible(r, c)) {
          alert(
            'Cannot merge: selection contains already-merged cells. Unmerge them first.',
          );
          return;
        }
      }
    const texts = [];
    for (let r = r0; r <= r1; r++)
      for (let c = c0; c <= c1; c++) {
        if (state.cells[r][c].content) texts.push(state.cells[r][c].content);
        if (r !== r0 || c !== c0) {
          state.cells[r][c].content = '';
          state.cells[r][c].colspan = 1;
          state.cells[r][c].rowspan = 1;
        }
      }
    state.cells[r0][c0].colspan = c1 - c0 + 1;
    state.cells[r0][c0].rowspan = r1 - r0 + 1;
    state.cells[r0][c0].content = texts.join(' ');
    state.selected = [r0, c0];
    state.selSet = new Set([cellKey(r0, c0)]);
    renderTable();
    if (window.UI) window.UI.updateSidePanel();
  }

  function splitH() {
    if (!state.selected) {
      alert('Select a cell first.');
      return;
    }
    const [r, c] = state.selected;
    const cd = state.cells[r][c];
    if (cd.rowspan < 2) {
      if (state.rows >= 20) {
        alert('Max rows reached.');
        return;
      }
      state.cells.splice(
        r + 1,
        0,
        Array.from({ length: state.cols }, (_, ci) =>
          global.App.makeCellData(r + 1, ci),
        ),
      );
      state.rows++;
      for (let rr = r + 2; rr < state.rows; rr++)
        for (let cc = 0; cc < state.cols; cc++) state.cells[rr][cc].row = rr;
      for (let cc = 0; cc < state.cols; cc++) {
        if (cc === c) continue;
        const oc = findVisibleCellInColCoveringRow(cc, r);
        if (oc) oc.rowspan++;
      }
    } else {
      // shrink the rowspan of the selected cell and reset the
      // cells that become independent after the split
      cd.rowspan--;
      const tr = r + cd.rowspan;
      for (let cc = c; cc < c + cd.colspan; cc++)
        state.cells[tr][cc] = global.App.makeCellData(tr, cc);
    }
    renderTable();
  }

  function splitV() {
    if (!state.selected) {
      alert('Select a cell first.');
      return;
    }
    const [r, c] = state.selected;
    const cd = state.cells[r][c];
    if (cd.colspan < 2) {
      if (state.cols >= 12) {
        alert('Max columns reached.');
        return;
      }
      for (let rr = 0; rr < state.rows; rr++)
        state.cells[rr].splice(c + 1, 0, global.App.makeCellData(rr, c + 1));
      state.cols++;
      for (let rr = 0; rr < state.rows; rr++)
        for (let cc = 0; cc < state.cols; cc++) state.cells[rr][cc].col = cc;
      for (let rr = 0; rr < state.rows; rr++) {
        if (rr === r) continue;
        const oc = findVisibleCellInRowCoveringCol(rr, c);
        if (oc) oc.colspan++;
      }
    } else {
      // shrink the colspan of the selected cell and reset the
      // cells that become independent after the split
      cd.colspan--;
      const tc = c + cd.colspan;
      for (let rr = r; rr < r + cd.rowspan; rr++)
        state.cells[rr][tc] = global.App.makeCellData(rr, tc);
    }
    renderTable();
  }

  function addRow(after) {
    if (state.rows >= 20) {
      alert('Max rows reached.');
      return;
    }
    const at = state.selected ? state.selected[0] : state.rows - 1;
    const pos = after ? at + 1 : at;
    state.cells.splice(
      pos,
      0,
      Array.from({ length: state.cols }, (_, ci) =>
        global.App.makeCellData(pos, ci),
      ),
    );
    state.rows++;
    for (let r = 0; r < state.rows; r++)
      for (let c = 0; c < state.cols; c++) state.cells[r][c].row = r;
    renderTable();
  }

  function delRow() {
    if (state.rows <= 1) {
      alert('Cannot delete the last row.');
      return;
    }
    const at = state.selected ? state.selected[0] : state.rows - 1;
    for (let c = 0; c < state.cols; c++) {
      const cd = state.cells[at][c];
      if (cd.rowspan > 1) cd.rowspan--;
    }
    state.cells.splice(at, 1);
    state.rows--;
    state.selected = null;
    state.selSet = new Set();
    renderTable();
  }

  function addCol(after) {
    if (state.cols >= 12) {
      alert('Max columns reached.');
      return;
    }
    const at = state.selected ? state.selected[1] : state.cols - 1;
    const pos = after ? at + 1 : at;
    for (let r = 0; r < state.rows; r++)
      state.cells[r].splice(pos, 0, global.App.makeCellData(r, pos));
    state.cols++;
    for (let r = 0; r < state.rows; r++)
      for (let c = 0; c < state.cols; c++) state.cells[r][c].col = c;
    renderTable();
  }

  function delCol() {
    if (state.cols <= 1) {
      alert('Cannot delete the last column.');
      return;
    }
    const at = state.selected ? state.selected[1] : state.cols - 1;
    for (let r = 0; r < state.rows; r++) {
      const cd = state.cells[r][at];
      if (cd.colspan > 1) cd.colspan--;
    }
    for (let r = 0; r < state.rows; r++) state.cells[r].splice(at, 1);
    state.cols--;
    state.selected = null;
    state.selSet = new Set();
    renderTable();
  }

  // Export API
  global.Table = {
    renderTable,
    attachEvents,
    startEditing,
    stopEditing,
    getSelCells,
    applyToSelected,
    mergeSelected,
    splitH,
    splitV,
    addRow,
    delRow,
    addCol,
    delCol,
    updateHtmlOutput,
  };
})(window);
