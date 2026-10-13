import { Injectable, signal } from '@angular/core';
import type { FirebaseApp, FirebaseOptions } from 'firebase/app';
import { firebaseConfig } from './firebase-config';

/**
 * Connects the app to its Firebase project. Loaded lazily so Firebase never delays the
 * courier's first screen, and never breaks the app when it is unavailable (local dev,
 * offline). Analytics starts only when the project has a Measurement ID.
 */
@Injectable({ providedIn: 'root' })
export class Firebase {
  readonly app = signal<FirebaseApp | null>(null);
  private started?: Promise<FirebaseApp | null>;

  init(): Promise<FirebaseApp | null> {
    this.started ??= this.start();
    return this.started;
  }

  private async start(): Promise<FirebaseApp | null> {
    try {
      const options = firebaseConfig ?? (await this.hostingConfig());
      if (!options?.apiKey || !options.appId) return null;
      const { initializeApp } = await import('firebase/app');
      const app = initializeApp(options);
      this.app.set(app);
      if (options.measurementId) {
        const { getAnalytics, isSupported } = await import('firebase/analytics');
        if (await isSupported()) getAnalytics(app);
      }
      return app;
    } catch (err) {
      console.warn('Firebase not initialised', err);
      return null;
    }
  }

  /** Firebase Hosting serves the project's web app config here. */
  private async hostingConfig(): Promise<FirebaseOptions | null> {
    const res = await fetch('/__/firebase/init.json');
    if (!res.ok || !res.headers.get('content-type')?.includes('json')) return null;
    return (await res.json()) as FirebaseOptions;
  }
}
