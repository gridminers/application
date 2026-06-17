import { Component, computed, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { ProjectData } from '../../../core/services/project-data';
import { FeatureCard } from '../feature-card/feature-card';

interface Feature {
  icon: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-landing',
  imports: [RouterLink, DecimalPipe, FeatureCard],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
})
export class Landing {
  private readonly data = inject(ProjectData);

  readonly projectCount = this.data.projectCount;
  readonly totalBudget = this.data.totalBudget;
  readonly sparteCount = computed(
    () => new Set(this.data.projects().map((p) => p.sparte)).size,
  );

  readonly features: readonly Feature[] = [
    {
      icon: '📄',
      title: 'Aus Dokumenten extrahiert',
      description:
        'Projektaufträge werden automatisiert aus PDFs ausgelesen – Titel, Sparte, Kosten und Zahlungspläne.',
    },
    {
      icon: '📊',
      title: 'Kosten transparent',
      description:
        'Material-, Fremd- und Eigenleistungen sowie Zuschläge aufgeschlüsselt und vergleichbar gemacht.',
    },
    {
      icon: '🗓️',
      title: 'Zahlungspläne über Jahre',
      description:
        'Wann fließt wie viel? Zahlungspläne werden je Jahr aggregiert und visualisiert.',
    },
    {
      icon: '⚡',
      title: 'Alle Sparten im Blick',
      description:
        'Strom, Gas, Wasser, Infotechnik und Fernwärme – das gesamte Netz Braunschweigs auf einen Blick.',
    },
  ];
}
