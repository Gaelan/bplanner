<script lang="ts">
	import { loadBplan, loadKey } from '$lib/bplan';
	import { getTiplocLocations } from '$lib/railmap';
	import { route } from '$lib/routing';
	import { getFastestTiming } from '$lib/unused_astar';
	import { Temporal } from '@js-temporal/polyfill';

	const bplan = loadBplan();
	bplan.then((bp) => {
		console.log(bp);
		getTiplocLocations().then((locs) => console.log(getFastestTiming(bp, locs)));
	});

	let fromTiploc: string = 'LEUCHRS';
	let toTiploc: string = 'KNGX';
	let bannedLoads: string[] = [];
	let preferredLoads: string[] = [];

	$: r = (async () => {
		const bp = await bplan;
		if (!fromTiploc || !toTiploc || !bp.locations[fromTiploc] || !bp.locations[toTiploc]) {
			return null;
		}
		return route(bp, fromTiploc, toTiploc, preferredLoads, bannedLoads);
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
			<div>
				<label>From: <input class="tiploc" list="locs" bind:value={fromTiploc} /></label>
			</div>
			<div>
				<label>To: <input class="tiploc" list="locs" bind:value={toTiploc} /></label>
			</div>
			<datalist id="locs">
				{#each Object.keys(bplan.locations) as tiploc}
					<option value={tiploc}>{bplan.locations[tiploc].name}</option>
				{/each}
			</datalist>

			<!-- {#await stockOptions then stockOptions}
				{#if stockOptions}
					<button on:click={() => (loads = [...stockOptions])}>Select All</button>
					{#each stockOptions as opt}
						<div>
							<label>
								<input type="checkbox" bind:group={loads} value={opt} />
								{bplan.loads[opt].description}
							</label>
						</div>
					{/each}
				{/if}
			{/await} -->
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
					{#each r[1] as link}
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
