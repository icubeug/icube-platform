// lib/api.ts — typed API client; all calls proxy through Next.js → backend :3000

/** Read tenant ID from localStorage (set on login). Falls back to env / legacy key. */
export function getTenantId(): string {
  if (typeof window === 'undefined') return '';
  return (
    localStorage.getItem('icube_tenant_id') ||
    localStorage.getItem('tenant_id') ||
    ''
  );
}

/** @deprecated — use getTenantId() for dynamic reads */
export const TENANT_ID = '';

const BASE = '/api/v1';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Site {
  id: string; name: string; location: string; status: 'active' | 'inactive';
  router_count: number; active_vouchers: number; created_at: string; tenant_id: string | null;
}
export interface Router {
  id: string; name: string; ip_address: string; api_port: number;
  status: 'online' | 'offline' | 'unreachable'; brand: string;
  board_name: string | null; model: string | null; firmware_version: string | null;
  cpu_load: number; uptime_seconds: number; ssh_port: number;
  site_id: string | null; site_name: string | null; created_at: string;
  vpn_port: number | null; vpn_address: string | null;
  vpn_connected: boolean; last_heartbeat_at: string | null;
}

export interface SiteLimit {
  max_sites: number;
  count: number;
}
export interface Voucher {
  id: string; code: string; status: 'unused' | 'active' | 'expired' | 'used';
  package_name: string | null; site_name: string | null; expires_at: string | null;
  customer_phone: string | null; created_at: string; use_case: string | null;
  note: string | null; first_login_at: string | null; deleted_at: string | null;
}
export interface Payment {
  id: string; amount_ugx: number; method: string; status: string;
  voucher_code: string | null; voucher_id: string | null;
  site_name: string | null; customer_phone: string | null; customer_name: string | null;
  created_at: string;
}
export interface Package {
  id: string; name: string; price_ugx: number; duration_hrs: number;
  speed_mbps: number | null; upload_mbps: number | null; active: boolean;
  agent_commission_ugx: number; data_limit_mb: number | null; site_id: string;
}
export interface AgentInfo {
  id: string; name: string; phone: string; commission_pct: number; wallet_balance: number;
  site_id: string; tenant_id: string;
}
export interface AgentDashboard {
  agent: AgentInfo;
  stats: {
    total_sales: number; total_revenue: number; total_commission: number;
    sales_today: number; revenue_today: number;
  };
  recent_transactions: { type: string; amount_ugx: number; reference: string; created_at: string }[];
}
export interface Tenant {
  id: string; name: string; slug: string; owner_email: string; plan: string; status: string; created_at: string;
}
export interface PPPoEPlan {
  id: string; name: string; download_mbps: number; upload_mbps: number; price_ugx: number;
  billing_cycle: string; active: boolean;
}
export interface PPPoESubscriber {
  id: string; full_name: string; phone: string; username: string; status: string;
  next_billing_date: string | null; plan_name: string | null;
  account_number: string | null; note: string | null; created_at: string;
}
export interface Health { status: 'ok' | 'degraded'; db: boolean; redis: boolean; ts: number; }

// New types
export interface Role {
  id: string; tenant_id: string; name: string; permissions: string[]; created_at: string;
}
export interface Customer {
  id: string; tenant_id: string; name: string; phone: string; email: string;
  site_id: string | null; site_name: string | null; role_id: string | null;
  last_login_at: string | null; cards_count: number; created_at: string;
}
export interface StaffMember {
  id: string; name: string; email: string; phone: string | null;
  role: string; site_id: string | null; last_login_at: string | null;
  created_at: string; requires_printer: boolean;
}
export interface FloatAgent {
  id: string; name: string; phone: string; status: string;
  balance: number; use_float: boolean; float_account_id: string | null;
}
export interface FloatPurchase {
  id: string; agent_id: string; agent_name: string; seller_name: string | null;
  amount: number; created_float: number; payer: string | null;
  status: string; created_at: string;
}
export interface FloatTransaction {
  id: string; agent_id: string; agent_name: string;
  operation: 'credit' | 'debit'; amount: number; balance_after: number;
  memo: string | null; request_id: string | null; created_at: string;
}
export interface Disbursement {
  id: string; phone: string; payee: string | null; amount_ugx: number;
  transaction_id: string | null; charges: number; reason: string | null;
  status: 'pending' | 'success' | 'failed'; created_at: string;
}
export interface PlatformTransaction {
  id: string; transaction_id: string | null; request_id: string | null;
  operation: 'debit' | 'credit'; note: string | null;
  amount: number; balance_after: number | null; created_at: string;
}
export interface BillingInvoice {
  id: string; description: string; amount: number; status: string;
  payer: string | null; payer_name: string | null; created_at: string;
}
export interface HotspotSettings {
  tenant_id: string; dns_url: string | null; support_phone_1: string | null;
  support_phone_2: string | null; login_page_name: string | null;
  router_identity: string | null; footer_note: string | null; updated_at: string;
}
export interface SmsSettings {
  tenant_id: string; agent_sales_sms: boolean; realtime_momo_sms: boolean;
  delayed_reminder_minutes: number | null; account_credit: number; per_sms_rate: number;
}
export interface SaleItem {
  id: string; code: string; status: string; use_case: string | null; channel: string | null;
  package_name: string | null; customer_phone: string | null; customer_name: string | null;
  method: string | null; note: string | null; first_login_at: string | null;
  expires_at: string | null; created_at: string; deleted_at: string | null;
}
export interface RouterMetrics {
  router: { id: string; name: string; status: string; uptime_seconds: number; board_name: string; firmware_version: string; };
  stats: { uptime: string; active_users: number; cpu_load: number; memory_usage: number; };
  series: { time_label: string; cpu_load: number; memory_usage: number; active_users: number; bytes_in: number; bytes_out: number; }[];
}
export interface SupportIntelligence {
  avg_login_minutes: number; login_rate: number;
  never_logged_in: number; expired_today: number;
  feed: { code: string; status: string; customer_phone: string | null; use_case: string | null; package_name: string | null; created_at: string; activated_at: string | null; }[];
  paid_never_connected: { customer_phone: string | null; customer_name: string | null; package_name: string | null; method: string | null; created_at: string; }[];
  chart: { day: string; avg_minutes: number; }[];
}
export interface Paginated<T> { data: T[]; total: number; page: number; per_page: number; }

// ── Core fetch helper ─────────────────────────────────────────────────────────

async function req<T>(
  path: string,
  opts: RequestInit & { agentToken?: string } = {}
): Promise<T> {
  const { agentToken, ...fetchOpts } = opts;
  // Prefer icube_token (new) then fall back to legacy auth_token
  const adminToken =
    (typeof window !== 'undefined' && (localStorage.getItem('icube_token') || localStorage.getItem('auth_token'))) || '';
  const tenantId = getTenantId();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(tenantId ? { 'X-Tenant-ID': tenantId } : {}),
    ...(agentToken
      ? { Authorization: `Bearer ${agentToken}` }
      : adminToken
      ? { Authorization: `Bearer ${adminToken}` }
      : {}),
    ...(fetchOpts.headers as Record<string, string> | undefined),
  };
  const res = await fetch(`${BASE}${path}`, { ...fetchOpts, headers });
  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try { msg = JSON.parse(text)?.error ?? text; } catch {}
    throw new Error(msg);
  }
  try { return JSON.parse(text) as T; } catch { return text as unknown as T; }
}

/**
 * Low-level fetch helper — attaches Bearer token and X-Tenant-ID from
 * localStorage. Use this for one-off calls; prefer the typed `api.*`
 * methods for structured endpoints.
 */
export async function apiCall(path: string, options: RequestInit = {}): Promise<Response> {
  if (typeof window === 'undefined') return fetch(path, options);
  const token    = localStorage.getItem('icube_token') || localStorage.getItem('auth_token') || '';
  const tenantId = localStorage.getItem('icube_tenant_id') || localStorage.getItem('tenant_id') || '';
  return fetch(`/api/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token    ? { Authorization: `Bearer ${token}` }  : {}),
      ...(tenantId ? { 'X-Tenant-ID': tenantId }           : {}),
      ...(options.headers as Record<string, string> | undefined),
    },
  });
}

/** Clear all auth state from localStorage + cookie, then redirect to login */
export function logout(redirectTo = '/auth/login') {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('icube_token');
  localStorage.removeItem('icube_tenant_id');
  localStorage.removeItem('icube_user');
  localStorage.removeItem('auth_token');
  localStorage.removeItem('tenant_id');
  // Clear the middleware cookie
  document.cookie = 'icube_token=; path=/; max-age=0; SameSite=Lax';
  window.location.href = redirectTo;
}

function qs(params: Record<string, string | number | boolean | undefined | null>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  }
  const s = p.toString();
  return s ? '?' + s : '';
}

// ── API surface ───────────────────────────────────────────────────────────────

export const api = {
  health: async (): Promise<Health> => {
    const res = await fetch('/health');
    return res.json();
  },

  sites: {
    list:   () => req<Site[]>('/sites'),
    limit:  () => req<SiteLimit>('/sites/limit'),
    create: (data: { name: string; location?: string }) =>
      req<Site>('/sites', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Site>) =>
      req<Site>(`/sites/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },

  routers: {
    list: () => req<Router[]>('/routers'),
    get:  (id: string) => req<Router>(`/routers/${id}`),
    create: (data: Partial<Router>) =>
      req<Router>('/routers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Router>) =>
      req<Router>(`/routers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    metrics: (id: string, range = '1h') => req<RouterMetrics>(`/routers/${id}/metrics?range=${range}`),
  },

  vouchers: {
    list: (params?: { status?: string; site_id?: string; page?: number; per_page?: number }) => {
      return req<Voucher[]>(`/vouchers${qs(params ?? {})}`);
    },
    generate: (data: { package_id: string; site_id: string; count?: number; note?: string }) =>
      req<{ generated: number; vouchers: { id: string; code: string }[] }>(
        '/vouchers/generate', { method: 'POST', body: JSON.stringify(data) }
      ),
    redeem: (code: string) =>
      req<{ message: string; expires_at: string; package: string }>(
        '/vouchers/redeem', { method: 'POST', body: JSON.stringify({ code }) }
      ),
  },

  payments: {
    list: (limit = 50) => req<Payment[]>(`/payments?limit=${limit}`),
  },

  packages: {
    list: (params?: { search?: string; page?: number; per_page?: number }) =>
      req<Paginated<Package> | Package[]>(`/packages${qs(params ?? {})}`),
    create: (data: Partial<Package>) =>
      req<Package>('/packages', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Package>) =>
      req<Package>(`/packages/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) =>
      req<{ ok: boolean }>(`/packages/${id}`, { method: 'DELETE' }),
  },

  agents: {
    login: (phone: string, pin: string) =>
      req<{ token: string; agent: AgentInfo }>(
        '/agents/login', { method: 'POST', body: JSON.stringify({ phone, pin }) }
      ),
    dashboard: (token: string) => req<AgentDashboard>('/agents/dashboard', { agentToken: token }),
    packages: (token: string) => req<Package[]>('/agents/packages', { agentToken: token }),
    sale: (token: string, data: { package_id: string; customer_phone: string; payment_method?: string }) =>
      req<{ success: boolean; voucher_code: string; package_name: string; amount_ugx: number; commission_ugx: number }>(
        '/agents/sale', { method: 'POST', body: JSON.stringify(data), agentToken: token }
      ),
  },

  tenants: {
    list: () => req<Tenant[]>('/tenants'),
    create: (data: { name: string; slug: string; owner_email: string; plan?: string }) =>
      req<Tenant>('/tenants', { method: 'POST', body: JSON.stringify(data) }),
  },

  pppoe: {
    plans: () => req<PPPoEPlan[]>('/pppoe/plans'),
    subscribers: (params?: { page?: number; per_page?: number; search?: string; status?: string; package_id?: string }) =>
      req<Paginated<PPPoESubscriber>>(`/pppoe/subscribers${qs(params ?? {})}`),
    createSubscriber: (data: Partial<PPPoESubscriber> & { plan_id: string; router_id: string }) =>
      req<PPPoESubscriber>('/pppoe/subscribers', { method: 'POST', body: JSON.stringify(data) }),
  },

  ai: {
    query: (message: string, history: { role: string; content: string }[] = []) =>
      req<{ reply: string; timestamp: string }>(
        '/ai/query', { method: 'POST', body: JSON.stringify({ message, history }) }
      ),
  },

  support: {
    intelligence: () => req<SupportIntelligence>('/support/intelligence'),
  },

  float: {
    list:         (params?: { page?: number; per_page?: number }) =>
      req<Paginated<FloatAgent>>(`/float${qs(params ?? {})}`),
    toggle:       (agentId: string, use_float: boolean) =>
      req<{ ok: boolean }>(`/float/${agentId}`, { method: 'PATCH', body: JSON.stringify({ use_float }) }),
    purchases:    (params?: { page?: number; per_page?: number; from?: string; to?: string }) =>
      req<Paginated<FloatPurchase>>(`/float/purchases${qs(params ?? {})}`),
    transactions: (params?: { page?: number; per_page?: number; operation?: string }) =>
      req<Paginated<FloatTransaction>>(`/float/transactions${qs(params ?? {})}`),
  },

  disbursements: {
    list:   (params?: { page?: number; per_page?: number; search?: string; from?: string; to?: string }) =>
      req<Paginated<Disbursement> & { total_disbursed: number }>(`/disbursements${qs(params ?? {})}`),
    create: (data: { phone: string; payee?: string; amount_ugx: number; reason?: string }) =>
      req<Disbursement>('/disbursements', { method: 'POST', body: JSON.stringify(data) }),
  },

  transactions: {
    list: (params?: { page?: number; per_page?: number; search?: string; operation?: string; from?: string; to?: string }) =>
      req<Paginated<PlatformTransaction>>(`/transactions${qs(params ?? {})}`),
  },

  billing: {
    history:      (params?: { page?: number; per_page?: number; status?: string; from?: string; to?: string }) =>
      req<Paginated<BillingInvoice> & { account_credit: number }>(`/billing/history${qs(params ?? {})}`),
    transactions: (params?: { page?: number; per_page?: number; operation?: string; from?: string; to?: string }) =>
      req<Paginated<PlatformTransaction>>(`/billing/transactions${qs(params ?? {})}`),
    payments:     (params?: { page?: number; per_page?: number; status?: string }) =>
      req<Paginated<BillingInvoice> & { account_credit: number }>(`/billing/payments${qs(params ?? {})}`),
  },

  settings: {
    getGeneral: () => req<HotspotSettings>('/settings/general'),
    putGeneral: (data: Partial<HotspotSettings>) =>
      req<HotspotSettings>('/settings/general', { method: 'PUT', body: JSON.stringify(data) }),
    getSms: () => req<SmsSettings>('/settings/sms'),
    putSms: (data: Partial<SmsSettings>) =>
      req<SmsSettings>('/settings/sms', { method: 'PUT', body: JSON.stringify(data) }),
  },

  features: {
    list:    () => req<{ limits: Record<string, { current: number; max: number; label: string }>; optional: { key: string; label: string; enabled: boolean; description: string }[] }>('/features'),
    request: (data: { category: string; feature: string; reason: string }) =>
      req<{ id: string }>('/features/request', { method: 'POST', body: JSON.stringify(data) }),
  },

  users: {
    staff:     (params?: { page?: number; per_page?: number; search?: string; role?: string }) =>
      req<Paginated<StaffMember>>(`/users/staff${qs(params ?? {})}`),
    customers: (params?: { page?: number; per_page?: number; search?: string }) =>
      req<Paginated<Customer>>(`/users/customers${qs(params ?? {})}`),
    roles:     (params?: { page?: number; per_page?: number }) =>
      req<Paginated<Role>>(`/users/roles${qs(params ?? {})}`),
    createRole: (data: { name: string; permissions?: string[] }) =>
      req<Role>('/users/roles', { method: 'POST', body: JSON.stringify(data) }),
    deleteRole: (id: string) =>
      req<{ ok: boolean }>(`/users/roles/${id}`, { method: 'DELETE' }),
  },

  sales: {
    list:       (params?: { page?: number; per_page?: number; search?: string; package_id?: string; from?: string; to?: string }) =>
      req<Paginated<SaleItem>>(`/sales${qs(params ?? {})}`),
    trash:      (params?: { page?: number; per_page?: number }) =>
      req<Paginated<SaleItem>>(`/sales/trash${qs(params ?? {})}`),
    softDelete: (id: string) =>
      req<{ ok: boolean }>(`/sales/${id}`, { method: 'DELETE' }),
    emptyTrash: () =>
      req<{ deleted: number }>('/sales/trash/empty', { method: 'POST' }),
  },
};
