<script lang="ts">
	import { onMount } from 'svelte';

	type ChartDataset = {
		label: string;
		data: number[];
		borderColor: string;
		backgroundColor?: string;
		stepped?: boolean | string;
		fill?: boolean;
		yAxisID?: string;
	};

	let {
		title,
		datasets,
		labels,
		logScale = false,
		dualAxis = false
	}: {
		title: string;
		datasets: ChartDataset[];
		labels: number[];
		logScale?: boolean;
		dualAxis?: boolean;
	} = $props();

	let canvas: HTMLCanvasElement | undefined = $state();
	let chartInstance: { destroy: () => void } | undefined;

	onMount(async () => {
		const { Chart, registerables } = await import('chart.js');
		Chart.register(...registerables);

		if (!canvas) return;

		const scales: Record<string, object> = {
			x: {
				ticks: { color: 'white' },
				grid: { color: 'rgba(255,255,255,0.1)' },
				title: { display: true, text: 'Stage', color: 'white' }
			},
			y: {
				type: logScale ? 'logarithmic' : 'linear',
				ticks: { color: 'white' },
				grid: { color: 'rgba(255,255,255,0.1)' },
				position: 'left'
			}
		};

		if (dualAxis) {
			scales.y1 = {
				type: logScale ? 'logarithmic' : 'linear',
				ticks: { color: 'white' },
				grid: { drawOnChartArea: false },
				position: 'right'
			};
		}

		chartInstance = new Chart(canvas, {
			type: 'line',
			data: {
				labels,
				datasets: datasets.map((ds) => ({
					...ds,
					tension: 0.3,
					pointRadius: 2,
					borderWidth: 2,
					fill: ds.fill ?? false
				}))
			},
			options: {
				responsive: true,
				plugins: {
					title: { display: true, text: title, color: 'white', font: { size: 14 } },
					legend: { labels: { color: 'white' } }
				},
				scales
			}
		});

		return () => {
			chartInstance?.destroy();
		};
	});
</script>

<div class="chart-container">
	<canvas bind:this={canvas}></canvas>
</div>

<style>
	.chart-container {
		background: rgba(0, 0, 0, 0.3);
		border-radius: 8px;
		padding: 12px;
		margin-bottom: 12px;
	}
</style>
