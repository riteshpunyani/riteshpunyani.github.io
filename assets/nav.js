/* ============================================================
   SHARED SITE NAVIGATION — Ritesh Punyani
   Inject this before </body> on every page.
   It reads window.location.pathname to highlight the active page.
   ============================================================ */
(function () {
  'use strict';

  /* ----------------------------------------------------------
     1. Nav data — all pages & their dropdown groups
  ---------------------------------------------------------- */
  var NAV = [
    { label: 'Home', href: 'index.html', key: 'index' },
    { label: 'Portfolio', href: 'portfolio.html', key: 'portfolio' },
    {
      label: 'Analytics', href: 'analytics.html', key: 'analytics',
      children: [
        { label: '🔍 Fraud Analytics Framework',   href: 'analytics.html' },
        { label: '📈 Predictive Analytics',         href: 'predictive.html' },
        { label: '🤖 Machine Learning & Data Sci',  href: 'ml.html' },
      ]
    },
    {
      label: 'Automation', href: 'automation.html', key: 'automation',
      children: [
        { label: '📊 MS Office & Automation',        href: 'automation-office.html' },
        { label: '🖥️ Windows & Desktop',             href: 'automation-desktop.html' },
        { label: '🌐 Browser & Web',                 href: 'automation-browser.html' },
        { label: '📱 Mobile Automation',              href: 'automation-mobile.html' },
        { label: '☁️ Cloud & Integration',            href: 'automation-cloud.html' },
        { label: '🧠 AI & Copilots',                 href: 'automation-ai.html' },
        { sep: true },
        { label: '⚙️ Free n8n Automation',            href: 'n8n.html' },
      ]
    },
    { label: 'Prompting', href: 'prompts.html', key: 'prompts' },
    {
      label: 'Tools', href: 'tools.html', key: 'tools',
      children: [
        { label: '🤖 Emily — AI Appointment Asst',   href: 'tools-emily.html' },
        { label: '🛒 Sophia — AI Order Assistant',   href: 'tools-sophia.html' },
        { sep: true },
        { label: '🧠 Custom GPTs',                   href: 'tools-custom-gpts.html' },
        { label: '🌍 Common AI Tools',               href: 'tools-common-ai.html' },
        { label: '⚙️ Excel VBA Utilities',            href: 'tools.html' },
        { label: '🔄 Free n8n Automation',            href: 'n8n.html' },
      ]
    },
    {
      label: 'Case Studies', href: 'casestudies.html', key: 'casestudies',
      children: [
        { label: '🛠️ Automation in Action',           href: 'cs-automation.html' },
        { label: '📊 Customer Purchase Propensity',   href: 'cs-propensity.html' },
        { label: '🔎 Fraud Detection using ML',       href: 'cs-fraud-ml.html' },
      ]
    },
    {
      label: 'Learn', href: 'blogs.html', key: 'learn',
      children: [
        { label: '▶️ YouTube Picks',                  href: 'youtube.html' },
        { label: '✍️ My Blogs',                       href: 'blogs.html' },
        { label: '📰 News & Updates',                 href: 'news.html' },
      ]
    },
    { label: 'Credentials', href: 'index.html#certs', key: 'certs' },
    { label: 'Contact', href: 'contact.html', key: 'contact' },
  ];

  /* ----------------------------------------------------------
     2. Detect active page
  ---------------------------------------------------------- */
  var path = window.location.pathname;
  var file = path.split('/').pop() || 'index.html';
  if (file === '') file = 'index.html';

  function isActive(item) {
    if (item.href === file) return true;
    if (item.children) {
      return item.children.some(function(c) { return c.href && c.href.split('#')[0] === file; });
    }
    return false;
  }

  /* ----------------------------------------------------------
     3. Build HTML
  ---------------------------------------------------------- */
  function esc(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  var liHtml = NAV.map(function(item) {
    var active = isActive(item);
    var activeClass = active ? ' active' : '';

    if (!item.children) {
      return '<li><a href="' + esc(item.href) + '" class="' + activeClass.trim() + '">' + item.label + '</a></li>';
    }

    var ddItems = item.children.map(function(c) {
      if (c.sep) return '<div class="dd-sep"></div>';
      var ca = (file === c.href || file === c.href.split('#')[0]) ? ' class="active"' : '';
      return '<a href="' + esc(c.href) + '"' + ca + '>' + c.label + '</a>';
    }).join('');

    return [
      '<li class="has-dd">',
        '<a href="' + esc(item.href) + '" class="' + activeClass.trim() + '">',
          item.label,
          '<span class="ddcaret">▾</span>',
        '</a>',
        '<div class="sdd">' + ddItems + '</div>',
      '</li>',
    ].join('');
  }).join('');

  var navHTML = [
    '<div class="snav-inner">',
      '<a class="snav-logo" href="index.html"><span class="snav-mono">RP</span></a>',
      '<ul class="snav-links" id="snav-ul">' + liHtml + '</ul>',
      '<div class="snav-hbg" id="snav-hbg" aria-label="Menu" role="button" tabindex="0">',
        '<span></span><span></span><span></span>',
      '</div>',
    '</div>',
  ].join('');

  /* ----------------------------------------------------------
     4. Inject into #snav placeholder
  ---------------------------------------------------------- */
  var placeholder = document.getElementById('snav');
  if (!placeholder) {
    placeholder = document.createElement('nav');
    placeholder.id = 'snav';
    document.body.insertBefore(placeholder, document.body.firstChild);
  }
  placeholder.innerHTML = navHTML;

  /* ----------------------------------------------------------
     5. Behaviours: scroll shadow, hamburger, mobile accordion
  ---------------------------------------------------------- */
  window.addEventListener('scroll', function() {
    placeholder.classList.toggle('scrolled', window.scrollY > 40);
  });

  var hbg = document.getElementById('snav-hbg');
  var ul  = document.getElementById('snav-ul');

  function toggleMenu() {
    ul.classList.toggle('open');
  }

  hbg.addEventListener('click', toggleMenu);
  hbg.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === ' ') toggleMenu();
  });

  // Mobile: tap top-level item with children opens accordion instead of navigating
  ul.addEventListener('click', function(e) {
    if (window.innerWidth > 900) return;
    var li = e.target.closest('.has-dd');
    if (!li) return;
    if (e.target.closest('.sdd')) return; // clicked a child link — let it navigate
    e.preventDefault();
    li.classList.toggle('mob-open');
  });

  // Close menu on nav link click (mobile)
  ul.addEventListener('click', function(e) {
    if (window.innerWidth > 900) return;
    if (e.target.tagName === 'A' && !e.target.closest('.has-dd > a')) {
      ul.classList.remove('open');
    }
    if (e.target.closest('.sdd a')) {
      ul.classList.remove('open');
    }
  });

  // Close dropdown on outside click (desktop)
  document.addEventListener('click', function(e) {
    if (window.innerWidth <= 900) return;
    if (!placeholder.contains(e.target)) {
      ul.querySelectorAll('.has-dd').forEach(function(li) {
        li.classList.remove('mob-open');
      });
    }
  });


  /* ----------------------------------------------------------
     6. "On this page" section bar — auto-built from page sections
  ---------------------------------------------------------- */
  (function() {
    // Skip if bar already exists
    if (document.getElementById('page-bar')) return;
    // Find all sections with an id, skip hero/banner sections
    var sections = Array.from(document.querySelectorAll('section[id]')).filter(function(s){
      return !['hero','banner','top','header'].includes(s.id.toLowerCase());
    });
    if (sections.length < 2) return; // skip pages with only 1 section

    // Get label: prefer first h2 > stag text or h2, fallback to section id
    function getLabel(sec) {
      var stag = sec.querySelector('.stag');
      if (stag) {
        // stag has a ::before pseudo, get text content minus that
        var txt = stag.textContent.trim();
        return txt;
      }
      var h2 = sec.querySelector('h2');
      if (h2) return h2.textContent.trim().replace(/[^\w\s&]/g,'').trim().substring(0,28);
      // format id
      return sec.id.replace(/-/g,' ').split(' ').map(function(w){return w.charAt(0).toUpperCase()+w.slice(1);}).join(' ');
    }

    // Build bar HTML
    var links = sections.map(function(s) {
      return '<a href="#' + s.id + '" class="pb-link">' + getLabel(s) + '</a>';
    }).join('');

    var bar = document.createElement('div');
    bar.id = 'page-bar';
    bar.innerHTML = '<div class="pb-inner"><span class="pb-label">On this page</span><div class="pb-links">' + links + '</div></div>';

    // Insert as first element inside body, after snav
    // Use fixed positioning so it always sits below the nav
    bar.style.cssText = 'position:fixed;top:56px;left:0;right:0;z-index:8990;background:rgba(13,20,35,0.97);backdrop-filter:blur(12px);border-bottom:1px solid #1a2640;overflow-x:auto;scrollbar-width:none;';
    document.body.appendChild(bar);
    // After render, measure bar height and add to body padding-top
    requestAnimationFrame(function(){
      var h = bar.offsetHeight || 36;
      var current = parseInt(getComputedStyle(document.body).paddingTop) || 0;
      document.body.style.paddingTop = (current + h) + 'px';
    });

    // Highlight active section on scroll
    var allLinks = bar.querySelectorAll('.pb-link');
    var obs = new IntersectionObserver(function(entries) {
      entries.forEach(function(e) {
        if (e.isIntersecting) {
          allLinks.forEach(function(l) { l.classList.remove('active'); });
          var active = bar.querySelector('.pb-link[href="#' + e.target.id + '"]');
          if (active) active.classList.add('active');
        }
      });
    }, { threshold: 0.25 });
    sections.forEach(function(s) { obs.observe(s); });
  })();

})();
