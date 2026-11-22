import { building } from '$app/environment';
import type { Handle } from '@sveltejs/kit';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { auth } from '$lib/server/auth';

export const handle: Handle = ({ event, resolve }) =>
  svelteKitHandler({ event, resolve, auth, building });
