(function (global) {
  const { state, initTable, PRESETS } = global.App;
  const T = global.Table;
  const U = global.Utils;

  function isUnsetValue(value) {
    return value === '' || value == null;
  }

  function setFieldValue(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = isUnsetValue(value) ? '' : value;
  }

  function setStatusLabel(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    const unset = isUnsetValue(value);
    el.textContent = unset ? 'unset' : value;
    el.classList.toggle('is-unset', unset);
  }

  function updateSidePanel() {
    const noSel = document.getElementById('no-sel-msg');
    const props = document.getElementById('cell-props');
    if (!noSel || !props) return;
    if (!state.selected) {
      noSel.style.display = '';
      props.style.display = 'none';
      return;
    }
    noSel.style.display = 'none';
    props.style.display = 'flex';
    const [r, c] = state.selected;
    const cd = state.cells[r][c];
    document.getElementById('cell-addr').textContent = `R${r + 1} C${c + 1}`;
    const sb = document.getElementById('span-badge');
    if (cd.colspan > 1 || cd.rowspan > 1) {
      sb.textContent = `${cd.colspan}×${cd.rowspan}`;
      sb.style.display = '';
    } else sb.style.display = 'none';
    document.getElementById('cell-content').value = cd.content;
    setFieldValue('cell-width', cd.width);
    setFieldValue('cell-height', cd.height);
    setFieldValue('cell-padding', cd.padding);
    setFieldValue('cell-border-w', cd.borderWidth);
    setFieldValue('cell-border-style', cd.borderStyle);
    setFieldValue('sel-align', cd.align);
    setFieldValue('sel-valign', cd.valign);
    setFieldValue('sel-fontsize', cd.fontsize);
    document.getElementById('pick-bg').value = cd.bg || '#ffffff';
    document.getElementById('pick-fg').value = cd.fg || '#000000';
    document.getElementById('pick-border').value = cd.borderColor || '#888888';
    setStatusLabel('pick-bg-value', cd.bg);
    setStatusLabel('pick-fg-value', cd.fg);
    setStatusLabel('pick-border-value', cd.borderColor);
  }

  function copyHtml() {
    try {
      const out = document.getElementById('html-out').textContent;
      navigator.clipboard.writeText(out).then(() => {
        const btn = document.getElementById('btn-copy-html');
        if (btn) {
          btn.innerHTML = '<i class="ti ti-check"></i> Copied!';
          setTimeout(
            () => (btn.innerHTML = '<i class="ti ti-copy"></i> HTML'),
            1500,
          );
        }
      });
    } catch (err) {
      console.error('copyHtml', err);
      alert('Copy failed');
    }
  }

  function wireEvents() {
    // Toolbar
    const byId = id => document.getElementById(id);
    const bindLiveControl = (id, handler, eventTypes = ['input']) => {
      const el = byId(id);
      if (!el) return;
      eventTypes.forEach(eventType => {
        el.addEventListener(eventType, e => {
          enableInlineStyles();
          handler(e.target.value, e);
        });
      });
    };

    if (byId('btn-row-above'))
      byId('btn-row-above').onclick = () => T.addRow(false);
    if (byId('btn-row-below'))
      byId('btn-row-below').onclick = () => T.addRow(true);
    if (byId('btn-del-row')) byId('btn-del-row').onclick = T.delRow;
    if (byId('btn-col-left'))
      byId('btn-col-left').onclick = () => T.addCol(false);
    if (byId('btn-col-right'))
      byId('btn-col-right').onclick = () => T.addCol(true);
    if (byId('btn-del-col')) byId('btn-del-col').onclick = T.delCol;
    if (byId('btn-merge')) byId('btn-merge').onclick = T.mergeSelected;
    if (byId('btn-split-h')) byId('btn-split-h').onclick = T.splitH;
    if (byId('btn-split-v')) byId('btn-split-v').onclick = T.splitV;
    if (byId('btn-copy-html')) byId('btn-copy-html').onclick = copyHtml;
    if (byId('btn-copy-html2')) byId('btn-copy-html2').onclick = copyHtml;
    if (byId('btn-clear'))
      byId('btn-clear').onclick = () => {
        if (confirm('Clear all table data?')) initTable(state.rows, state.cols);
      };

    // Apply styles to selection
    bindLiveControl('sel-align', v => T.applyToSelected('align', v), [
      'change',
    ]);
    bindLiveControl('sel-valign', v => T.applyToSelected('valign', v), [
      'change',
    ]);
    bindLiveControl('sel-fontsize', v => T.applyToSelected('fontsize', v), [
      'change',
    ]);
    bindLiveControl('pick-bg', v => T.applyToSelected('bg', v));
    bindLiveControl('pick-fg', v => T.applyToSelected('fg', v));
    bindLiveControl('pick-border', v => T.applyToSelected('borderColor', v));

    if (byId('btn-bold'))
      byId('btn-bold').onclick = () => {
        if (!state.selected) return;
        enableInlineStyles();
        const cd = state.cells[state.selected[0]][state.selected[1]];
        cd.fontweight = cd.fontweight === 'bold' ? 'normal' : 'bold';
        T.renderTable();
      };
    if (byId('btn-italic'))
      byId('btn-italic').onclick = () => {
        if (!state.selected) return;
        enableInlineStyles();
        const cd = state.cells[state.selected[0]][state.selected[1]];
        cd.fontstyle = cd.fontstyle === 'italic' ? 'normal' : 'italic';
        T.renderTable();
      };
    if (byId('btn-header'))
      byId('btn-header').onclick = () => {
        if (!state.selected) return;
        enableInlineStyles();
        const cd = state.cells[state.selected[0]][state.selected[1]];
        cd.isHeader = !cd.isHeader;
        T.renderTable();
      };

    // Cell props
    bindLiveControl('cell-content', v => {
      if (!state.selected) return;
      state.cells[state.selected[0]][state.selected[1]].content = v;
      T.renderTable();
    });
    bindLiveControl('cell-width', v => {
      if (!state.selected) return;
      state.cells[state.selected[0]][state.selected[1]].width = v;
      T.renderTable();
    });
    bindLiveControl('cell-height', v => {
      if (!state.selected) return;
      state.cells[state.selected[0]][state.selected[1]].height = v;
      T.renderTable();
    });
    bindLiveControl('cell-padding', v => {
      if (!state.selected) return;
      state.cells[state.selected[0]][state.selected[1]].padding = v;
      T.renderTable();
    });
    bindLiveControl('cell-border-w', v => {
      if (!state.selected) return;
      state.cells[state.selected[0]][state.selected[1]].borderWidth = v;
      T.renderTable();
    });
    bindLiveControl(
      'cell-border-style',
      v => {
        if (!state.selected) return;
        state.cells[state.selected[0]][state.selected[1]].borderStyle = v;
        T.renderTable();
      },
      ['change'],
    );

    // Tabs
    document.querySelectorAll('.panel-tab').forEach(tab => {
      tab.onclick = () => {
        document
          .querySelectorAll('.panel-tab')
          .forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        ['panel-cell', 'panel-table', 'panel-help'].forEach(id => {
          const el = byId(id);
          if (el) el.style.display = 'none';
        });
        const p = byId('panel-' + tab.dataset.tab);
        if (p) p.style.display = 'flex';
      };
    });

    if (byId('btn-resize-table'))
      byId('btn-resize-table').onclick = () => {
        const r = Math.max(1, Math.min(20, +byId('tbl-rows').value || 3));
        const c = Math.max(1, Math.min(12, +byId('tbl-cols').value || 4));
        initTable(r, c);
      };

    bindLiveControl('tbl-width', v => {
      state.tableProps.width = v;
      T.renderTable();
    });
    bindLiveControl(
      'tbl-collapse',
      v => {
        state.tableProps.collapse = v;
        T.renderTable();
      },
      ['change'],
    );
    bindLiveControl('tbl-spacing', v => {
      state.tableProps.spacing = v;
      T.renderTable();
    });
    bindLiveControl('tbl-caption', v => {
      state.tableProps.caption = v;
      T.renderTable();
    });

    if (byId('btn-apply-preset'))
      byId('btn-apply-preset').onclick = () => {
        const p = byId('tbl-preset').value;
        if (!p) return;
        enableInlineStyles();
        for (let r = 0; r < state.rows; r++)
          for (let c = 0; c < state.cols; c++) {
            const cd = state.cells[r][c];
            cd.bg = '';
            cd.fg = '';
            cd.borderWidth = '1';
            cd.borderColor = '#888888';
            cd.borderStyle = 'solid';
            if (p === 'striped' && r % 2 === 1) cd.bg = '#f0f4fa';
            if (p === 'minimal') {
              cd.borderWidth = '0';
              cd.borderColor = 'transparent';
            }
            if (p === 'dark' && r === 0) {
              cd.bg = '#1a1a2e';
              cd.fg = '#ffffff';
              cd.isHeader = true;
              cd.fontweight = '500';
            }
            if (p === 'striped' && r === 0) {
              cd.bg = '#e8ecf4';
              cd.fontweight = '500';
            }
          }
        T.renderTable();
      };

    // Keyboard navigation
    document.addEventListener('keydown', e => {
      if (state.editing) {
        if (e.key === 'Escape' || e.key === 'Tab') {
          e.preventDefault();
          T.stopEditing();
        }
        return;
      }
      if (!state.selected) return;
      let [r, c] = state.selected;
      if (e.key === 'ArrowRight' && c < state.cols - 1)
        state.selected = [r, c + 1];
      else if (e.key === 'ArrowLeft' && c > 0) state.selected = [r, c - 1];
      else if (e.key === 'ArrowDown' && r < state.rows - 1)
        state.selected = [r + 1, c];
      else if (e.key === 'ArrowUp' && r > 0) state.selected = [r - 1, c];
      else if (e.key === 'F2' || e.key === 'Enter') {
        T.startEditing(r, c);
        return;
      } else if (e.key === 'Delete') {
        state.cells[r][c].content = '';
        T.renderTable();
        return;
      } else return;
      e.preventDefault();
      state.selSet = new Set([U.cellKey(...state.selected)]);
      T.renderTable();
      updateSidePanel();
    });

    // Initialize table size inputs
    const rr = byId('tbl-rows'),
      cc = byId('tbl-cols');
    if (rr) rr.value = state.rows;
    if (cc) cc.value = state.cols;
  }

  // Expose UI functions
  function enableInlineStyles() {
    state.preserveNoStyles = false;
  }

  global.UI = { updateSidePanel, copyHtml, wireEvents, enableInlineStyles };

  // Auto-init when DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    // preserveNoStyles is true by default; init without inline styles
    initTable(4, 5);
    UI.wireEvents();
  });
})(window);
