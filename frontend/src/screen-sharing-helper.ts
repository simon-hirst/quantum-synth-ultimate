export class ScreenSharingHelper {
  private helperElement: HTMLDivElement | null = null;

  showHelper() {
    // Create helper element if it doesn't exist
    if (!this.helperElement) {
      this.helperElement = this.createHelperElement();
      document.body.appendChild(this.helperElement);
      
      // Auto-hide after 10 seconds
      setTimeout(() => {
        this.hideHelper();
      }, 10000);
    }
  }

  hideHelper() {
    if (this.helperElement && this.helperElement.parentElement) {
      document.body.removeChild(this.helperElement);
      this.helperElement = null;
    }
  }

  private createHelperElement(): HTMLDivElement {
    const helper = document.createElement('div');
    helper.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: #00ffaa;
        padding: 12px 20px;
        border-radius: 25px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 14px;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(0, 255, 170, 0.3);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 10px;
      ">
        <span>💡 Click "Hide" on the Chrome screen sharing indicator to clean up your view</span>
        <button style="
          background: rgba(0, 255, 170, 0.2);
          border: 1px solid rgba(0, 255, 170, 0.5);
          color: #00ffaa;
          border-radius: 15px;
          padding: 6px 12px;
          cursor: pointer;
          font-size: 12px;
        " onclick="this.parentElement.parentElement.style.display='none'">
          Got it
        </button>
      </div>
    `;
    return helper;
  }
}
