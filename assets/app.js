(() => {
  'use strict';
  const root = document.documentElement;
  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  let userReduced = false;
  try { userReduced = localStorage.getItem('noctra-motion') === 'reduced'; } catch (_) {}
  let reduced = motionQuery.matches || userReduced;
  const motionButton = $('.motion-toggle');

  function applyMotion() {
    reduced = motionQuery.matches || userReduced;
    root.classList.toggle('motion-reduced', reduced);
    root.classList.toggle('js-motion', !reduced);
    motionButton.setAttribute('aria-pressed', String(reduced));
    motionButton.disabled = motionQuery.matches;
    $('.motion-label').textContent = motionQuery.matches ? 'Reduced motion' : reduced ? 'Motion off' : 'Motion on';
    motionButton.title = motionQuery.matches ? 'Following your device’s reduced motion preference' : 'Toggle page animations';
    if (reduced) $$('.reveal').forEach(el => el.classList.add('is-visible'));
  }
  applyMotion();
  motionButton.addEventListener('click', () => {
    userReduced = !userReduced;
    try { localStorage.setItem('noctra-motion', userReduced ? 'reduced' : 'full'); } catch (_) {}
    applyMotion();
  });
  motionQuery.addEventListener('change', applyMotion);

  // Reveals only run once. Content stays accessible with JavaScript disabled.
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: .08, rootMargin: '0px 0px -24px 0px' });
    $$('.reveal').forEach(el => revealObserver.observe(el));
    $$('.feature-item').forEach((el, index) => el.style.setProperty('--reveal-delay', `${index * 90}ms`));
    const navObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        $$('.nav-link').forEach(a => {
          const active = a.hash === `#${entry.target.id}`;
          a.classList.toggle('active', active);
          if (active) a.setAttribute('aria-current', 'location');
          else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-15% 0px -55% 0px', threshold: 0 });
    ['vision', 'experience', 'collection'].forEach(id => navObserver.observe(document.getElementById(id)));
  } else $$('.reveal').forEach(el => el.classList.add('is-visible'));

  const progress = $('.reading-progress');
  const stage = $('.experience-stage');
  const stageProduct = $('.stage-product');
  let framePending = false;
  function updateScroll() {
    framePending = false;
    const distance = root.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleX(${distance > 0 ? Math.min(1, window.scrollY / distance) : 0})`;
    if (!reduced && finePointer.matches) {
      const rect = stage.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < window.innerHeight) {
        const relative = (rect.top + rect.height / 2 - window.innerHeight / 2) / window.innerHeight;
        stageProduct.style.transform = `translateY(${relative * 24}px) rotate(${relative * -3}deg)`;
      }
    }
  }
  function scheduleScroll() {
    if (!framePending) { framePending = true; requestAnimationFrame(updateScroll); }
  }
  window.addEventListener('scroll', scheduleScroll, { passive: true });
  window.addEventListener('resize', scheduleScroll, { passive: true });
  updateScroll();

  // Pointer motion adds depth without intercepting scrolling or touch gestures.
  const hero = $('.hero');
  const heroImage = $('.hero-product');
  hero.addEventListener('pointermove', event => {
    if (reduced || !finePointer.matches) return;
    const rect = hero.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - .5;
    const y = (event.clientY - rect.top) / rect.height - .5;
    heroImage.style.transform = `translate(${x * 14}px, ${y * 10}px) rotate(${-11 + x * 2}deg)`;
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { heroImage.style.transform = ''; });
  $$('.magnetic').forEach(button => {
    button.addEventListener('pointermove', event => {
      if (reduced || !finePointer.matches) return;
      const rect = button.getBoundingClientRect();
      button.style.transform = `translate(${(event.clientX - rect.left - rect.width / 2) * .1}px, ${(event.clientY - rect.top - rect.height / 2) * .14}px)`;
    }, { passive: true });
    button.addEventListener('pointerleave', () => { button.style.transform = ''; });
  });

  const menuToggle = $('.menu-toggle');
  const mobileMenu = $('#mobile-menu');
  const main = $('main');
  const footer = $('.site-footer');
  function setMenu(open, restoreFocus = false) {
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    mobileMenu.hidden = !open;
    document.body.classList.toggle('menu-open', open);
    main.inert = open;
    footer.inert = open;
    if (restoreFocus) menuToggle.focus({ preventScroll: true });
  }
  menuToggle.addEventListener('click', () => setMenu(menuToggle.getAttribute('aria-expanded') !== 'true'));
  window.addEventListener('resize', () => { if (window.innerWidth > 800 && !mobileMenu.hidden) setMenu(false); });
  document.addEventListener('keydown', event => {
    if (mobileMenu.hidden) return;
    if (event.key === 'Escape') setMenu(false, true);
    if (event.key === 'Tab') {
      const items = [menuToggle, ...$$('a', mobileMenu)];
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });

  let curtainBusy = false;
  const curtain = $('.transition-curtain');
  function focusSection(target) {
    const focusTarget = $('h1, h2', target) || target;
    if (!focusTarget.hasAttribute('tabindex')) {
      focusTarget.setAttribute('tabindex', '-1');
      focusTarget.addEventListener('blur', () => focusTarget.removeAttribute('tabindex'), { once: true });
    }
    focusTarget.focus({ preventScroll: true });
  }
  $$('a[href^="#"]').forEach(link => link.addEventListener('click', event => {
    const target = document.getElementById(link.hash.slice(1));
    if (!target || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    setMenu(false);
    const navigate = behavior => {
      target.scrollIntoView({ behavior, block: 'start' });
      try { history.replaceState(null, '', link.hash); } catch (_) {}
      focusSection(target);
    };
    if (!reduced && (link.classList.contains('closing-link') || link.classList.contains('header-cta'))) {
      if (curtainBusy) return;
      curtainBusy = true;
      curtain.classList.add('is-transitioning');
      setTimeout(() => navigate('instant'), 460);
      setTimeout(() => { curtain.classList.remove('is-transitioning'); curtainBusy = false; }, 1040);
    } else navigate(reduced ? 'instant' : 'smooth');
  }));

  const featureData = {
    display: { label: '01 / THE OPTICAL SURFACE', title: 'A wider way to see.', copy: 'A continuous curved visor gives Vision One its distinctive, uninterrupted silhouette.' },
    comfort: { label: '02 / THE HUMAN SIDE', title: 'Softness meets structure.', copy: 'A woven headband and cushioned contact points balance the sculpted metal frame.' }
  };
  const featurePopover = $('#feature-popover');
  function closeFeatures() {
    featurePopover.hidden = true;
    $$('.hotspot').forEach(button => button.setAttribute('aria-expanded', 'false'));
  }
  $$('.hotspot').forEach(button => {
    button.setAttribute('aria-controls', 'feature-popover');
    button.addEventListener('click', () => {
      const wasOpen = button.getAttribute('aria-expanded') === 'true';
      closeFeatures();
      if (wasOpen) return;
      const item = featureData[button.dataset.feature];
      $('#feature-label').textContent = item.label;
      $('#feature-title').textContent = item.title;
      $('#feature-copy').textContent = item.copy;
      button.setAttribute('aria-expanded', 'true');
      featurePopover.hidden = false;
    });
  });
  document.addEventListener('click', event => { if (!event.target.closest('.hotspot, .feature-popover')) closeFeatures(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeFeatures(); });

  const products = {
    vision: {
      index: '01', name: 'Vision One', image: 'assets/vision.webp', alt: 'Vision One spatial computing headset with silver frame and curved optical visor', kicker: 'A NEW POINT OF VIEW',
      description: 'Make a little more room for possibility. Spatial computing that brings your digital world into the space around you.',
      tags: ['Spatial computing', 'Intuitive by design'],
      features: [['Category', 'Spatial computing'], ['Finish', 'Silver / Obsidian'], ['Materials', 'Metal, glass, woven textile'], ['Design focus', 'Immersion & comfort']]
    },
    motion: {
      index: '02', name: 'Motion One', image: 'assets/motion.webp', alt: 'Motion One graphite gaming mouse with sculpted perforated shell and subtle lime accents', kicker: 'EVERY MOVE. ALL YOU.',
      description: 'Find your flow, then push it further. A sculpted precision mouse that feels like an extension of your hand, from the first move to the last play.',
      tags: ['Precision play', 'Sculpted control'],
      features: [['Category', 'Precision gaming'], ['Finish', 'Graphite / Electric lime'], ['Materials', 'Perforated shell, metal wheel'], ['Design focus', 'Control & agility']]
    },
    sound: {
      index: '03', name: 'Sound One', image: 'assets/sound.webp', alt: 'Sound One over-ear headphones with brushed silver earcups and charcoal cushions', kicker: 'LESS OUTSIDE. MORE INSIDE.',
      description: 'A space that belongs to you. Slip into the details of your favorite sound with an over-ear design made for getting wonderfully lost.',
      tags: ['Immersive listening', 'Over-ear comfort'],
      features: [['Category', 'Personal audio'], ['Finish', 'Brushed silver / Charcoal'], ['Materials', 'Metal, soft cushioned pads'], ['Design focus', 'Presence & listening comfort']]
    }
  };
  const panel = $('#product-panel');
  const collectionImage = $('#collection-image');
  const tabs = $$('.collection-tab');
  let currentProduct = 'vision';
  let switchSequence = 0;
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

  async function selectProduct(key, moveFocus = false) {
    const item = products[key];
    if (!item || key === currentProduct) return;
    currentProduct = key;
    const sequence = ++switchSequence;
    tabs.forEach(tab => {
      const selected = tab.dataset.product === key;
      tab.classList.toggle('is-active', selected);
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && moveFocus) tab.focus();
    });
    panel.setAttribute('aria-busy', 'true');
    panel.classList.add('is-switching');
    await delay(reduced ? 0 : 270);
    if (sequence !== switchSequence) return;
    collectionImage.src = item.image;
    collectionImage.alt = item.alt;
    $('.product-backdrop-number').textContent = item.index;
    $('#collection-kicker').textContent = item.kicker;
    $('#collection-name').replaceChildren(document.createTextNode(item.name), Object.assign(document.createElement('span'), { textContent: '™' }));
    $('#collection-description').textContent = item.description;
    $('#collection-tags').replaceChildren(...item.tags.map(tag => Object.assign(document.createElement('span'), { textContent: tag })));
    $('#product-details').dataset.product = key;
    panel.setAttribute('aria-labelledby', `tab-${key}`);
    try { await collectionImage.decode(); } catch (_) {}
    if (sequence !== switchSequence) return;
    panel.removeAttribute('aria-busy');
    requestAnimationFrame(() => panel.classList.remove('is-switching'));
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectProduct(tab.dataset.product));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault();
      tabs[next].focus();
      selectProduct(tabs[next].dataset.product, true);
    });
  });

  const dialog = $('.product-dialog');
  const detailsButton = $('#product-details');
  detailsButton.addEventListener('click', () => {
    const item = products[detailsButton.dataset.product];
    $('#dialog-image').src = item.image;
    $('#dialog-image').alt = item.alt;
    $('#dialog-kicker').textContent = item.kicker;
    $('#dialog-title').textContent = item.name;
    $('#dialog-description').textContent = item.description;
    $('#dialog-features').replaceChildren(...item.features.map(([label, value]) => {
      const row = document.createElement('div');
      row.append(Object.assign(document.createElement('dt'), { textContent: label }), Object.assign(document.createElement('dd'), { textContent: value }));
      return row;
    }));
    closeFeatures();
    document.body.classList.add('dialog-open');
    dialog.showModal();
    $('.dialog-close').focus();
  });
  $('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => { document.body.classList.remove('dialog-open'); detailsButton.focus({ preventScroll: true }); });

  // Warm the two alternate product images after the initial page has loaded.
  function warmImages() {
    ['motion', 'sound'].forEach(key => { const img = new Image(); img.src = products[key].image; });
  }
  if (document.readyState === 'complete') warmImages();
  else window.addEventListener('load', () => {
    if ('requestIdleCallback' in window) requestIdleCallback(warmImages, { timeout: 2500 });
    else setTimeout(warmImages, 600);
  }, { once: true });
})();
