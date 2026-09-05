import type {CaptionWord} from '../components/KineticCaption';
import type {MapPoint} from '../components/MinimapRouteTracer';

/**
 * Word-level transcript. Times are seconds relative to the start of the
 * <Sequence> the caption lives in. Whisper / Deepgram word timestamps drop
 * straight into this shape.
 */
export const DEMO_TRANSCRIPT: CaptionWord[] = [
	{text: 'Kairi', start: 0.3},
	{text: 'goes', start: 0.62},
	{text: 'in', start: 0.86},
	{text: 'alone', start: 1.06, emphasis: true},

	{text: 'and', start: 2.0},
	{text: 'he', start: 2.2},
	{text: 'is', start: 2.4},
	{text: 'not', start: 2.62},
	{text: 'stopping', start: 2.86, emphasis: true},

	{text: 'two', start: 4.1},
	{text: 'down', start: 4.4, emphasis: true},
	{text: 'sheesh', start: 4.9, emphasis: 'red'},

	{text: 'triple', start: 6.4},
	{text: 'kill', start: 6.75, emphasis: true},
	{text: 'in', start: 7.1},
	{text: 'four', start: 7.3},
	{text: 'seconds', start: 7.6},

	{text: 'maniac', start: 9.2, emphasis: 'red'},
	{text: 'are', start: 9.9},
	{text: 'you', start: 10.05},
	{text: 'kidding', start: 10.3, emphasis: true},
	{text: 'me', start: 10.7},

	{text: 'the', start: 11.6},
	{text: 'whole', start: 11.85},
	{text: 'team', start: 12.15},
	{text: 'wiped', start: 12.5, emphasis: 'red'},
	{text: 'out', start: 12.85, emphasis: 'red'},
];

/**
 * Movement path in normalised minimap coordinates.
 * 0,0 = top-left of the minimap crop, 1,1 = bottom-right.
 */
export const DEMO_ROUTE: MapPoint[] = [
	{x: 0.14, y: 0.82},
	{x: 0.24, y: 0.7},
	{x: 0.3, y: 0.55},
	{x: 0.42, y: 0.48},
	{x: 0.5, y: 0.56},
	{x: 0.62, y: 0.5},
	{x: 0.68, y: 0.36},
	{x: 0.6, y: 0.26},
	{x: 0.7, y: 0.18},
];
