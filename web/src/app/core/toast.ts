import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: number;
  text: string;
  kind: 'info' | 'error' | 'success';
}

@Injectable({ providedIn: 'root' })
export class Toast {
  readonly messages = signal<ToastMessage[]>([]);
  private next = 1;

  show(text: string, kind: ToastMessage['kind'] = 'info', ms = 3500) {
    const id = this.next++;
    this.messages.update((m) => [...m, { id, text, kind }]);
    setTimeout(() => this.dismiss(id), ms);
  }

  dismiss(id: number) {
    this.messages.update((m) => m.filter((t) => t.id !== id));
  }
}
