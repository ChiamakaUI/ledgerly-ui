import type {
  Booking,
  BookingListResponse,
  CreateBookingRequest,
  CreateBookingResponse,
  CreateHostRequest,
  Host,
  HostMeResponse,
  HostProfileResponse,
  PublicHost,
  SetAvailabilityRequest,
  Slot,
  SlotsResponse,
  UpdateHostRequest,
  BookSessionRequest,
  BookSessionResponse,
  CreateSessionRequest,
  Session,
  SessionResponse,
  SessionsListResponse,
  Gift
} from "@/types";
import { apiFetch } from "./http";

/**
 * API client. Every function is a thin wrapper around the backend that:
 *  - Unwraps the backend's response envelopes (`{ host }`, `{ booking }`, etc.)
 *  - Keeps the return shapes stable so components don't change when we swap
 *    implementations
 *
 * Host-authenticated routes (x-wallet-address header) take an explicit
 * `walletAddress` argument. Pass the connected Privy wallet address from
 * useWallet().
 */

// ============================================================================
// Hosts — public reads
// ============================================================================

/** GET /api/hosts/:slug — public host profile + availability rules. */
export async function getHost(slug: string): Promise<PublicHost> {
  const res = await apiFetch<HostProfileResponse>(`/api/hosts/${slug}`);
  return res.host;
}

/**
 * GET /api/hosts/:slug — both profile and availability in one call.
 * Useful when a page (like the dashboard availability editor) needs both.
 */
export async function getHostWithAvailability(
  slug: string,
): Promise<HostProfileResponse> {
  return apiFetch<HostProfileResponse>(`/api/hosts/${slug}`);
}

/**
 * GET /api/hosts/me — the current host's own profile + availability.
 * Requires x-wallet-address header (connected Privy wallet).
 *
 * Throws ApiError with status 404 if the wallet is not registered as a host.
 * Callers should catch that case to redirect to the onboarding flow.
 */
export async function getHostMe(
  walletAddress: string,
): Promise<HostMeResponse> {
  return apiFetch<HostMeResponse>(`/api/hosts/me`, {
    walletAddress,
  });
}

// ============================================================================
// Slots
// ============================================================================

/** GET /api/hosts/:slug/slots?date=YYYY-MM-DD */
export async function getSlots(slug: string, date: string): Promise<Slot[]> {
  const res = await apiFetch<SlotsResponse>(`/api/hosts/${slug}/slots`, {
    query: { date },
  });
  return res.slots;
}

// ============================================================================
// Hosts — authenticated writes (host only)
// ============================================================================

/** POST /api/hosts — register as a new host. */
export async function createHost(data: CreateHostRequest): Promise<Host> {
  const res = await apiFetch<{ host: Host }>(`/api/hosts`, {
    method: "POST",
    body: data,
  });
  return res.host;
}

/** PUT /api/hosts/me — update own profile. */
export async function  updateHostProfile(
  walletAddress: string,
  patch: UpdateHostRequest,
): Promise<Host> {
  const res = await apiFetch<{ host: Host }>(`/api/hosts/me`, {
    method: "PUT",
    body: patch,
    walletAddress,
  });
  return res.host;
}

/** PUT /api/hosts/me/availability — overwrite weekly rules. */
export async function setAvailability(
  walletAddress: string,
  data: SetAvailabilityRequest,
) {
  return apiFetch<{ rules: unknown[] }>(`/api/hosts/me/availability`, {
    method: "PUT",
    body: data,
    walletAddress,
  });
}

// ============================================================================
// Bookings — reads
// ============================================================================

/** GET /api/bookings/:id — booking detail. */
export async function getBooking(id: string): Promise<Booking> {
  const res = await apiFetch<{ booking: Booking }>(`/api/bookings/${id}`);
  return res.booking;
}

/** GET /api/bookings/caller/:wallet — caller's own bookings. */
export async function listCallerBookings(
  callerWallet: string,
  limit = 20,
  offset = 0,
): Promise<BookingListResponse> {
  return apiFetch<BookingListResponse>(
    `/api/bookings/caller/${callerWallet}`,
    { query: { limit, offset } },
  );
}

/**
 * GET /api/bookings/host/me — host's bookings.
 * Requires x-wallet-address (host's connected wallet).
 */
export async function listHostBookings(
  walletAddress: string,
  limit = 50,
  offset = 0,
): Promise<Booking[]> {
  const res = await apiFetch<BookingListResponse>(`/api/bookings/host/me`, {
    query: { limit, offset },
    walletAddress,
  });
  return res.bookings;
}

// ============================================================================
// Bookings — writes
// ============================================================================

/**
 * POST /api/bookings — create a booking and get the deposit instruction.
 * The client then signs `depositInstruction` with the caller's wallet and
 * posts the resulting signature to confirmPayment().
 */
export async function createBooking(
  input: CreateBookingRequest,
): Promise<CreateBookingResponse> {
  return apiFetch<CreateBookingResponse>(`/api/bookings`, {
    method: "POST",
    body: input,
  });
}

/** POST /api/bookings/:id/confirm-payment — submit deposit signature. */
export async function confirmPayment(
  bookingId: string,
  signature: string,
): Promise<Booking> {
  const res = await apiFetch<{ booking: Booking }>(
    `/api/bookings/${bookingId}/confirm-payment`,
    { method: "POST", body: { signature } },
  );
  return res.booking;
}

/**
 * POST /api/bookings/:id/confirm-call — host confirms call completed.
 * Releases escrowed USDC (minus platform fee) to the host's wallet.
 */
export async function confirmCallCompleted(
  bookingId: string,
  hostWallet: string,
): Promise<Booking> {
  const res = await apiFetch<{ booking: Booking }>(
    `/api/bookings/${bookingId}/confirm-call`,
    { method: "POST", body: { hostWallet } },
  );
  return res.booking;
}

/**
 * POST /api/bookings/:id/cancel — caller cancels, triggers refund if paid.
 */
export async function cancelBooking(
  bookingId: string,
  callerWallet: string,
  reason?: string,
): Promise<Booking> {
  const res = await apiFetch<{ booking: Booking }>(
    `/api/bookings/${bookingId}/cancel`,
    { method: "POST", body: { callerWallet, reason } },
  );
  return res.booking;
}

/**
 * POST /api/bookings/:id/host-cancel — host cancels, triggers refund if paid.
 * Requires x-wallet-address (host's connected wallet).
 */
export async function hostCancelBooking(
  bookingId: string,
  walletAddress: string,
): Promise<Booking> {
  const res = await apiFetch<{ booking: Booking }>(
    `/api/bookings/${bookingId}/host-cancel`,
    { method: "POST", walletAddress },
  );
  return res.booking;
}

export interface JoinResponse {
  token: string;
  roomName: string;
  userType: "host" | "co-host" | "guest";
}

/**
 * GET /api/bookings/:id/join — fetch Vidbloq LiveKit token.
 * Backend validates payment, time window, and wallet ownership.
 */
export async function joinBookingCall(
  bookingId: string,
  walletAddress: string,
  name?: string,
): Promise<JoinResponse> {
  return apiFetch<JoinResponse>(`/api/bookings/${bookingId}/join`, {
    query: name ? { wallet: walletAddress, name } : { wallet: walletAddress },
  });
}

// ============================================================================
// Sessions (group calls)
// ============================================================================

/**
 * GET /api/sessions/host/:slug — list a host's open sessions.
 * Public — used on the caller-facing /sessions/[slug] page.
 */
export async function listOpenSessions(
  hostSlug: string,
  limit = 20,
  offset = 0,
): Promise<Session[]> {
  const res = await apiFetch<SessionsListResponse>(
    `/api/sessions/host/${hostSlug}`,
    { query: { limit, offset } },
  );
  return res.sessions;
}

/** GET /api/sessions/:id — session details with spotsRemaining. */
export async function getSession(id: string): Promise<Session> {
  const res = await apiFetch<SessionResponse>(`/api/sessions/${id}`);
  return res.session;
}

/**
 * POST /api/sessions — create a new session.
 * Requires x-wallet-address (host's connected wallet).
 */
export async function createSession(
  walletAddress: string,
  data: CreateSessionRequest,
): Promise<Session> {
  const res = await apiFetch<SessionResponse>(`/api/sessions`, {
    method: "POST",
    body: data,
    walletAddress,
  });
  return res.session;
}

/**
 * GET /api/sessions/host-dashboard/me — list host's own sessions.
 * Requires x-wallet-address.
 */
export async function listMySessions(
  walletAddress: string,
  options?: { upcoming?: boolean; limit?: number; offset?: number },
): Promise<Session[]> {
  const query: Record<string, string | number> = {
    limit: options?.limit ?? 20,
    offset: options?.offset ?? 0,
  };
  if (options?.upcoming !== undefined) {
    query.upcoming = options.upcoming ? "true" : "false";
  }
  const res = await apiFetch<SessionsListResponse>(
    `/api/sessions/host-dashboard/me`,
    { query, walletAddress },
  );
  return res.sessions;
}

/**
 * POST /api/sessions/:id/book — book a spot in a session.
 * Returns the booking + deposit instruction, just like 1:1 createBooking.
 */
export async function bookSession(
  sessionId: string,
  data: BookSessionRequest,
): Promise<BookSessionResponse> {
  return apiFetch<BookSessionResponse>(`/api/sessions/${sessionId}/book`, {
    method: "POST",
    body: data,
  });
}

/**
 * POST /api/sessions/booking/:bookingId/confirm-payment
 * Sessions have their own confirm-payment endpoint (it lives under
 * /api/sessions/booking/:id, not /api/bookings/:id), but the response
 * shape and on-chain flow are identical.
 */
export async function confirmSessionPayment(
  bookingId: string,
  signature: string,
): Promise<Booking> {
  const res = await apiFetch<{ booking: Booking }>(
    `/api/sessions/booking/${bookingId}/confirm-payment`,
    { method: "POST", body: { signature } },
  );
  return res.booking;
}

/**
 * GET /api/sessions/:id/join — get a Vidbloq token for this session.
 * Backend resolves whether the wallet is a participant or the host
 * and returns the appropriate token + userType.
 */
export async function joinSessionCall(
  sessionId: string,
  walletAddress: string,
  name?: string,
): Promise<JoinResponse> {
  return apiFetch<JoinResponse>(`/api/sessions/${sessionId}/join`, {
    query: name ? { wallet: walletAddress, name } : { wallet: walletAddress },
  });
}

/**
 * POST /api/sessions/:id/cancel — host cancels session.
 * Backend refunds all paid bookings automatically.
 */
export async function cancelSession(
  sessionId: string,
  walletAddress: string,
): Promise<{ session: Session; refundedCount: number }> {
  return apiFetch<{ session: Session; refundedCount: number }>(
    `/api/sessions/${sessionId}/cancel`,
    { method: "POST", walletAddress },
  );
}

// ============================================================================
// Gift claim flow
// ============================================================================

/**
 * GET /api/bookings/gift/claim/:code — fetch gift details by claim code.
 * Public — no auth needed. Recipient lands here from email link.
 */
export async function getGiftByClaimCode(code: string): Promise<Gift> {
  const res = await apiFetch<{ gift: Gift }>(
    `/api/bookings/gift/claim/${code}`,
  );
  return res.gift;
}

/**
 * POST /api/bookings/gift/claim/:code — bind recipient wallet to gift.
 * Returns the now-claimed booking with participant_wallet set.
 */
export async function claimGift(
  code: string,
  wallet: string,
): Promise<{ booking: Booking; message: string }> {
  return apiFetch<{ booking: Booking; message: string }>(
    `/api/bookings/gift/claim/${code}`,
    { method: "POST", body: { wallet } },
  );
}