import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { Auth } from './core/auth';
import { TranslatePipe } from './core/i18n';
import { Firebase } from './core/firebase';
import { Toast } from './core/toast';
import { Icon } from './shared/icon';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <router-outlet />

    @if (showNav()) {
      <nav class="nav" aria-label="Main">
        <a routerLink="/" routerLinkActive="on" [routerLinkActiveOptions]="{ exact: true }">
          <app-icon name="route" /><span>{{ 'nav.route' | t }}</span>
        </a>
        <a routerLink="/orders/new" routerLinkActive="on" class="nav__add">
          <span class="nav__plus"><app-icon name="plus" [size]="26" /></span><span>{{ 'nav.add' | t }}</span>
        </a>
        <a routerLink="/cash" routerLinkActive="on"><app-icon name="cash" /><span>{{ 'nav.cash' | t }}</span></a>
        <a routerLink="/more" routerLinkActive="on"><app-icon name="more" /><span>{{ 'nav.more' | t }}</span></a>
      </nav>
    }

    <div class="toasts" aria-live="polite">
      @for (m of toast.messages(); track m.id) {
        <div class="toast" [class]="'toast toast--' + m.kind" (click)="toast.dismiss(m.id)">{{ m.text }}</div>
      }
    </div>
  `,
  styles: `
    .nav {
      position: fixed; inset-inline: 0; bottom: 0; z-index: 30; height: calc(var(--nav-h) + env(safe-area-inset-bottom));
      padding-bottom: env(safe-area-inset-bottom); display: grid; grid-template-columns: repeat(4, 1fr);
      background: var(--surface); border-top: 1px solid var(--line);
    }
    .nav a {
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
      color: var(--muted); text-decoration: none; font-size: 12px; font-weight: 600;
    }
    .nav a.on { color: var(--primary); }
    .nav__plus { display: grid; place-items: center; width: 44px; height: 32px; border-radius: 16px; background: var(--primary); color: var(--primary-ink); }
    .toasts { position: fixed; inset-inline: 16px; top: calc(12px + env(safe-area-inset-top)); z-index: 60;
      display: flex; flex-direction: column; gap: 8px; align-items: center; pointer-events: none; }
    .toast { pointer-events: auto; max-width: 560px; width: 100%; padding: 12px 16px; border-radius: 12px; font-weight: 600;
      background: var(--ink); color: var(--bg); box-shadow: var(--shadow); }
    .toast--error { background: var(--danger); color: #fff; }
    .toast--success { background: var(--success); color: #fff; }
  `,
})
export class App {
  private auth = inject(Auth);
  private router = inject(Router);
  protected toast = inject(Toast);
  private url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => (e as NavigationEnd).urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );
  constructor() {
    inject(Firebase).init();
  }

  protected showNav = computed(() => this.auth.signedIn() && !/^\/(l\/|login)/.test(this.url()));
}
