import { Component, computed, effect, inject, isDevMode, signal, untracked, viewChild } from '@angular/core';
import { arrowDrawnYear, arrowsAtYear, arrowSpan, type MapArrow, type MapPlace, needsWide, RegionMap } from '../region-map/region-map';
import { TimeScale } from '../time-scale/time-scale';
import { StepScrollbar } from '../step-scrollbar/step-scrollbar';
import { SlideSwap } from '../slide-swap/slide-swap';
import { MomentCaption } from '../moment-caption/moment-caption';
import { PlaySlider } from '../play-slider/play-slider';
import { PictureFade } from '../picture-fade/picture-fade';
import { IntroCover } from '../intro-cover/intro-cover';
import { mediaSignal, storedFlag } from '../signals';
import { momentShapes } from './moment-shapes';
import { STEPS, WheelSteps } from './moment-steps';
import { Geography } from '../../data/geography';
import { type Moment, MOMENTS } from '../../data/moments';
import { missingIds } from '../../data/palette';
import { NAME_PLACES, NAME_TEXTS } from '../../data/name-places';
import { Shapes } from '../../data/shapes';
import { SPOTS } from '../../data/spots';

// The scrollbar down the far right edge, in px (as in moments-map.scss)
const SCROLLBAR_WIDTH = 14;
// The share of the arrows' play slider kept at its left for the overview, before their first year
const ARROW_LEAD = 0.15;

// The map at a moment of the story, full bleed, with the moment's caption floating over its bottom left, a time scale
// down its right and a scrollbar at the far right; the scroll wheel and the scrollbar step through the moments
// (moment-steps.ts), and the caption slides out and in the way the story moves. A moment with peoples passing through
// has a play slider at the bottom right that draws their arrows on. What the map draws for each moment:
// moment-shapes.ts. Fills its parent (which must be positioned and sized).
@Component({
  selector: 'app-moments-map',
  imports: [RegionMap, TimeScale, StepScrollbar, SlideSwap, MomentCaption, PlaySlider, PictureFade, IntroCover],
  templateUrl: './moments-map.html',
  styleUrl: './moments-map.scss'
})
export class MomentsMap {
  protected readonly geography = inject(Geography);
  private readonly shapes = inject(Shapes);
  // The timeline: every moment of the story and the shape it shows
  protected readonly timeline = MOMENTS;
  // The steps the scroll wheel and the scrollbar go through: the moments, and within one with several migrations each
  // migration on its own
  protected readonly steps = STEPS;
  protected readonly stepLabels = STEPS.map(s => s.label);
  // The chosen moment: the intro on every load (a refresh starts the story again)
  protected readonly momentId = signal(MOMENTS[0].id);
  private readonly index = computed(() => MOMENTS.findIndex(m => m.id === this.momentId()));
  // Which way the story last moved: 1 forward in time, -1 back (the caption slides out and in that way)
  protected readonly direction = signal<1 | -1>(1);
  protected readonly moment = computed(() => MOMENTS.find(m => m.id === this.momentId())!);
  protected readonly regionMap = viewChild(RegionMap);

  // What the map draws for the moment (moment-shapes.ts), and the parts of it the template needs on their own
  private readonly drawn = computed(() => momentShapes(this.moment(), {
    states: this.shapes.states(), blocks: this.shapes.blocks(), lands: this.shapes.lands(), empires: this.shapes.empires(), zones: this.shapes.zones()
  }, this.geography.base()?.land.features ?? []));
  protected readonly territories = computed(() => this.drawn().territories);
  protected readonly state = computed(() => this.drawn().state);
  protected readonly zone = computed(() => this.drawn().zone);
  protected readonly neighbours = computed(() => this.drawn().neighbours);
  protected readonly countries = computed(() => this.drawn().countries);
  // The moment's own view, its places and its curiosities (data/spots.ts)
  protected readonly view = computed(() => this.moment().view ?? null);
  protected readonly places = computed<MapPlace[]>(() => (this.moment().places ?? []).map(p => ({ id: `${this.moment().id}-${p.name}`, ...p })));
  protected readonly spots = computed(() => (this.moment().spots ?? []).map(id => SPOTS[id]).filter(Boolean));
  // The names placed and written by hand (data/name-places.ts)
  protected readonly namePlaces = NAME_PLACES;
  protected readonly nameTexts = NAME_TEXTS;

  // The moment's arrows (the peoples passing through), with ids for the map's loops
  protected readonly arrows = computed<MapArrow[]>(() => (this.moment().arrows ?? []).map(a => ({ id: `${this.moment().id}-${a.name}`, ...a })));
  // Their play slider: the years they play over (null: no dated arrows, no slider), with a stretch before them at its
  // left (ARROW_LEAD of the track) where it rests at first, every arrow drawn in full: the year it is at, whether it
  // plays, a mark for each people where its arrow is fully drawn, and above it the people named at that year (as the
  // map's caption names it). A click on a mark goes to its year and shows that migration on its own (arrowOnly, by
  // arrow index) until the slider moves again.
  protected readonly arrowYears = computed(() => arrowSpan(this.arrows()));
  protected readonly arrowStart = computed(() => { const s = this.arrowYears(); return s ? s[0] - (s[1] - s[0]) * ARROW_LEAD / (1 - ARROW_LEAD) : 0; });
  // Before the first year, in the stretch at the left: the overview, every arrow in full
  protected readonly arrowOverview = computed(() => !!this.arrowYears() && this.arrowYear() < this.arrowYears()![0]);
  protected readonly arrowYear = signal(0);
  protected readonly arrowsPlaying = signal(false);
  protected readonly arrowOnly = signal<number | null>(null);
  private readonly dated = computed(() => this.arrows().map((a, i) => ({ a, i })).filter(({ a }) => a.years));
  protected readonly arrowMarks = computed(() => this.dated().map(({ a }) => ({ at: arrowDrawnYear(a), name: a.name })));
  protected readonly activeMark = computed(() => { const only = this.arrowOnly(); return only === null ? null : this.dated().findIndex(d => d.i === only); });
  // The migration named at the slider's year, by arrow index (-1: none; none in the overview either)
  private readonly arrowNamed = computed(() => this.arrowOverview() ? -1 : arrowsAtYear(this.arrows(), this.arrowYear(), this.arrowOnly()).caption);
  protected readonly arrowTitle = computed(() => {
    // The overview names the span of them all
    if (this.arrowOverview()) {
      const years = this.arrows().flatMap(a => a.years ?? []);
      return `${Math.min(...years)}–${Math.max(...years)}: all the peoples`;
    }
    const a = this.arrows()[this.arrowNamed()];
    return a ? (a.when ? `${a.when}: ` : '') + a.name : '';
  });
  // Its picture, at the map's top left, fading from one migration's to the next (none in the overview)
  protected readonly arrowPicture = computed(() => this.moment().arrows?.[this.arrowNamed()]?.picture ?? null);
  // The slider moved (dragged, played or a mark picked): the migration shown on its own goes back among the others; a
  // mark picked sets it again just after (pickArrow)
  protected setArrowYear(year: number) { this.arrowYear.set(year); this.arrowOnly.set(null); }
  protected pickArrow(mark: number) { this.arrowOnly.set(this.dated()[mark]?.i ?? null); }
  // One migration on its own, fully drawn, the slider paused at it (as a click on its mark)
  private isolate(arrow: number) {
    this.arrowsPlaying.set(false);
    this.arrowYear.set(arrowDrawnYear(this.arrows()[arrow]));
    this.arrowOnly.set(arrow);
  }

  // The step shown: the moment's own, or, in a moment with migration steps, the migration on its own, else the one named
  // at the slider's year, else (the overview) the first
  protected readonly stepIndex = computed(() => {
    const id = this.momentId(), first = STEPS.findIndex(s => s.moment.id === id);
    if (STEPS[first]?.arrow === null) return first;
    const named = this.arrowOnly() ?? (this.arrowNamed() >= 0 ? this.arrowNamed() : null);
    const at = STEPS.findIndex(s => s.moment.id === id && s.arrow === named);
    return at >= 0 ? at : first;
  });
  // One step later (1) or earlier (-1), for the wheel and the scrollbar: from a moment's overview, later is its first
  // migration (the overview shows on the scrollbar at that step, so the step after it would skip one)
  private stepBy(way: 1 | -1) {
    const inOverview = this.arrowOverview() && STEPS[this.stepIndex()]?.arrow !== null;
    this.goToStep(this.stepIndex() + (way > 0 ? (inOverview ? 0 : 1) : -1));
  }
  // The scrollbar picked a step: the next or the one before, as the wheel steps; any other (dragged to), that one
  protected fromScrollbar(i: number) {
    const d = i - this.stepIndex();
    if (d === 1 || d === -1) this.stepBy(d);
    else this.goToStep(i);
  }
  // To a step: its moment (its migration shown on its own once the moment is in), or, within the moment, the migration
  protected goToStep(i: number, fade = true) {
    const step = STEPS[i];
    if (!step) return;
    if (step.moment.id !== this.momentId()) this.choose(step.moment, fade, step.arrow);
    else if (step.arrow !== null) this.isolate(step.arrow);
  }
  // The scroll wheel: a step per gesture (moment-steps.ts); ctrl + wheel is the browser's zoom
  private readonly wheel = new WheelSteps();
  protected scroll(event: WheelEvent) {
    if (event.ctrlKey) return;
    event.preventDefault();
    const way = this.wheel.step(event);
    if (way) this.stepBy(way);
  }

  // The time scale open (or folded to the years), the caption open (or folded to its title), the moments' people shown,
  // each kept across reloads
  protected readonly scaleOpen = storedFlag('romanianBorders.timeScaleOpen');
  protected readonly captionOpen = storedFlag('romanianBorders.captionOpen');
  protected readonly charactersShown = storedFlag('romanianBorders.charactersShown');
  // How much of the map's right edge the scrollbar and the time scale cover (their widths and breakpoint:
  // moments-map.scss), kept clear of the spots' cards and the intro's cover
  private readonly scaleShown = mediaSignal('(width >= 760px)');
  protected readonly coveredRight = computed(() => SCROLLBAR_WIDTH + (this.scaleShown() ? (this.scaleOpen() ? 300 : 100) : 0));

  constructor() {
    // Arriving at a moment with dated arrows, they wait in the overview, all drawn in full, paused: play starts them from
    // the first year. Arriving on a migration's step (the wheel or the scrollbar), that migration on its own instead.
    effect(() => {
      const span = this.arrowYears();
      untracked(() => {
        const arrow = this.arrivingArrow;
        this.arrivingArrow = null;
        this.arrowsPlaying.set(false);
        this.arrowOnly.set(null);
        if (!span) return;
        if (arrow !== null && this.arrows()[arrow]) this.isolate(arrow);
        else this.arrowYear.set(this.arrowStart());
      });
    });

    // In development, every id the moments and the colours use must be in shapes.topo.json (data/palette.ts): a typo would
    // quietly show nothing. Checked once the file has loaded.
    if (isDevMode()) effect(() => {
      if (!this.shapes.states().length) return;
      const missing = missingIds(MOMENTS, { states: this.shapes.states(), blocks: this.shapes.blocks(), empires: this.shapes.empires(), zones: this.shapes.zones() });
      if (missing.length) console.warn(`moments-map: ids not in shapes.topo.json or without a colour:\n  ${missing.join('\n  ')}`);
    });
  }

  // A moment with another view zooms; the map keeps a copy of the old drawings first, to fade them out. With the same
  // view, only when stepped to with the scroll wheel (`fade`): what changed fades out, then in; a click shows the new
  // moment at once. A zoom out past the area over the satellite picture waits until the wide picture is ready: started
  // earlier, its edges would show blank, then the picture pop in, mid-zoom.
  // `arrow`: a migration to show on its own once the moment is in (a migration's step), by arrow index
  private chosen = 0;
  private arrivingArrow: number | null = null;
  protected async choose(moment: Moment, fade = false, arrow: number | null = null) {
    const ticket = ++this.chosen;
    this.arrivingArrow = arrow;
    if (needsWide(moment.view) && !moment.plain) {
      await this.regionMap()?.widePicture();
      if (ticket !== this.chosen) return; // another moment was chosen meanwhile
    }
    const zooms = JSON.stringify(moment.view ?? null) !== JSON.stringify(this.view());
    if (moment.id !== this.momentId() && (zooms || fade)) this.regionMap()?.holdDrawings();
    if (moment.id !== this.momentId()) this.direction.set(MOMENTS.indexOf(moment) > this.index() ? 1 : -1);
    this.momentId.set(moment.id);
  }
}
