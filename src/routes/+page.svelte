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

  const supabase = getSupabase();
  $: configured = Boolean(supabase);

  onMount(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => user = data.user);
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      user = session?.user ?? null;
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

    <section class="guest-strip" id="guest">
      <div class="guest-symbol">↗</div>
      <div><strong>Just checking something?</strong><p>Guest lookups will stay available for one-time price and parcel checks. Sign in when you want to save them permanently.</p></div>
      <span class="guest-label">NO ACCOUNT NEEDED</span>
    </section>
  </main>
  <footer><a class="brand footer-brand" href="/"><span class="brand-mark" aria-hidden="true"><span></span><span></span><span></span></span><span>webwatch<span class="brand-dot">.</span></span></a><span>Built to keep you in the loop.</span><span>Privacy first · India ready</span></footer>
</div>
