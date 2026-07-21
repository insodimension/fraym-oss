import type { SelectorMenuCategory } from "@fraym-ai/ui";

export interface CityItem {
	readonly id: string;
	readonly name: string;
	readonly country: string;
	readonly population: string;
}

export const CITY_CATEGORIES: SelectorMenuCategory<CityItem>[] = [
	{
		id: "europe",
		label: "Europe",
		items: [
			{ id: "lon", name: "London", country: "UK", population: "8.8M" },
			{ id: "par", name: "Paris", country: "France", population: "2.1M" },
			{ id: "ber", name: "Berlin", country: "Germany", population: "3.6M" },
			{ id: "ams", name: "Amsterdam", country: "Netherlands", population: "0.9M" },
		],
	},
	{
		id: "asia",
		label: "Asia",
		items: [
			{ id: "tok", name: "Tokyo", country: "Japan", population: "13.9M" },
			{ id: "sin", name: "Singapore", country: "Singapore", population: "5.6M" },
			{ id: "ban", name: "Bangkok", country: "Thailand", population: "10.5M" },
			{ id: "seo", name: "Seoul", country: "South Korea", population: "9.7M" },
		],
	},
	{
		id: "americas",
		label: "Americas",
		items: [
			{ id: "nyc", name: "New York", country: "USA", population: "8.3M" },
			{ id: "la", name: "Los Angeles", country: "USA", population: "3.9M" },
			{ id: "tor", name: "Toronto", country: "Canada", population: "2.9M" },
			{ id: "mx", name: "Mexico City", country: "Mexico", population: "9.2M" },
		],
	},
];
