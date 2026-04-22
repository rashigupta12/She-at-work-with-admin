// lib/api/banners.ts
/*eslint-disable @typescript-eslint/no-empty-object-type */
const API_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:4019';

// =====================
// Types
// =====================

export type ScreenType = "DESKTOP" | "TABLET" | "MOBILE";
export type BannerStatus = "DRAFT" | "ACTIVE" | "INACTIVE" | "SCHEDULED";

export interface TextElementStyle {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  lineHeight?: number;
  letterSpacing?: number;
  textAlign?: string;
  textDecoration?: string;
  textTransform?: string;
  color?: string;
  backgroundColor?: string;
  padding?: string;
  borderRadius?: number;
  border?: string;
  textShadow?: string;
  boxShadow?: string;
  custom?: Record<string, string>;
}

export interface TextElement {
  id: string;
  type: "TEXT";
  zIndex: number;
  content: string;
  positionX: number;
  positionY: number;
  width?: number;
  height?: number;
  maxWidth?: number;
  isVisible: boolean;
  style: TextElementStyle;
}

export interface ButtonElementStyle {
  width?: number;
  height?: number;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  textTransform?: string;
  letterSpacing?: number;
  backgroundColor?: string;
  textColor?: string;
  hoverBackgroundColor?: string;
  hoverTextColor?: string;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  borderStyle?: string;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  boxShadow?: string;
  opacity?: number;
  custom?: Record<string, string>;
}

export interface ButtonElement {
  id: string;
  type: "BUTTON";
  zIndex: number;
  label: string;
  href: string;
  isExternal: boolean;
  ariaLabel?: string;
  positionX: number;
  positionY: number;
  isVisible: boolean;
  iconUrl?: string;
  iconPosition?: "left" | "right";
  style: ButtonElementStyle;
}

export type BannerElement = TextElement | ButtonElement;

export interface Banner {
  _id: string;
  __v?: number;
  name: string;
  slug: string;
  description?: string | null;
  screenType: ScreenType;
  page: string;
  position: string;
  width: number;
  height: number;
  backgroundColor: string;
  backgroundImageUrl?: string | null;
  backgroundImageAlt?: string | null;
  backgroundSize: string;
  backgroundPosition: string;
  elements: BannerElement[];
  status: BannerStatus;
  startsAt?: string | null;
  endsAt?: string | null;
  priority: number;
  createdBy: { _id: string; name: string; email: string };
  updatedBy?: { _id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export interface CreateBannerInput {
  name: string;
  slug: string;
  description?: string | null;
  screenType: ScreenType;
  page: string;
  position?: string;
  width: number;
  height: number;
  backgroundColor?: string;
  backgroundImageUrl?: string | null;
  backgroundImageAlt?: string | null;
  backgroundSize?: string;
  backgroundPosition?: string;
  elements: BannerElement[];
  status?: BannerStatus;
  startsAt?: string | null;
  endsAt?: string | null;
  priority?: number;
}

export interface UpdateBannerInput extends Partial<CreateBannerInput> {}

export interface BannerListResponse {
  success: boolean;
  data: Banner[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface BannerResponse {
  success: boolean;
  data: Banner;
  message?: string;
}

// =====================
// Helpers
// =====================

/**
 * Build FormData from banner input + optional image file
 * - Skips empty strings (backend rejects them as missing)
 * - Strips blob: preview URLs (never sent to backend)
 */
const buildFormData = (
  data: Record<string, unknown>,
  backgroundImageFile?: File | null
): FormData => {
  const formData = new FormData();

  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    // Skip empty strings — backend treats '' same as missing for required fields
    if (value === '') return;
    // Strip client-side blob preview URLs — backend only stores real Cloudinary paths
    if (key === 'backgroundImageUrl' && typeof value === 'string' && value.startsWith('blob:')) return;
    if (key === 'backgroundImageUrl' && typeof value === 'string' && value.startsWith('data:')) return;
    if (Array.isArray(value) || (typeof value === 'object' && !(value instanceof File))) {
      formData.append(key, JSON.stringify(value));
    } else {
      formData.append(key, String(value));
    }
  });

  if (backgroundImageFile) {
    formData.append('backgroundImage', backgroundImageFile);
  }

  return formData;
};

/**
 * Get current logged-in user ID from session
 * Uses NextAuth session to get the user ID
 */
const getCurrentUserId = async (): Promise<string> => {
  try {
    // Call the API endpoint that uses the session
    const response = await fetch(`/api/admin/me`, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Not authenticated — /api/admin/me returned ${response.status}`);
    }
    
    const data = await response.json();
    const id = data._id || data.id || data.userId || data.user?.id || '';
    
    if (!id) {
      throw new Error('User ID missing from /api/admin/me response');
    }
    
    return id;
  } catch (error) {
    console.error('Failed to get current user ID:', error);
    throw new Error('Authentication required. Please log in again.');
  }
};

// =====================
// API
// =====================

export const BannerAPI = {

  /**
   * GET /api/admin/banners/new
   */
  list: async (params?: {
    page?: number;
    limit?: number;
    status?: BannerStatus;
    screenType?: ScreenType;
    slug?: string;
    pageRoute?: string;
    search?: string;
    active?: boolean;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }): Promise<BannerListResponse> => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });
    }
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const response = await fetch(`${API_BASE_URL}/api/admin/banners/new${query}`, {
      method: 'GET',
      credentials: 'include',
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || 'Failed to fetch banners');
    return data;
  },

  /**
   * GET /api/admin/banners/new/:id
   */
  getById: async (id: string): Promise<BannerResponse> => {
    const response = await fetch(`${API_BASE_URL}/api/admin/banners/new/${id}`, {
      method: 'GET',
      credentials: 'include',
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || 'Failed to fetch banner');
    return data;
  },

  /**
   * POST /api/admin/banners/new
   */
  create: async (
    input: CreateBannerInput,
    backgroundImageFile?: File | null
  ): Promise<BannerResponse> => {
    const userId = await getCurrentUserId();
    const formData = buildFormData({ ...input, createdBy: userId }, backgroundImageFile);
    const response = await fetch(`${API_BASE_URL}/api/admin/banners/new`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || 'Failed to create banner');
    return data;
  },

  /**
   * PATCH /api/admin/banners/new/:id
   */
  update: async (
    id: string,
    input: UpdateBannerInput,
    backgroundImageFile?: File | null
  ): Promise<BannerResponse> => {
    const userId = await getCurrentUserId();
    const formData = buildFormData({ ...input, updatedBy: userId }, backgroundImageFile);
    const response = await fetch(`${API_BASE_URL}/api/admin/banners/new/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      body: formData,
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || 'Failed to update banner');
    return data;
  },

  /**
   * DELETE /api/admin/banners/new/:id
   */
  delete: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await fetch(`${API_BASE_URL}/api/admin/banners/new/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || 'Failed to delete banner');
    return data;
  },

  /**
   * PATCH /api/admin/banners/new/:id/status
   */
  setStatus: async (id: string, status: BannerStatus): Promise<{ success: boolean; message: string }> => {
    const userId = await getCurrentUserId();
    const response = await fetch(`${API_BASE_URL}/api/admin/banners/new/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status, updatedBy: userId }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || 'Failed to update status');
    return data;
  },

  /**
   * POST /api/admin/banners/new/:id/duplicate
   */
  duplicate: async (
    id: string,
    overrides?: { name?: string; slug?: string }
  ): Promise<BannerResponse> => {
    const userId = await getCurrentUserId();
    const response = await fetch(`${API_BASE_URL}/api/admin/banners/new/${id}/duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ ...overrides, createdBy: userId }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || 'Failed to duplicate banner');
    return data;
  },

  /**
   * POST /api/admin/banners/new/update-scheduled
   */
  updateScheduled: async (): Promise<{ success: boolean; message: string; data: { activated: number; deactivated: number } }> => {
    const userId = await getCurrentUserId();
    const response = await fetch(`${API_BASE_URL}/api/admin/banners/new/update-scheduled`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ updatedBy: userId }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || 'Failed to update scheduled banners');
    return data;
  },

  /**
   * GET /api/banners/active (public)
   */
  getActive: async (params?: {
    screenType?: ScreenType;
    page?: string;
    position?: string;
  }): Promise<{ success: boolean; data: Banner[] }> => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });
    }
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const response = await fetch(`${API_BASE_URL}/api/banners/active${query}`, {
      method: 'GET',
      credentials: 'include',
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || 'Failed to fetch active banners');
    return data;
  },
};