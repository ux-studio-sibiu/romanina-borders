import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LessonPage } from '../lesson-page/lesson-page';

@Component({
  selector: 'app-lesson-time-scale',
  imports: [LessonPage, RouterLink],
  templateUrl: './lesson-time-scale.html'
})
export class LessonTimeScale {}
