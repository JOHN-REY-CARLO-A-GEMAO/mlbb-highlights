import React, {useMemo} from 'react';
import {
	AbsoluteFill,
	Img,
	interpolate,
	spring,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';
import {COLORS, FONT_CONDENSED} from '../theme';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type MapPoint = {x: number; y: number};

export type MinimapRouteTracerProps = {
	/** The player's movement path. Normalised 0..1 (0,0 = top-left of the map). */
	routePath: MapPoint[];
	/** 'blue' | 'red' | any CSS colour. */
	teamColor?: 'blue' | 'red' | string;
	/** Seconds the line takes to draw itself. Brief says 2-3s. */
	drawSeconds?: number;
	/** Delay before the line starts drawing, seconds. */
	delaySeconds?: number;
	/** Crop of the in-game minimap. Omit to use the built-in stylised map. */
	minimapSrc?: string;
	/** Size of the enlarged minimap as a fraction of frame width. */
	sizeRatio?: number;
	position?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
	margin?: number;
	/** Coordinate space of routePath. 'pixels' needs mapSize. */
	coordinateSpace?: 'normalized' | 'pixels';
	mapSize?: {width: number; height: number};
	title?: string;
	startLabel?: string;
	endLabel?: string;
	/** Fade the whole widget out at the end of its sequence. */
	holdAfterDrawSeconds?: number;
};

/* ------------------------------------------------------------------ */
/* Path maths                                                          */
/* ------------------------------------------------------------------ */

/** Catmull-Rom -> dense polyline, so the route reads as a smooth rotation. */
const smoothPolyline = (pts: MapPoint[], samplesPerSegment = 18): MapPoint[] => {
	if (pts.length < 3) return pts;
	const out: MapPoint[] = [];
	const p = [pts[0], ...pts, pts[pts.length - 1]];
	for (let i = 1; i < p.length - 2; i++) {
		const p0 = p[i - 1];
		const p1 = p[i];
		const p2 = p[i + 1];
		const p3 = p[i + 2];
		for (let s = 0; s < samplesPerSegment; s++) {
			const t = s / samplesPerSegment;
			const t2 = t * t;
			const t3 = t2 * t;
			out.push({
				x:
					0.5 *
					(2 * p1.x +
						(-p0.x + p2.x) * t +
						(2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
						(-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
				y:
					0.5 *
					(2 * p1.y +
						(-p0.y + p2.y) * t +
						(2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
						(-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
			});
		}
	}
	out.push(pts[pts.length - 1]);
	return out;
};

const cumulativeLengths = (pts: MapPoint[]) => {
	const lens = [0];
	for (let i = 1; i < pts.length; i++) {
		const dx = pts[i].x - pts[i - 1].x;
		const dy = pts[i].y - pts[i - 1].y;
		lens.push(lens[i - 1] + Math.hypot(dx, dy));
	}
	return lens;
};

const pointAt = (pts: MapPoint[], lens: number[], dist: number): MapPoint => {
	const total = lens[lens.length - 1];
	const d = Math.max(0, Math.min(dist, total));
	let i = 1;
	while (i < lens.length && lens[i] < d) i++;
	const prev = pts[i - 1] ?? pts[0];
	const next = pts[i] ?? pts[pts.length - 1];
	const segLen = (lens[i] ?? total) - lens[i - 1];
	const t = segLen === 0 ? 0 : (d - lens[i - 1]) / segLen;
	return {x: prev.x + (next.x - prev.x) * t, y: prev.y + (next.y - prev.y) * t};
};

/* ------------------------------------------------------------------ */
/* Built-in stylised MLBB-ish minimap                                  */
/* ------------------------------------------------------------------ */

const StylisedMap: React.FC = () => (
	<svg viewBox="0 0 100 100" style={{width: '100%', height: '100%'}}>
		<defs>
			<linearGradient id="terrain" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0%" stopColor="#16281F" />
				<stop offset="50%" stopColor="#0F1B18" />
				<stop offset="100%" stopColor="#141F2B" />
			</linearGradient>
			<linearGradient id="river" x1="0" y1="1" x2="1" y2="0">
				<stop offset="0%" stopColor="#1D4E6B" />
				<stop offset="100%" stopColor="#20627F" />
			</linearGradient>
		</defs>
		<rect width="100" height="100" fill="url(#terrain)" />
		{/* river running corner to corner */}
		<path
			d="M -6 66 C 26 56, 46 46, 66 -6 L 84 -6 C 62 52, 34 74, -6 84 Z"
			fill="url(#river)"
			opacity="0.75"
		/>
		{/* lanes */}
		<g stroke="#C7B98A" strokeOpacity="0.30" strokeWidth="4.5" fill="none" strokeLinecap="round">
			<path d="M 10 90 L 10 22 L 78 10" />
			<path d="M 14 86 L 86 14" />
			<path d="M 22 90 L 90 78 L 90 12" />
		</g>
		{/* jungle bush clusters */}
		<g fill="#1E3A2A" opacity="0.85">
			{[
				[30, 70],
				[42, 58],
				[58, 42],
				[70, 30],
				[26, 42],
				[74, 58],
				[46, 78],
				[54, 22],
			].map(([cx, cy], i) => (
				<circle key={i} cx={cx} cy={cy} r={4.2} />
			))}
		</g>
		{/* turrets */}
		<g>
			{[
				[10, 60],
				[10, 40],
				[30, 70],
				[42, 62],
				[26, 84],
			].map(([cx, cy], i) => (
				<rect
					key={`b${i}`}
					x={cx - 1.6}
					y={cy - 1.6}
					width="3.2"
					height="3.2"
					fill={COLORS.teamBlue}
					opacity="0.9"
				/>
			))}
			{[
				[90, 40],
				[90, 60],
				[70, 30],
				[58, 38],
				[74, 16],
			].map(([cx, cy], i) => (
				<rect
					key={`r${i}`}
					x={cx - 1.6}
					y={cy - 1.6}
					width="3.2"
					height="3.2"
					fill={COLORS.teamRed}
					opacity="0.9"
				/>
			))}
		</g>
		{/* bases */}
		<circle cx="8" cy="92" r="7" fill={COLORS.teamBlue} opacity="0.35" />
		<circle cx="92" cy="8" r="7" fill={COLORS.teamRed} opacity="0.35" />
	</svg>
);

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export const MinimapRouteTracer: React.FC<MinimapRouteTracerProps> = ({
	routePath,
	teamColor = 'blue',
	drawSeconds = 2.5,
	delaySeconds = 0.25,
	minimapSrc,
	sizeRatio = 0.62,
	position = 'center',
	margin = 0.05,
	coordinateSpace = 'normalized',
	mapSize,
	title = 'ROTATION PATH',
	startLabel,
	endLabel,
	holdAfterDrawSeconds,
}) => {
	const frame = useCurrentFrame();
	const {fps, width, height, durationInFrames} = useVideoConfig();

	const color =
		teamColor === 'blue'
			? COLORS.teamBlue
			: teamColor === 'red'
				? COLORS.teamRed
				: teamColor;

	const box = width * sizeRatio;

	/* normalise coordinates into a 0..100 viewBox */
	const pts = useMemo(() => {
		const w = coordinateSpace === 'pixels' ? (mapSize?.width ?? 100) : 1;
		const h = coordinateSpace === 'pixels' ? (mapSize?.height ?? 100) : 1;
		return routePath.map((p) => ({x: (p.x / w) * 100, y: (p.y / h) * 100}));
	}, [routePath, coordinateSpace, mapSize]);

	const dense = useMemo(() => smoothPolyline(pts), [pts]);
	const lens = useMemo(() => cumulativeLengths(dense), [dense]);
	const totalLen = lens[lens.length - 1] || 1;

	const d = useMemo(
		() =>
			dense
				.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(3)} ${p.y.toFixed(3)}`)
				.join(' '),
		[dense],
	);

	const delayF = delaySeconds * fps;
	const drawF = drawSeconds * fps;

	/* widget enlarges into place */
	const appear = spring({
		frame,
		fps,
		config: {damping: 16, mass: 0.5, stiffness: 170},
		durationInFrames: Math.round(fps * 0.45),
	});

	/* line self-draws */
	const drawProgress = interpolate(frame, [delayF, delayF + drawF], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
		easing: (t) => 1 - Math.pow(1 - t, 2.2), // eases out at the destination
	});

	const head = pointAt(dense, lens, drawProgress * totalLen);
	const start = dense[0] ?? {x: 0, y: 0};
	const end = dense[dense.length - 1] ?? {x: 0, y: 0};

	/* destination marker pulses once the line lands */
	const arrived = drawProgress > 0.985;
	const pulseT = (frame / fps) * 2.4;
	const pulse = arrived ? (Math.sin(pulseT * Math.PI) + 1) / 2 : 0;

	/* exit fade */
	const holdF =
		holdAfterDrawSeconds === undefined
			? undefined
			: (delaySeconds + drawSeconds + holdAfterDrawSeconds) * fps;
	const fadeOutStart = holdF ?? durationInFrames - fps * 0.35;
	const outFade = interpolate(
		frame,
		[fadeOutStart, fadeOutStart + fps * 0.35],
		[1, 0],
		{extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
	);

	const opacity = appear * outFade;

	const posStyle: React.CSSProperties =
		position === 'center'
			? {
					// Centre within the PARENT (which may be the gameplay half of a
					// split-screen), not within the full canvas.
					left: '50%',
					top: '50%',
				}
			: {
					left: position.endsWith('left') ? width * margin : undefined,
					right: position.endsWith('right') ? width * margin : undefined,
					top: position.startsWith('top') ? width * margin : undefined,
					bottom: position.startsWith('bottom') ? width * margin : undefined,
				};

	const centreShift =
		position === 'center' ? 'translate(-50%, -50%) ' : '';

	const strokeW = 2.1;

	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			<div
				style={{
					position: 'absolute',
					width: box,
					...posStyle,
					opacity,
					transform: `${centreShift}scale(${interpolate(appear, [0, 1], [0.86, 1])})`,
					willChange: 'transform, opacity',
				}}
			>
				{title ? (
					<div
						style={{
							fontFamily: FONT_CONDENSED,
							fontSize: box * 0.055,
							letterSpacing: '0.22em',
							textTransform: 'uppercase',
							color: '#FFFFFF',
							textShadow: `0 2px 10px rgba(0,0,0,0.9), 0 0 ${box * 0.05}px ${color}`,
							marginBottom: box * 0.025,
							display: 'flex',
							alignItems: 'center',
							gap: box * 0.02,
						}}
					>
						<span
							style={{
								width: box * 0.03,
								height: box * 0.03,
								background: color,
								boxShadow: `0 0 ${box * 0.04}px ${color}`,
								display: 'inline-block',
								transform: 'rotate(45deg)',
							}}
						/>
						{title}
					</div>
				) : null}

				<div
					style={{
						position: 'relative',
						width: box,
						height: box,
						borderRadius: box * 0.02,
						overflow: 'hidden',
						border: `${Math.max(2, box * 0.006)}px solid ${color}`,
						boxShadow: `0 0 ${box * 0.06}px ${color}88, 0 ${box * 0.03}px ${
							box * 0.09
						}px rgba(0,0,0,0.65), inset 0 0 ${box * 0.12}px rgba(0,0,0,0.7)`,
						background: '#0A1014',
					}}
				>
					{minimapSrc ? (
						<Img
							src={minimapSrc}
							style={{width: '100%', height: '100%', objectFit: 'cover'}}
						/>
					) : (
						<StylisedMap />
					)}

					{/* darken the map slightly so the route pops */}
					<AbsoluteFill style={{background: 'rgba(4,8,12,0.28)'}} />

					<svg
						viewBox="0 0 100 100"
						style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}}
					>
						<defs>
							<filter id="routeGlow" x="-60%" y="-60%" width="220%" height="220%">
								<feGaussianBlur stdDeviation="2.2" result="b" />
								<feMerge>
									<feMergeNode in="b" />
									<feMergeNode in="b" />
								</feMerge>
							</filter>
							<filter id="headGlow" x="-200%" y="-200%" width="500%" height="500%">
								<feGaussianBlur stdDeviation="1.6" />
							</filter>
						</defs>

						{/* faint full route so the viewer knows where it's heading */}
						<path
							d={d}
							fill="none"
							stroke={color}
							strokeOpacity={0.18}
							strokeWidth={strokeW * 0.7}
							strokeLinecap="round"
							strokeDasharray="1.6 2.4"
						/>

						{/* glow underlay */}
						<path
							d={d}
							fill="none"
							stroke={color}
							strokeWidth={strokeW * 2.4}
							strokeLinecap="round"
							strokeLinejoin="round"
							filter="url(#routeGlow)"
							opacity={0.75}
							pathLength={1}
							strokeDasharray="1 1"
							strokeDashoffset={1 - drawProgress}
						/>

						{/* team-coloured body */}
						<path
							d={d}
							fill="none"
							stroke={color}
							strokeWidth={strokeW * 1.55}
							strokeLinecap="round"
							strokeLinejoin="round"
							pathLength={1}
							strokeDasharray="1 1"
							strokeDashoffset={1 - drawProgress}
						/>

						{/* hot core */}
						<path
							d={d}
							fill="none"
							stroke="#FFFFFF"
							strokeWidth={strokeW * 0.55}
							strokeLinecap="round"
							strokeLinejoin="round"
							pathLength={1}
							strokeDasharray="1 1"
							strokeDashoffset={1 - drawProgress}
							opacity={0.95}
						/>

						{/* start marker */}
						<g opacity={drawProgress > 0 ? 1 : 0}>
							<circle cx={start.x} cy={start.y} r={2.6} fill="#0A0E14" stroke={color} strokeWidth={1} />
							<circle cx={start.x} cy={start.y} r={1.1} fill={color} />
						</g>

						{/* travelling head */}
						{!arrived ? (
							<g>
								<circle cx={head.x} cy={head.y} r={3.4} fill={color} opacity={0.55} filter="url(#headGlow)" />
								<circle cx={head.x} cy={head.y} r={1.7} fill="#FFFFFF" />
							</g>
						) : null}

						{/* destination pulse */}
						<g opacity={arrived ? 1 : 0}>
							<circle
								cx={end.x}
								cy={end.y}
								r={3 + pulse * 6}
								fill="none"
								stroke={color}
								strokeWidth={0.9}
								opacity={1 - pulse}
							/>
							<circle
								cx={end.x}
								cy={end.y}
								r={3 + pulse * 1.2}
								fill={color}
								opacity={0.9}
								filter="url(#headGlow)"
							/>
							<circle cx={end.x} cy={end.y} r={1.6} fill="#FFFFFF" />
						</g>
					</svg>

					{/* corner ticks for the HUD feel */}
					{(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
						<div
							key={c}
							style={{
								position: 'absolute',
								width: box * 0.07,
								height: box * 0.07,
								top: c[0] === 't' ? box * 0.02 : undefined,
								bottom: c[0] === 't' ? undefined : box * 0.02,
								left: c[1] === 'l' ? box * 0.02 : undefined,
								right: c[1] === 'l' ? undefined : box * 0.02,
								borderTop: c[0] === 't' ? `2px solid rgba(255,255,255,0.55)` : undefined,
								borderBottom: c[0] === 't' ? undefined : `2px solid rgba(255,255,255,0.55)`,
								borderLeft: c[1] === 'l' ? `2px solid rgba(255,255,255,0.55)` : undefined,
								borderRight: c[1] === 'l' ? undefined : `2px solid rgba(255,255,255,0.55)`,
							}}
						/>
					))}

					{/* labels pinned to the route ends */}
					{startLabel ? (
						<Tag box={box} x={start.x} y={start.y} color={color} opacity={1}>
							{startLabel}
						</Tag>
					) : null}
					{endLabel ? (
						<Tag
							box={box}
							x={end.x}
							y={end.y}
							color={color}
							opacity={arrived ? 1 : 0}
						>
							{endLabel}
						</Tag>
					) : null}
				</div>
			</div>
		</AbsoluteFill>
	);
};

const Tag: React.FC<{
	box: number;
	x: number;
	y: number;
	color: string;
	opacity: number;
	children: React.ReactNode;
}> = ({box, x, y, color, opacity, children}) => (
	<div
		style={{
			position: 'absolute',
			left: `${x}%`,
			top: `${y}%`,
			transform: `translate(${x > 60 ? '-108%' : '12%'}, -50%)`,
			fontFamily: FONT_CONDENSED,
			fontSize: box * 0.038,
			letterSpacing: '0.14em',
			textTransform: 'uppercase',
			color: '#FFFFFF',
			background: 'rgba(6,10,16,0.82)',
			border: `1px solid ${color}`,
			padding: `${box * 0.008}px ${box * 0.018}px`,
			whiteSpace: 'nowrap',
			opacity,
			boxShadow: `0 0 ${box * 0.03}px ${color}88`,
		}}
	>
		{children}
	</div>
);
