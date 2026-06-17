import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  signal,
  viewChild,
} from '@angular/core';

/**
 * Scrollable chart grid that shows a floating "Weitere Diagramme" hint while
 * more charts can still be scrolled into view. Chart cards are projected via
 * <ng-content>; the host element acts as the `.graph-page__scroll` container.
 */
@Component({
  selector: 'app-graph-scroll',
  imports: [],
  templateUrl: './graph-scroll.html',
  host: { class: 'graph-page__scroll' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraphScroll {
  private readonly body = viewChild<ElementRef<HTMLElement>>('body');
  /** True while the chart grid can still be scrolled further down. */
  protected readonly canScrollDown = signal(false);

  constructor() {
    afterNextRender(() => {
      const el = this.body()?.nativeElement;
      if (!el) {
        return;
      }
      this.updateScrollState();
      const observer = new ResizeObserver(() => this.updateScrollState());
      observer.observe(el);
    });
  }

  protected onScroll(): void {
    this.updateScrollState();
  }

  protected scrollDown(): void {
    const el = this.body()?.nativeElement;
    el?.scrollBy({ top: el.clientHeight * 0.8, behavior: 'smooth' });
  }

  private updateScrollState(): void {
    const el = this.body()?.nativeElement;
    if (!el) {
      return;
    }
    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
    this.canScrollDown.set(remaining > 8);
  }
}
