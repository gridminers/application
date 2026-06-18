import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { Project } from '../models/project';
import { toProject } from './application.mapper';
import { ApplicationDto } from './dto/application.dto';
import { environment } from '../../../environments/environment';

/**
 * Read-only client for the Django REST API. Fetches the application list and
 * maps it to the UI's `Project` domain model. Error handling / fallback is the
 * caller's responsibility (see `ProjectData`).
 */
@Service()
export class ApplicationsApi {
  private readonly http = inject(HttpClient);

  /** Load all applications as mapped `Project`s. */
  loadProjects(): Observable<Project[]> {
    return this.http
      .get<ApplicationDto[]>(`${environment.apiBaseUrl}/applications/`)
      .pipe(map((dtos) => dtos.map(toProject)));
  }
}
