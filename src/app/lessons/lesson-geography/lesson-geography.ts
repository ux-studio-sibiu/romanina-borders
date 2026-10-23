import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LessonPage } from '../lesson-page/lesson-page';

@Component({
  selector: 'app-lesson-geography',
  imports: [LessonPage, RouterLink],
  templateUrl: './lesson-geography.html'
})
export class LessonGeography {}
