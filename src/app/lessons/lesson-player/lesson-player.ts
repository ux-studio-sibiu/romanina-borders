import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LessonPage } from '../lesson-page/lesson-page';

@Component({
  selector: 'app-lesson-player',
  imports: [LessonPage, RouterLink],
  templateUrl: './lesson-player.html'
})
export class LessonPlayer {}
