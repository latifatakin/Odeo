// Help: how Ôdēō works, keyboard shortcuts, privacy.



export function render(main) {
  main.innerHTML = `
  <div class="page page--narrow">
    <header class="page-head">
      <h1>Help</h1>
      <p>Paste text or upload a file, then press play.</p>
    </header>
    <div class="help-list">
      <section class="settings-card" aria-labelledby="h-start">
        <h2 class="h4" id="h-start">Getting started</h2>
        <ol class="kbd-list">
          <li>1. Press <strong>Add</strong>, then choose Paste text or Upload a file (PDF or TXT).</li>
          <li>2. Press <strong>Start listening</strong>. Each word lights up as it’s read.</li>
          <li>3. Tap any word to listen from there. Select text and choose <strong>Save note</strong> to keep it.</li>
          <li>4. Come back any time. Ôdēō remembers where you stopped.</li>
        </ol>
      </section>
      <section class="settings-card" aria-labelledby="h-keys">
        <h2 class="h4" id="h-keys">Keyboard shortcuts in the reader</h2>
        <ul class="kbd-list">
          <li><kbd>Space</kbd> Play or pause</li>
          <li><kbd>←</kbd> Back 10 seconds</li>
          <li><kbd>→</kbd> Forward 10 seconds</li>
        </ul>
      </section>
      <section class="settings-card" aria-labelledby="h-voices">
        <h2 class="h4" id="h-voices">Voices</h2>
        <p>Voices come from your device, so the list is different on each phone, tablet or computer. Voices marked “Works offline” play without internet.</p>
      </section>
      <section class="settings-card" aria-labelledby="h-private">
        <h2 class="h4" id="h-private">Your privacy</h2>
        <p>Everything stays on this device. Your text and files are never uploaded, and there’s no account to make.</p>
      </section>
      <p><a href="#/settings">Open Settings</a></p>
    </div>
  </div>`;
}
