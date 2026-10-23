<script lang="ts">
  import { onMount } from 'svelte';
  import type { User } from '@supabase/supabase-js';
  import { getSupabase } from '$lib/supabase';

  let mode: 'signin' | 'signup' | 'reset' = 'signin';
  let email = '';
  let password = '';
  let user: User | null = null;
  let busy = false;
  let message = '';
  let error = '';

  let parcelNumber = '';
  let parcelCarrier = '';
  let parcelBusy = false;
  let parcelError = '';
  let parcelSaveBusy = false;
  let parcelSaveMessage = '';
  let parcelSaveError = '';
  let savedParcels: { id: string; tracking_number: string; carrier: string; current_status: string | null; expected_delivery: string | null; updated_at: string }[] = [];
  let savedParcelsBusy = false;
  let savedParcelsError = '';
  let parcelResult: {
    carrier: string;
    source: string;
    status: string | null;
    expectedDelivery: string | null;
    serviceName: string | null;
    events: { time: string | null; location: string | null; description: string | null; stage: string | null }[];
  } | null = null;

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
        body: JSON.stringify({ number: parcelNumber.trim(), ...(parcelCarrier ? { carrier: parcelCarrier } : {}) })
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

  async function saveParcel() {
    parcelSaveMessage = '';
    parcelSaveError = '';
    if (!supabase || !user || !parcelResult) {
      parcelSaveError = 'Sign in to save this parcel.';
      return;
    }
    parcelSaveBusy = true;
    try {
      const { error: saveError } = await supabase.from('tracked_parcels').upsert({
        user_id: user.id,
        tracking_number: parcelNumber.trim(),
        carrier: parcelResult.carrier,
        current_status: parcelResult.status,
        expected_delivery: parcelResult.expectedDelivery,
        service_name: parcelResult.serviceName,
        latest_result: parcelResult,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,tracking_number,carrier' });
      if (saveError) throw saveError;
      parcelSaveMessage = 'Parcel saved to your WebWatch account.';
    } catch (e) {
      parcelSaveError = e instanceof Error ? e.message : 'Could not save this parcel.';
    } finally {
      parcelSaveBusy = false;
    }
  }

  function formatEventTime(value: string | null): string {
    if (!value) return 'Time not provided by courier';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  }

  const supabase = getSupabase();
  $: configured = Boolean(supabase);

  async function loadSavedParcels(userId: string) {
    if (!supabase) return;
    savedParcelsBusy = true;
    savedParcelsError = '';
    const { data, error: loadError } = await supabase
      .from('tracked_parcels')
      .select('id, tracking_number, carrier, current_status, expected_delivery, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(50);
    if (loadError) {
      savedParcelsError = 'Could not load saved parcels. Apply the tracked-parcels database migration in Supabase first.';
    } else {
      savedParcels = data ?? [];
    }
    savedParcelsBusy = false;
  }

  onMount(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      user = data.user;
      if (data.user) void loadSavedParcels(data.user.id);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      user = session?.user ?? null;
      if (session?.user) void loadSavedParcels(session.user.id);
      else savedParcels = [];
    });
    return () => data.subscription.unsubscribe();
  });

  async function submit() {
    error = '';
    message = '';
    if (!supabase) {
      error = 'Authentication is not configured yet. Add your Supabase project URL and public key to the environment before testing sign-in.';
      return;
    }
    if (!email.trim()) { error = 'Enter your email address.'; return; }
    if (mode !== 'reset' && password.length < 8) { error = 'Use a password with at least 8 characters.'; return; }
    busy = true;
    try {
      if (mode === 'signup') {
        const { error: e } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: window.location.origin } });
        if (e) throw e;
        message = 'Check your inbox for the verification email. Your account is not ready until you verify it.';
      } else if (mode === 'signin') {
        const { error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (e) throw e;
        message = 'Signed in. Your account session is active on this device.';
      } else {
        const { error: e } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
        if (e) throw e;
        message = 'If that address belongs to an account, a password reset email will arrive shortly.';
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Something went wrong. Please try again.';
    } finally {
      busy = false;
    }
  }

  async function signOut() {
    if (!supabase) return;
    const { error: e } = await supabase.auth.signOut();
    if (e) error = e.message;
    else { message = 'You have signed out.'; user = null; }
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
      <a class="quiet-link" href="#guest">Continue as guest</a>
    </div>
  </header>

  <main>
    <section class="hero">
      <div class="hero-copy">
        <div class="eyebrow"><span class="eyebrow-line"></span> YOUR PERSONAL TRACKING RADAR</div>
        <h1>Keep an eye<br />on <span>everything.</span></h1>
        <p class="intro">Prices shift. Parcels move. WebWatch brings both into one clear view, so you can spend less time checking and more time doing.</p>
        <div class="feature-list">
          <div><span class="feature-icon">↘</span><span><strong>Price watch</strong><small>Follow price changes and target deals.</small></span></div>
          <div><span class="feature-icon">↗</span><span><strong>Parcel radar</strong><small>Keep shipment progress in one timeline.</small></span></div>
          <div><span class="feature-icon">◈</span><span><strong>Your private space</strong><small>Save and sync your watchlist when signed in.</small></span></div>
        </div>
        <div class="hero-foot"><span class="web-orbit" aria-hidden="true"></span><span>One dashboard. Fewer tabs. Better timing.</span></div>
      </div>

      <section class="auth-card" aria-labelledby="auth-heading">
        <div class="card-topline"><span class="live-dot"></span> ACCOUNT ACCESS <span class="card-topline-end">01 / 03</span></div>
        {#if user}
          <div class="welcome-mark">✓</div>
          <p class="kicker">YOU'RE SIGNED IN</p>
          <h2 id="auth-heading">Welcome back.</h2>
          <p class="card-description">Signed in as <strong>{user.email}</strong>. The account is connected; saved tracking features will be added in the next implementation phase.</p>
          <button class="primary-button" onclick={signOut}>Sign out <span>↗</span></button>
        {:else}
          <p class="kicker">{mode === 'signup' ? 'CREATE YOUR ACCOUNT' : mode === 'reset' ? 'ACCOUNT RECOVERY' : 'GOOD TO SEE YOU'}</p>
          <h2 id="auth-heading">{mode === 'signup' ? 'Make it yours.' : mode === 'reset' ? 'Reset password.' : 'Welcome back.'}</h2>
          <p class="card-description">{mode === 'signup' ? 'Create an account to save products and parcels across devices.' : mode === 'reset' ? 'We will email you a secure password reset link.' : 'Sign in to pick up where you left off.'}</p>
          <form onsubmit={(event) => { event.preventDefault(); submit(); }}>
            <label for="email">Email address</label>
            <input id="email" type="email" bind:value={email} placeholder="you@example.com" autocomplete="email" required />
            {#if mode !== 'reset'}
              <div class="label-row"><label for="password">Password</label>{#if mode === 'signin'}<button class="text-button" type="button" onclick={() => { mode = 'reset'; error = ''; message = ''; }}>Forgot password?</button>{/if}</div>
              <input id="password" type="password" bind:value={password} placeholder="At least 8 characters" autocomplete={mode === 'signup' ? 'new-password' : 'current-password'} minlength="8" required />
            {/if}
            {#if error}<p class="notice error" role="alert">{error}</p>{/if}
            {#if message}<p class="notice success" role="status">{message}</p>{/if}
            <button class="primary-button" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Send reset link' : 'Sign in'} <span>↗</span></button>
          </form>
          <div class="divider"><span></span><small>SECURE ACCESS</small><span></span></div>
          <p class="auth-switch">
            {#if mode === 'signup'}
              Already have an account? <button class="text-button" onclick={() => { mode = 'signin'; error = ''; message = ''; }}>Sign in</button>
            {:else if mode === 'reset'}
              Remembered it? <button class="text-button" onclick={() => { mode = 'signin'; error = ''; message = ''; }}>Back to sign in</button>
            {:else}
              New to WebWatch? <button class="text-button" onclick={() => { mode = 'signup'; error = ''; message = ''; }}>Create account</button>
            {/if}
          </p>
        {/if}
        {#if !configured}<p class="config-note"><span>!</span> Preview mode — connect Supabase to enable authentication.</p>{/if}
      </section>
    </section>

    <section class="parcel-section" id="parcel-tracking" aria-labelledby="parcel-heading">
      <div class="section-eyebrow"><span class="eyebrow-line"></span> LIVE LOOKUP · FIRST TRACKING FEATURE</div>
      <div class="parcel-heading-row">
        <div>
          <h2 id="parcel-heading">Track a parcel.</h2>
          <p class="parcel-intro">Enter a real tracking number. WebWatch will query the tracking engine and show returned courier events when available.</p>
        </div>
        <span class="lookup-badge">GUEST LOOKUP</span>
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
        <button class="primary-button parcel-submit" type="submit" disabled={parcelBusy}>{parcelBusy ? 'Checking courier…' : 'Track parcel'} <span>↗</span></button>
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
                  <div><strong>{event.description ?? event.stage ?? 'Shipment update'}</strong><p>{event.location || 'Location not provided'}</p><small>{formatEventTime(event.time)}</small></div>
                  {#if event.stage}<span class="event-stage">{event.stage}</span>{/if}
                </li>
              {/each}
            </ol>
          {:else}
            <p class="no-events">The courier response did not include scan events. This is not a fabricated timeline; try again later or verify the tracking number.</p>
          {/if}
          <div class="parcel-save-row">
            {#if user}
              <button class="primary-button save-parcel-button" type="button" onclick={saveParcel} disabled={parcelSaveBusy}>{parcelSaveBusy ? 'Saving…' : 'Save this parcel'} <span>↗</span></button>
            {:else}
              <p class="save-hint">Sign in above to save this parcel to your account.</p>
            {/if}
            {#if parcelSaveMessage}<p class="notice success" role="status">{parcelSaveMessage}</p>{/if}
            {#if parcelSaveError}<p class="notice error" role="alert">{parcelSaveError}</p>{/if}
          </div>
          <p class="source-note">Source: {parcelResult.source}. Availability depends on the courier's website and its anti-bot protections.</p>
        </div>
      {/if}
      <p class="privacy-note">Lookup requests are sent to the tracking provider. Do not enter passwords or other sensitive information.</p>
    </section>

    {#if user}
      <section class="saved-parcels" aria-labelledby="saved-parcels-heading">
        <div class="section-eyebrow"><span class="eyebrow-line"></span> YOUR PRIVATE WATCHLIST</div>
        <div class="saved-parcels-heading">
          <div><h2 id="saved-parcels-heading">Saved parcels.</h2><p>Shipments linked to your account on this device and across sessions.</p></div>
          <span class="saved-count">{savedParcels.length} saved</span>
        </div>
        {#if savedParcelsBusy}<p class="saved-empty">Loading your parcels…</p>
        {:else if savedParcelsError}<p class="notice error" role="alert">{savedParcelsError}</p>
        {:else if savedParcels.length}
          <ul class="saved-parcel-list">
            {#each savedParcels as parcel (parcel.id)}
              <li>
                <div class="saved-parcel-icon">↗</div>
                <div class="saved-parcel-main"><strong>{parcel.tracking_number}</strong><span>{parcel.carrier}</span></div>
                <div class="saved-parcel-status"><strong>{parcel.current_status ?? 'Status not available'}</strong>{#if parcel.expected_delivery}<span>Expected: {parcel.expected_delivery}</span>{/if}</div>
              </li>
            {/each}
          </ul>
        {:else}
          <p class="saved-empty">No saved parcels yet. Track a parcel above and choose “Save this parcel”.</p>
        {/if}
      </section>
    {/if}

    <section class="guest-strip" id="guest">
      <div class="guest-symbol">↗</div>
      <div><strong>Just checking something?</strong><p>Guest lookups will stay available for one-time price and parcel checks. Sign in when you want to save them permanently.</p></div>
      <span class="guest-label">NO ACCOUNT NEEDED</span>
    </section>
  </main>
  <footer><a class="brand footer-brand" href="/"><span class="brand-mark" aria-hidden="true"><span></span><span></span><span></span></span><span>webwatch<span class="brand-dot">.</span></span></a><span>Built to keep you in the loop.</span><span>Privacy first · India ready</span></footer>
</div>
