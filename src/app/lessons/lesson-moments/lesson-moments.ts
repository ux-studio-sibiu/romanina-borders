import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MOMENTS, yearsAgo } from '../../data/moments';
import { LessonPage } from '../lesson-page/lesson-page';

@Component({
  selector: 'app-lesson-moments',
  imports: [LessonPage, RouterLink],
  templateUrl: './lesson-moments.html',
  styleUrl: './lesson-moments.scss'
})
export class LessonMoments {
  protected readonly moments = MOMENTS;
  protected readonly yearsAgo = yearsAgo;
}
