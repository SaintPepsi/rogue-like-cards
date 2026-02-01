<script lang="ts">
	import { onDestroy } from 'svelte';
	import type { Chart as ChartType } from 'chart.js';

	type ChartDataset = {
		label: string;
		data: number[];
		borderColor: string;
		backgroundColor?: string;
		stepped?: boolean | 'before' | 'after' | 'middle';
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
	let chartInstance: ChartType | undefined;
	let chartModule: typeof import('chart.js') | undefined;

	function buildScales(): Record<string, object> {
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

		return scales;
	}

	function mapDatasets(input: ChartDataset[]) {
		return input.map((ds) => ({
			...ds,
			tension: 0.3,
			pointRadius: 2,
			borderWidth: 2,
			fill: ds.fill ?? false
		}));
	}

	$effect(() => {
		// Read reactive deps: datasets, labels, title, canvas
		const currentDatasets = datasets;
		const currentLabels = labels;
		const currentTitle = title;
		const currentCanvas = canvas;

		if (!currentCanvas) return;

		// Lazy-load Chart.js once, then create/update
		if (!chartModule) {
			import('chart.js').then((mod) => {
				chartModule = mod;
				mod.Chart.register(...mod.registerables);
				createChart(currentCanvas, currentLabels, currentDatasets, currentTitle);
			});
			return;
		}

		if (!chartInstance) {
			createChart(currentCanvas, currentLabels, currentDatasets, currentTitle);
			return;
		}

		// Update existing chart in-place
		chartInstance.data.labels = currentLabels;
		chartInstance.data.datasets = mapDatasets(currentDatasets);
		chartInstance.options.plugins!.title = {
			display: true,
			text: currentTitle,
			color: 'white',
			font: { size: 14 }
		};
		chartInstance.update();
	});

	function createChart(
		canvasEl: HTMLCanvasElement,
		chartLabels: number[],
		chartDatasets: ChartDataset[],
		chartTitle: string
	) {
		if (!chartModule) return;

		chartInstance?.destroy();
		chartInstance = new chartModule.Chart(canvasEl, {
			type: 'line',
			data: {
				labels: chartLabels,
				datasets: mapDatasets(chartDatasets)
			},
			options: {
				responsive: true,
				plugins: {
					title: { display: true, text: chartTitle, color: 'white', font: { size: 14 } },
					legend: { labels: { color: 'white' } }
				},
				scales: buildScales()
			}
		});
	}

	onDestroy(() => {
		chartInstance?.destroy();
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
