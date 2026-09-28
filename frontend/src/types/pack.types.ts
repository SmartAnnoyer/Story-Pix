import type { Album } from './album.types';

export enum AlbumPackTier {
  PERSONAL = 'personal',
  MINIMAL = 'minimal',
  STANDARD = 'standard',
  PROFESSIONAL = 'professional',
  VOLUME = 'volume',
}

export enum PackLedgerAction {
  ASSIGN = 'assign',
  PURCHASE = 'purchase',
  CONSUME = 'consume',
  REVOKE = 'revoke',
  SCAN_RENEWAL = 'scan_renewal',
}

export interface AlbumPack {
  id: string;
  code: string;
  name: string;
  tier: AlbumPackTier;
  description: string | null;
  maxMappings: number;
  /** Always 1000 — plays guaranteed per mapped photo. */
  scansPerMapping: number;
  albumsIncluded: number;
  unitPriceInr: number;
  features: string[];
  isActive: boolean;
  sortOrder: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface StudioPackCredit {
  id: string;
  studioId: string;
  packId: string;
  packCode: string;
  packName: string;
  maxMappings: number;
  scansPerMapping: number;
  /** Photo-mapping slots granted by this purchase. */
  totalCredits: number;
  remainingCredits: number;
  creditUnit?: 'album' | 'mapping';
  unitPriceInr: number;
  totalPriceInr: number;
  assignedBy: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface StudioPackSummary {
  grantedMappingSlots?: number;
  usedMappingSlots?: number;
  remainingMappingSlots?: number;
  /** @deprecated Prefer remainingMappingSlots — albums are unlimited. */
  remainingAlbumCredits: number;
  totalAssignedCredits: number;
  usedCredits: number;
  credits: StudioPackCredit[];
}

export interface PackLedgerEntry {
  id: string;
  studioId: string;
  studioName: string | null;
  studioCode: string | null;
  packId: string | null;
  creditId: string | null;
  albumId: string | null;
  packCode: string;
  packName: string;
  action: PackLedgerAction;
  quantity: number;
  unitPriceInr: number;
  totalPriceInr: number;
  performedBy: string | null;
  notes: string | null;
  createdAt: string | null;
}

export interface PaginatedPackLedger {
  items: PackLedgerEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface AssignPackPayload {
  studioId: string;
  packId: string;
  quantity?: number;
  notes?: string;
}

export interface TopUpAlbumScansPayload {
  albumId: string;
  additionalScans: number;
  /** Omit or leave empty to renew every live photo in the album. */
  arTargetIds?: string[];
  notes?: string;
  /** Used only to refresh the right admin view after the top-up. */
  studioId?: string;
}

export interface ScanRenewalResult {
  album: Album;
  renewedCount: number;
  arTargetIds: string[];
}

export interface ScanUsagePhoto {
  id: string;
  targetName: string;
  status: string;
  scanLimit: number;
  scanUsage: number;
  scansRemaining: number;
  scansExhausted: boolean;
}

export interface StudioScanUsageAlbum {
  id: string;
  albumName: string;
  albumCode: string;
  slug: string;
  status: string;
  photoCount: number;
  exhaustedCount: number;
  photos: ScanUsagePhoto[];
}

export interface ScanRenewalRequest {
  albumId: string;
  arTargetIds?: string[];
  blocks?: number;
}

export interface ScanRenewalQuote {
  albumId: string;
  albumName: string;
  arTargetIds: string[];
  photoCount: number;
  blocks: number;
  scansPerPhoto: number;
  unitPriceInr: number;
  amountInr: number;
}
