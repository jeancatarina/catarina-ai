/**
 * Catarina Claude - Downloads Page Logic
 * Handles: GitHub Releases API fetch, OS detection, dynamic download links
 * Layout: Big hero card for detected platform, compact grid for others
 */

const GITHUB_REPO = 'catarina-claude/catarina-claude.github.io';
const API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
const RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases`;

// Platform mapping: filename patterns -> platform keys
const PLATFORM_PATTERNS = {
  'macos-arm64': { match: (name) => /macos.*arm64.*\.dmg$/i.test(name) || /aarch64.*\.dmg$/i.test(name) },
  'macos-x64': { match: (name) => /macos.*x64.*\.dmg$/i.test(name) || /x86_64.*\.dmg$/i.test(name) || (/\.dmg$/i.test(name) && !/arm64|aarch64/i.test(name)) },
  'linux-appimage': { match: (name) => /linux.*x64.*\.AppImage$/i.test(name) || /\.AppImage$/i.test(name) },
  'linux-deb': { match: (name) => /linux.*x64.*\.deb$/i.test(name) || /\.deb$/i.test(name) },
  'windows-exe': { match: (name) => /windows.*x64.*\.exe$/i.test(name) || (/\.exe$/i.test(name) && !/\.msi/i.test(name)) },
  'windows-msi': { match: (name) => /windows.*x64.*\.msi$/i.test(name) || /\.msi$/i.test(name) },
};

// Platform display info
const PLATFORM_INFO = {
  'macos-arm64': { icon: '🍎', title: 'macOS', arch: 'Apple Silicon (M1/M2/M3/M4)', format: '.dmg', btnLabel: 'Download for macOS (Apple Silicon)' },
  'macos-x64': { icon: '🍎', title: 'macOS', arch: 'Intel (x86_64)', format: '.dmg', btnLabel: 'Download for macOS (Intel)' },
  'linux-appimage': { icon: '🐧', title: 'Linux', arch: 'x86_64 (AppImage)', format: '.AppImage', btnLabel: 'Download AppImage' },
  'linux-deb': { icon: '🐧', title: 'Linux', arch: 'x86_64 (Debian/Ubuntu)', format: '.deb', btnLabel: 'Download .deb Package' },
  'windows-exe': { icon: '🪟', title: 'Windows', arch: 'x86_64 (Installer)', format: '.exe', btnLabel: 'Download .exe Installer' },
  'windows-msi': { icon: '🪟', title: 'Windows', arch: 'x86_64 (MSI)', format: '.msi', btnLabel: 'Download .msi Package' },
};

// Group platforms by OS family
const OS_FAMILIES = {
  macos: ['macos-arm64', 'macos-x64'],
  linux: ['linux-appimage', 'linux-deb'],
  windows: ['windows-exe', 'windows-msi'],
};

// ---------- OS Detection ----------
function detectOS() {
  const ua = navigator.userAgent;
  const platform = navigator.platform || '';

  if (/Mac/i.test(platform) || /Macintosh/i.test(ua)) {
    return detectMacArch();
  }

  if (/Linux/i.test(platform) || /Linux/i.test(ua)) {
    return 'linux-appimage';
  }

  if (/Win/i.test(platform) || /Windows/i.test(ua)) {
    return 'windows-exe';
  }

  return null;
}

function detectMacArch() {
  // Method 1: Check navigator.userAgentData (Chromium 90+)
  if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
    // This is async but we need sync — use the sync hints if available
    const brands = navigator.userAgentData.brands || [];
    // On ARM Macs, the architecture in userAgentData is 'arm'
    if (navigator.userAgentData.architecture === 'arm') return 'macos-arm64';
    if (navigator.userAgentData.architecture === 'x86') return 'macos-x64';
  }

  // Method 2: Check WebGL renderer for Apple GPU (Apple Silicon has Apple GPU, Intel has Intel GPU)
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        // Apple Silicon GPUs show as "Apple M1", "Apple M2", "Apple GPU", etc.
        if (/Apple M|Apple GPU/i.test(renderer)) return 'macos-arm64';
        // Intel GPUs show as "Intel" on Intel Macs
        if (/Intel/i.test(renderer)) return 'macos-x64';
      }
    }
  } catch (e) {
    // WebGL not available
  }

  // Method 3: Check platform string
  const platform = navigator.platform || '';
  if (/arm/i.test(platform)) return 'macos-arm64';

  // Default: Intel (safer default — ARM users on modern browsers will be caught above)
  return 'macos-x64';
}

function getOSDisplayName(platform) {
  const info = PLATFORM_INFO[platform];
  return info ? `${info.title} ${info.arch}` : 'your platform';
}

// ---------- Format Helpers ----------
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '--';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

// ---------- Dynamic Layout Builder ----------
function buildDownloadsLayout(detectedOS) {
  const container = document.getElementById('downloads-dynamic');
  if (!container) return;

  // Determine the primary platform and alternatives
  const primaryPlatform = detectedOS || 'macos-arm64';
  const allPlatforms = Object.keys(PLATFORM_INFO);
  const otherPlatforms = allPlatforms.filter((p) => p !== primaryPlatform);

  // Build the hero (primary) card
  const primaryInfo = PLATFORM_INFO[primaryPlatform];
  const heroHTML = `
    <div class="download-hero-card animate-on-scroll" data-platform="${primaryPlatform}">
      <div class="download-hero-card__badge">
        <span class="download-hero-card__badge-dot"></span>
        Detected: ${primaryInfo.title} ${primaryInfo.arch}
      </div>
      <div class="download-hero-card__content">
        <div class="download-hero-card__icon">${primaryInfo.icon}</div>
        <div class="download-hero-card__info">
          <h2 class="download-hero-card__title">Download for ${primaryInfo.title}</h2>
          <p class="download-hero-card__arch">${primaryInfo.arch}</p>
          <div class="download-hero-card__meta">
            <span class="download-card__format">${primaryInfo.format}</span>
            <span class="download-card__size" data-size="${primaryPlatform}">--</span>
          </div>
        </div>
      </div>
      <a class="btn btn--primary btn--lg download-hero-card__btn" data-download="${primaryPlatform}" href="${RELEASES_URL}" target="_blank" rel="noopener noreferrer">
        <span class="btn__icon">↓</span>
        ${primaryInfo.btnLabel}
      </a>
    </div>
  `;

  // Build the compact grid of other platforms
  const othersHTML = otherPlatforms
    .map(
      (platformKey) => {
        const info = PLATFORM_INFO[platformKey];
        return `
      <div class="download-alt-card animate-on-scroll" data-platform="${platformKey}">
        <div class="download-alt-card__left">
          <span class="download-alt-card__icon">${info.icon}</span>
          <div>
            <h3 class="download-alt-card__title">${info.title}</h3>
            <p class="download-alt-card__arch">${info.arch}</p>
          </div>
        </div>
        <div class="download-alt-card__right">
          <div class="download-alt-card__meta">
            <span class="download-card__format">${info.format}</span>
            <span class="download-card__size" data-size="${platformKey}">--</span>
          </div>
          <a class="btn btn--sm btn--outline download-alt-card__btn" data-download="${platformKey}" href="${RELEASES_URL}" target="_blank" rel="noopener noreferrer">
            <span class="btn__icon">↓</span>
            Download
          </a>
        </div>
      </div>
    `;
      }
    )
    .join('');

  container.innerHTML = `
    ${heroHTML}
    <div class="download-alt-section">
      <h3 class="download-alt-section__title">Other platforms</h3>
      <div class="download-alt-grid">
        ${othersHTML}
      </div>
    </div>
  `;

  // Re-observe for scroll animations (elements were just created)
  container.querySelectorAll('.animate-on-scroll').forEach((el) => {
    // Small delay so the observer catches them after DOM insertion
    requestAnimationFrame(() => el.classList.add('visible'));
  });
}

// ---------- Fetch and Render ----------
async function fetchLatestRelease() {
  const versionValue = document.getElementById('version-value');
  const fallback = document.getElementById('downloads-fallback');
  const osMsg = document.getElementById('os-detect-msg');

  // Detect OS
  const detectedOS = detectOS();

  // Update subtitle
  if (osMsg) {
    if (detectedOS) {
      const info = PLATFORM_INFO[detectedOS];
      osMsg.textContent = `We detected ${info.title} ${info.arch} — your download is ready.`;
    } else {
      osMsg.textContent = 'Select the download for your operating system.';
    }
  }

  // Build the dynamic layout
  buildDownloadsLayout(detectedOS);

  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status}`);
    }

    const release = await response.json();

    // Update version badge
    if (versionValue) {
      versionValue.textContent = release.tag_name || release.name || 'Unknown';
    }

    // Map assets to platforms
    const assets = release.assets || [];

    for (const [platformKey, config] of Object.entries(PLATFORM_PATTERNS)) {
      const asset = assets.find((a) => config.match(a.name));

      if (asset) {
        // Update download link
        const btn = document.querySelector(`[data-download="${platformKey}"]`);
        if (btn) btn.href = asset.browser_download_url;

        // Update file size
        const sizeEl = document.querySelector(`[data-size="${platformKey}"]`);
        if (sizeEl) sizeEl.textContent = formatBytes(asset.size);
      }
    }
  } catch (error) {
    console.warn('Failed to fetch latest release:', error.message);

    if (versionValue) versionValue.textContent = 'Check GitHub';
    if (fallback) fallback.hidden = false;

    document.querySelectorAll('[data-download]').forEach((btn) => {
      btn.href = RELEASES_URL;
    });
  }
}

// ---------- Init ----------
document.addEventListener('DOMContentLoaded', () => {
  fetchLatestRelease();
});
