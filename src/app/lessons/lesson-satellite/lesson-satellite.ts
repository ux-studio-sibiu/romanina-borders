import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LessonPage } from '../lesson-page/lesson-page';

@Component({
  selector: 'app-lesson-satellite',
  imports: [LessonPage, RouterLink],
  templateUrl: './lesson-satellite.html'
})
export class LessonSatellite {}
