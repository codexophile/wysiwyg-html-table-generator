(function (global) {
  // Small DOM helper with safety checks
  function q(sel) {
    return document.querySelector(sel);
  }
  function qAll(sel) {
    return Array.from(document.querySelectorAll(sel));
  }

  function cellKey(r, c) {
    return `${r},${c}`;
  }

  // Pretty-format HTML string for the preview
  function formatHtml(s) {
    try {
      let out = '';
      let ind = 0;
      s = s.replace(/></g, '>\n<');
      s.split('\n').forEach(l => {
        l = l.trim();
        if (!l) return;
        if (l.startsWith('</')) ind = Math.max(0, ind - 1);
        out += '  '.repeat(ind) + l + '\n';
        if (!l.startsWith('</') && !l.includes('</') && !l.endsWith('/>'))
          ind++;
      });
      return out;
    } catch (err) {
      console.error('formatHtml error', err);
      return s;
    }
  }

  global.Utils = { q, qAll, cellKey, formatHtml };
})(window);
