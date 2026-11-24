(() => {
  "use strict";
  const {effects, looks, layer, groups} = TonepressLooks;
  const i18n = window.TonepressI18n;
  const {t} = i18n;
  const byId = id => document.getElementById(id);
  const copyLayers = layers => layers.map(item => ({...item}));
  const copyState = state => ({...state, layers: copyLayers(state.layers)});
  const storageKey = "tonepress-v02-looks";
  const featured = ["halftone", "riso", "dither", "ascii", "voronoi"];
  const searchAliases = {halftone: ["原色轻网", "轻网"], voronoi: ["彩片镶嵌"]};
  const groupNames = new Map(groups.map(([name, english]) => [name, english]));
  const typeOrder = [...new Set([
    ...featured.filter(type => Object.hasOwn(effects, type)),
    ...groups.flatMap(([name]) => Object.keys(effects).filter(type => effects[type].group === name)),
    ...Object.keys(effects)
  ])];
  const normalizeSearch = value => value.normalize("NFKC").toLowerCase().replace(/[\s_-]+/g, " ").trim();
  const searchable = new Map(typeOrder.map(type => {
    const effect = effects[type];
    const sources = [type, ...(searchAliases[type] || []), effect.name, effect.english, effect.group,
      groupNames.get(effect.group), effect.scaleLabel, effect.description].filter(Boolean);
    const terms = sources.flatMap(source => [source, ...(window.TonepressCatalogStrings?.[source] || []),
      ...(window.TonepressWorkspaceStrings?.[source] || [])]);
    return [type, normalizeSearch(terms.join(" "))];
  }));
  const lookNameOf = look => look.id.startsWith("own-") ? look.name : t(look.name);
  const countLayers = n => n === 1 ? t("1 层") : t("{n} 层", {n});
  const asciiValidation = "请使用 2 到 24 个可打印的 ASCII 字符。";
  const presetNameValidation = "请输入模板名称。";

  function checkedLooks() {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || "[]");
      if (!Array.isArray(stored)) return [];
      return stored.filter(item => item && typeof item.id === "string" && item.id.startsWith("own-")
        && typeof item.name === "string" && item.name && ["none", "breathe"].includes(item.motion)
        && Array.isArray(item.layers) && item.layers.every(entry => entry && Object.hasOwn(effects, entry.type)
          && Number.isInteger(entry.size) && entry.size >= 2 && entry.size <= 16
          && Number.isInteger(entry.strength) && entry.strength >= 0 && entry.strength <= 100
          && typeof entry.enabled === "boolean"));
    } catch { return []; }
  }

  function labelButton(element, label) {
    element.title = label;
    element.setAttribute("aria-label", label);
  }

  function button(text, action) {
    const element = document.createElement("button");
    element.type = "button";
    element.textContent = text;
    element.addEventListener("click", action);
    return element;
  }

  function stateForLook(look) {
    const selected = Number.isInteger(look.selected) && look.selected >= 0 && look.selected < look.layers.length
      ? look.selected : (look.layers.length ? 0 : -1);
    return {layers: copyLayers(look.layers), motion: look.motion, templateId: look.id, selected};
  }

  function create(notify, feedback) {
    const query = new URLSearchParams(location.search);
    let custom = checkedLooks();
    const templates = () => [...looks, ...custom];
    const initial = templates().find(look => look.id === query.get("look")) || looks[0];
    const single = query.get("effect");
    let committed = stateForLook(initial);
    if (single && Object.hasOwn(effects, single)) {
      committed = {layers: [layer(single)], motion: "none", templateId: null, selected: 0};
    }

    let draft = null;
    let transient = null;
    let peekRequest = null;
    let peekTimer = 0;
    let mode = "solo";
    let busy = false;
    let editGroup = null;
    let expanded = false;
    let collapsedOffset = 0;
    let pointerPosition = null;
    let suspendPointer = false;
    const history = [];

    const rail = byId("templateRail");
    const list = byId("layerList");
    const catalog = byId("catalog");
    const gallery = byId("effectsDialog");
    const galleryButton = byId("lookLibrary");
    const catalogCards = [];
    const search = byId("findEffect");
    const category = byId("effectCategory");
    const onlyNew = byId("onlyNew");
    const specialist = TonepressControls.create(byId("extraControls"), writeLayerParameter, feedback);
    const visibleTrial = () => transient || draft;
    const editing = () => draft?.state || committed;
    const focusedLayer = state => state.layers[state.selected];
    const pickedLook = state => templates().find(look => look.id === state.templateId);
    const settingsOf = state => ({layers: copyLayers(state.layers), motion: state.motion});
    const displayName = proposal => proposal.kind === "template" ? lookNameOf(proposal.look) : t(effects[proposal.key].name);

    const sample = document.createElement("canvas");
    const tile = document.createElement("canvas");
    const thumbPainter = TonepressStack.create(tile);
    sample.width = 320;
    sample.height = 224;
    let hasSample = false;
    let sampleRevision = 0;
    const thumbnails = new Map();
    const thumbQueue = new Set();
    let thumbFrame = 0;

    function thumbnail(canvas) {
      const type = canvas.dataset.type;
      const look = canvas.dataset.look && templates().find(item => item.id === canvas.dataset.look);
      const recipe = type ? [layer(type)] : look?.layers;
      if (!recipe) return;
      const key = type ? "effect:" + type : "template:" + look.id;
      if (!thumbnails.has(key)) {
        thumbPainter.render(sample, {layers: recipe, width: sample.width, height: sample.height, motion: "none", time: .6});
        const snapshot = document.createElement("canvas");
        snapshot.width = sample.width;
        snapshot.height = sample.height;
        snapshot.getContext("2d").drawImage(tile, 0, 0);
        thumbnails.set(key, snapshot);
      }
      canvas.width = sample.width;
      canvas.height = sample.height;
      canvas.getContext("2d").drawImage(thumbnails.get(key), 0, 0);
      canvas.dataset.ready = "true";
      canvas.dataset.sampleRevision = String(sampleRevision);
    }

    function paintThumbnails() {
      thumbFrame = 0;
      let painted = 0;
      for (const canvas of thumbQueue) {
        thumbQueue.delete(canvas);
        if (!hasSample || !canvas.isConnected || canvas.closest("[hidden]")) continue;
        thumbnail(canvas);
        if (++painted === 3) break;
      }
      if (thumbQueue.size) thumbFrame = requestAnimationFrame(paintThumbnails);
    }

    function thumbObserver(root) {
      return new IntersectionObserver((entries, observer) => {
        if (!hasSample) return;
        for (const entry of entries) if (entry.isIntersecting) {
          observer.unobserve(entry.target);
          thumbQueue.add(entry.target);
        }
        if (thumbQueue.size && !thumbFrame) thumbFrame = requestAnimationFrame(paintThumbnails);
      }, {root, rootMargin: "64px 150px"});
    }
    const catalogObserver = thumbObserver(catalog);
    const railObserver = thumbObserver(rail);

    function watchThumbnails(root, observer) {
      observer.disconnect();
      if (!hasSample) return;
      for (const canvas of root.querySelectorAll("canvas")) {
        if (!canvas.closest("[hidden]") && canvas.dataset.sampleRevision !== String(sampleRevision)) {
          observer.observe(canvas);
        }
      }
    }

    function keepSnapshot() {
      history.push(copyState(committed));
      if (history.length > 40) history.shift();
      editGroup = null;
    }

    function compareCard(candidate, card) {
      return candidate && (candidate.kind === "effect"
        ? card.dataset.effect === candidate.key : card.dataset.template === candidate.key);
    }

    function syncCards() {
      const previewed = visibleTrial();
      const selectedType = focusedLayer(committed)?.type;
      for (const card of catalog.querySelectorAll("[data-effect]")) {
        card.setAttribute("aria-pressed", String(Boolean(compareCard(draft, card))));
        card.dataset.trial = String(Boolean(compareCard(previewed, card)));
        card.dataset.applied = String(card.dataset.effect === selectedType);
      }
      for (const card of rail.querySelectorAll("[data-template]")) {
        card.setAttribute("aria-pressed", String(Boolean(compareCard(draft, card))));
        card.dataset.trial = String(Boolean(compareCard(previewed, card)));
        card.dataset.applied = String(card.dataset.template === committed.templateId);
      }
    }

    function setDisabled(id, disabled) {
      const element = byId(id);
      if (element) element.disabled = disabled;
    }

    function horizontalArrows(strip, prev, next) {
      const inactive = busy || strip === catalog && expanded;
      setDisabled(prev, inactive || strip.scrollLeft < 2);
      setDisabled(next, inactive || strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 2);
    }

    function syncActions() {
      rail.inert = busy;
      catalog.inert = busy;
      list.inert = busy || !!draft;
      byId("extraControls").inert = busy;
      for (const id of ["addEffect","lookLibrary","modeSolo","modeAdd","size","strength","reset","motion","palette",
        "chars","findEffect","effectCategory","onlyNew"]) setDisabled(id, busy);
      setDisabled("saveLook", busy || !!visibleTrial());
      setDisabled("applyTrial", busy || !draft);
      setDisabled("cancelTrial", busy || !visibleTrial());
      setDisabled("undoEdit", busy || !!draft || !history.length);
      horizontalArrows(catalog, "catalogPrev", "catalogNext");
      horizontalArrows(rail, "previousLooks", "nextLooks");
    }

    function showCurrent() {
      const trial = visibleTrial();
      const state = editing();
      const current = focusedLayer(state);
      const look = pickedLook(committed);
      const status = byId("trialStatus");
      if (status) {
        status.dataset.state = transient ? "hover" : draft ? "pending" : "idle";
        const text = transient ? t("试看 {name}", {name: displayName(transient)}) :
          draft ? t("待应用 {name}", {name: displayName(draft)}) : "";
        if (status.textContent !== text) status.textContent = text;
      }
      byId("templateStatus").textContent = (look ? lookNameOf(look) : t("自定义组合")) + " · " + countLayers(committed.layers.length);
      byId("afterLabel").textContent = trial ? displayName(trial) : look ? lookNameOf(look)
        : committed.layers.length === 1 ? t(effects[committed.layers[0].type].name)
        : t(committed.layers.length ? "叠加效果" : "原片");
      byId("motion").value = state.motion;
      byId("emptyStack").hidden = Boolean(committed.layers.length);
      byId("activeControls").hidden = !current;
      const definition = current && effects[current.type];
      const info = byId("effectInfo");
      info.hidden = !current;
      info.textContent = definition ? t(definition.description) : "";
      const english = byId("activeLayerEnglish");
      const group = byId("effectGroup");
      const layerName = state.templateId === "light" && current?.type === "halftone"
        ? lookNameOf(pickedLook(state)) : t(definition?.name || "原片");
      if (english) {
        english.textContent = definition?.english || "";
        english.hidden = !definition || i18n.language === "en" || layerName === definition.english;
      }
      if (group) group.textContent = definition ? t(definition.group) : "";
      byId("activeLayerName").textContent = layerName;
      specialist.show(current || null, definition);
      byId("paletteRow").hidden = current?.type !== "dither";
      byId("charsRow").hidden = current?.type !== "ascii";
      if (current) {
        byId("palette").value = current.palette || "handheld";
        if (document.activeElement !== byId("chars") || current.type !== "ascii") {
          byId("chars").value = current.chars ?? " .,:-+=*#%@";
        }
        byId("sizeLabel").textContent = t(definition.scaleLabel);
        byId("sizeUnit").textContent = current.type === "halftone" ? "px" : "";
        for (const key of ["size","strength"]) {
          const input = byId(key);
          input.value = String(current[key]);
          byId(key + "Value").textContent = input.value;
          input.style.setProperty("--fill", 100 * (current[key] - Number(input.min)) /
            (Number(input.max) - Number(input.min)) + "%");
        }
      }
      syncCards();
      syncActions();
    }

    function update(kind, redrawLayers = false) {
      if (redrawLayers) drawLayers();
      showCurrent();
      notify({kind});
    }

    function clearTransient() {
      if (peekTimer) clearTimeout(peekTimer);
      peekTimer = 0;
      peekRequest = null;
      const changed = !!transient;
      transient = null;
      return changed;
    }

    function cancelPreview() {
      const changed = clearTransient() || !!draft;
      draft = null;
      if (changed) update("cancel");
      return changed;
    }

    function proposal(option, tunedLayer) {
      if (option.kind === "template") return {...option, state: stateForLook(option.look)};
      const state = copyState(committed);
      const current = focusedLayer(state);
      const replacing = mode === "solo" && !!current;
      if (replacing) {
        if (current.type !== option.key || tunedLayer) {
          // A replacement keeps the target layer's enabled state and all other layers intact.
          state.layers[state.selected] = tunedLayer ? {...tunedLayer} : {...layer(option.key), enabled: current.enabled};
          state.templateId = null;
        }
      } else {
        state.layers.push(tunedLayer ? {...tunedLayer} : layer(option.key));
        state.selected = state.layers.length - 1;
        state.templateId = null;
      }
      return {...option, mode, state};
    }

    function beginPeek(option, card, trigger) {
      if (busy) return;
      if (peekTimer) clearTimeout(peekTimer);
      peekRequest = {option, card, trigger};
      const target = peekRequest;
      peekTimer = setTimeout(() => {
        peekTimer = 0;
        if (target !== peekRequest || !card.isConnected || busy) return;
        const unchanged = compareCard(draft, card);
        if (unchanged && !transient) return;
        transient = unchanged ? null : proposal(option);
        update("peek");
      }, trigger === "pointer" ? 105 : 0);
    }

    function endPeek(card, trigger) {
      if (peekRequest?.card !== card || peekRequest.trigger !== trigger) return;
      if (clearTransient()) update("endPeek");
    }

    function lock(option, card) {
      if (busy) return;
      const alreadyLocked = compareCard(draft, card);
      clearTransient();
      if (!alreadyLocked) draft = proposal(option);
      editGroup = null;
      update("lock");
    }

    function pauseLayoutHover() {
      suspendPointer = true;
      if (peekRequest?.trigger === "pointer" && catalog.contains(peekRequest.card) && peekTimer) {
        clearTimeout(peekTimer);
        peekTimer = 0;
      }
    }

    function onPointerMove(event) {
      if (event.pointerType === "touch") return;
      const {clientX, clientY} = event;
      const moved = !pointerPosition || clientX !== pointerPosition.x || clientY !== pointerPosition.y;
      pointerPosition = {x: clientX, y: clientY};
      if (!suspendPointer || !moved) return;
      suspendPointer = false;
      const card = event.target instanceof Element && event.target.closest("#catalog [data-effect]");
      if (card && !card.hidden && !event.buttons) beginPeek({kind: "effect", key: card.dataset.effect}, card, "pointer");
      else if (peekRequest?.trigger === "pointer" && catalog.contains(peekRequest.card)) endPeek(peekRequest.card, "pointer");
    }

    function attachTrialCard(card, option) {
      card.addEventListener("pointerenter", event => {
        if (option.kind === "effect" && suspendPointer) return;
        if (event.pointerType !== "touch") beginPeek(option, card, "pointer");
      });
      card.addEventListener("pointerleave", () => {
        if (option.kind !== "effect" || !suspendPointer) endPeek(card, "pointer");
      });
      card.addEventListener("focus", () => {
        if (card.matches(":focus-visible")) beginPeek(option, card, "focus");
      });
      card.addEventListener("blur", () => endPeek(card, "focus"));
    }

    function applyDraft() {
      if (!draft || busy) return;
      const result = draft.state;
      clearTransient();
      draft = null;
      if (JSON.stringify(committed) !== JSON.stringify(result)) {
        keepSnapshot();
        committed = copyState(result);
      }
      update("apply", true);
    }

    function undo() {
      if (busy || draft || !history.length) return;
      clearTransient();
      committed = history.pop();
      editGroup = null;
      update("undo", true);
    }

    function writeLayerParameter(target, key, value, gesture = null) {
      const state = editing();
      if (busy || !target || target !== focusedLayer(state) || target[key] === value) return;
      clearTransient();
      if (!draft && (!gesture || editGroup !== gesture)) keepSnapshot();
      editGroup = gesture;
      target[key] = value;
      state.templateId = null;
      update("parameter");
    }

    function editCommitted(change, kind) {
      if (busy || draft) return;
      clearTransient();
      keepSnapshot();
      change(committed);
      committed.templateId = null;
      update(kind, true);
    }

    function choose(index) {
      if (busy || draft) return;
      clearTransient();
      editGroup = null;
      committed.selected = index;
      update("selectLayer", true);
    }

    function move(index, step) {
      const destination = index + step;
      if (destination < 0 || destination >= committed.layers.length) return;
      editCommitted(state => {
        const selected = focusedLayer(state);
        [state.layers[index], state.layers[destination]] = [state.layers[destination], state.layers[index]];
        state.selected = state.layers.indexOf(selected);
      }, "moveLayer");
    }

    function localizeLayerRow(row, item) {
      const name = t(effects[item.type].name);
      const [, pick, toggle, earlier, later, remove] = row.children;
      pick.textContent = name;
      labelButton(pick, t("编辑{name}", {name}));
      labelButton(toggle, t(item.enabled ? "停用{name}" : "启用{name}", {name}));
      labelButton(earlier, t("提前应用{name}", {name}));
      labelButton(later, t("推后应用{name}", {name}));
      labelButton(remove, t("移除{name}", {name}));
    }

    function drawLayers() {
      list.replaceChildren();
      committed.layers.forEach((item, index) => {
        const row = document.createElement("li");
        row.dataset.layer = item.type;
        row.classList.toggle("current", index === committed.selected);
        row.classList.toggle("bypassed", !item.enabled);

        const order = document.createElement("span");
        order.className = "layer-index";
        order.textContent = String(index + 1).padStart(2, "0");
        const pick = button("", () => choose(index));
        pick.className = "layer-name";
        pick.setAttribute("aria-pressed", String(index === committed.selected));

        const toggle = button(item.enabled ? "●" : "○",
          () => editCommitted(() => {item.enabled = !item.enabled;}, "toggleLayer"));
        toggle.className = "layer-toggle";
        toggle.dataset.action = "toggle";
        toggle.setAttribute("aria-pressed", String(item.enabled));
        const earlier = button("↑", () => move(index, -1));
        const later = button("↓", () => move(index, 1));
        earlier.dataset.action = "up";
        later.dataset.action = "down";
        earlier.disabled = index === 0;
        later.disabled = index === committed.layers.length - 1;
        const remove = button("×", () => editCommitted(state => {
          const selected = focusedLayer(state);
          state.layers.splice(index, 1);
          state.selected = selected === item ? Math.min(index, state.layers.length - 1) : state.layers.indexOf(selected);
        }, "removeLayer"));
        remove.dataset.action = "remove";

        row.append(order, pick, toggle, earlier, later, remove);
        localizeLayerRow(row, item);
        list.append(row);
      });
    }

    function localizeCard(card, look) {
      const name = card.querySelector("strong");
      const sub = card.querySelector("small");
      if (look) {
        name.textContent = lookNameOf(look);
        sub.textContent = countLayers(look.layers.length);
        labelButton(card, t("试用模板 {name}", {name: name.textContent}));
      } else {
        const definition = effects[card.dataset.effect];
        name.textContent = t(definition.name);
        sub.textContent = definition.english;
        sub.hidden = i18n.language === "en" || name.textContent === sub.textContent;
        sub.lang = "en";
        labelButton(card, t("试样{name}", {name: name.textContent}));
        card.title = t(definition.description);
      }
    }

    function makeCard(option) {
      const card = button("", () => lock(option, card));
      const canvas = document.createElement("canvas");
      canvas.width = sample.width;
      canvas.height = sample.height;
      canvas.setAttribute("aria-hidden", "true");
      const caption = document.createElement("span");
      caption.className = "tile-caption";
      const name = document.createElement("strong");
      const sub = document.createElement("small");
      if (option.kind === "effect") {
        card.dataset.effect = canvas.dataset.type = option.key;
      } else {
        const {look} = option;
        card.dataset.template = canvas.dataset.look = look.id;
      }
      caption.append(name, sub);
      card.append(canvas, caption);
      localizeCard(card, option.look);
      attachTrialCard(card, option);
      return card;
    }

    function drawRail() {
      const position = rail.scrollLeft;
      rail.replaceChildren(...templates().map(look =>
        makeCard({kind: "template", key: look.id, look})));
      rail.scrollLeft = position;
      watchThumbnails(rail, railObserver);
    }

    function rovingTab(card) {
      for (const entry of catalogCards) entry.tabIndex = entry === card && !entry.hidden ? 0 : -1;
    }

    function makeCatalog() {
      for (const type of typeOrder) {
        const card = makeCard({kind: "effect", key: type});
        card.addEventListener("focus", () => rovingTab(card));
        catalogCards.push(card);
      }
      catalog.replaceChildren(...catalogCards);
    }

    function filterCatalog(preserveTrial = false) {
      pauseLayoutHover();
      const changed = !preserveTrial && clearTransient();
      const filter = normalizeSearch(search.value);
      const group = category.value;
      const cards = catalogCards.filter(card => {
        const type = card.dataset.effect;
        const definition = effects[type];
        const shown = (!group || definition.group === group) && (!onlyNew.checked || definition.isNew) &&
          searchable.get(type).includes(filter);
        card.hidden = !shown;
        return shown;
      });
      catalog.scrollLeft = 0;
      catalog.scrollTop = 0;
      const focused = cards.includes(document.activeElement) ? document.activeElement : null;
      rovingTab(focused || cards.find(card => compareCard(draft, card)) || cards[0]);
      byId("effectCount").textContent = cards.length + " / " + typeOrder.length;
      byId("emptyResults").hidden = cards.length > 0;
      watchThumbnails(catalog, catalogObserver);
      if (changed) update("endPeek");
      else showCurrent();
    }

    function setMode(next) {
      if (busy) return;
      const changed = clearTransient();
      if (mode === next) {
        if (changed) update("endPeek");
        return;
      }
      mode = next;
      if (draft?.kind === "effect") draft = proposal(draft, focusedLayer(draft.state));
      byId("modeSolo").setAttribute("aria-pressed", String(mode === "solo"));
      byId("modeAdd").setAttribute("aria-pressed", String(mode === "add"));
      update("mode");
    }

    function localizeGallery() {
      galleryButton.title = t(expanded ? "收起全部效果" : "展开全部效果");
      galleryButton.querySelector("span").textContent = t(expanded ? "收起" : "全部效果");
    }

    function showGallery(next, resetFilters = false, restoreFocus = false) {
      if (expanded !== next) {
        pauseLayoutHover();
        if (next) collapsedOffset = catalog.scrollLeft;
        expanded = next;
        gallery.classList.toggle("is-expanded", expanded);
        catalog.scrollTop = 0;
        catalog.scrollLeft = expanded ? 0 : collapsedOffset;
      }
      galleryButton.setAttribute("aria-expanded", String(expanded));
      galleryButton.setAttribute("aria-controls", catalog.id);
      localizeGallery();
      if (resetFilters) {
        search.value = "";
        category.value = "";
        onlyNew.checked = false;
        filterCatalog(true);
      } else {
        watchThumbnails(catalog, catalogObserver);
        syncActions();
      }
      if (restoreFocus) galleryButton.focus({preventScroll: true});
    }

    function verticalCard(cards, card, direction) {
      const rect = card.getBoundingClientRect();
      const middle = (rect.left + rect.right) / 2;
      const targets = cards.map(next => {
        const bounds = next.getBoundingClientRect();
        return {
          next, y: (bounds.top - rect.top) * direction,
          x: Math.abs((bounds.left + bounds.right) / 2 - middle),
          column: bounds.left < rect.right && bounds.right > rect.left
        };
      }).filter(entry => entry.y > 2);
      targets.sort((left, right) => Number(right.column) - Number(left.column) || left.y - right.y || left.x - right.x);
      return targets[0]?.next;
    }

    function wireScroll(strip, prev, next) {
      const controls = () => horizontalArrows(strip, prev, next);
      for (const [id, direction] of [[prev,-1],[next,1]]) {
        byId(id)?.addEventListener("click", () => {
          if (strip === catalog) pauseLayoutHover();
          strip.scrollBy({left: direction * strip.clientWidth * .8, behavior: "smooth"});
        });
      }
      strip.addEventListener("scroll", controls, {passive: true});
      new ResizeObserver(controls).observe(strip);
    }

    const categoryLabels = groups.map(([name,,types]) => {
      const option = new Option("", name);
      category.add(option);
      return {option, name, count: types.length};
    });
    function localizeCategories() {
      for (const {option, name, count} of categoryLabels) option.textContent = t(name) + " · " + count;
    }
    localizeCategories();
    if (query.get("library") === "new") onlyNew.checked = true;
    for (const input of [search, category, onlyNew]) {
      input.addEventListener(input === search ? "input" : "change", () => filterCatalog());
    }
    byId("modeSolo").onclick = () => setMode("solo");
    byId("modeAdd").onclick = () => setMode("add");
    galleryButton.onclick = () => {
      if (!busy) showGallery(!expanded, !expanded);
    };
    byId("addEffect").onclick = () => {
      if (busy) return;
      setMode("add");
      showGallery(true);
    };
    byId("closeEffects")?.addEventListener("click", cancelPreview);
    byId("applyTrial")?.addEventListener("click", applyDraft);
    byId("cancelTrial")?.addEventListener("click", cancelPreview);
    byId("undoEdit")?.addEventListener("click", undo);
    catalog.addEventListener("keydown", event => {
      const card = event.target.closest("[data-effect]");
      const vertical = ["ArrowUp","ArrowDown"].includes(event.key);
      if (!card || card.hidden || (vertical ? !expanded : !["ArrowLeft","ArrowRight","Home","End"].includes(event.key))) return;
      const cards = catalogCards.filter(entry => !entry.hidden);
      const index = cards.indexOf(card);
      const target = event.key === "Home" ? 0 : event.key === "End" ? cards.length - 1
        : (index + (event.key === "ArrowLeft" ? -1 : 1) + cards.length) % cards.length;
      event.preventDefault();
      const next = vertical ? verticalCard(cards, card, event.key === "ArrowUp" ? -1 : 1) : cards[target];
      if (!next || next === card) return;
      pauseLayoutHover();
      next.focus({preventScroll: true});
      const bounds = catalog.getBoundingClientRect();
      const slot = next.getBoundingClientRect();
      if (expanded) {
        if (slot.top < bounds.top) catalog.scrollTop -= bounds.top - slot.top;
        if (slot.bottom > bounds.bottom) catalog.scrollTop += slot.bottom - bounds.bottom;
      } else {
        if (slot.left < bounds.left) catalog.scrollLeft -= bounds.left - slot.left;
        if (slot.right > bounds.right) catalog.scrollLeft += slot.right - bounds.right;
      }
    });
    catalog.addEventListener("wheel", pauseLayoutHover, {passive: true});
    catalog.addEventListener("scroll", pauseLayoutHover, {passive: true});
    document.addEventListener("pointermove", onPointerMove, {capture: true, passive: true});
    wireScroll(catalog, "catalogPrev", "catalogNext");
    wireScroll(rail, "previousLooks", "nextLooks");

    const saveDialog = byId("saveDialog");
    const lookNameInput = byId("lookName");
    function validatePresetName() {
      const valid = Boolean(lookNameInput.value.trim());
      lookNameInput.setCustomValidity(valid ? "" : t(presetNameValidation));
      return valid;
    }
    lookNameInput.addEventListener("input", validatePresetName);
    lookNameInput.addEventListener("invalid", validatePresetName);
    byId("closeSave").onclick = () => saveDialog.close();
    saveDialog.addEventListener("click", event => {
      if (event.target !== saveDialog) return;
      const rect = saveDialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
        saveDialog.close();
      }
    });
    byId("saveLook").onclick = () => {
      if (busy || visibleTrial()) return;
      const look = pickedLook(committed);
      lookNameInput.value = t("{name} 副本", {name: look ? lookNameOf(look) : t("我的风格")});
      validatePresetName();
      saveDialog.showModal();
      lookNameInput.select();
    };
    byId("saveForm").onsubmit = event => {
      event.preventDefault();
      if (!validatePresetName()) {
        lookNameInput.reportValidity();
        return;
      }
      const name = lookNameInput.value.trim();
      const saved = {id: "own-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2,6),
        name, ...settingsOf(committed), selected: committed.selected};
      const next = [...custom,saved];
      try { localStorage.setItem(storageKey, JSON.stringify(next)); }
      catch {
        saveDialog.close();
        feedback("此浏览器无法保存本地模板。可以继续编辑并导出。", true);
        return;
      }
      keepSnapshot();
      custom = next;
      committed.templateId = saved.id;
      saveDialog.close();
      drawRail();
      update("saveTemplate");
      rail.lastElementChild?.scrollIntoView({block: "nearest", inline: "nearest"});
      feedback("已保存模板「{name}」。", false, {name});
    };

    byId("reset").onclick = () => {
      const state = editing();
      const current = focusedLayer(state);
      if (!current || busy) return;
      const definition = effects[current.type];
      const explicitControls = current.chars !== undefined || current.palette !== undefined
        || (definition.controls || []).some(control => Object.hasOwn(current, control.key));
      if (current.size === definition.size && current.strength === definition.strength && !explicitControls) return;
      if (!draft) keepSnapshot();
      clearTransient();
      current.size = definition.size;
      current.strength = definition.strength;
      delete current.chars;
      delete current.palette;
      for (const control of definition.controls || []) delete current[control.key];
      state.templateId = null;
      specialist.reset();
      update("parameter");
    };
    for (const key of ["size","strength"]) {
      const input = byId(key);
      input.oninput = () => writeLayerParameter(focusedLayer(editing()), key, Number(input.value), input);
      input.onchange = () => { editGroup = null; };
    }
    byId("palette").onchange = event => {
      const current = focusedLayer(editing());
      if (current?.type === "dither") writeLayerParameter(current, "palette", event.target.value);
    };
    byId("chars").oninput = event => {
      const input = event.target;
      const current = focusedLayer(editing());
      if (current?.type !== "ascii") return;
      if (input.value.length < 2 || !input.value.trim() || /[^ -~]/.test(input.value)) {
        input.setCustomValidity(t(asciiValidation));
        input.reportValidity();
        return;
      }
      input.setCustomValidity("");
      writeLayerParameter(current, "chars", input.value, input);
    };
    byId("chars").onblur = event => {
      const input = event.target;
      input.setCustomValidity("");
      input.value = focusedLayer(editing())?.chars ?? " .,:-+=*#%@";
    };
    byId("motion").onchange = event => {
      const state = editing();
      if (busy || state.motion === event.target.value) return;
      clearTransient();
      if (!draft) keepSnapshot();
      state.motion = event.target.value;
      state.templateId = null;
      update("motion");
    };
    document.addEventListener("focusout", event => {
      if (editGroup === event.target) editGroup = null;
    });
    document.addEventListener("keydown", event => {
      if (busy || saveDialog.open || document.documentElement.dataset.view === "cover") return;
      if (event.key === "Escape") {
        if (visibleTrial() || peekRequest && !expanded) {
          event.preventDefault();
          cancelPreview();
          return;
        }
        if (expanded) {
          event.preventDefault();
          clearTransient();
          showGallery(false, false, true);
          return;
        }
      }
      if ((event.metaKey || event.ctrlKey) && !event.shiftKey && event.key.toLowerCase() === "z"
          && !(event.target instanceof Element && event.target.closest("input:not([type=range]),textarea,select,[contenteditable]"))
          && !draft && history.length) {
        event.preventDefault();
        undo();
      }
    });

    drawRail();
    drawLayers();
    makeCatalog();
    filterCatalog();
    showGallery(query.has("library"));
    document.addEventListener("tonepress:language", () => {
      for (const card of catalogCards) localizeCard(card);
      const looksById = new Map(templates().map(look => [look.id, look]));
      for (const card of rail.children) localizeCard(card, looksById.get(card.dataset.template));
      committed.layers.forEach((item, index) => localizeLayerRow(list.children[index], item));
      localizeCategories();
      localizeGallery();
      specialist.localize();
      const input = byId("chars");
      if (input.validity.customError) input.setCustomValidity(t(asciiValidation));
      if (saveDialog.open) validatePresetName();
      showCurrent();
    });
    return {
      get settings() { return settingsOf(committed); },
      get previewSettings() { return settingsOf(visibleTrial()?.state || committed); },
      get previewing() { return !!visibleTrial(); },
      get previewKey() { return visibleTrial()?.key || null; },
      get pending() { return !!draft; },
      get title() {
        const look = pickedLook(committed);
        return look ? lookNameOf(look) : t(committed.layers.length ? "自定义风格" : "原片");
      },
      get motion() { return committed.motion; },
      get timed() {
        return committed.motion === "breathe" || committed.layers.some(item =>
          item.enabled && item.strength > 0 && (effects[item.type].timed || ["vhs","glitch"].includes(item.type)));
      },
      cancelPreview,
      setBusy(value) {
        busy = value;
        if (busy) {
          const changed = clearTransient();
          if (changed) update("endPeek");
        }
        syncActions();
      },
      sampleSource(source, width, height) {
        const scale = Math.max(sample.width / width, sample.height / height);
        const context = sample.getContext("2d");
        context.clearRect(0, 0, sample.width, sample.height);
        context.drawImage(source,(sample.width - width * scale) / 2,(sample.height - height * scale) / 2,
          width * scale,height * scale);
        hasSample = true;
        sampleRevision++;
        thumbnails.clear();
        thumbQueue.clear();
        watchThumbnails(rail, railObserver);
        watchThumbnails(catalog, catalogObserver);
      }
    };
  }

  window.TonepressWorkspace = {create};
})();
