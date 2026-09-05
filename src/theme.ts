import {fitText} from '@remotion/layout-utils';
import {loadFont as loadAnton} from '@remotion/google-fonts/Anton';
import {loadFont as loadBebas} from '@remotion/google-fonts/BebasNeue';
import {loadFont as loadInter} from '@remotion/google-fonts/Inter';

/**
 * Fonts.
 * Anton  -> the heavy condensed "impact" face used for kill streaks / titles.
 * Bebas  -> tall condensed face used for counters + small callouts.
 * Inter  -> UI/meta text (event lines, channel tag).
 */
const anton = loadAnton('normal', {weights: ['400'], subsets: ['latin']});
const bebas = loadBebas('normal', {weights: ['400'], subsets: ['latin']});
const inter = loadInter('normal', {weights: ['500', '700'], subsets: ['latin']});

export const FONT_IMPACT = `${anton.fontFamily}, "Anton", "Impact", "Haettenschweiler", sans-serif`;
export const FONT_CONDENSED = `${bebas.fontFamily}, "Bebas Neue", "Oswald", "Impact", sans-serif`;
export const FONT_UI = `${inter.fontFamily}, "Inter", system-ui, sans-serif`;

/** Shared palette. */
export const COLORS = {
	white: '#FFFFFF',
	ice: '#E8F4FF',
	gold: '#FFC531',
	orange: '#FF7A18',
	deepOrange: '#FF4D0D',
	red: '#FF3B30',
	yellow: '#FFE24B',
	blue: '#3FA9FF',
	teamBlue: '#2E9BFF',
	teamRed: '#FF4655',
	ink: '#07080C',
	inkSoft: 'rgba(5, 7, 12, 0.72)',
} as const;

/** ms -> frames helper (rounds so 150ms @30fps = 5 frames, not 4.5). */
export const ms = (milliseconds: number, fps: number) =>
	(milliseconds / 1000) * fps;

/**
 * Thick dark stroke + white fill, the MLBB / Impact-meme look.
 * `paintOrder: stroke` keeps the stroke *behind* the fill so letterforms
 * stay crisp instead of getting eaten from the inside.
 */
export const strokeText = (
	strokeWidth: number,
	strokeColor = '#08090D',
): React.CSSProperties => ({
	WebkitTextStroke: `${strokeWidth}px ${strokeColor}`,
	paintOrder: 'stroke fill',
	// @ts-expect-error - non-prefixed variant, Chrome understands it
	textStroke: `${strokeWidth}px ${strokeColor}`,
});

/** Layered drop shadow that reads over busy gameplay. */
export const hardShadow = (size = 6, color = 'rgba(0,0,0,0.85)') =>
	[
		`0 ${size * 0.35}px 0 ${color}`,
		`0 ${size}px ${size * 2}px rgba(0,0,0,0.7)`,
	].join(', ');

/**
 * Exact width fitting.
 * `fitText` measures the real glyphs in the DOM, and @remotion/google-fonts
 * holds `delayRender` until the webfont is ready, so the measurement is stable
 * in both the Studio and a distributed render.
 *
 * Falls back to an advance-width estimate if measuring is unavailable
 * (e.g. running the component outside a browser in a unit test).
 */
export const fitFontSize = ({
	text,
	targetWidth,
	fontFamily = FONT_IMPACT,
	letterSpacing = '0em',
	max = 1000,
	min = 12,
	avgAdvance = 0.38,
}: {
	text: string;
	targetWidth: number;
	fontFamily?: string;
	letterSpacing?: string;
	max?: number;
	min?: number;
	avgAdvance?: number;
}) => {
	const clamp = (n: number) => Math.max(min, Math.min(max, n));
	try {
		const {fontSize} = fitText({
			text,
			withinWidth: targetWidth,
			fontFamily,
			letterSpacing,
			textTransform: 'uppercase',
			fontWeight: 400,
		});
		if (Number.isFinite(fontSize) && fontSize > 0) return clamp(fontSize);
	} catch {
		// fall through to the estimate
	}
	const emWidth = text.split('').reduce((acc, c) => {
		if (c === ' ') return acc + 0.24;
		if (/[IJl1.,!:']/.test(c)) return acc + avgAdvance * 0.6;
		if (/[MW]/.test(c)) return acc + avgAdvance * 1.25;
		return acc + avgAdvance;
	}, 0);
	return clamp(targetWidth / Math.max(emWidth, 0.001));
};
