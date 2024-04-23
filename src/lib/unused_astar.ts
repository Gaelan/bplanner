// aborted attempt to implement A* - too much bad data

import type { Bplan, Timing, Location } from './bplan';

// locations for which we can't do the speed heuristic
const badLocs = [
	// eurotunnel timetable hacks
	'HONDEGM',
	// bad bus link to notts
	'BOSTON',
	// bad bus link to preston
	'MNCRIAP',
	// bad bus link to Collingham
	'CHARTHM',
	// bad bus link to Peebles
	'EDINBUS'
];

// CC BY-SA https://stackoverflow.com/questions/27928/calculate-distance-between-two-latitude-longitude-points-haversine-formula
function distance(lat1: number, lon1: number, lat2: number, lon2: number) {
	const r = 6371; // km
	const p = Math.PI / 180;

	const a =
		0.5 -
		Math.cos((lat2 - lat1) * p) / 2 +
		(Math.cos(lat1 * p) * Math.cos(lat2 * p) * (1 - Math.cos((lon2 - lon1) * p))) / 2;

	return 2 * r * Math.asin(Math.sqrt(a));
}

function timingSpeed(timing: Timing, tiplocs: Record<string, [number, number]>) {
	if (!tiplocs[timing.link.from.tiploc]) {
		console.log(timing);
	}
	const dist = distance(...tiplocs[timing.link.from.tiploc], ...tiplocs[timing.link.to.tiploc]);
	return dist / timing.time;
}

export function getFastestTiming(bplan: Bplan, tiplocs: Record<string, [number, number]>) {
	let fastest = null;
	let fastestSpeed = 0;
	let tooFast = 0;

	bplan.timings.forEach((t) => {
		if (badLocs.includes(t.link.from.tiploc) || badLocs.includes(t.link.to.tiploc)) {
			return;
		}
		if (t.time == 0) {
			return;
		}

		if (!tiplocs[t.link.from.tiploc] || !tiplocs[t.link.to.tiploc]) {
			return;
		}

		if (timingSpeed(t, tiplocs) > 1000) {
			tooFast++;
		}

		if (timingSpeed(t, tiplocs) > fastestSpeed) {
			fastest = t;
			fastestSpeed = timingSpeed(t, tiplocs);
		}
	});

	return [fastest, fastestSpeed, tooFast];
}
