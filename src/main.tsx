import type { Plugin } from "@samvera/clover-iiif";
import Viewer from "@samvera/clover-iiif/viewer";
import { type ReactNode, StrictMode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";
import "./style.css";

const API = "https://art-api.famsf.org/api/v1/develop";
const IIIF = "https://iiif.famsf.org/iiif/3";

type ArtObject = {
	label: string;
	id: string;
	title: string;
	date: string;
	artist: string;
	medium: string;
	details: [string, string][];
	department: string;
	copyright: string;
	citation: string;
	/** Rights allow download. Otherwise the page offers a request instead. */
	download: boolean;
	relatedLabel: string;
	related: [title: string, date: string, imageId: string][];
};

const objects: Record<string, ArtObject> = {
	book: {
		label: "Yeats book: 5 images, download",
		id: "68102",
		title: "Poems of W. B. Yeats (San Francisco: Arion Press, 1990)",
		date: "1990",
		artist: "Richard Diebenkorn (1922–1993)",
		medium: "Book with six etchings",
		details: [
			["Dimensions", "Object: 276 x 215 x 42 mm (10 7/8 x 8 7/16 x 1 5/8 in.)"],
			["Collection area", "Achenbach Foundation for Graphic Arts"],
			["Object type", "Artist's Book"],
			["Credit line", "Gift of George Hellyer in honor of Ira Yeager"],
			["Accession number", "1999.137.27"],
		],
		department: "Achenbach Foundation for Graphic Arts",
		copyright:
			"© 2026 Richard Diebenkorn Foundation / Artists Rights Society (ARS), New York",
		citation: "Gift of George Hellyer in honor of Ira Yeager, 1999.137.27",
		download: true,
		relatedLabel: "More by this artist",
		related: [
			["Seawall", "1957", "A314807_V3_crop"],
			["Folsom Street Variations III", "1986", "MS_106521_20260710-01_crop"],
			["Ocean Park #116", "1979", "RD1546PUB"],
			["Berkeley # 3", "1953", "RD1102PUB"],
			["iii from the set 4-12-75", "1975", "MS_303613_20230719_1_crop"],
			["Trial proof for Blue Surround", "1982", "5050161216210028"],
		],
	},
	shoe: {
		label: "Baby shoe: 1 image, no download",
		id: "74092",
		title: "One baby shoe",
		date: "early 20th century",
		artist: "Unknown artist",
		medium: "leather",
		details: [
			["Dimensions", "7.5 x 11.5 x 5 cm (2 15/16 x 4 1/2 x 1 15/16 in.)"],
			["Collection area", "Costume and Textile Arts"],
			["Object type", "Costume"],
			["Credit line", "Gift of Mrs. Marie Clary"],
			["Accession number", "1980.62.20"],
		],
		department: "Costume and Textile Arts",
		copyright: "Copyright status is unknown",
		citation: "Gift of Mrs. Marie Clary, 1980.62.20",
		download: false,
		relatedLabel: "More from this collection",
		related: [
			["One baby shoe", "early 20th century", "0820200210230233"],
			["Pair of baby shoes", "ca. 1913", "0820200210230241"],
			["Pair of baby shoes", "early 20th century", "0820200210230235"],
			["Pair of baby shoes", "early 20th century", "0820200210230236"],
			["Pair of baby shoes", "early 20th century", "0820200210230188"],
			["Pair of baby shoes", "late 19th century", "0820200210230242"],
		],
	},
};

type LangMap = Record<string, string[]> | null | undefined;
type Manifest = { items?: { id: string; summary?: LangMap }[] };
type ViewerOptions = NonNullable<Parameters<typeof Viewer>[0]["options"]>;

const toText = (value: LangMap) =>
	value ? Object.values(value).flat().join(" ") : "";

// The Craft ImageViewer options, plus the film strip search hidden.
const siteOptions: ViewerOptions = {
	showIIIFBadge: false,
	showTitle: false,
	canvasHeight: "31.25rem",
	informationPanel: { open: false, renderToggle: false },
	openSeadragon: { showNavigator: false },
	showMediaSearch: false,
};

type Layout = {
	name: string;
	note: string;
	options: ViewerOptions;
	/** Viewer height, image plus film strip. Unset keeps the fixed canvasHeight. */
	height?: string;
	split?: boolean;
	/** Licence and download sit in the caption row, above the thumbnail strip. */
	actionsInViewer?: boolean;
};

const layouts: Record<string, Layout> = {
	current: {
		name: "Current",
		note: "Site options today: fixed 31.25rem canvas.",
		options: siteOptions,
	},
	compact: {
		name: "Current, compact",
		note: "Current, with licence and download in the caption row so the thumbnail strip comes last.",
		options: siteOptions,
		actionsInViewer: true,
	},
	panel: {
		name: "Info panel",
		note: "Clover's own side panel, open, with the object metadata in its About tab.",
		options: {
			...siteOptions,
			informationPanel: {
				open: true,
				renderToggle: true,
				renderAbout: true,
			},
		},
		height: "calc(100svh - 16rem)",
	},
	split: {
		name: "Split",
		note: "Stock viewer in a two-thirds column; title, artist and medium beside it.",
		options: siteOptions,
		height: "calc(100svh - 14rem)",
		split: true,
	},
};

const param = <T extends string>(name: string, keys: T[]) => {
	const value = new URLSearchParams(location.search).get(name);
	return keys.find((k) => k === value) ?? keys[0];
};

function ImageActions({
	object,
	compact = false,
}: {
	object: ArtObject;
	compact?: boolean;
}) {
	const button = `shrink-0 rounded-full border border-black ${compact ? "px-5 py-1.5 text-sm" : "px-8 py-3"}`;
	return object.download ? (
		<div className="flex shrink-0 items-center gap-4">
			<span
				className={`leading-none font-black ${compact ? "text-3xl" : "text-5xl"}`}
				title="Licence"
			>
				C
			</span>
			<button type="button" className={button}>
				Download
			</button>
		</div>
	) : (
		<button type="button" className={button}>
			Request information
		</button>
	);
}

/**
 * Shows the active canvas's summary directly under the image, above Clover's
 * thumbnail strip. Clover's only plugin slot is inside its toolbar, so this
 * renders into its own element placed after `.clover-viewer-painting`.
 */
function CaptionPlugin({
	useViewerState,
	actions,
}: Plugin & { actions?: ReactNode }) {
	const { activeCanvas, openSeadragonViewer, vault } = useViewerState();
	const [slot, setSlot] = useState<HTMLElement>();

	useEffect(() => {
		const painting = openSeadragonViewer?.element?.closest(
			".clover-viewer-painting",
		);
		if (!painting) return;
		const el = document.createElement("div");
		painting.after(el);
		setSlot(el);
		return () => el.remove();
	}, [openSeadragonViewer]);

	const summary = toText(
		(vault.get({ id: activeCanvas, type: "Canvas" }) as { summary?: LangMap })
			?.summary,
	);
	if (!slot || (!summary && !actions)) return null;
	return createPortal(
		<div className="caption-row flex flex-col items-start gap-3 bg-white py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
			<p className="text-sm text-zinc-600">{summary}</p>
			{actions}
		</div>,
		slot,
	);
}

function Clover({
	manifest,
	object,
	layout,
}: {
	manifest: Manifest;
	object: ArtObject;
	layout: Layout;
}) {
	return (
		<figure
			className={
				layout.split
					? ""
					: "[&_.caption-row]:px-8 [&_.clover-viewer-media-wrapper]:px-8"
			}
		>
			{/* Clover's "auto" height needs a positioned parent with a set height. */}
			<div className="relative z-0" style={{ height: layout.height }}>
				<Viewer
					iiifContent={manifest as never}
					options={
						layout.height
							? { ...layout.options, canvasHeight: "auto" }
							: layout.options
					}
					plugins={[
						{
							id: "caption",
							imageViewer: {
								controls: {
									component: CaptionPlugin,
									componentProps: layout.actionsInViewer
										? { actions: <ImageActions object={object} compact /> }
										: {},
								},
							},
						},
					]}
				/>
			</div>
			{!layout.actionsInViewer && (
				<div className={`mt-4 ${layout.split ? "" : "px-8"}`}>
					<ImageActions object={object} />
				</div>
			)}
		</figure>
	);
}

function FrontMatter({ object }: { object: ArtObject }) {
	return (
		<div className="max-w-sm space-y-2">
			<p className="text-xl font-semibold">{object.title}</p>
			<p>{object.artist}</p>
			<p>{object.date}</p>
			<p className="text-sm text-zinc-600">{object.medium}</p>
			<p className="mt-4 inline-block rounded-full bg-zinc-100 px-3 py-1 text-sm">
				Not on view
			</p>
		</div>
	);
}

function DataRows({ rows }: { rows: [string, string][] }) {
	return (
		<dl className="divide-y divide-zinc-200 border-y border-zinc-200">
			{rows.map(([k, v]) => (
				<div
					key={k}
					className="grid gap-1 py-3 sm:grid-cols-[12rem_1fr] sm:gap-6"
				>
					<dt className="text-sm text-zinc-500">{k}</dt>
					<dd>{v}</dd>
				</div>
			))}
		</dl>
	);
}

function Disclosure({
	summary,
	children,
}: {
	summary: string;
	children: ReactNode;
}) {
	return (
		<details className="group border-t border-zinc-300">
			<summary className="flex cursor-pointer list-none items-center justify-between py-5 text-2xl font-semibold">
				{summary}
				<span className="text-3xl font-light transition-transform group-open:rotate-45">
					+
				</span>
			</summary>
			<div className="pb-8">{children}</div>
		</details>
	);
}

// Section order follows the Craft site's templates/_pages/artwork.twig.
function PageBody({
	object,
	withFrontMatter,
}: {
	object: ArtObject;
	withFrontMatter: boolean;
}) {
	return (
		<>
			<nav className="sticky top-10 z-10 mt-12 flex gap-6 overflow-x-auto border-y border-zinc-200 bg-white px-8 py-3 text-sm">
				{[
					"Object details",
					"Additional information",
					"Provenance",
					"Rights and citation",
				].map((s) => (
					<a key={s} href="#top" className="whitespace-nowrap hover:underline">
						{s}
					</a>
				))}
			</nav>
			<div className="grid gap-10 px-8 py-12 lg:grid-cols-12">
				<div className="self-start lg:sticky lg:top-28 lg:col-span-4">
					{withFrontMatter && <FrontMatter object={object} />}
				</div>
				<div className="flex flex-col gap-16 lg:col-span-8">
					<section>
						<h2 className="mb-8 text-3xl font-semibold">Object details</h2>
						<DataRows
							rows={[
								["Artist", object.artist],
								["Date", object.date],
								["Medium", object.medium],
								...object.details,
							]}
						/>
					</section>
					<div className="border-b border-zinc-300">
						<Disclosure summary="Additional information">
							<DataRows rows={[["Department", object.department]]} />
						</Disclosure>
						<Disclosure summary="Provenance">
							<p className="text-zinc-500">Placeholder: provenance entries.</p>
						</Disclosure>
					</div>
					<section>
						<h2 className="mb-6 text-3xl font-semibold">Rights and citation</h2>
						<p className="text-sm">{object.copyright}</p>
						<p className="mt-4 text-sm text-zinc-600">
							{object.artist}, <i>{object.title}</i>, {object.date}. Fine Arts
							Museums of San Francisco, {object.citation}.
						</p>
					</section>
				</div>
			</div>
			<section className="mt-12 px-8">
				<h2 className="text-3xl font-semibold">Related works</h2>
				<div className="mt-6 flex gap-6 border-b border-zinc-200 text-sm">
					<span className="border-b-2 border-black pb-2 font-semibold">
						{object.relatedLabel}
					</span>
					<span className="pb-2 text-zinc-500">Same time period</span>
				</div>
				<div className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-6">
					{object.related.map(([t, d, id]) => (
						<a key={id} href="#top" className="block">
							<div className="grid aspect-square place-items-center bg-stage p-3">
								<img
									src={`${IIIF}/${id}/thumb-400.webp`}
									alt=""
									className="max-h-full object-contain"
								/>
							</div>
							<p className="mt-3 font-medium">{t}</p>
							<p className="text-sm text-zinc-600">{d}</p>
						</a>
					))}
				</div>
			</section>
			<div className="mx-8 mt-16 border border-zinc-200 px-4 py-3 text-sm text-zinc-500">
				Artwork records are living documents and may be updated as new research
				emerges.
			</div>
			<footer className="mt-24 bg-zinc-900 px-8 py-16 text-zinc-300">
				<p className="text-lg font-bold text-white">
					de Young \ Legion of Honor
				</p>
				<p className="mt-1">fine arts museums of san francisco</p>
			</footer>
		</>
	);
}

// Plain links: Clover does not reinitialise cleanly when remounted in a live
// page, so every switch is a fresh load.
function Toggle({
	name,
	value,
	options,
}: {
	name: string;
	value: string;
	options: Record<string, string>;
}) {
	return (
		<div className="flex gap-1">
			{Object.keys(options).map((k) => {
				const url = new URL(location.href);
				url.searchParams.set(name, k);
				return (
					<a
						key={k}
						href={url.search}
						className={`rounded px-3 py-1 ${k === value ? "bg-white text-black" : "hover:bg-white/10"}`}
					>
						{options[k]}
					</a>
				);
			})}
		</div>
	);
}

const layoutKey = param("layout", Object.keys(layouts));
const objectKey = param("object", Object.keys(objects));
const layout = layouts[layoutKey];
const object = objects[objectKey];

function App() {
	const [manifest, setManifest] = useState<Manifest>();

	useEffect(() => {
		fetch(`${API}/${object.id}/manifest/v3`)
			.then((r) => r.json())
			.then(setManifest);
	}, []);

	const viewer = manifest && (
		<Clover manifest={manifest} object={object} layout={layout} />
	);

	return (
		<>
			<div className="sticky top-0 z-20 flex flex-wrap items-center gap-x-6 gap-y-2 bg-zinc-900 px-4 py-2 text-sm text-white">
				<Toggle
					name="layout"
					value={layoutKey}
					options={Object.fromEntries(
						Object.keys(layouts).map((k) => [k, layouts[k].name]),
					)}
				/>
				<Toggle
					name="object"
					value={objectKey}
					options={Object.fromEntries(
						Object.keys(objects).map((k) => [k, objects[k].label]),
					)}
				/>
				<span className="text-zinc-400">{layout.note}</span>
			</div>
			<header className="flex items-center justify-between bg-zinc-100 px-8 py-4">
				<div className="flex items-center gap-8 text-lg leading-tight">
					<span className="font-bold">
						de Young \<br />
						Legion of Honor
					</span>
					<span className="text-zinc-600">
						fine arts museums
						<br />
						of san francisco
					</span>
				</div>
				<nav className="flex gap-6 font-semibold">
					<a href="#top">Home</a>
					<a href="#top">Search</a>
				</nav>
			</header>
			{layout.split ? (
				<div className="grid gap-8 px-8 pt-6 lg:grid-cols-[2fr_1fr]">
					<div className="min-w-0">{viewer}</div>
					<FrontMatter object={object} />
				</div>
			) : (
				<>
					<div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 px-8 py-5">
						<h1 className="text-3xl font-semibold">
							{object.title}{" "}
							<span className="text-sm font-normal">{object.date}</span>
						</h1>
						<p className="font-medium">{object.artist}</p>
					</div>
					{viewer}
				</>
			)}
			<PageBody object={object} withFrontMatter={!layout.split} />
		</>
	);
}

createRoot(document.getElementById("app") as HTMLElement).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
