import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MomentsMap } from '../../charts/moments-map/moments-map';
import { LessonPage } from '../lesson-page/lesson-page';

@Component({
  selector: 'app-lesson-shapes',
  imports: [LessonPage, RouterLink, MomentsMap],
  templateUrl: './lesson-shapes.html',
  styleUrl: './lesson-shapes.scss'
})
export class LessonShapes {}
