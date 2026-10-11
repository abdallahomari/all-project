import { Routes } from '@angular/router';
import { signedInGuard, signedOutGuard } from './core/auth';

export const routes: Routes = [
  { path: 'login', canActivate: [signedOutGuard], loadComponent: () => import('./features/login/login-page').then((m) => m.LoginPage) },
  // Public page the customer opens from WhatsApp — no account needed.
  { path: 'l/:token', loadComponent: () => import('./features/share-location/share-location-page').then((m) => m.ShareLocationPage) },
  {
    path: '',
    canActivate: [signedInGuard],
    children: [
      { path: '', pathMatch: 'full', loadComponent: () => import('./features/route/route-page').then((m) => m.RoutePage) },
      { path: 'orders/new', loadComponent: () => import('./features/order-form/order-form-page').then((m) => m.OrderFormPage) },
      { path: 'orders/:id', loadComponent: () => import('./features/order-form/order-form-page').then((m) => m.OrderFormPage) },
      { path: 'cash', loadComponent: () => import('./features/cash/cash-page').then((m) => m.CashPage) },
      { path: 'more', loadComponent: () => import('./features/more/more-page').then((m) => m.MorePage) },
    ],
  },
  { path: '**', redirectTo: '' },
];
