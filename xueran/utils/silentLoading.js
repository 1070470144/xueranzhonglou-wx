let installed = false;
let patchedUniShowLoading = null;
let patchedWxShowLoading = null;

function shouldBlockLoading(options = {}) {
  const title = String(options.title || '').trim();
  return !title || title === '加载中' || title === '加载中...' || title === '加载中…';
}

function patchShowLoading(target) {
  if (!target || typeof target.showLoading !== 'function' || target.showLoading.__silentPatched) return;
  const original = target.showLoading;
  const patched = function patchedShowLoading(options = {}) {
    if (shouldBlockLoading(options)) return;
    return original.call(target, options);
  };
  patched.__silentPatched = true;
  patched.__original = original;
  target.showLoading = patched;
  return patched;
}

export function installSilentDefaultLoading() {
  const uniTarget = typeof uni !== 'undefined' ? uni : null;
  const wxTarget = typeof wx !== 'undefined' ? wx : null;
  if (!uniTarget && !wxTarget) return;

  if (installed && uniTarget && uniTarget.showLoading !== patchedUniShowLoading) {
    patchedUniShowLoading = null;
    installed = false;
  }
  if (installed && wxTarget && wxTarget.showLoading !== patchedWxShowLoading) {
    patchedWxShowLoading = null;
    installed = false;
  }
  installed = true;
  if (uniTarget) {
    patchedUniShowLoading = patchShowLoading(uniTarget) || uniTarget.showLoading;
  }
  if (wxTarget) {
    patchedWxShowLoading = patchShowLoading(wxTarget) || wxTarget.showLoading;
  }
}

installSilentDefaultLoading();
