import { describe, it, expect, beforeAll } from 'vitest';
import { route } from './routing';
import { loadBplan, loadBplanFromCompressedStream, type Bplan } from './bplan';
import { createReadableStreamFromReadable } from './testUtil';
import { createReadStream } from 'node:fs';

let bplan: Bplan;

beforeAll(async () => {
	bplan = await loadBplanFromCompressedStream(
		createReadableStreamFromReadable(createReadStream('static/bplan.gz.bleh'))
	);
}); //.map((x) => [x.link.from.tiploc, x.link.to.tiploc, x.load.description, x.time])

describe('route', () => {
	it('Leuchars-Edinburgh', async () => {
		const [dist, hist] = route(bplan, 'LEUCHRS', 'EDINBUR', []);

		expect([
			dist,
			hist.map((x) => [x.link.from.tiploc, x.link.to.tiploc, x.load.description, x.time])
		]).toMatchSnapshot();
	});

	it('Leuchars-London', async () => {
		const [dist, hist] = route(bplan, 'LEUCHRS', 'KNGX', []);

		expect([
			dist,
			hist.map((x) => [x.link.from.tiploc, x.link.to.tiploc, x.load.description, x.time])
		]).toMatchSnapshot();
	});
});
