import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LessonPage } from '../lesson-page/lesson-page';

@Component({
  selector: 'app-lesson-trace',
  imports: [LessonPage, RouterLink],
  templateUrl: './lesson-trace.html'
})
export class LessonTrace {}
