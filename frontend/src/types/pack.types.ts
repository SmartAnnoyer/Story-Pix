export enum AlbumPackTier {
  MINIMAL = 'minimal',
  STANDARD = 'standard',
  PROFESSIONAL = 'professional',
  VOLUME = 'volume',
}

export enum PackLedgerAction {
  ASSIGN = 'assign',
  CONSUME = 'consume',
  REVOKE = 'revoke',
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
  totalCredits: number;
  remainingCredits: number;
  unitPriceInr: number;
  totalPriceInr: number;
  assignedBy: string;
  notes: string | null;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface StudioPackSummary {
  remainingAlbumCredits: number;
  totalAssignedCredits: number;
  usedCredits: number;
  credits: StudioPackCredit[];
}

export interface PackLedgerEntry {
  id: string;
  studioId: string;
  packId: string;
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
}
