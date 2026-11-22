<script lang="ts">
  import { authClient } from '$lib/auth-client';

  const session = authClient.useSession();

  let mode: 'signin' | 'signup' = 'signin';
  let activeSection: 'overview' | 'prices' | 'parcels' | 'settings' = 'overview';
  let displayName = '';
  let email = '';
  let password = '';
  let authBusy = false;
  let authError = '';
  let authMessage = '';

  let parcelNumber = '';
  let parcelCarrier = '';
  let parcelBusy = false;
  let parcelError = '';
  let parcelResult: {
    carrier: string;
    source: string;
    status: string | null;
    expectedDelivery: string | null;
    serviceName: string | null;
    events: { time: string | null; location: string | null; description: string | null; stage: string | null }[];
  } | null = null;

  async function submitAuth() {
    authError = '';
    authMessage = '';

    if (!email.trim()) {
      authError = 'Enter your email address.';
      return;
    }
    if (password.length < 8) {
      authError = 'Use a password with at least 8 characters.';
      return;
    }
    if (mode === 'signup' && !displayName.trim()) {
      authError = 'Enter your name.';
      return;
    }

    authBusy = true;
    try {
      const result = mode === 'signup'
        ? await authClient.signUp.email({
            name: displayName.trim(),
            email: email.trim(),
            password,
            callbackURL: '/'
          })
        : await authClient.signIn.email({
            email: email.trim(),
            password,
            callbackURL: '/'
          });

      if (result.error) throw new Error(result.error.message || 'Authentication failed.');
      authMessage = mode === 'signup' ? 'Your WebWatch account is ready.' : 'You are signed in.';
      password = '';
    } catch (e) {
      authError = e instanceof Error ? e.message : 'Something went wrong. Please try again.';
    } finally {
      authBusy = false;
    }
  }

  async function signOut() {
    authError = '';
    authMessage = '';
    authBusy = true;
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error(result.error.message || 'Could not sign out.');
      mode = 'signin';
      password = '';
    } catch (e) {
      authError = e instanceof Error ? e.message : 'Could not sign out. Please try again.';
    } finally {
      authBusy = false;
    }
  }

  function switchMode(nextMode: 'signin' | 'signup') {
    mode = nextMode;
    authError = '';
    authMessage = '';
    password = '';
  }

  async function trackParcel() {
    parcelError = '';
    parcelResult = null;
    if (parcelNumber.trim().length < 5) {
      parcelError = 'Enter a tracking number with at least 5 characters.';
      return;
    }

    parcelBusy = true;
    try {
      const response = await fetch('/api/parcels/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: parcelNumber.trim(),
          ...(parcelCarrier.trim() ? { carrier: parcelCarrier.trim() } : {})
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Tracking lookup failed.');
      parcelResult = data;
    } catch (e) {
      parcelError = e instanceof Error ? e.message : 'Tracking lookup failed. Please try again.';
    } finally {
      parcelBusy = false;
    }
  }

  function formatEventTime(value: string | null): string {
    if (!value) return 'Time not provided by courier';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  }
</script>

<svelte:head>
  <title>WebWatch — Keep an eye on everything</title>
  <meta name="description" content="Track prices and parcels in one place with WebWatch." />
</svelte:head>

<div class="app-shell">
  <header class="topbar">
    <a class="brand" href="/" aria-label="WebWatch home">
      <span class="brand-mark" aria-hidden="true"><span></span><span></span><span></span></span>
      <span>webwatch<span class="brand-dot">.</span></span>
    </a>
    <div class="top-actions">
      <span class="status"><span class="status-dot"></span> Early access</span>
      {#if $session.data}
        <span class="signed-in-label">{$session.data.user.email}</span>
        <button class="quiet-link sign-out-link" type="button" onclick={signOut} disabled={authBusy}>
          {authBusy ? 'Signing out…' : 'Sign out'}
        </button>
      {:else if !$session.isPending}
        <a class="quiet-link" href="#parcel-tracking">Continue as guest</a>
      {/if}
    </div>
  </header>

  <main>
    {#if $session.isPending}
      <section class="session-loading" aria-live="polite">
        <span class="loading-orbit" aria-hidden="true"></span>
        <p>Connecting your WebWatch session…</p>
      </section>
    {:else if $session.data}
      <div class="workspace-layout">
        <aside class="workspace-sidebar" aria-label="Main navigation">
          <p class="sidebar-label">WORKSPACE</p>
          <button class:active={activeSection === 'overview'} type="button" onclick={() => activeSection = 'overview'}><span>⌂</span> Overview</button>
          <button class:active={activeSection === 'prices'} type="button" onclick={() => activeSection = 'prices'}><span>↘</span> Price tracking <small>SOON</small></button>
          <button class:active={activeSection === 'parcels'} type="button" onclick={() => activeSection = 'parcels'}><span>↗</span> Parcel tracking</button>
          <div class="sidebar-divider"></div>
          <p class="sidebar-label">PREFERENCES</p>
          <button class:active={activeSection === 'settings'} type="button" onclick={() => activeSection = 'settings'}><span>⚙</span> Settings</button>
          <div class="sidebar-account">
            <span class="sidebar-avatar">{($session.data.user.name || $session.data.user.email).slice(0, 1).toUpperCase()}</span>
            <span><strong>{$session.data.user.name || 'Your account'}</strong><small>Signed in</small></span>
          </div>
        </aside>
        <div class="workspace-content">
          <div class="workspace-toolbar">
            <div>
              <span class="toolbar-kicker">WEBWATCH / WORKSPACE</span>
              <strong>{activeSection === 'overview' ? 'Overview' : activeSection === 'prices' ? 'Price intelligence' : activeSection === 'parcels' ? 'Parcel radar' : 'Account settings'}</strong>
            </div>
            <div class="toolbar-meta"><span class="toolbar-live"><i></i> ALL SYSTEMS OPERATIONAL</span><span class="toolbar-avatar">{($session.data.user.name || $session.data.user.email).slice(0, 1).toUpperCase()}</span></div>
          </div>
        {#if activeSection === 'overview'}
      <section class="dashboard-hero">
        <div class="dashboard-welcome">
          <div>
            <div class="eyebrow"><span class="eyebrow-line"></span> YOUR TRACKING COMMAND CENTRE</div>
            <p class="kicker">MONDAY BRIEFING · YOUR WORKSPACE</p>
            <h1>Good to have you<br /><span>back.</span></h1>
            <p class="intro">One place to keep tabs on the things that matter. Your workspace is ready when you are.</p>
          </div>
          <aside class="welcome-panel">
            <div class="welcome-panel-top"><span>WORKSPACE STATUS</span><span class="status-pill"><i></i> ACTIVE</span></div>
            <div class="welcome-user">
              <span class="welcome-avatar">{($session.data.user.name || $session.data.user.email).slice(0, 1).toUpperCase()}</span>
              <div><strong>{$session.data.user.name || 'Your account'}</strong><small>{$session.data.user.email}</small></div>
            </div>
            <div class="welcome-divider"></div>
            <div class="welcome-panel-foot"><span>Authentication</span><strong>Protected by Better Auth</strong></div>
          </aside>
        </div>

        <div class="metric-grid">
          <article class="metric-card metric-primary">
            <div class="metric-top"><span>AVAILABLE MODULES</span><span class="metric-symbol">◈</span></div>
            <div class="metric-value">01<span> / 02</span></div>
            <p>Tracking module ready to use</p>
            <div class="metric-track"><span></span></div>
            <small>Parcel radar is live · Price watch is in development</small>
          </article>
          <article class="metric-card">
            <div class="metric-top"><span>PARCEL RADAR</span><span class="metric-symbol">↗</span></div>
            <div class="metric-state"><i></i> READY FOR LOOKUP</div>
            <p>Check shipment progress with a tracking number.</p>
            <button class="metric-action" type="button" onclick={() => activeSection = 'parcels'}>Open parcel radar <span>↗</span></button>
          </article>
          <article class="metric-card">
            <div class="metric-top"><span>PRICE INTELLIGENCE</span><span class="metric-symbol">⌁</span></div>
            <div class="metric-state metric-muted">COMING NEXT</div>
            <p>Product monitoring and price history are on the roadmap.</p>
            <button class="metric-action muted-action" type="button" onclick={() => activeSection = 'prices'}>View roadmap <span>→</span></button>
          </article>
        </div>

        <div class="overview-lower">
          <section class="overview-card activity-card">
            <div class="overview-card-heading"><div><span class="card-overline">WORKSPACE ACTIVITY</span><h2>Pick up where you left off.</h2></div><span class="subtle-chip">YOUR SPACE</span></div>
            <div class="activity-empty">
              <span class="activity-icon">⌁</span>
              <div><strong>Your activity will appear here.</strong><p>Run a parcel lookup to get started. Saved tracking history will appear here once account-linked storage is enabled.</p></div>
            </div>
            <button class="inline-action" type="button" onclick={() => activeSection = 'parcels'}>Start a parcel lookup <span>→</span></button>
          </section>
          <section class="overview-card quick-actions-card">
            <span class="card-overline">QUICK ACCESS</span>
            <h2>Move faster.</h2>
            <button class="quick-action" type="button" onclick={() => activeSection = 'parcels'}><span class="quick-action-icon">↗</span><span><strong>Track a parcel</strong><small>Get the latest courier status</small></span><b>→</b></button>
            <button class="quick-action" type="button" onclick={() => activeSection = 'prices'}><span class="quick-action-icon">↘</span><span><strong>Explore price watch</strong><small>See what is coming next</small></span><b>→</b></button>
            <button class="quick-action" type="button" onclick={() => activeSection = 'settings'}><span class="quick-action-icon">⚙</span><span><strong>Account settings</strong><small>Review your account details</small></span><b>→</b></button>
          </section>
        </div>
      </section>
      {:else if activeSection === 'prices'}

        <section class="workspace-panel">
          <div class="section-eyebrow"><span class="eyebrow-line"></span> PRICE INTELLIGENCE</div>
          <p class="kicker">COMING NEXT</p>
          <h1 class="panel-title">Know when the price<br /><span>moves.</span></h1>
          <p class="panel-description">Price tracking is the next WebWatch module. The interface and account navigation are in place, but product monitoring, price history, and alert delivery are not connected yet.</p>
          <div class="roadmap-grid">
            <article><span>01</span><strong>Product watchlists</strong><p>Save product URLs and organize the items you care about.</p></article>
            <article><span>02</span><strong>Price history</strong><p>See verified price changes over time, not estimates.</p></article>
            <article><span>03</span><strong>Target alerts</strong><p>Get notified when a product reaches your target price.</p></article>
          </div>
          <p class="panel-footnote">No products are being monitored yet. We will enable this area when the tracking backend is ready.</p>
        </section>
      {:else if activeSection === 'settings'}
        <section class="workspace-panel settings-panel">
          <div class="section-eyebrow"><span class="eyebrow-line"></span> ACCOUNT PREFERENCES</div>
          <p class="kicker">YOUR ACCOUNT</p>
          <h1 class="panel-title">Account<br /><span>settings.</span></h1>
          <div class="settings-list">
            <div><span>DISPLAY NAME</span><strong>{$session.data.user.name || 'Not set'}</strong></div>
            <div><span>EMAIL ADDRESS</span><strong>{$session.data.user.email}</strong></div>
            <div><span>ACCOUNT ID</span><strong class="account-id">{$session.data.user.id}</strong></div>
            <div><span>AUTHENTICATION</span><strong>Better Auth · Active session</strong></div>
          </div>
          <div class="settings-actions">
            <p>Need to end this session on the current device?</p>
            <button class="danger-button" type="button" onclick={signOut} disabled={authBusy}>{authBusy ? 'Signing out…' : 'Sign out'}</button>
          </div>
        </section>
      {/if}
      </div>
      </div>
    {:else}
      <section class="hero">
        <div class="hero-copy">
          <div class="eyebrow"><span class="eyebrow-line"></span> YOUR PERSONAL TRACKING RADAR</div>
          <h1>Keep an eye<br />on <span>everything.</span></h1>
          <p class="intro">Prices shift. Parcels move. WebWatch brings both into one clear view, so you can spend less time checking and more time doing.</p>
          <div class="feature-list">
            <div><span class="feature-icon">↘</span><span><strong>Price watch</strong><small>Follow price changes and target deals.</small></span></div>
            <div><span class="feature-icon">↗</span><span><strong>Parcel radar</strong><small>Keep shipment progress in one timeline.</small></span></div>
            <div><span class="feature-icon">◈</span><span><strong>Your private space</strong><small>Sign in to keep your account connected.</small></span></div>
          </div>
          <div class="hero-foot"><span class="web-orbit" aria-hidden="true"></span><span>One dashboard. Fewer tabs. Better timing.</span></div>
        </div>

        <section class="auth-card" aria-labelledby="auth-heading">
          <div class="card-topline"><span class="live-dot"></span> ACCOUNT ACCESS <span class="card-topline-end">01 / 03</span></div>
          <p class="kicker">{mode === 'signup' ? 'CREATE YOUR ACCOUNT' : 'GOOD TO SEE YOU'}</p>
          <h2 id="auth-heading">{mode === 'signup' ? 'Make it yours.' : 'Welcome back.'}</h2>
          <p class="card-description">{mode === 'signup' ? 'Create an account to get your own WebWatch space.' : 'Sign in to pick up where you left off.'}</p>
          <form onsubmit={(event) => { event.preventDefault(); submitAuth(); }}>
            {#if mode === 'signup'}
              <label for="display-name">Your name</label>
              <input id="display-name" type="text" bind:value={displayName} placeholder="How should we address you?" autocomplete="name" maxlength="80" required />
            {/if}
            <label for="email">Email address</label>
            <input id="email" type="email" bind:value={email} placeholder="you@example.com" autocomplete="email" required />
            <label for="password">Password</label>
            <input id="password" type="password" bind:value={password} placeholder="At least 8 characters" autocomplete={mode === 'signup' ? 'new-password' : 'current-password'} minlength="8" required />
            {#if authError}<p class="notice error" role="alert">{authError}</p>{/if}
            {#if authMessage}<p class="notice success" role="status">{authMessage}</p>{/if}
            <button class="primary-button" type="submit" disabled={authBusy}>
              {authBusy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'} <span>↗</span>
            </button>
          </form>
          <div class="divider"><span></span><small>SECURE ACCESS</small><span></span></div>
          <p class="auth-switch">
            {#if mode === 'signup'}
              Already have an account? <button class="text-button" type="button" onclick={() => switchMode('signin')}>Sign in</button>
            {:else}
              New to WebWatch? <button class="text-button" type="button" onclick={() => switchMode('signup')}>Create account</button>
            {/if}
          </p>
        </section>
      </section>
    {/if}

    {#if !$session.data || activeSection === 'parcels'}
    <section class="parcel-section" id="parcel-tracking" aria-labelledby="parcel-heading">
      <div class="section-eyebrow"><span class="eyebrow-line"></span> LIVE LOOKUP · PARCEL RADAR</div>
      <div class="parcel-heading-row">
        <div>
          <h2 id="parcel-heading">Track a parcel.</h2>
          <p class="parcel-intro">Enter a real tracking number. WebWatch will query the tracking engine and show returned courier events when available.</p>
        </div>
        <span class="lookup-badge">{#if $session.data}ACCOUNT SESSION{:else}GUEST LOOKUP{/if}</span>
      </div>

      <form class="parcel-form" onsubmit={(event) => { event.preventDefault(); trackParcel(); }}>
        <div class="parcel-field">
          <label for="parcel-number">Tracking number</label>
          <input id="parcel-number" bind:value={parcelNumber} placeholder="Enter your tracking number" autocomplete="off" minlength="5" maxlength="100" required />
        </div>
        <div class="parcel-field courier-field">
          <label for="parcel-carrier">Courier (optional)</label>
          <input id="parcel-carrier" bind:value={parcelCarrier} placeholder="Auto-detect courier" autocomplete="off" maxlength="60" />
          <small>Leave blank to let the engine detect it. An explicit carrier must use its supported carrier ID.</small>
        </div>
        <button class="primary-button parcel-submit" type="submit" disabled={parcelBusy}>
          {parcelBusy ? 'Checking courier…' : 'Track parcel'} <span>↗</span>
        </button>
      </form>

      {#if parcelError}
        <p class="notice error parcel-notice" role="alert">{parcelError}</p>
      {/if}
      {#if parcelResult}
        <div class="parcel-result" aria-live="polite">
          <div class="result-summary">
            <div><span class="result-label">COURIER</span><strong>{parcelResult.carrier}</strong></div>
            <div><span class="result-label">CURRENT STATUS</span><strong>{parcelResult.status ?? 'Status not provided'}</strong></div>
            {#if parcelResult.expectedDelivery}
              <div><span class="result-label">EXPECTED DELIVERY</span><strong>{parcelResult.expectedDelivery}</strong></div>
            {/if}
          </div>
          {#if parcelResult.serviceName}<p class="service-name">{parcelResult.serviceName}</p>{/if}
          {#if parcelResult.events.length}
            <h3>Shipment events <span>{parcelResult.events.length}</span></h3>
            <ol class="event-timeline">
              {#each parcelResult.events as event, index}
                <li class:latest={index === 0}>
                  <span class="timeline-node"></span>
                  <div>
                    <strong>{event.description ?? event.stage ?? 'Shipment update'}</strong>
                    <p>{event.location || 'Location not provided'}</p>
                    <small>{formatEventTime(event.time)}</small>
                  </div>
                  {#if event.stage}<span class="event-stage">{event.stage}</span>{/if}
                </li>
              {/each}
            </ol>
          {:else}
            <p class="no-events">The courier response did not include scan events. This is not a fabricated timeline; try again later or verify the tracking number.</p>
          {/if}
          <p class="source-note">Source: {parcelResult.source}. Availability depends on the courier's website and its anti-bot protections.</p>
        </div>
      {/if}
      <p class="privacy-note">Lookup requests are sent to the tracking provider. Do not enter passwords or other sensitive information.</p>
    </section>

    {/if}

    {#if $session.data && activeSection === 'parcels'}
      <section class="saved-parcels">
        <div class="section-eyebrow"><span class="eyebrow-line"></span> YOUR PRIVATE SPACE</div>
        <h2>Your watchlist is next.</h2>
        <p class="watchlist-note">Your Better Auth account is active. We are connecting the existing parcel storage to the new account identity before enabling saved trackers here, so your data stays correctly scoped to your account.</p>
      </section>
    {:else if !$session.data && !$session.isPending}
      <section class="guest-strip" id="guest">
        <div class="guest-symbol">↗</div>
        <div><strong>Just checking something?</strong><p>Guest parcel lookups stay available. Sign in when you want your own WebWatch space.</p></div>
        <span class="guest-label">NO ACCOUNT NEEDED</span>
      </section>
    {/if}
  </main>

  <footer>
    <a class="brand footer-brand" href="/">
      <span class="brand-mark" aria-hidden="true"><span></span><span></span><span></span></span>
      <span>webwatch<span class="brand-dot">.</span></span>
    </a>
    <span>Built to keep you in the loop.</span>
    <span>Privacy first · India ready</span>
  </footer>
</div>
