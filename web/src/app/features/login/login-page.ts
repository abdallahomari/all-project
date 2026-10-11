import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Api, apiErrorCode } from '../../core/api';
import { Auth } from '../../core/auth';
import { I18n, TranslatePipe } from '../../core/i18n';
import { Icon } from '../../shared/icon';

@Component({
  selector: 'app-login-page',
  imports: [FormsModule, TranslatePipe, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="login">
      <div class="brand">
        <div class="brand__mark"><app-icon name="route" [size]="34" /></div>
        <h1>{{ 'app.name' | t }}</h1>
        <p class="muted">{{ 'app.tagline' | t }}</p>
      </div>

      <form class="card stack" (ngSubmit)="submit()">
        <h2>{{ (mode() === 'in' ? 'login.signIn' : 'login.register') | t }}</h2>
        @if (mode() === 'up') {
          <label class="field">{{ 'login.name' | t }}
            <input class="input" name="name" autocomplete="name" [(ngModel)]="name" required maxlength="80" />
          </label>
        }
        <label class="field">{{ 'login.phone' | t }}
          <input class="input ltr" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="07X XXX XXXX"
            [(ngModel)]="phone" required />
        </label>
        <label class="field">{{ 'login.pin' | t }}
          <input class="input ltr" name="pin" type="password" inputmode="numeric" autocomplete="current-password"
            maxlength="6" [(ngModel)]="pin" required />
        </label>
        @if (error()) { <div class="notice notice--error" role="alert">{{ error() }}</div> }
        <button class="btn btn--primary btn--block btn--xl" type="submit" [disabled]="busy()">
          {{ (mode() === 'in' ? 'login.submitIn' : 'login.submitUp') | t }}
        </button>
        <button class="btn btn--ghost btn--block" type="button" (click)="toggle()">
          {{ (mode() === 'in' ? 'login.switchToUp' : 'login.switchToIn') | t }}
        </button>
      </form>

      <button class="btn btn--ghost lang" type="button" (click)="switchLang()">
        <app-icon name="globe" [size]="18" /> {{ i18n.lang() === 'ar' ? 'English' : 'العربية' }}
      </button>
    </main>
  `,
  styles: `
    .login { max-width: 420px; margin: 0 auto; padding: 32px 16px; display: flex; flex-direction: column; gap: 20px; }
    .brand { text-align: center; }
    .brand h1 { margin: 8px 0 0; font-size: 30px; }
    .brand p { margin: 4px 0 0; }
    .brand__mark { display: inline-grid; place-items: center; width: 64px; height: 64px; border-radius: 20px;
      background: var(--primary); color: var(--primary-ink); }
    h2 { margin: 0; font-size: 20px; }
    .lang { align-self: center; }
  `,
})
export class LoginPage {
  private api = inject(Api);
  private auth = inject(Auth);
  private router = inject(Router);
  protected i18n = inject(I18n);

  protected mode = signal<'in' | 'up'>('in');
  protected busy = signal(false);
  protected error = signal('');
  protected name = '';
  protected phone = '';
  protected pin = '';

  protected toggle() {
    this.mode.update((m) => (m === 'in' ? 'up' : 'in'));
    this.error.set('');
  }

  protected switchLang() {
    this.i18n.lang.update((l) => (l === 'ar' ? 'en' : 'ar'));
  }

  protected async submit() {
    this.busy.set(true);
    this.error.set('');
    try {
      const session =
        this.mode() === 'in'
          ? await this.api.login({ phone: this.phone, pin: this.pin })
          : await this.api.register({ name: this.name, phone: this.phone, pin: this.pin });
      this.auth.start(session);
      await this.router.navigateByUrl('/');
    } catch (err) {
      this.error.set(this.i18n.error(apiErrorCode(err)));
    } finally {
      this.busy.set(false);
    }
  }
}
