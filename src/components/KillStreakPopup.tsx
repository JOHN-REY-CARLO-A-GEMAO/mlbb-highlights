import React from 'react';
import {
	AbsoluteFill,
	Audio,
	interpolate,
	spring,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';
import {
	COLORS,
	FONT_IMPACT,
	fitFontSize,
	ms,
	strokeText,
} from '../theme';

/* ------------------------------------------------------------------ */
/* Tiers                                                               */
/* ------------------------------------------------------------------ */

export type KillTier =
	| 'FIRST_BLOOD'
	| 'DOUBLE'
	| 'TRIPLE'
	| 'MANIAC'
	| 'SAVAGE';

type TierStyle = {
	label: string;
	/** Fill can be a flat color or a gradient (applied via background-clip). */
	fill: string;
	gradient?: [string, string, string];
	glow: string;
	/** Glow multiplier - gold tiers punch harder. */
	glowStrength: number;
	strokeColor: string;
	shakeAmount: number;
};

export const KILL_TIERS: Record<KillTier, TierStyle> = {
	FIRST_BLOOD: {
		label: 'FIRST BLOOD',
		fill: COLORS.white,
		glow: 'rgba(255,90,90,0.75)',
		glowStrength: 0.8,
		strokeColor: '#0A0B10',
		shakeAmount: 3,
	},
	DOUBLE: {
		label: 'DOUBLE KILL',
		fill: COLORS.white,
		glow: 'rgba(200,228,255,0.75)',
		glowStrength: 0.75,
		strokeColor: '#0A0B10',
		shakeAmount: 3,
	},
	TRIPLE: {
		label: 'TRIPLE KILL',
		fill: COLORS.white,
		glow: 'rgba(215,235,255,0.9)',
		glowStrength: 1,
		strokeColor: '#0A0B10',
		shakeAmount: 4,
	},
	MANIAC: {
		label: 'MANIAC',
		fill: COLORS.gold,
		gradient: ['#FFE9A8', '#FFC531', '#FF8A17'],
		glow: 'rgba(255,168,32,0.95)',
		glowStrength: 1.7,
		strokeColor: '#160A02',
		shakeAmount: 7,
	},
	SAVAGE: {
		label: 'SAVAGE',
		fill: COLORS.orange,
		gradient: ['#FFF3C4', '#FFB01F', '#FF3D08'],
		glow: 'rgba(255,110,10,1)',
		glowStrength: 2.2,
		strokeColor: '#1A0600',
		shakeAmount: 10,
	},
};

/** Accepts 'SAVAGE', 'savage', 'DOUBLE KILL', 'double_kill'... */
const resolveTier = (input: string): KillTier => {
	const key = input.trim().toUpperCase().replace(/[\s-]+/g, '_');
	if (key in KILL_TIERS) return key as KillTier;
	if (key.startsWith('DOUBLE')) return 'DOUBLE';
	if (key.startsWith('TRIPLE')) return 'TRIPLE';
	if (key.startsWith('MANIAC')) return 'MANIAC';
	if (key.startsWith('SAVAGE')) return 'SAVAGE';
	if (key.startsWith('FIRST')) return 'FIRST_BLOOD';
	return 'DOUBLE';
};

/* ------------------------------------------------------------------ */
/* Timing                                                              */
/* ------------------------------------------------------------------ */

const ENTER_MS = 150; // scale 115% -> 100%
const EXIT_MS = 180; // fast upward drift + fade
export const DEFAULT_HOLD_MS = 1000; // 0.8 - 1.2s per brief

/** Total length of the popup, so you can size its <Sequence> exactly. */
export const killStreakDurationInFrames = (
	fps: number,
	holdMs: number = DEFAULT_HOLD_MS,
) => Math.round(ms(ENTER_MS + holdMs + EXIT_MS, fps));

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export type KillStreakPopupProps = {
	/** 'DOUBLE' | 'TRIPLE' | 'MANIAC' | 'SAVAGE' | 'FIRST_BLOOD' (labels also accepted) */
	killTier: KillTier | string;
	/** Override the printed text while keeping the tier's colour ramp. */
	labelOverride?: string;
	/** How long it sits at full opacity, ms. 800-1200 recommended. */
	holdMs?: number;
	/** Fraction of frame width the label should span. */
	widthRatio?: number;
	/** Audio cue fired on mount - staticFile('sfx/savage.mp3'). */
	audioSrc?: string;
	audioVolume?: number;
	/** Vertical nudge from centre, px (negative = up). */
	offsetY?: number;
	/** Little tier-coloured swipe bar under the text. */
	showAccentBar?: boolean;
};

export const KillStreakPopup: React.FC<KillStreakPopupProps> = ({
	killTier,
	labelOverride,
	holdMs = DEFAULT_HOLD_MS,
	widthRatio = 0.66,
	audioSrc,
	audioVolume = 1,
	offsetY = 0,
	showAccentBar = true,
}) => {
	const frame = useCurrentFrame();
	const {fps, width, height} = useVideoConfig();

	const tier = KILL_TIERS[resolveTier(String(killTier))];
	const label = (labelOverride ?? tier.label).toUpperCase();

	const enterF = ms(ENTER_MS, fps);
	const exitF = ms(EXIT_MS, fps);
	const holdF = ms(holdMs, fps);
	const exitStart = enterF + holdF;

	/* --- entrance: 115% -> 100% in 150ms, slight overshoot settle --- */
	const pop = spring({
		frame,
		fps,
		config: {damping: 14, mass: 0.42, stiffness: 220},
		durationInFrames: Math.max(enterF, 1),
	});
	const enterScale = interpolate(pop, [0, 1], [1.15, 1]);

	/* --- exit: quick upward drift + fade, never lingers --- */
	const exitProgress = interpolate(
		frame,
		[exitStart, exitStart + exitF],
		[0, 1],
		{extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (t) => t * t},
	);
	const exitY = -exitProgress * height * 0.075;
	const exitScale = 1 - exitProgress * 0.06;
	const opacity =
		interpolate(frame, [0, enterF * 0.35], [0.25, 1], {
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
		}) * (1 - exitProgress);

	/* --- glow flash: hot on impact, decays over ~250ms --- */
	const flash = interpolate(frame, [0, ms(60, fps), ms(260, fps)], [0.35, 1, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	/** Gold tiers keep a low idle glow after the flash burns off. */
	const idleGlow = tier.glowStrength > 1.2 ? 0.42 : 0.16;
	const glow = Math.max(flash, idleGlow * (1 - exitProgress));

	/* --- impact shake, only during the first few frames --- */
	const shakeDecay = interpolate(frame, [0, ms(220, fps)], [1, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const shakeX =
		Math.sin(frame * 3.1) * tier.shakeAmount * shakeDecay * tier.glowStrength;
	const shakeY =
		Math.cos(frame * 4.3) * tier.shakeAmount * 0.6 * shakeDecay;

	const fontSize = fitFontSize({
		text: label,
		targetWidth: width * widthRatio,
		fontFamily: FONT_IMPACT,
		letterSpacing: '-0.005em',
		max: height * 0.17,
	});
	// -webkit-text-stroke is centred on the outline, so only half of it shows
	// outside the glyph - double it to read as a genuinely thick dark edge.
	const strokeWidth = Math.max(10, fontSize * 0.105);

	const gradient = tier.gradient
		? `linear-gradient(178deg, ${tier.gradient[0]} 8%, ${tier.gradient[1]} 52%, ${tier.gradient[2]} 100%)`
		: undefined;

	const glowShadow = [
		`0 0 ${18 * tier.glowStrength * glow}px ${tier.glow}`,
		`0 0 ${56 * tier.glowStrength * glow}px ${tier.glow}`,
		`0 0 ${120 * tier.glowStrength * glow}px ${tier.glow}`,
	].join(', ');

	const baseTextStyle: React.CSSProperties = {
		fontFamily: FONT_IMPACT,
		fontSize,
		lineHeight: 0.95,
		letterSpacing: '-0.005em',
		whiteSpace: 'nowrap',
		margin: 0,
		textTransform: 'uppercase',
	};

	return (
		<AbsoluteFill
			style={{
				justifyContent: 'center',
				alignItems: 'center',
				pointerEvents: 'none',
			}}
		>
			{audioSrc ? <Audio src={audioSrc} volume={audioVolume} /> : null}

			<div
				style={{
					position: 'relative',
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					opacity,
					transform: `translate(${shakeX}px, ${offsetY + exitY + shakeY}px) scale(${
						enterScale * exitScale
					})`,
					willChange: 'transform, opacity',
				}}
			>
				{/* radial impact burst behind the text */}
				<div
					style={{
						position: 'absolute',
						width: fontSize * 9,
						height: fontSize * 3.4,
						borderRadius: '50%',
						background: `radial-gradient(ellipse at center, ${tier.glow} 0%, rgba(0,0,0,0) 68%)`,
						opacity: 0.5 * glow * tier.glowStrength,
						filter: `blur(${fontSize * 0.22}px)`,
						transform: `scale(${0.75 + glow * 0.35})`,
					}}
				/>

				{/* blurred duplicate = the actual bloom */}
				<div
					aria-hidden
					style={{
						...baseTextStyle,
						position: 'absolute',
						color: tier.gradient ? tier.gradient[1] : COLORS.white,
						filter: `blur(${fontSize * 0.055}px)`,
						opacity: 0.85 * glow,
					}}
				>
					{label}
				</div>

				{/* stroked base layer - the thick dark outline */}
				<div
					aria-hidden
					style={{
						...baseTextStyle,
						position: 'absolute',
						color: '#0A0B10',
						...strokeText(strokeWidth, tier.strokeColor),
						textShadow: `0 ${strokeWidth * 0.5}px 0 rgba(0,0,0,0.6), 0 ${
							strokeWidth * 0.9
						}px ${strokeWidth * 1.4}px rgba(0,0,0,0.55)`,
					}}
				>
					{label}
				</div>

				{/* fill layer */}
				<div
					style={{
						...baseTextStyle,
						position: 'relative',
						color: gradient ? 'transparent' : tier.fill,
						...(gradient
							? {
									backgroundImage: gradient,
									WebkitBackgroundClip: 'text',
									backgroundClip: 'text',
								}
							: {}),
						textShadow: gradient ? undefined : glowShadow,
						filter: gradient
							? `drop-shadow(0 0 ${20 * glow * tier.glowStrength}px ${tier.glow}) drop-shadow(0 0 ${
									70 * glow * tier.glowStrength
								}px ${tier.glow})`
							: undefined,
					}}
				>
					{label}
				</div>

				{/* white hot-flash overlay on the first frames */}
				<div
					aria-hidden
					style={{
						...baseTextStyle,
						position: 'absolute',
						color: '#FFFFFF',
						opacity: Math.max(0, flash - 0.45) * 1.6,
						mixBlendMode: 'screen',
					}}
				>
					{label}
				</div>

				{showAccentBar ? (
					<div
						style={{
							marginTop: fontSize * 0.1,
							height: Math.max(4, fontSize * 0.035),
							width: '100%',
							background: gradient ?? COLORS.white,
							boxShadow: `0 0 ${26 * glow * tier.glowStrength}px ${tier.glow}`,
							opacity: 0.9,
							transform: `skewX(-18deg) scaleX(${interpolate(
								pop,
								[0, 1],
								[0.15, 1],
							)})`,
						}}
					/>
				) : null}
			</div>
		</AbsoluteFill>
	);
};
