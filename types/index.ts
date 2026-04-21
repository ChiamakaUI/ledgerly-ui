/**
 * Shared types matching the backend API contract.
 *
 * Source of truth: the Express backend at /api/hosts and /api/bookings.
 * These mirror the `camelizeKeys()` output of the Postgres rows returned
 * by the service layer.
 */

/**
 * USDC amount in minor units (6 decimals).
 * The backend returns this as a `number` from Postgres NUMERIC columns.
 * Be aware that JS numbers only safely handle integers up to 2^53 — for
 * amounts beyond ~9 trillion USDC this would need to become a string.
 * Practically fine for this app.
 */
export type UsdcAmount = number;

/** ISO-8601 datetime string, always UTC. */
export type Iso = string;

/** IANA timezone, e.g. "Africa/Lagos". */
export type Timezone = string;

// ============================================================================
// Host
// ============================================================================

/**
 * Public host profile — what callers see on /book/:slug.
 * Note: `id`, `walletAddress`, and `isActive` are intentionally stripped by
 * the backend's GET /api/hosts/:slug response for privacy.
 */
export interface PublicHost {
  slug: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  rate: UsdcAmount;
  durationMinutes: number;
  timezone: Timezone;
}

/**
 * Full host record — only available to the host themselves (x-wallet-address
 * authenticated routes). Returned by POST /api/hosts and PUT /api/hosts/me.
 */
export interface Host extends PublicHost {
  id: string;
  walletAddress: string;
  isActive: boolean;
  email?: string;
  feePercentage?: number;
  createdAt?: Iso;
  updatedAt?: Iso;
}

export interface CreateHostRequest {
  walletAddress: string;
  name: string;
  slug: string;
  rate: UsdcAmount;
  email?: string;  
  durationMinutes?: number;
  bio?: string;
  timezone?: Timezone;
}

export interface UpdateHostRequest {
  name?: string;
  bio?: string;
  email?: string;
  rate?: UsdcAmount;
  durationMinutes?: number;
  timezone?: Timezone;
  isActive?: boolean;
}

// ============================================================================
// Availability
// ============================================================================

export interface AvailabilityRule {
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  startTime: string; // "HH:MM:SS"
  endTime: string;
}

export interface SetAvailabilityRequest {
  rules: AvailabilityRule[];
}

export interface DateOverride {
  date: string; // YYYY-MM-DD
  isBlocked: boolean;
  startTime?: string | null;
  endTime?: string | null;
}

export interface SetOverridesRequest {
  overrides: DateOverride[];
}

// ============================================================================
// Slots
// ============================================================================

export interface Slot {
  startTime: Iso;
  endTime: Iso;
  available: boolean;
}

// ============================================================================
// Booking
// ============================================================================

export type BookingStatus =
  | "pending_payment"
  | "paid"
  | "active" 
  | "completed"
  | "refunded"
  | "expired"
  | "no_show";

/**
 * Booking record from the database.
 * Field names match the backend's `camelizeKeys(booking)` output.
 */
export interface Booking {
  id: string;
  hostId: string;
  callerWallet: string;
  callerName: string | null;
  callerEmail: string | null;
  scheduledAt: Iso;
  durationMinutes: number;
  timezone: Timezone;
  amount: UsdcAmount;
  status: BookingStatus;
  streamName: string;
  streamPda: string;
  streamAta: string;
  donorPda: string;
  vidbloqRoom: string;
  paymentExpiresAt: Iso | null;

  /** Caller's deposit tx signature (set when status transitions to "paid"). */
  depositSignature: string | null;

  /** Host payout signature (set when status transitions to "completed"). */
  distributeSignature: string | null;

  /** Refund tx signature (set when status transitions to "refunded" or "no_show"). */
  refundSignature: string | null;

  refundReason: string | null;
  feePercentage?: number;
  createdAt: Iso;
  updatedAt?: Iso;

  /** Joined host fields — present on list endpoints and getBookingWithHost. */
  hostName: string;
  hostSlug: string;
  hostWallet?: string;
}

export interface CreateBookingRequest {
  hostSlug: string;
  scheduledAt: Iso;
  callerWallet: string;
  callerName?: string;
  callerEmail?: string;
}

/**
 * Serialized Solana instruction returned by POST /api/bookings.
 * The client deserializes this into a TransactionInstruction, wraps it in a
 * Transaction, and signs via the Privy-embedded wallet.
 */
export interface SerializedInstruction {
  keys: Array<{
    pubkey: string;
    isSigner: boolean;
    isWritable: boolean;
  }>;
  programId: string;
  data: string; // base64
}

export interface CreateBookingResponse {
  booking: Booking;
  depositInstruction: SerializedInstruction;
  accounts: {
    streamPDA: string;
    streamATA: string;
    donorPDA: string;
  };
  paymentExpiresAt: Iso;
}

// ============================================================================
// API response envelopes
// ============================================================================

export interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface BookingListResponse {
  bookings: Booking[];
  pagination: Pagination;
}

export interface HostProfileResponse {
  host: PublicHost;
  availability: AvailabilityRule[];
}

/**
 * Response from GET /api/hosts/me — current host's own profile.
 * Includes the full Host record (with wallet, id, isActive, etc.)
 * and their weekly availability rules.
 */
export interface HostMeResponse {
  host: Host;
  availability: AvailabilityRule[];
}

export interface SlotsResponse {
  date: string;
  slots: Slot[];
}