(function () {
  if (window.__CAIGE_MOJIBAKE_NORMALIZER__) {
    return;
  }

  window.__CAIGE_MOJIBAKE_NORMALIZER__ = true;

  const MOJIBAKE_PATTERN = /[ÃÂâðŸ�]/;

  function normalizeMojibake(value) {
    if (typeof value !== 'string' || !MOJIBAKE_PATTERN.test(value)) {
      return value;
    }

    try {
      const decoded = decodeURIComponent(escape(value));
      return decoded || value;
    } catch {
      return value;
    }
  }

  function normalizeDocumentText() {
    const root = document.body;
    if (!root) {
      return;
    }

    if (document.title) {
      document.title = normalizeMojibake(document.title);
    }

    const textWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (textWalker.nextNode()) {
      const node = textWalker.currentNode;
      const normalized = normalizeMojibake(node.nodeValue);
      if (normalized !== node.nodeValue) {
        node.nodeValue = normalized;
      }
    }

    const attributeNames = ['title', 'placeholder', 'aria-label', 'alt'];
    root.querySelectorAll('*').forEach((element) => {
      attributeNames.forEach((attributeName) => {
        if (element.hasAttribute(attributeName)) {
          const currentValue = element.getAttribute(attributeName);
          const normalized = normalizeMojibake(currentValue);
          if (normalized !== currentValue) {
            element.setAttribute(attributeName, normalized);
          }
        }
      });
    });
  }

  function normalizeNode(node) {
    if (!node) {
      return;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      const normalized = normalizeMojibake(node.nodeValue);
      if (normalized !== node.nodeValue) {
        node.nodeValue = normalized;
      }
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const element = node;
    const attributeNames = ['title', 'placeholder', 'aria-label', 'alt'];

    attributeNames.forEach((attributeName) => {
      if (element.hasAttribute(attributeName)) {
        const currentValue = element.getAttribute(attributeName);
        const normalized = normalizeMojibake(currentValue);
        if (normalized !== currentValue) {
          element.setAttribute(attributeName, normalized);
        }
      }
    });

    element.querySelectorAll('*').forEach((childElement) => {
      attributeNames.forEach((attributeName) => {
        if (childElement.hasAttribute(attributeName)) {
          const currentValue = childElement.getAttribute(attributeName);
          const normalized = normalizeMojibake(currentValue);
          if (normalized !== currentValue) {
            childElement.setAttribute(attributeName, normalized);
          }
        }
      });
    });
  }

  function startObserver() {
    const root = document.body;
    if (!root || typeof MutationObserver === 'undefined') {
      return;
    }

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'characterData') {
          normalizeNode(mutation.target);
          return;
        }

        mutation.addedNodes.forEach((addedNode) => normalizeNode(addedNode));

        if (mutation.type === 'attributes') {
          normalizeNode(mutation.target);
        }
      });
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      normalizeDocumentText();
      startObserver();
    }, { once: true });
  } else {
    normalizeDocumentText();
    startObserver();
  }
})();