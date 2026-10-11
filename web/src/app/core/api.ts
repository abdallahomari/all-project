import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LatLng } from '../domain/geo';
import { AppConfig, Courier, NewOrder, Order, OrderPatch, ServerRoute, Shop, StatusChange } from './models';

/** Error code from the API (`{ error: "phone_taken" }`) or "network". */
export function apiErrorCode(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return 'network';
    return (err.error && typeof err.error === 'object' && err.error.error) || `http_${err.status}`;
  }
  return 'unknown';
}

@Injectable({ providedIn: 'root' })
export class Api {
  private http = inject(HttpClient);
  private get<T>(url: string) {
    return firstValueFrom(this.http.get<T>(`/api${url}`));
  }
  private send<T>(method: 'POST' | 'PATCH' | 'DELETE', url: string, body?: unknown) {
    return firstValueFrom(this.http.request<T>(method, `/api${url}`, { body }));
  }

  config = () => this.get<AppConfig>('/config');

  register = (body: { name: string; phone: string; pin: string }) =>
    this.send<{ token: string; courier: Courier }>('POST', '/auth/register', body);
  login = (body: { phone: string; pin: string }) =>
    this.send<{ token: string; courier: Courier }>('POST', '/auth/login', body);
  logout = () => this.send<void>('POST', '/auth/logout');

  shops = () => this.get<Shop[]>('/shops');
  createShop = (body: { name: string; phone?: string }) => this.send<Shop>('POST', '/shops', body);
  updateShop = (id: string, body: Partial<Shop>) => this.send<Shop>('PATCH', `/shops/${id}`, body);
  deleteShop = (id: string) => this.send<void>('DELETE', `/shops/${id}`);

  orders = (scope: 'active' | 'today' | 'all' = 'today') => this.get<Order[]>(`/orders?scope=${scope}`);
  createOrder = (body: NewOrder) => this.send<Order>('POST', '/orders', body);
  updateOrder = (id: string, body: OrderPatch | StatusChange) =>
    this.send<Order>('PATCH', `/orders/${id}`, body);
  deleteOrder = (id: string) => this.send<void>('DELETE', `/orders/${id}`);

  optimizeRoute = (origin: LatLng, stops: (LatLng & { id: string })[], language: string) =>
    this.send<ServerRoute>('POST', '/route/optimize', { origin, stops, language });
  resolveMapsLink = (url: string) => this.send<LatLng>('POST', '/maps/resolve', { url });

  publicLocation = (token: string) =>
    this.get<{ shopName: string; hasLocation: boolean; closed: boolean }>(`/public/location/${token}`);
  submitPublicLocation = (token: string, body: LatLng & { accuracy?: number }) =>
    this.send<{ ok: true }>('POST', `/public/location/${token}`, body);
}
