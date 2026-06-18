import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { theme, toggleTheme } from '../../core/theme/theme';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, NgOptimizedImage],
  templateUrl: './header.html',
  styleUrl: './header.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Header {
  /** Active colour scheme — drives the brand mark and the toggle icon. */
  protected readonly theme = theme;

  /** Flip between the dark and light (BS Netz) schemes. */
  protected toggleTheme(): void {
    toggleTheme();
  }
}
