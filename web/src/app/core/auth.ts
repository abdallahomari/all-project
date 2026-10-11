import { HttpInterceptorFn } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { Courier } from './models';
import { storage } from './storage';

const KEY = 'wasel.session';

@Injectable({ providedIn: 'root' })
export class Auth {
  private session = signal<{ token: string; courier: Courier } | null>(storage.get(KEY, null));
  readonly courier = computed(() => this.session()?.courier ?? null);
  readonly token = computed(() => this.session()?.token ?? null);
  readonly signedIn = computed(() => this.session() !== null);

  start(session: { token: string; courier: Courier }) {
    this.session.set(session);
    storage.set(KEY, session);
  }

  clear() {
    this.session.set(null);
    storage.remove(KEY);
  }
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);
  const router = inject(Router);
  const token = auth.token();
  const isPublic = req.url.startsWith('/api/public') || req.url.startsWith('/api/auth/') || req.url === '/api/config';
  const authed = token && !isPublic ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  return next(authed).pipe(
    catchError((err) => {
      if (err?.status === 401 && !isPublic) {
        auth.clear();
        router.navigateByUrl('/login');
      }
      return throwError(() => err);
    }),
  );
};

export const signedInGuard: CanActivateFn = () => inject(Auth).signedIn() || inject(Router).parseUrl('/login');
export const signedOutGuard: CanActivateFn = () => !inject(Auth).signedIn() || inject(Router).parseUrl('/');
