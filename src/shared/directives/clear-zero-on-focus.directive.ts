import { Directive, ElementRef, HostListener } from '@angular/core';

@Directive({
  selector: '[clearZeroOnFocus]'
})
export class ClearZeroOnFocusDirective {
  constructor(private el: ElementRef<HTMLInputElement>) {}

  private isZeroLike(value: string | null | undefined): boolean {
    if (value === null || value === undefined) return false;
    const trimmed = value.trim();
    if (trimmed === '') return false;
    // Consider 0, 0.0, 0.00 etc. as zero-like
    const num = Number(trimmed);
    return !isNaN(num) && num === 0;
  }

  @HostListener('focus')
  onFocus() {
    const input = this.el.nativeElement;
    if (this.isZeroLike(input.value)) {
      input.value = '';
    } else {
      // Select all text for quick overwrite
      try { input.select(); } catch (_) {}
    }
  }

  @HostListener('blur')
  onBlur() {
    const input = this.el.nativeElement;
    if (input.value.trim() === '') {
      input.value = '0';
      // Trigger input event so Angular updates form control if bound
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
}































