export interface Load {
	type: string;
	trailingLoad: string;
	speed: string;
	raGauge: string;
	description: string;
	itpsPowerType: string;
	itpsLoad: string;
	itpsSpeed: string;
}

export interface Location {
	tiploc: string;
	name: string;
	northing: number;
	easting: number;
	timingPointType: 'trust' | 'mandatory' | 'optional';
	zone: string;
	stanox: number;
	offNetwork: boolean;
	forceLine: 'approaching' | 'leaving' | 'both' | 'none';
}

export interface Link {
	from: Location;
	to: Location;
	line: string;
	lineDesc: string;
	fromDir: 'up' | 'down';
	toDir: 'up' | 'down';
	distance: number;
	dooPassenger: boolean;
	dooNonPassenger: boolean;
	retb: boolean;
	zone: string;
	reversible: 'bidirectional' | 'reversible' | 'neither';
	powerSupply: string;
	ra: number;
	maxTrainLength: number;
	timings: Timing[];
}

export interface Timing {
	link: Link;
	load: Load;
	fromStart: boolean;
	toStop: boolean;
	time: number; //seconds
}

export interface Bplan {
	loads: Record<string, Load>; // key: loadKey()
	locations: Record<string, Location>; // key: tiploc
	links: Record<string, Record<string, Link[]>>; // keys: from and to tiploc
	timings: Timing[];
}

export function loadKey(load: Load) {
	return [load.type, load.trailingLoad, load.speed, load.raGauge].join(' ');
}

export async function loadBplan(): Promise<Bplan> {
	// it's named this to avoid sveltekit serving it as content-encoding: gz
	// in development, when we can't guarantee this happen in production
	const req = await fetch('/bplan.gz.bleh');
	if (!req.ok || !req.body) {
		throw new Error('failed to fetch bplan data');
	}

	return loadBplanFromCompressedStream(req.body);
}

export async function loadBplanFromCompressedStream(stream: ReadableStream): Promise<Bplan> {
	return parseStream(
		stream.pipeThrough(new DecompressionStream('gzip')).pipeThrough(new TextDecoderStream('utf-8'))
	);
}

function handleLine(bplan: Bplan, line: string) {
	const parts = line.split('\t');

	if (parts[0] == 'TLD') {
		const load: Load = {
			// 0 "TLD"
			// 1 "A"
			type: parts[2].trim(),
			trailingLoad: parts[3].trim(),
			speed: parts[4].trim(),
			raGauge: parts[5].trim(),
			description: parts[6],
			itpsPowerType: parts[7],
			itpsLoad: parts[8],
			itpsSpeed: parts[9]
		};
		bplan.loads[loadKey(load)] = load;
	} else if (parts[0] == 'LOC') {
		if (parts[5] != '') {
			console.log(parts);
		}
		const loc = {
			// 0 "LOC"
			// 1 "A"
			tiploc: parts[2],
			name: parts[3],
			// 4 start date
			// 5 end date
			easting: parseInt(parts[6]),
			northing: parseInt(parts[7]),
			timingPointType: ({ T: 'trust', M: 'mandatory', O: 'optional' } as const)[parts[8]]!,
			zone: parts[9],
			stanox: parseInt(parts[10]),
			offNetwork: parts[11] == 'Y',
			forceLine: ({ L: 'approaching', P: 'leaving', B: 'both', ' ': 'none' } as const)[parts[12]]!
		};
		bplan.locations[loc.tiploc] = loc;
	} else if (parts[0] == 'NWK') {
		if (parts[7] != '') {
			// console.log('expires', parts);
		}
		const link: Link = {
			// 0 "NWK"
			// 1 "A"
			from: bplan.locations[parts[2]],
			to: bplan.locations[parts[3]],
			line: parts[4].trim(),
			lineDesc: parts[5],
			// 6 start date
			// 7 end date
			fromDir: ({ U: 'up', D: 'down' } as const)[parts[8]]!,
			toDir: ({ U: 'up', D: 'down' } as const)[parts[9]]!,
			distance: parseInt(parts[10]),
			dooPassenger: parts[11] == 'Y',
			dooNonPassenger: parts[12] == 'Y',
			retb: parts[13] == 'Y',
			zone: parts[14],
			reversible: ({ R: 'reversible', B: 'bidirectional', N: 'neither' } as const)[parts[15]]!,
			powerSupply: parts[16],
			ra: parseInt(parts[17]),
			maxTrainLength: parseInt(parts[18]),
			timings: []
		};
		if (!link.from) {
			console.log(parts);
			return;
		}
		bplan.links[link.from.tiploc] ||= {};
		bplan.links[link.from.tiploc][link.to.tiploc] ||= [];
		bplan.links[link.from.tiploc][link.to.tiploc].push(link);
	} else if (parts[0] == 'TLK') {
		if (parts[7] != '') {
			// console.log(parts);
		}

		const timeParts = parts[13].split("'");
		const timing = {
			// 0 "TLK"
			// 1 "A"
			link: bplan.links[parts[2]][parts[3]].find((l) => l.line == parts[4].trim())!,
			load: bplan.loads[
				parts
					.slice(5, 9)
					.map((x) => x.trim())
					.join(' ')
			],
			fromStart: parts[9] == '0',
			toStop: parts[10] == '0',
			// 11 start date
			// 12 end date
			time: parseInt(timeParts[0]) * 60 + parseInt(timeParts[1]),
			description: parts[14]
		};

		timing.link.timings.push(timing);
		bplan.timings.push(timing);
	}
}

async function parseStream(stream: ReadableStream<string>): Promise<Bplan> {
	const bplan = {
		locations: {},
		links: {},
		loads: {},
		timings: []
	};

	let currentLine = '';

	const reader = stream.getReader();

	while (true) {
		const result = await reader.read();
		if (result.done) {
			break;
		}

		const lineParts = result.value.split('\n');

		if (lineParts.length == 1) {
			currentLine += lineParts[0];
		} else {
			currentLine += lineParts[0];
			handleLine(bplan, currentLine);
			lineParts.slice(1, -1).forEach((x) => handleLine(bplan, x));
			currentLine = lineParts[lineParts.length - 1];
		}
	}

	return bplan;
}
