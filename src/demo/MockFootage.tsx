import React from 'react';
import {AbsoluteFill, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT_CONDENSED} from '../theme';

/**
 * Stand-in for real MLBB footage so every composition previews immediately.
 * Swap it out by passing `topVideo={staticFile('gameplay.mp4')}`.
 */
export const MockGameplay: React.FC<{seed?: number; label?: string}> = ({
	seed = 1,
	label = 'GAMEPLAY PLACEHOLDER',
}) => {
	const frame = useCurrentFrame();
	const {fps, width, height} = useVideoConfig();
	const t = frame / fps;

	const particles = new Array(46).fill(0).map((_, i) => {
		const r1 = random(`p${seed}${i}`);
		const r2 = random(`q${seed}${i}`);
		const r3 = random(`s${seed}${i}`);
		const speed = 0.15 + r3 * 0.5;
		return {
			x: ((r1 + t * speed * 0.06) % 1) * 100,
			y: ((r2 + t * speed * 0.1) % 1) * 100,
			size: 2 + r3 * 7,
			opacity: 0.12 + r3 * 0.35,
		};
	});

	return (
		<AbsoluteFill style={{overflow: 'hidden', background: '#0B1520'}}>
			{/* terrain */}
			<AbsoluteFill
				style={{
					background:
						'radial-gradient(ellipse at 30% 20%, #1D3A46 0%, #101E2A 45%, #070C13 100%)',
				}}
			/>
			{/* drifting lane light */}
			<AbsoluteFill
				style={{
					background: `linear-gradient(${
						115 + Math.sin(t * 0.6) * 10
					}deg, rgba(63,169,255,0.12) 0%, rgba(0,0,0,0) 40%, rgba(255,86,60,0.12) 100%)`,
				}}
			/>
			{/* ground grid, slowly scrolling = camera movement */}
			<AbsoluteFill
				style={{
					backgroundImage:
						'linear-gradient(rgba(120,200,255,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(120,200,255,0.09) 1px, transparent 1px)',
					backgroundSize: `${width * 0.09}px ${width * 0.09}px`,
					backgroundPosition: `${(t * 26) % 200}px ${(t * 14) % 200}px`,
					transform: 'perspective(700px) rotateX(52deg) scale(1.9)',
					transformOrigin: 'center 65%',
					opacity: 0.55,
				}}
			/>

			{/* spell circle */}
			<div
				style={{
					position: 'absolute',
					left: '50%',
					top: '52%',
					width: width * 0.5,
					height: width * 0.5 * 0.42,
					marginLeft: -width * 0.25,
					marginTop: -width * 0.105,
					borderRadius: '50%',
					border: `${Math.max(2, width * 0.004)}px solid rgba(120,220,255,0.5)`,
					boxShadow: '0 0 60px rgba(80,200,255,0.4), inset 0 0 60px rgba(80,200,255,0.25)',
					transform: `rotate(${t * 34}deg) scale(${1 + Math.sin(t * 2.4) * 0.04})`,
				}}
			/>

			{/* combat particles */}
			{particles.map((p, i) => (
				<div
					key={i}
					style={{
						position: 'absolute',
						left: `${p.x}%`,
						top: `${p.y}%`,
						width: p.size,
						height: p.size,
						borderRadius: '50%',
						background: i % 5 === 0 ? '#FFC531' : '#8FD8FF',
						opacity: p.opacity,
						filter: 'blur(1px)',
					}}
				/>
			))}

			{/* hero silhouettes */}
			<div
				style={{
					position: 'absolute',
					left: `${46 + Math.sin(t * 1.1) * 6}%`,
					top: `${50 + Math.cos(t * 0.9) * 4}%`,
					width: width * 0.1,
					height: width * 0.1,
					marginLeft: -width * 0.05,
					marginTop: -width * 0.05,
					borderRadius: '50%',
					background:
						'radial-gradient(circle at 35% 30%, #EAF6FF 0%, #4FA8E8 45%, #123049 100%)',
					boxShadow: '0 0 40px rgba(90,190,255,0.7)',
				}}
			/>
			{[0, 1, 2].map((i) => (
				<div
					key={i}
					style={{
						position: 'absolute',
						left: `${58 + i * 9 + Math.sin(t * 1.4 + i) * 3}%`,
						top: `${44 + i * 6 + Math.cos(t * 1.2 + i) * 3}%`,
						width: width * 0.07,
						height: width * 0.07,
						borderRadius: '50%',
						background:
							'radial-gradient(circle at 35% 30%, #FFD9D2 0%, #E8574F 45%, #4A1210 100%)',
						boxShadow: '0 0 28px rgba(255,90,70,0.6)',
						opacity: 0.9,
					}}
				/>
			))}

			{/* vignette */}
			<AbsoluteFill
				style={{
					background:
						'radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,0.6) 100%)',
				}}
			/>

			<div
				style={{
					position: 'absolute',
					bottom: height * 0.02,
					width: '100%',
					textAlign: 'center',
					fontFamily: FONT_CONDENSED,
					fontSize: width * 0.022,
					letterSpacing: '0.3em',
					color: 'rgba(255,255,255,0.28)',
					textTransform: 'uppercase',
				}}
			>
				{label}
			</div>
		</AbsoluteFill>
	);
};

/** Stand-in for the reaction cam in the bottom third. */
export const MockReactionCam: React.FC<{name?: string}> = ({
	name = 'REACTION CAM',
}) => {
	const frame = useCurrentFrame();
	const {fps, width} = useVideoConfig();
	const t = frame / fps;
	const bob = Math.sin(t * 3.1) * width * 0.006;
	const lean = Math.sin(t * 1.7) * 2;

	return (
		<AbsoluteFill
			style={{
				background:
					'radial-gradient(ellipse at 30% 10%, #2A2140 0%, #171326 45%, #0A0812 100%)',
				overflow: 'hidden',
			}}
		>
			{/* rgb key lights */}
			<div
				style={{
					position: 'absolute',
					left: '-10%',
					top: '-40%',
					width: '60%',
					height: '180%',
					background:
						'radial-gradient(ellipse at center, rgba(120,60,255,0.35) 0%, rgba(0,0,0,0) 70%)',
				}}
			/>
			<div
				style={{
					position: 'absolute',
					right: '-10%',
					bottom: '-60%',
					width: '60%',
					height: '180%',
					background:
						'radial-gradient(ellipse at center, rgba(255,80,140,0.3) 0%, rgba(0,0,0,0) 70%)',
				}}
			/>

			{/* bust silhouette */}
			<div
				style={{
					position: 'absolute',
					left: '50%',
					bottom: 0,
					transform: `translateX(-50%) translateY(${bob}px) rotate(${lean}deg)`,
					transformOrigin: 'bottom center',
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
				}}
			>
				<div
					style={{
						width: width * 0.16,
						height: width * 0.16,
						borderRadius: '50%',
						background: 'linear-gradient(180deg, #3B3352 0%, #211B33 100%)',
						boxShadow: '0 0 40px rgba(160,110,255,0.35)',
					}}
				/>
				<div
					style={{
						width: width * 0.36,
						height: width * 0.2,
						marginTop: -width * 0.01,
						borderRadius: `${width * 0.18}px ${width * 0.18}px 0 0`,
						background: 'linear-gradient(180deg, #302A46 0%, #16122A 100%)',
					}}
				/>
			</div>

			{/* headset mic arm */}
			<div
				style={{
					position: 'absolute',
					left: '50%',
					bottom: '18%',
					width: width * 0.12,
					height: 3,
					background: 'rgba(255,255,255,0.25)',
					transform: 'translateX(-2%) rotate(12deg)',
				}}
			/>

			<div
				style={{
					position: 'absolute',
					left: width * 0.035,
					top: width * 0.025,
					display: 'flex',
					alignItems: 'center',
					gap: width * 0.012,
					fontFamily: FONT_CONDENSED,
					fontSize: width * 0.026,
					letterSpacing: '0.22em',
					color: 'rgba(255,255,255,0.75)',
					textTransform: 'uppercase',
				}}
			>
				<span
					style={{
						width: width * 0.016,
						height: width * 0.016,
						borderRadius: '50%',
						background: '#FF3B30',
						opacity: 0.55 + Math.sin(t * 4) * 0.45,
						boxShadow: '0 0 12px #FF3B30',
					}}
				/>
				{name}
			</div>
		</AbsoluteFill>
	);
};
