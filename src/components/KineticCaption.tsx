import {measureText} from '@remotion/layout-utils';
import React, {useMemo} from 'react';
import {
	AbsoluteFill,
	interpolate,
	spring,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';
import {COLORS, FONT_IMPACT, hardShadow, strokeText} from '../theme';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type CaptionWord = {
	text: string;
	/** Start time of the spoken word (unit set by `timeUnit`). */
	start: number;
	/** Optional end time. Defaults to next word's start / start + 0.4s. */
	end?: number;
	/** true -> yellow flash. 'red' -> red flash for the biggest reactions. */
	emphasis?: boolean | 'yellow' | 'red';
	/** Force a new caption line to start on this word. */
	lineBreak?: boolean;
};

export type KineticCaptionProps = {
	transcript: CaptionWord[];
	timeUnit?: 'seconds' | 'ms' | 'frames';
	/** Hard cap for one line on screen. Brief says 6-8. */
	maxWordsPerLine?: number;
	/** A pause this long (seconds) between words breaks the line. */
	lineBreakGap?: number;
	/** Distance of the caption baseline from the bottom, as a fraction of height. */
	bottomRatio?: number;
	/** Base text colour. */
	color?: string;
	/** Keep the finished line up this long (seconds) after the last word ends. */
	lineTailSeconds?: number;
	fontSizeRatio?: number;
};

type Line = {
	words: (CaptionWord & {startF: number; endF: number})[];
	startF: number;
	endF: number;
};

/* ------------------------------------------------------------------ */
/* Line grouping                                                       */
/* ------------------------------------------------------------------ */

const buildLines = (
	transcript: CaptionWord[],
	toFrames: (t: number) => number,
	maxWordsPerLine: number,
	gapFrames: number,
	tailFrames: number,
	fps: number,
): Line[] => {
	const normalised = transcript
		.slice()
		.sort((a, b) => a.start - b.start)
		.map((w, i, arr) => {
			const startF = toFrames(w.start);
			const nextStart = arr[i + 1] ? toFrames(arr[i + 1].start) : undefined;
			const explicitEnd = w.end === undefined ? undefined : toFrames(w.end);
			const endF =
				explicitEnd ?? Math.min(nextStart ?? startF + gapFrames, startF + gapFrames);
			return {...w, startF, endF: Math.max(endF, startF + 1)};
		});

	/* 1. cut into phrases at pauses, punctuation and explicit breaks */
	const phrases: Line['words'][] = [];
	let phrase: Line['words'] = [];
	normalised.forEach((w, i) => {
		const prev = normalised[i - 1];
		// Measure the pause from where the previous word actually stopped being
		// spoken (its own `end`, or a ~0.3s default), not from its display end.
		const prevSpokenEnd = prev
			? (prev.end === undefined ? prev.startF + 0.3 * fps : toFrames(prev.end))
			: 0;
		const pause = prev ? w.startF - prevSpokenEnd > gapFrames : false;
		const punctuation = prev ? /[.!?]$/.test(prev.text) : false;
		if (phrase.length && (pause || punctuation || w.lineBreak)) {
			phrases.push(phrase);
			phrase = [];
		}
		phrase.push(w);
	});
	if (phrase.length) phrases.push(phrase);

	/* 2. chunk each phrase into evenly sized lines (10 words, max 7 -> 5 + 5,
	      never 7 + 3, so no orphaned tail line) */
	const chunks: Line['words'][] = [];
	phrases.forEach((p) => {
		const lineCount = Math.ceil(p.length / maxWordsPerLine);
		const per = Math.ceil(p.length / lineCount);
		for (let i = 0; i < p.length; i += per) chunks.push(p.slice(i, i + per));
	});

	const lines: Line[] = chunks.map((words) => ({
		words,
		startF: words[0].startF,
		endF: words[words.length - 1].endF + tailFrames,
	}));

	// Don't let a line outlive the start of the next one.
	return lines.map((l, i) => {
		const next = lines[i + 1];
		return next ? {...l, endF: Math.min(l.endF, next.startF)} : l;
	});
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export const KineticCaption: React.FC<KineticCaptionProps> = ({
	transcript,
	timeUnit = 'seconds',
	maxWordsPerLine = 7,
	lineBreakGap = 0.5,
	bottomRatio = 0.24,
	color = COLORS.white,
	lineTailSeconds = 0.35,
	fontSizeRatio = 0.072,
}) => {
	const frame = useCurrentFrame();
	const {fps, width, height} = useVideoConfig();

	const toFrames = useMemo(() => {
		if (timeUnit === 'frames') return (t: number) => t;
		if (timeUnit === 'ms') return (t: number) => (t / 1000) * fps;
		return (t: number) => t * fps;
	}, [timeUnit, fps]);

	const lines = useMemo(
		() =>
			buildLines(
				transcript,
				toFrames,
				maxWordsPerLine,
				lineBreakGap * fps,
				lineTailSeconds * fps,
				fps,
			),
		[transcript, toFrames, maxWordsPerLine, lineBreakGap, lineTailSeconds, fps],
	);

	// active line = the one whose window contains the playhead
	const activeIndex = lines.findIndex(
		(l) => frame >= l.startF - fps * 0.12 && frame < l.endF,
	);
	if (activeIndex === -1) return null;
	const line = lines[activeIndex];

	const lineFade =
		interpolate(frame, [line.startF - fps * 0.1, line.startF], [0, 1], {
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
		}) *
		interpolate(frame, [line.endF - fps * 0.12, line.endF], [1, 0], {
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
		});

	const baseFontSize = width * fontSizeRatio;
	const available = width * (1 - 2 * 0.05);

	/* shrink the line if it would run past the safe area */
	const lineText = line.words.map((w) => w.text).join(' ');
	let fontSize = baseFontSize;
	try {
		const measured = measureText({
			text: lineText,
			fontFamily: FONT_IMPACT,
			fontSize: baseFontSize,
			letterSpacing: '0.005em',
			textTransform: 'uppercase',
			fontWeight: 400,
		});
		// gaps between words are drawn with flex `gap`, so add them in
		const totalWidth =
			measured.width + baseFontSize * 0.24 * (line.words.length - 1);
		if (totalWidth > available) fontSize = baseFontSize * (available / totalWidth);
	} catch {
		// keep the base size if measuring is unavailable
	}

	const popFrames = Math.max(1, (120 / 1000) * fps); // 120ms word pop

	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			<div
				style={{
					position: 'absolute',
					left: 0,
					right: 0,
					bottom: height * bottomRatio,
					display: 'flex',
					flexWrap: 'nowrap',
					justifyContent: 'center',
					alignItems: 'flex-end',
					gap: fontSize * 0.24,
					padding: `0 ${width * 0.05}px`,
					opacity: lineFade,
				}}
			>
				{line.words.map((w, i) => {
					const spoken = frame >= w.startF;
					if (!spoken) return null;

					const local = frame - w.startF;

					/* scale bounce 120% -> 100% over 120ms */
					const pop = spring({
						frame: local,
						fps,
						config: {damping: 12, mass: 0.34, stiffness: 260},
						durationInFrames: popFrames,
					});
					const scale = interpolate(pop, [0, 1], [1.2, 1]);
					const rise = interpolate(pop, [0, 1], [fontSize * 0.14, 0]);

					const emph = w.emphasis;
					const emphColor =
						emph === 'red' ? COLORS.red : emph ? COLORS.yellow : null;

					/* emphasis flash: hot colour on impact, decays over ~350ms */
					const flash = emphColor
						? interpolate(local, [0, popFrames, fps * 0.42], [1, 0.9, 0.32], {
								extrapolateLeft: 'clamp',
								extrapolateRight: 'clamp',
							})
						: 0;

					const textColor = emphColor ?? color;
					const glowColor = emphColor ?? 'rgba(140,190,255,0.55)';

					/* the already-spoken words dim very slightly so the new one leads */
					const isLatest =
						i ===
						line.words.reduce(
							(acc, ww, idx) => (frame >= ww.startF ? idx : acc),
							0,
						);
					const dim = isLatest ? 1 : 0.88;

					return (
						<span
							key={`${w.text}-${i}`}
							style={{
								display: 'inline-block',
								transform: `translateY(${rise}px) scale(${scale})`,
								transformOrigin: 'center bottom',
								fontFamily: FONT_IMPACT,
								fontSize: emphColor ? fontSize * 1.08 : fontSize,
								lineHeight: 1,
								letterSpacing: '0.005em',
								textTransform: 'uppercase',
								color: textColor,
								opacity: dim,
								...strokeText(Math.max(4, fontSize * 0.075), '#06070B'),
								textShadow: `${hardShadow(fontSize * 0.06)}, 0 0 ${
									fontSize * 0.34 * (0.35 + flash)
								}px ${glowColor}`,
								filter: flash
									? `drop-shadow(0 0 ${fontSize * 0.3 * flash}px ${glowColor})`
									: undefined,
								whiteSpace: 'nowrap',
								willChange: 'transform',
							}}
						>
							{w.text.toUpperCase()}
						</span>
					);
				})}
			</div>
		</AbsoluteFill>
	);
};
