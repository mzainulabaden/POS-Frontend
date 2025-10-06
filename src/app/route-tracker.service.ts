import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class RouteTrackerService {
  private activeRouteSubject = new BehaviorSubject<string>(''); // Default to empty string
  activeRoute$ = this.activeRouteSubject.asObservable();

  setActiveRoute(route: string) {
    if (this.activeRouteSubject.value !== route) {
      this.activeRouteSubject.next(route); // Only update if different
    }
  }

  getActiveRoute(): string {
    return this.activeRouteSubject.value;
  }
}
