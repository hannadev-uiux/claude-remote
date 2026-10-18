/* Injects the SVG sprite with the Remote Harness mark ("the Tether") so every page uses one source.
   <svg><use href="#rh-mark"/></svg> — color via `color`, node colors via --n-l / --n-c / --n-r,
   ring fill via --ring (tray "working" state). */
(function () {
  var sprite = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute" aria-hidden="true">',
    // Regular weight: app icon, splash, README, landing.
    '<symbol id="rh-mark" viewBox="0 0 256 256">',
    '<g fill="none" stroke="currentColor" stroke-width="24" stroke-linecap="round" stroke-linejoin="round">',
    '<circle cx="128" cy="184" r="34" fill="var(--ring, none)"/>',
    '<path d="M128 150V66"/>',
    '<path d="M111 154C104 120 88 100 60 80"/>',
    '<path d="M145 154C152 120 168 100 196 80"/>',
    '</g>',
    '<rect x="110" y="34" width="36" height="36" rx="9" fill="var(--n-c, currentColor)"/>',
    '<rect x="36" y="52" width="36" height="36" rx="9" fill="var(--n-l, currentColor)"/>',
    '<rect x="184" y="52" width="36" height="36" rx="9" fill="var(--n-r, currentColor)"/>',
    '</symbol>',
    // Bold weight: menu bar, notification icon, favicon 16/32, anything under 24 px.
    '<symbol id="rh-mark-bold" viewBox="0 0 256 256">',
    '<g fill="none" stroke="currentColor" stroke-width="34" stroke-linecap="round" stroke-linejoin="round">',
    '<circle cx="128" cy="186" r="36" fill="var(--ring, none)"/>',
    '<path d="M128 150V70"/>',
    '<path d="M108 156C100 122 86 104 56 84"/>',
    '<path d="M148 156C156 122 170 104 200 84"/>',
    '</g>',
    '<rect x="104" y="24" width="48" height="48" rx="12" fill="var(--n-c, currentColor)"/>',
    '<rect x="28" y="46" width="48" height="48" rx="12" fill="var(--n-l, currentColor)"/>',
    '<rect x="180" y="46" width="48" height="48" rx="12" fill="var(--n-r, currentColor)"/>',
    '</symbol>',
    '</svg>',
  ].join('');
  var holder = document.createElement('div');
  holder.innerHTML = sprite;
  document.body.prepend(holder.firstElementChild);

  // Theme switcher: buttons with [data-theme] swap the `t-*` class of the closest [data-themed] target.
  document.querySelectorAll('[data-theme-switch]').forEach(function (group) {
    var target = document.querySelector(group.getAttribute('data-theme-switch'));
    group.querySelectorAll('[data-theme]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!target) return;
        target.className = target.className.replace(/\bt-\w+\b/g, '').trim() + ' ' + btn.getAttribute('data-theme');
        group.querySelectorAll('[data-theme]').forEach(function (b) { b.classList.toggle('on', b === btn); });
      });
    });
  });

  // Copy buttons on the landing mockup.
  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy');
      var done = function () { var old = btn.textContent; btn.textContent = btn.getAttribute('data-copied') || 'Copied'; setTimeout(function () { btn.textContent = old; }, 1400); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, done); else done();
    });
  });
})();
