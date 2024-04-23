import { describe, it, expect, beforeAll } from 'vitest';
import { route } from './routing';
import { loadBplan, loadBplanFromCompressedStream, loadKey, type Bplan } from './bplan';
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
		const [dist, hist] = route(bplan, 'LEUCHRS', true, 'EDINBUR', true, [], []);

		expect([
			dist,
			hist.map((x) => [x.link.from.tiploc, x.link.to.tiploc, x.load.description, x.time])
		]).toMatchSnapshot();
	});

	it('Leuchars-Edinburgh with preferred loads', async () => {
		const [dist, hist] = route(bplan, 'LEUCHRS', true, 'EDINBUR', true, ['170  100 '], []);

		expect([
			dist,
			hist.map((x) => [x.link.from.tiploc, x.link.to.tiploc, x.load.description, x.time])
		]).toMatchSnapshot();
	});

	it('Leuchars-London', async () => {
		const [dist, hist] = route(bplan, 'LEUCHRS', true, 'KNGX', true, [], []);

		expect([
			dist,
			hist.map((x) => [x.link.from.tiploc, x.link.to.tiploc, x.load.description, x.time])
		]).toMatchSnapshot();
	});

	it('Leuchars-London with banned loads', async () => {
		const [dist, hist] = route(bplan, 'LEUCHRS', true, 'KNGX', true, [], ['BUS   ']);

		expect([
			dist,
			hist.map((x) => [x.link.from.tiploc, x.link.to.tiploc, x.load.description, x.time])
		]).toMatchSnapshot();
	});
});
