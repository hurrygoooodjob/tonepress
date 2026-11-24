(() => {
  'use strict';

  function viewFromURL() {
    if (location.hash === '#cover') return 'cover';
    if (location.hash === '#studio') return 'studio';
    const query = new URLSearchParams(location.search);
    return ['studio', 'library', 'effect', 'look', 'mosh'].some(key => query.has(key)) ? 'studio' : 'cover';
  }

  const root = document.documentElement;
  root.dataset.view = viewFromURL();

  function connect({enter, leave, pickFile}) {
    const cover = document.getElementById('cover');
    const studio = document.querySelector('.shell');
    const power = document.getElementById('enterStudio');
    const home = document.getElementById('returnToCover');
    const theme = document.querySelector('meta[name="theme-color"]');
    let active;

    function show(view, file, focus) {
      if (active === view) {
        if (file) enter(file);
        return;
      }
      if (active === 'studio') leave();
      active = view;
      const editing = view === 'studio';
      root.dataset.view = view;
      cover.hidden = editing;
      studio.hidden = !editing;
      theme.content = editing ? '#0b0d09' : '#e8eade';
      if (editing) enter(file);
      if (focus) (editing ? home : power).focus({preventScroll:true});
    }

    function navigate(view, file = null) {
      if (view !== active) {
        // A fragment keeps the document, local files and video decoder alive, including on file://.
        history.pushState(null, '', '#' + view);
      }
      show(view, file, true);
    }

    power.addEventListener('click', () => navigate('studio'));
    document.addEventListener('tonepress:open-studio', () => {
      if (active === 'cover') navigate('studio');
    });
    home.addEventListener('click', () => navigate('cover'));
    document.getElementById('coverImport').addEventListener('click', pickFile);
    document.addEventListener('keydown', event => {
      if (active === 'cover' && event.key === 'Enter' && !event.repeat &&
          (event.target === document.body || event.target === root)) {
        event.preventDefault();
        navigate('studio');
      }
    });
    const restore = () => show(viewFromURL(), null, true);
    window.addEventListener('popstate', restore);
    window.addEventListener('hashchange', restore);
    show(viewFromURL(), null, false);
    return {openFile: file => navigate('studio', file)};
  }

  window.TonepressScreens = {connect};
})();
