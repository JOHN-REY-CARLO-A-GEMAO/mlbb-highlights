import React from 'react';
import {
	AbsoluteFill,
	interpolate,
	spring,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';
import {
	COLORS,
	FONT_CONDENSED,
	FONT_IMPACT,
	FONT_UI,
	fitFontSize,
	ms,
	strokeText,
} from '../theme';

const ENTER_MS = 300;
const EXIT_MS = 320; // fast scale-up whoosh
export const DEFAULT_INTRO_HOLD_MS = 2500;

export const introCardDurationInFrames = (
	fps: number,
	holdMs: number = DEFAULT_INTRO_HOLD_MS,
) => Math.round(ms(ENTER_MS + holdMs + EXIT_MS, fps));

export type IntroTitleCardProps = {
	playerName: string;
	event: string;
	matchup?: string;
	holdMs?: number;
	accentColor?: string;
	/** Darkens the gameplay behind the card so the type reads. 0 = off. */
	scrimOpacity?: number;
};

/** Corner bracket for the game-native frame. */
const Bracket: React.FC<{
	corner: 'tl' | 'tr' | 'bl' | 'br';
	size: number;
	thickness: number;
	color: string;
	glow: string;
}> = ({corner, size, thickness, color, glow}) => {
	const top = corner[0] === 't';
	const left = corner[1] === 'l';
	return (
		<div
			style={{
				position: 'absolute',
				width: size,
				height: size,
				top: top ? 0 : undefined,
				bottom: top ? undefined : 0,
				left: left ? 0 : undefined,
				right: left ? undefined : 0,
				borderTop: top ? `${thickness}px solid ${color}` : undefined,
				borderBottom: top ? undefined : `${thickness}px solid ${color}`,
				borderLeft: left ? `${thickness}px solid ${color}` : undefined,
				borderRight: left ? undefined : `${thickness}px solid ${color}`,
				filter: `drop-shadow(0 0 ${thickness * 4}px ${glow})`,
			}}
		/>
	);
};

export const IntroTitleCard: React.FC<IntroTitleCardProps> = ({
	playerName,
	event,
	matchup,
	holdMs = DEFAULT_INTRO_HOLD_MS,
	accentColor = COLORS.blue,
	scrimOpacity = 0.55,
}) => {
	const frame = useCurrentFrame();
	const {fps, width, height} = useVideoConfig();

	const enterF = ms(ENTER_MS, fps);
	const exitF = ms(EXIT_MS, fps);
	const exitStart = enterF + ms(holdMs, fps);

	/* ---- enter: slide up + fade, spring settle ---- */
	const enterSpring = spring({
		frame,
		fps,
		config: {damping: 18, mass: 0.6, stiffness: 140},
		durationInFrames: Math.max(enterF, 1),
	});
	const enterFade = interpolate(frame, [0, enterF * 0.8], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	/* ---- exit: whoosh = fast scale-up + fade, reveals clean gameplay ---- */
	const exit = interpolate(frame, [exitStart, exitStart + exitF], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
		easing: (t) => t * t,
	});

	const opacity = enterFade * (1 - exit);
	const scale = interpolate(enterSpring, [0, 1], [0.94, 1]) * (1 + exit * 0.45);
	const slideY = interpolate(enterSpring, [0, 1], [height * 0.05, 0]);
	const blur = exit * 14;

	const nameSize = fitFontSize({
		text: playerName,
		targetWidth: width * 0.82,
		fontFamily: FONT_IMPACT,
		letterSpacing: '0.01em',
		max: height * 0.085,
	});
	const eventSize = Math.min(
		nameSize * 0.3,
		fitFontSize({
			text: event,
			targetWidth: width * 0.7,
			fontFamily: FONT_CONDENSED,
			letterSpacing: '0.22em',
			max: height * 0.03,
		}),
	);

	const framePad = width * 0.075;
	const bracket = width * 0.1;

	/* subtle scanline shimmer */
	const shimmer = (frame / fps) * 120;

	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			{/* scrim */}
			<AbsoluteFill
				style={{
					background: `radial-gradient(ellipse at 50% 45%, rgba(8,10,18,${
						scrimOpacity * 0.75
					}) 0%, rgba(3,4,9,${scrimOpacity}) 70%, rgba(3,4,9,${
						scrimOpacity * 1.1
					}) 100%)`,
					opacity: opacity,
				}}
			/>

			{/* scanlines / game-native texture */}
			<AbsoluteFill
				style={{
					opacity: opacity * 0.18,
					backgroundImage: `repeating-linear-gradient(0deg, rgba(255,255,255,0.16) 0px, rgba(255,255,255,0.16) 1px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 4px)`,
					backgroundPositionY: `${shimmer}px`,
					mixBlendMode: 'overlay',
				}}
			/>

			<AbsoluteFill
				style={{
					opacity,
					transform: `translateY(${slideY}px) scale(${scale})`,
					filter: blur > 0.1 ? `blur(${blur}px)` : undefined,
					willChange: 'transform, opacity, filter',
				}}
			>
				{/* neon frame */}
				<div
					style={{
						position: 'absolute',
						inset: framePad,
						border: `1px solid ${accentColor}55`,
						boxShadow: `inset 0 0 ${width * 0.12}px rgba(0,0,0,0.55), 0 0 ${
							width * 0.02
						}px ${accentColor}33`,
					}}
				>
					<Bracket
						corner="tl"
						size={bracket}
						thickness={Math.max(3, width * 0.005)}
						color={accentColor}
						glow={accentColor}
					/>
					<Bracket
						corner="tr"
						size={bracket}
						thickness={Math.max(3, width * 0.005)}
						color={accentColor}
						glow={accentColor}
					/>
					<Bracket
						corner="bl"
						size={bracket}
						thickness={Math.max(3, width * 0.005)}
						color={accentColor}
						glow={accentColor}
					/>
					<Bracket
						corner="br"
						size={bracket}
						thickness={Math.max(3, width * 0.005)}
						color={accentColor}
						glow={accentColor}
					/>
				</div>

				{/* stacked type */}
				<AbsoluteFill
					style={{
						justifyContent: 'center',
						alignItems: 'center',
						textAlign: 'center',
						padding: framePad * 1.6,
					}}
				>
					{matchup ? (
						<div
							style={{
								fontFamily: FONT_UI,
								fontWeight: 700,
								fontSize: eventSize * 0.82,
								letterSpacing: '0.3em',
								textTransform: 'uppercase',
								color: '#FFFFFF',
								padding: `${eventSize * 0.32}px ${eventSize * 0.9}px`,
								border: `1px solid ${accentColor}88`,
								background: 'rgba(10,14,24,0.55)',
								boxShadow: `0 0 ${eventSize}px ${accentColor}55`,
								marginBottom: nameSize * 0.28,
								transform: `translateY(${(1 - enterSpring) * -40}px)`,
								opacity: interpolate(enterSpring, [0.15, 0.8], [0, 1], {
									extrapolateLeft: 'clamp',
									extrapolateRight: 'clamp',
								}),
							}}
						>
							{matchup.toUpperCase()}
						</div>
					) : null}

					{/* player name - the hero line */}
					<div style={{position: 'relative'}}>
						<div
							aria-hidden
							style={{
								position: 'absolute',
								inset: 0,
								fontFamily: FONT_IMPACT,
								fontSize: nameSize,
								lineHeight: 1,
								letterSpacing: '0.01em',
								color: accentColor,
								filter: `blur(${nameSize * 0.06}px)`,
								opacity: 0.9,
								whiteSpace: 'nowrap',
							}}
						>
							{playerName.toUpperCase()}
						</div>
						<div
							style={{
								position: 'relative',
								fontFamily: FONT_IMPACT,
								fontSize: nameSize,
								lineHeight: 1,
								letterSpacing: '0.01em',
								color: '#FFFFFF',
								whiteSpace: 'nowrap',
								...strokeText(Math.max(4, nameSize * 0.035), '#05070C'),
								textShadow: `0 0 ${nameSize * 0.14}px ${accentColor}, 0 0 ${
									nameSize * 0.45
								}px ${accentColor}99`,
							}}
						>
							{playerName.toUpperCase()}
						</div>
					</div>

					{/* neon divider */}
					<div
						style={{
							marginTop: nameSize * 0.2,
							marginBottom: nameSize * 0.2,
							height: Math.max(2, nameSize * 0.018),
							width: interpolate(enterSpring, [0, 1], [0, width * 0.62]),
							background: `linear-gradient(90deg, rgba(0,0,0,0) 0%, ${accentColor} 20%, #FFFFFF 50%, ${accentColor} 80%, rgba(0,0,0,0) 100%)`,
							boxShadow: `0 0 ${nameSize * 0.3}px ${accentColor}`,
						}}
					/>

					<div
						style={{
							fontFamily: FONT_CONDENSED,
							fontSize: eventSize,
							letterSpacing: '0.22em',
							textTransform: 'uppercase',
							color: 'rgba(255,255,255,0.92)',
							textShadow: '0 2px 12px rgba(0,0,0,0.9)',
							transform: `translateY(${(1 - enterSpring) * 40}px)`,
							opacity: interpolate(enterSpring, [0.25, 0.9], [0, 1], {
								extrapolateLeft: 'clamp',
								extrapolateRight: 'clamp',
							}),
						}}
					>
						{event.toUpperCase()}
					</div>
				</AbsoluteFill>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
