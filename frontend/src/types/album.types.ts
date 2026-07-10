export enum AlbumStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum EventType {
  WEDDING = 'wedding',
  PRE_WEDDING = 'pre_wedding',
  RECEPTION = 'reception',
  BIRTHDAY = 'birthday',
  BABY_SHOWER = 'baby_shower',
  NAMING_CEREMONY = 'naming_ceremony',
  ANNIVERSARY = 'anniversary',
  CORPORATE_EVENT = 'corporate_event',
  GRADUATION = 'graduation',
  TRAVEL = 'travel',
  CUSTOM = 'custom',
}

export enum AlbumSortField {
  CREATED_AT = 'createdAt',
  EVENT_DATE = 'eventDate',
  ALBUM_NAME = 'albumName',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export interface Album {
  id: string;
  studioId: string;
  albumCode: string;
  albumName: string;
  slug: string;
  publicViewerUrl: string;
  eventType: EventType;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  eventDate: string;
  coverImage: string | null;
  description: string | null;
  status: AlbumStatus;
  isPublished: boolean;
  publishedAt: string | null;
  arScanFileReady: boolean;
  arScanFileCompiledAt: string | null;
  createdBy: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface PublicAlbum {
  id: string;
  albumName: string;
  slug: string;
  publicViewerUrl: string;
  eventType: EventType;
  eventDate: string;
  coverImage: string | null;
  description: string | null;
  publishedAt: string | null;
}

export interface PaginatedAlbums {
  items: Album[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface CreateAlbumPayload {
  albumName: string;
  eventType: EventType;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  eventDate: string;
  coverImage?: string;
  description?: string;
}

export interface UpdateAlbumPayload extends Partial<CreateAlbumPayload> {}

export interface AlbumQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: AlbumStatus;
  eventType?: EventType;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: AlbumSortField;
  sortOrder?: SortOrder;
}

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  [EventType.WEDDING]: 'Wedding',
  [EventType.PRE_WEDDING]: 'Pre Wedding',
  [EventType.RECEPTION]: 'Reception',
  [EventType.BIRTHDAY]: 'Birthday',
  [EventType.BABY_SHOWER]: 'Baby Shower',
  [EventType.NAMING_CEREMONY]: 'Naming Ceremony',
  [EventType.ANNIVERSARY]: 'Anniversary',
  [EventType.CORPORATE_EVENT]: 'Corporate Event',
  [EventType.GRADUATION]: 'Graduation',
  [EventType.TRAVEL]: 'Travel',
  [EventType.CUSTOM]: 'Custom',
};
