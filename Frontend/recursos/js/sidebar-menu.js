(function () {
  function initSidebarMenus(options = {}) {
    const closeOthers = options.closeOthers !== false;
    const toggleActiveClass = options.toggleActiveClass === true;

    const toggles = document.querySelectorAll('.sidebar__menu-toggle');

    toggles.forEach((toggle) => {
      const menuId = toggle.getAttribute('data-expand');
      const submenu = menuId ? document.getElementById(menuId) : null;
      if (!submenu) return;

      const isOpen = submenu.classList.contains('open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      if (toggleActiveClass) {
        toggle.classList.toggle('sidebar__menu-toggle--active', isOpen);
      }

      toggle.addEventListener('click', () => {
        const currentlyOpen = submenu.classList.contains('open');

        if (closeOthers) {
          document.querySelectorAll('.sidebar__submenu').forEach((menu) => {
            if (menu.id !== menuId) {
              menu.classList.remove('open');
            }
          });

          if (toggleActiveClass) {
            toggles.forEach((otherToggle) => {
              if (otherToggle !== toggle) {
                otherToggle.classList.remove('sidebar__menu-toggle--active');
                otherToggle.setAttribute('aria-expanded', 'false');
              }
            });
          } else {
            toggles.forEach((otherToggle) => {
              if (otherToggle !== toggle) {
                const otherMenuId = otherToggle.getAttribute('data-expand');
                const otherMenu = otherMenuId ? document.getElementById(otherMenuId) : null;
                if (otherMenu && !otherMenu.classList.contains('open')) {
                  otherToggle.setAttribute('aria-expanded', 'false');
                }
              }
            });
          }
        }

        const nowOpen = !currentlyOpen;
        submenu.classList.toggle('open', nowOpen);
        toggle.setAttribute('aria-expanded', nowOpen ? 'true' : 'false');

        if (toggleActiveClass) {
          toggle.classList.toggle('sidebar__menu-toggle--active', nowOpen);
        }
      });
    });
  }

  window.initSidebarMenus = initSidebarMenus;
})();
