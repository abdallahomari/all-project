import { LatLng } from '../domain/geo';

export type OrderStatus =
  | 'pending_pickup'
  | 'picked_up'
  | 'delivered'
  | 'partial'
  | 'exchange'
  | 'postponed'
  | 'unreachable'
  | 'refused'
  | 'returned';

export const ACTIVE_STATUSES: readonly OrderStatus[] = ['pending_pickup', 'picked_up'];
export const SUCCESS_STATUSES: readonly OrderStatus[] = ['delivered', 'partial'];
export const isActive = (s: OrderStatus) => ACTIVE_STATUSES.includes(s);

export interface OrderLocation extends LatLng {
  accuracy?: number;
  source: 'customer' | 'link' | 'pin';
  at: string;
}

export interface Order {
  id: string;
  shopId: string;
  customerName: string;
  customerPhone?: string;
  amountFils: number;
  collectedFils?: number;
  addressNote?: string;
  location?: OrderLocation;
  locationToken: string;
  status: OrderStatus;
  statusReason?: string;
  statusNote?: string;
  postponedTo?: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
}

export interface Shop {
  id: string;
  name: string;
  phone?: string;
}

export interface Courier {
  id: string;
  name: string;
  phone: string;
}

export interface AppConfig {
  mapsApiKey: string;
  mapId: string;
  serverRouting: boolean;
}

export interface NewOrder {
  shopId: string;
  customerName: string;
  customerPhone?: string;
  amountFils: number;
  addressNote?: string;
  location?: LatLng & { source: OrderLocation['source'] };
  status?: 'pending_pickup' | 'picked_up';
}

/** PATCH body for editing an order; empty strings / null clear a field. */
export type OrderPatch = Partial<Omit<NewOrder, 'location' | 'status'>> & { location?: NewOrder['location'] | null };

export interface StatusChange {
  status: OrderStatus;
  statusReason?: string;
  statusNote?: string;
  postponedTo?: string;
  collectedFils?: number;
}

export interface ServerRoute {
  order: string[];
  distanceMeters: number;
  durationSeconds: number;
  polyline: string | null;
}
