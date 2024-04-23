<script lang="ts">
	import { loadBplan, loadKey, type Timing } from '$lib/bplan';
	import { getTiplocLocations } from '$lib/railmap';
	import { route } from '$lib/routing';
	import { getFastestTiming } from '$lib/unused_astar';
	import { Temporal } from '@js-temporal/polyfill';

	const bplan = loadBplan();
	bplan.then((bp) => {
		console.log(bp);
	});

	let waypoints: { tiploc: string; stop: boolean; dwell: number }[] = [
		{ tiploc: 'EDINBUR', stop: true, dwell: 0 },
		{ tiploc: 'KNGX', stop: true, dwell: 0 }
	];
	let bannedLoads: string[] = ['BUS  0 '];
	let preferredLoads: string[] = [];

	let r: Promise<[number, Timing[]] | null>;

	$: r = (async () => {
		const bp = await bplan;
		if (waypoints.some((x) => !bp.locations[x.tiploc])) {
			return null;
		}
		console.log(bannedLoads);
		const segments = waypoints
			.slice(1)
			.map((x, i) =>
				route(
					bp,
					waypoints[i].tiploc,
					waypoints[i].stop,
					x.tiploc,
					x.stop,
					preferredLoads,
					bannedLoads
				)
			);
		const ret: [number, Timing[]] = [
			segments.map((x) => x[0]).reduce((a, b) => a + b),
			segments.map((x) => x[1]).flat()
		];
		return ret;
	})();

	$: usedLoads = (async () => {
		const rr = await r;
		if (rr) {
			return [...new Set(rr[1].map((x) => x.load))];
		}
	})();
</script>

{#await bplan}
	Loading…
{:then bplan}
	<div id="main">
		<div>
			{#each waypoints as _, i}
				<div>
					<input class="tiploc" list="locs" bind:value={waypoints[i].tiploc} />
					<select bind:value={waypoints[i].stop}>
						<option value={true}>stop</option>
						<option value={false}>pass</option>
					</select>
					{#if waypoints.length > 2}
						<button
							on:click={() => {
								waypoints.splice(i, 1);
								waypoints = waypoints;
							}}>x</button
						>
					{/if}
					<button
						on:click={() => {
							waypoints.splice(i + 1, 0, { tiploc: '', stop: true, dwell: 1 });
							waypoints = waypoints;
						}}>+</button
					>
					<br />
				</div>
			{/each}
			<datalist id="locs">
				{#each Object.keys(bplan.locations) as tiploc}
					<option value={tiploc}>{bplan.locations[tiploc].name}</option>
				{/each}
			</datalist>

			Using timings for rolling stock:

			{#await usedLoads then usedLoads}
				{#if usedLoads}
					{#each usedLoads as load}
						<div>
							<button
								on:click={() => (bannedLoads = [loadKey(load), ...bannedLoads])}
								title="Do not use this rolling stock"
							>
								x
							</button>
							<button
								on:click={() => (preferredLoads = [loadKey(load), ...preferredLoads])}
								title="Use timings for this rolling stock wherever available"
							>
								*
							</button>
							{load.description}
						</div>
					{/each}
				{/if}
			{/await}

			<div>
				Preferred rolling stock:

				{#each preferredLoads as load}
					<div>
						<button on:click={() => (preferredLoads = preferredLoads.filter((x) => x != load))}>
							x
						</button>
						{bplan.loads[load].description}
					</div>
				{/each}
			</div>

			<div>
				Excluded rolling stock:

				{#each bannedLoads as load}
					<div>
						<button on:click={() => (bannedLoads = bannedLoads.filter((x) => x != load))}>
							x
						</button>
						{bplan.loads[load].description}
					</div>
				{/each}
			</div>
		</div>
		<div class="results">
			{#await r then r}
				{#if r}
					<div>
						{Temporal.Duration.from({ seconds: r[0] })
							.round({ largestUnit: 'hour', smallestUnit: 'second' })
							.toLocaleString()}
					</div>
					{#each r[1] as link, i}
						<div>
							<div class="point" class:stop={link.fromStart}>{link.link.from.name}</div>

							<div class="link">
								{Temporal.Duration.from({ seconds: link.time })
									.round({ largestUnit: 'hour', smallestUnit: 'second' })
									.toLocaleString()} ({link.load.description})
							</div>
						</div>
					{/each}
					<div class="point stop">{r[1][r[1].length - 1].link.to.name}</div>
				{/if}
			{/await}
		</div>
	</div>
{/await}

<style>
	:global(*) {
		box-sizing: border-box;
	}
	:global(body) {
		margin: 0;
	}
	input.tiploc {
		width: 32em;
	}

	* {
		font-family: sans-serif;
	}

	#main {
		display: flex;
	}

	#main > div {
		height: 100vh;
		overflow: scroll;
		padding: 10px;
	}

	.link {
		margin-left: 1em;
		color: grey;
	}

	.stop {
		font-weight: bold;
	}

	.results {
		flex: 1;
	}
</style>
