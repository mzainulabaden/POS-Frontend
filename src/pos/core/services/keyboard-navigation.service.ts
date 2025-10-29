import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

export interface NavigationState {
  currentSection: 'search' | 'products' | 'cart' | 'header';
  selectedProductIndex: number;
  selectedCartItemIndex: number;
  selectedHeaderIndex?: number;
  isSearchFocused: boolean;
  isBarcodeFocused: boolean;
  lastAction?: string;
}

@Injectable({
  providedIn: 'root'
})
export class KeyboardNavigationService {
  private navigationState = new BehaviorSubject<NavigationState>({
    currentSection: 'search',
    selectedProductIndex: -1,
    selectedCartItemIndex: -1,
    selectedHeaderIndex: -1,
    isSearchFocused: false,
    isBarcodeFocused: false,
    lastAction: undefined
  });

  public navigationState$ = this.navigationState.asObservable();
  public keyPress$ = new Subject<KeyboardEvent>();
  private isEnabled = true;

  constructor() {
    this.setupGlobalKeyListeners();
  }

  private setupGlobalKeyListeners() {
    document.addEventListener('keydown', (event) => {
      if (this.isEnabled) {
        this.handleKeyPress(event);
      }
    });
  }

  private handleKeyPress(event: KeyboardEvent) {
    // Prevent default behavior for our custom shortcuts, but allow text editing keys inside inputs
    const target = event.target as HTMLElement | null;
    const isInput = !!target && (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      (target as any).isContentEditable === true
    );
    const key = event.key;
    // Allow Enter, Backspace, Delete in input fields - let them work normally
    const allowInInput = isInput && (key === 'Backspace' || key === 'Delete' || key === 'Enter');

    if (this.isCustomShortcut(event) && !allowInInput) {
      event.preventDefault();
      event.stopPropagation();
    }

    this.keyPress$.next(event);
  }

  private isCustomShortcut(event: KeyboardEvent): boolean {
    const shortcuts = [
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      'Enter', 'Escape', 'Tab', 'Delete', 'Backspace',
      'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10'
    ];
    
    return shortcuts.includes(event.key) || 
           (event.ctrlKey && ['h', 's', 'p', 'f'].includes(event.key.toLowerCase()));
  }

  enable() {
    this.isEnabled = true;
  }

  disable() {
    this.isEnabled = false;
  }

  updateNavigationState(updates: Partial<NavigationState>) {
    const currentState = this.navigationState.value;
    const newState = { ...currentState, ...updates };
    this.navigationState.next(newState);
  }

  getCurrentState(): NavigationState {
    return this.navigationState.value;
  }

  // Navigation methods
  navigateToSection(section: NavigationState['currentSection'], clearFocus = true) {
    const updates: Partial<NavigationState> = { 
      currentSection: section,
      lastAction: `navigate_to_${section}`
    };
    
    if (clearFocus) {
      updates.isSearchFocused = false;
      updates.isBarcodeFocused = false;
    }
    
    this.updateNavigationState(updates);
  }

  selectProduct(index: number, totalProducts: number) {
    if (index >= 0 && index < totalProducts) {
      this.updateNavigationState({ 
        selectedProductIndex: index,
        currentSection: 'products',
        lastAction: 'select_product'
      });
    }
  }

  selectCartItem(index: number, totalItems: number) {
    if (index >= 0 && index < totalItems) {
      this.updateNavigationState({ 
        selectedCartItemIndex: index,
        currentSection: 'cart',
        lastAction: 'select_cart_item'
      });
    }
  }

  focusSearch() {
    this.updateNavigationState({ 
      isSearchFocused: true,
      isBarcodeFocused: false,
      currentSection: 'search',
      lastAction: 'focus_search'
    });
  }

  focusBarcode() {
    this.updateNavigationState({ 
      isBarcodeFocused: true,
      isSearchFocused: false,
      currentSection: 'search',
      lastAction: 'focus_barcode'
    });
  }

  clearFocus() {
    this.updateNavigationState({ 
      isSearchFocused: false,
      isBarcodeFocused: false,
      lastAction: 'clear_focus'
    });
  }

  resetNavigation() {
    this.updateNavigationState({
      currentSection: 'search',
      selectedProductIndex: -1,
      selectedCartItemIndex: -1,
      isSearchFocused: false,
      isBarcodeFocused: false,
      lastAction: 'reset'
    });
  }

  // Debug method
  logState(action: string) {
    console.log(`[KeyboardNav] ${action}:`, this.getCurrentState());
  }
}
