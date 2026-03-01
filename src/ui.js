export class UI {
  constructor(root) {
    this.root = root;
    this.toastEl = null;
    this.devOverlay = false;
    this.fps = 0;
    this.buildToast();
  }

  buildToast() {
    this.toastEl = document.createElement('div');
    this.toastEl.className = 'toast';
    this.toastEl.style.display = 'none';
    this.root.appendChild(this.toastEl);
  }

  setToast(text) {
    this.toastEl.textContent = text;
    this.toastEl.style.display = text ? 'block' : 'none';
  }

  showPanel(html) {
    this.clearPanels();
    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.innerHTML = html;
    this.root.appendChild(panel);
    return panel;
  }

  clearPanels() {
    const panels = this.root.querySelectorAll('.panel');
    panels.forEach((p) => p.remove());
  }
}
