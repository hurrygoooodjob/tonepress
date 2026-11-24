(() => {
  'use strict';

  const languages = {en: 'en', ja: 'ja', zh: 'zh-CN', ko: 'ko'};
  const columns = {en: 0, ja: 1, ko: 2};
  const storageKey = 'tonepress-language';
  const bindings = [];
  const dictionaries = [window.TonepressUIStrings, window.TonepressWorkspaceStrings, window.TonepressCatalogStrings];
  document.documentElement.classList.add('localizing');
  let language = 'en';
  try {
    const saved = localStorage.getItem(storageKey);
    if (Object.hasOwn(languages, saved)) language = saved;
  } catch { /* A private or offline document can still switch for this session. */ }
  document.documentElement.lang = languages[language];

  function t(source, values = {}) {
    let result = source;
    if (language !== 'zh') {
      for (const entries of dictionaries) {
        if (entries && Object.hasOwn(entries, source)) {
          result = entries[source][columns[language]];
          break;
        }
      }
    }
    return result.replace(/\{(\w+)\}/g, (match, key) => Object.hasOwn(values, key) ? String(values[key]) : match);
  }

  function apply() {
    document.documentElement.lang = languages[language];
    for (const {node, attribute, source} of bindings) {
      if (!node.isConnected) continue;
      if (attribute) node.setAttribute(attribute, t(source));
      else node.nodeValue = source.replace(/\S(?:[\s\S]*\S)?/, key => t(key));
    }
    document.querySelectorAll('[data-language-picker]').forEach(picker => { picker.value = language; });
  }

  function setLanguage(next, remember = true) {
    if (!Object.hasOwn(languages, next) || next === language) return;
    language = next;
    if (remember) {
      try { localStorage.setItem(storageKey, next); } catch { /* The choice still applies to this page. */ }
    }
    apply();
    document.dispatchEvent(new CustomEvent('tonepress:language', {detail: {language}}));
  }

  window.addEventListener('storage', event => {
    if (event.key === storageKey) setLanguage(event.newValue || 'en', false);
  });

  function bindDocument() {
    const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.parentElement.closest('script,style,svg,[data-language-picker]') && /[\u3400-\u9fff]/.test(node.nodeValue)) {
        bindings.push({node, source: node.nodeValue});
      }
    }
    document.querySelectorAll('[aria-label],[title],[placeholder]').forEach(node => {
      for (const attribute of ['aria-label', 'title', 'placeholder']) {
        const source = node.getAttribute(attribute);
        if (source && /[\u3400-\u9fff]/.test(source)) bindings.push({node, attribute, source});
      }
    });
    document.querySelectorAll('[data-language-picker]').forEach(picker => {
      picker.addEventListener('change', () => setLanguage(picker.value));
    });
    apply();
    document.documentElement.classList.remove('localizing');
  }

  window.TonepressI18n = {t, setLanguage, bindDocument, get language() { return language; }};
})();
