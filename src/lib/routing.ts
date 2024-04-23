import { loadKey, type Bplan, type Link, type Timing } from './bplan';
import { MinPriorityQueue, PriorityQueue } from '@datastructures-js/priority-queue';

export function route(
	bplan: Bplan,
	fromTiploc: string,
	toTiploc: string,
	banLoads: string[]
): [number, Timing[]] {
	let fromNode = 's' + fromTiploc;
	let toNode = 's' + toTiploc;
	let prev: Record<string, Timing> = {};
	let dists = { [fromNode]: 0 };
	let done = new Set();
	let queue = new MinPriorityQueue<[number, string]>((x) => x[0]);

	queue.enqueue([0, fromNode]);

	outer: while (queue.size() > 0) {
		const current = queue.dequeue()[1];
		const currentTiploc = current.slice(1);
		const currentIsStop = current[0] == 's';
		if (done.has(current)) {
			continue;
		}
		if (current == toNode) {
			break outer;
		}

		for (const linkTo in bplan.links[currentTiploc]) {
			for (const link of bplan.links[currentTiploc][linkTo]) {
				for (const timing of link.timings) {
					if (timing.fromStart != currentIsStop) {
						continue;
					}
					if (banLoads.includes(loadKey(timing.load))) {
						continue;
					}
					const nextNode = (timing.toStop ? 's' : 'f') + linkTo;
					const alt = dists[current] + timing.time;
					if (!dists[nextNode] || alt < dists[nextNode]) {
						prev[nextNode] = timing;
						dists[nextNode] = alt;

						// we can't decrease priority; instead we allow duplicate
						// entries in the queue and filter them out with done
						queue.enqueue([alt, nextNode]);
					}
				}
			}
		}

		done.add(current);
	}

	if (!dists[toNode]) {
		throw new Error('pathfinding failed');
	}

	// trace back
	let hist = [prev[toNode]];
	while (true) {
		const prevNodeName =
			(hist[hist.length - 1].fromStart ? 's' : 'f') + hist[hist.length - 1].link.from.tiploc;
		if (prevNodeName == fromNode) {
			break;
		}
		hist.push(prev[prevNodeName]);
	}

	// hist = simplifyLoads(hist);

	hist = simplifyLoads(hist);

	hist.reverse();

	hist = simplifyLoads(hist);

	return [dists[toNode], hist];
}

function simplifyLoads(hist: Timing[]) {
	const seenLoads = new Set();

	return hist.map((timing) => {
		const betterTiming = timing.link.timings.find(
			(t) =>
				t.fromStart == timing.fromStart &&
				t.toStop == timing.toStop &&
				t.time <= timing.time &&
				seenLoads.has(loadKey(t.load))
		);

		const ret = betterTiming || timing;

		seenLoads.add(loadKey(ret.load));

		return ret;
	});
}
