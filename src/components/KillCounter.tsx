import React, {useMemo} from 'react';
import {
	AbsoluteFill,
	interpolate,
	interpolateColors,
	spring,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';
import {COLORS, FONT_CONDENSED, FONT_IMPACT, ms, strokeText} from '../theme';

const PULSE_MS = 200;

export type KillCounterProps = {
	/**
	 * Static count. Use this when the counter is inside a <Sequence> that starts
	 * at the kill - it pulses on mount.
	 */
	killCount?: number;
	/**
	 * Preferred: the timestamp of every kill in the clip. The counter derives its
	 * own value per frame and pulses on each increment - fully deterministic, so
	 * it survives scrubbing and distributed rendering.
	 */
	killTimes?: number[];
	timeUnit?: 'seconds' | 'ms' | 'frames';
	/** Kills needed before the number turns gold. */
	goldThreshold?: number;
	corner?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
	/** Fraction of frame width used as the edge margin. */
	margin?: number;
	scale?: number;
	label?: string;
	/** Hide entirely until the first kill lands. */
	hideBeforeFirstKill?: boolean;
};

export const KillCounter: React.FC<KillCounterProps> = ({
	killCount,
	killTimes,
	timeUnit = 'seconds',
	goldThreshold = 3,
	corner = 'top-right',
	margin = 0.05,
	scale = 1,
	label = 'KILLS',
	hideBeforeFirstKill = false,
}) => {
	const frame = useCurrentFrame();
	const {fps, width} = useVideoConfig();

	const toFrames = useMemo(() => {
		if (timeUnit === 'frames') return (t: number) => t;
		if (timeUnit === 'ms') return (t: number) => (t / 1000) * fps;
		return (t: number) => t * fps;
	}, [timeUnit, fps]);

	const killFrames = useMemo(
		() => (killTimes ?? []).map(toFrames).sort((a, b) => a - b),
		[killTimes, toFrames],
	);

	/* ---- derive the current count + when it last changed ---- */
	let count: number;
	let lastChangeFrame: number;

	if (killFrames.length) {
		const landed = killFrames.filter((f) => frame >= f);
		count = landed.length;
		lastChangeFrame = landed.length ? landed[landed.length - 1] : -9999;
	} else {
		count = killCount ?? 0;
		lastChangeFrame = 0; // static mode: pulse on mount
	}

	if (hideBeforeFirstKill && count === 0) return null;

	const pulseF = ms(PULSE_MS, fps);
	const local = frame - lastChangeFrame;

	/* ---- 200ms scale pulse on every increment ---- */
	const pulseIn = spring({
		frame: Math.max(0, local),
		fps,
		config: {damping: 9, mass: 0.3, stiffness: 320},
		durationInFrames: Math.max(pulseF, 1),
	});
	const pulse =
		local >= 0 && local < pulseF * 3
			? Math.sin(Math.min(1, local / pulseF) * Math.PI) * (1 - pulseIn * 0.15)
			: 0;
	const numScale = 1 + pulse * 0.38;

	/* ---- white -> gold ramp at the threshold ---- */
	const goldMix = interpolate(
		count,
		[goldThreshold - 1, goldThreshold],
		[0, 1],
		{extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
	);
	const numberColor = interpolateColors(
		goldMix,
		[0, 1],
		[COLORS.white, COLORS.gold],
	);
	const glowColor = interpolateColors(
		goldMix,
		[0, 1],
		['rgba(190,220,255,0.55)', 'rgba(255,171,26,0.95)'],
	);
	const glowStrength = (0.35 + goldMix * 0.65) * (0.5 + pulse);

	const isTop = corner.startsWith('top');
	const isRight = corner.endsWith('right');

	const size = width * 0.115 * scale;
	const pad = size * 0.22;

	/* previous digit ghosting out on change */
	const showGhost = local >= 0 && local < pulseF * 1.6 && count > 0 && killFrames.length > 0;
	const ghostProgress = interpolate(local, [0, pulseF * 1.6], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			<div
				style={{
					position: 'absolute',
					top: isTop ? width * margin : undefined,
					bottom: isTop ? undefined : width * margin,
					right: isRight ? width * margin : undefined,
					left: isRight ? undefined : width * margin,
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					gap: pad * 0.25,
				}}
			>
				<div
					style={{
						position: 'relative',
						width: size,
						height: size,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
					}}
				>
					{/* pulse ring burst */}
					<div
						style={{
							position: 'absolute',
							inset: -size * 0.1,
							borderRadius: '50%',
							border: `${Math.max(2, size * 0.03)}px solid ${glowColor}`,
							opacity: pulse * 0.85,
							transform: `scale(${1 + pulse * 0.55})`,
						}}
					/>

					{/* backing plate */}
					<div
						style={{
							position: 'absolute',
							inset: 0,
							borderRadius: size * 0.16,
							background:
								'linear-gradient(150deg, rgba(9,12,20,0.86) 0%, rgba(9,12,20,0.5) 100%)',
							border: `1px solid ${goldMix > 0.5 ? 'rgba(255,190,60,0.5)' : 'rgba(255,255,255,0.18)'}`,
							boxShadow: `0 0 ${size * 0.5 * glowStrength}px ${glowColor}, inset 0 0 ${
								size * 0.3
							}px rgba(0,0,0,0.6)`,
							backdropFilter: 'blur(5px)',
						}}
					/>

					{/* ghost of the previous number rolling up */}
					{showGhost ? (
						<div
							style={{
								position: 'absolute',
								fontFamily: FONT_IMPACT,
								fontSize: size * 0.68,
								lineHeight: 1,
								color: numberColor,
								opacity: (1 - ghostProgress) * 0.35,
								transform: `translateY(${-ghostProgress * size * 0.4}px) scale(${
									1 - ghostProgress * 0.2
								})`,
							}}
						>
							{Math.max(0, count - 1)}
						</div>
					) : null}

					<div
						style={{
							position: 'relative',
							fontFamily: FONT_IMPACT,
							fontSize: size * 0.68,
							lineHeight: 1,
							color: numberColor,
							transform: `scale(${numScale})`,
							...strokeText(Math.max(3, size * 0.035), '#06070B'),
							textShadow: `0 0 ${size * 0.22 * glowStrength}px ${glowColor}, 0 0 ${
								size * 0.6 * glowStrength
							}px ${glowColor}`,
							willChange: 'transform',
						}}
					>
						{count}
					</div>
				</div>

				<div
					style={{
						fontFamily: FONT_CONDENSED,
						fontSize: size * 0.19,
						letterSpacing: '0.28em',
						textIndent: '0.28em',
						color: goldMix > 0.5 ? 'rgba(255,214,130,0.95)' : 'rgba(255,255,255,0.8)',
						textShadow: '0 2px 8px rgba(0,0,0,0.9)',
						textTransform: 'uppercase',
					}}
				>
					{label}
				</div>
			</div>
		</AbsoluteFill>
	);
};
