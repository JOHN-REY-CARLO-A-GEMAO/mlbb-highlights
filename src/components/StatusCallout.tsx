import React from 'react';
import {
	AbsoluteFill,
	interpolate,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';
import {COLORS, FONT_CONDENSED, hardShadow, ms} from '../theme';

export type CalloutCorner =
	| 'upper-left'
	| 'lower-left'
	| 'upper-right'
	| 'lower-right';

export type CalloutTone = 'white' | 'yellow' | 'red' | 'blue';

const TONES: Record<CalloutTone, {text: string; accent: string}> = {
	white: {text: COLORS.white, accent: 'rgba(255,255,255,0.9)'},
	yellow: {text: COLORS.yellow, accent: COLORS.gold},
	red: {text: '#FF6B60', accent: COLORS.red},
	blue: {text: '#8FD4FF', accent: COLORS.blue},
};

const ENTER_MS = 200;
const EXIT_MS = 220;
export const DEFAULT_CALLOUT_HOLD_MS = 2600; // 2-4s per brief

export const statusCalloutDurationInFrames = (
	fps: number,
	holdMs: number = DEFAULT_CALLOUT_HOLD_MS,
) => Math.round(ms(ENTER_MS + holdMs + EXIT_MS, fps));

export type StatusCalloutProps = {
	/** Short mechanic phrase: "CC IMMUNE", "STUNNED", "ABSORB". */
	label: string;
	corner?: CalloutCorner;
	tone?: CalloutTone;
	/** Time at full opacity, ms. 2000-4000 recommended. */
	holdMs?: number;
	/** Dark translucent pill behind the text (helps over bright gameplay). */
	chip?: boolean;
	/** Optional tiny second line, e.g. "PURIFY ACTIVE". */
	sublabel?: string;
	/** Distance from the frame edges, as a fraction of width. */
	margin?: number;
	/** Scale multiplier if you need it smaller/bigger. */
	scale?: number;
};

export const StatusCallout: React.FC<StatusCalloutProps> = ({
	label,
	corner = 'upper-left',
	tone = 'white',
	holdMs = DEFAULT_CALLOUT_HOLD_MS,
	chip = true,
	sublabel,
	margin = 0.055,
	scale = 1,
}) => {
	const frame = useCurrentFrame();
	const {fps, width} = useVideoConfig();

	const enterF = ms(ENTER_MS, fps);
	const exitF = ms(EXIT_MS, fps);
	const exitStart = enterF + ms(holdMs, fps);

	const isLeft = corner.endsWith('left');
	const isTop = corner.startsWith('upper');

	/* quick fade-in with a slide off the nearest edge */
	const enter = interpolate(frame, [0, enterF], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
		easing: (t) => 1 - Math.pow(1 - t, 3),
	});
	const exit = interpolate(frame, [exitStart, exitStart + exitF], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	const slide = (1 - enter) * width * 0.06 * (isLeft ? -1 : 1);
	const opacity = enter * (1 - exit);

	const t = TONES[tone];
	const fontSize = width * 0.042 * scale;
	const pad = fontSize * 0.42;

	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			<div
				style={{
					position: 'absolute',
					top: isTop ? width * margin : undefined,
					bottom: isTop ? undefined : width * margin,
					left: isLeft ? width * margin : undefined,
					right: isLeft ? undefined : width * margin,
					display: 'flex',
					alignItems: 'stretch',
					gap: pad * 0.7,
					opacity,
					transform: `translateX(${slide}px)`,
					flexDirection: isLeft ? 'row' : 'row-reverse',
					willChange: 'transform, opacity',
				}}
			>
				{/* accent bar on the edge side */}
				<div
					style={{
						width: Math.max(4, fontSize * 0.09),
						background: t.accent,
						boxShadow: `0 0 ${fontSize * 0.5}px ${t.accent}`,
						borderRadius: 2,
						transform: `scaleY(${interpolate(enter, [0, 1], [0.2, 1])})`,
					}}
				/>

				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						alignItems: isLeft ? 'flex-start' : 'flex-end',
						justifyContent: 'center',
						padding: chip ? `${pad * 0.55}px ${pad}px` : 0,
						background: chip
							? 'linear-gradient(100deg, rgba(6,8,13,0.82) 0%, rgba(6,8,13,0.55) 100%)'
							: 'transparent',
						backdropFilter: chip ? 'blur(6px)' : undefined,
						border: chip ? '1px solid rgba(255,255,255,0.14)' : undefined,
						borderRadius: chip ? fontSize * 0.14 : 0,
					}}
				>
					<div
						style={{
							fontFamily: FONT_CONDENSED,
							fontSize,
							lineHeight: 1.02,
							letterSpacing: '0.06em',
							color: t.text,
							textTransform: 'uppercase',
							textShadow: `${hardShadow(fontSize * 0.08)}, 0 0 ${
								fontSize * 0.6
							}px ${t.accent}`,
							whiteSpace: 'nowrap',
						}}
					>
						{label.toUpperCase()}
					</div>

					{sublabel ? (
						<div
							style={{
								fontFamily: FONT_CONDENSED,
								fontSize: fontSize * 0.45,
								letterSpacing: '0.18em',
								color: 'rgba(255,255,255,0.62)',
								textTransform: 'uppercase',
								marginTop: fontSize * 0.06,
								whiteSpace: 'nowrap',
							}}
						>
							{sublabel}
						</div>
					) : null}
				</div>
			</div>
		</AbsoluteFill>
	);
};
