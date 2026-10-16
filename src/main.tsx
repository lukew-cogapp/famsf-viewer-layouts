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
	/** rightsstatements.org icon family and the statement it stands for. */
	rights: { icon: "InC" | "NoC" | "Other"; label: string };
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
		rights: { icon: "InC", label: "In Copyright" },
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
	album: {
		label: "Paris album: 36 images",
		id: "55456",
		title: "Views of Paris",
		date: "ca. 1887",
		artist: "Unidentified, French, active 19th century",
		medium: "album with seventeen mounted albumen photographs",
		details: [
			["Dimensions", "Object: 163 x 248 x 53 mm (6 7/16 x 9 3/4 x 2 1/16 in.)"],
			["Collection area", "Achenbach Foundation for Graphic Arts"],
			["Object type", "Artist's Book"],
			["Credit line", "Gift of Serge Millan"],
			["Accession number", "1989.3.13"],
		],
		department: "Achenbach Foundation for Graphic Arts",
		copyright: "Public domain",
		citation: "Gift of Serge Millan, 1989.3.13",
		download: true,
		rights: { icon: "NoC", label: "Public domain" },
		relatedLabel: "More from this collection",
		related: [
			[
				"Sainte-Chapelle, plate 28 from the album Vues",
				"1858",
				"4359202410950056",
			],
			[
				"Tuileries Palace, plate 6 of the album Vues",
				"1858",
				"109255_A050144_V1_hero",
			],
			["Le Pont St. Michel", "1909", "3306201408290028"],
			["Ossuaire des catacombes", "1862", "A046630_V1"],
			["Umbrella Handle (Hands)", "1932", "A378555_V1"],
			["Photogram", "1946", "2105200910440026"],
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
		rights: { icon: "Other", label: "Copyright Undetermined" },
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
	/**
	 * Where licence and download go. Unset: under the viewer. "caption": in the
	 * caption row. "rights": in Rights and citation, linked from the caption row.
	 */
	actions?: "caption" | "rights";
	pagerInline?: boolean;
	pagerLeft?: boolean;
};

const layouts: Record<string, Layout> = {
	current: {
		name: "Current",
		note: "Site options today: fixed 31.25rem canvas.",
		options: siteOptions,
		pagerLeft: true,
	},
	compact: {
		name: "Current, compact",
		note: "Current, with licence and download in the caption row so the thumbnail strip comes last.",
		options: siteOptions,
		actions: "caption",
		pagerLeft: true,
	},
	tall: {
		name: "Compact, tall",
		note: "Compact, with a taller canvas on big screens and the pager beside the thumbnails.",
		options: { ...siteOptions, canvasHeight: "min(70svh, 50rem)" },
		actions: "caption",
		pagerInline: true,
	},
	link: {
		name: "Image link",
		note: "Compact, tall, with a link from the caption row to download or request in Rights and citation.",
		options: { ...siteOptions, canvasHeight: "min(70svh, 50rem)" },
		actions: "rights",
		pagerInline: true,
	},
	split: {
		name: "Split",
		note: "Stock viewer in a two-thirds column; title, artist and medium beside it.",
		options: siteOptions,
		height: "calc(100svh - 14rem)",
		split: true,
	},
};

const slug = (text: string) => text.toLowerCase().replaceAll(" ", "-");
const RIGHTS_ID = slug("Rights and citation");

const param = <T extends string>(name: string, keys: T[]) => {
	const value = new URLSearchParams(location.search).get(name);
	return keys.find((k) => k === value) ?? keys[0];
};

function RightsIcon({
	object,
	className,
}: {
	object: ArtObject;
	className: string;
}) {
	return (
		<img
			src={`${import.meta.env.BASE_URL}rights/${object.rights.icon}.svg`}
			alt={object.rights.label}
			title={object.rights.label}
			className={className}
		/>
	);
}

function ImageActions({
	object,
	compact = false,
}: {
	object: ArtObject;
	compact?: boolean;
}) {
	const button = `shrink-0 rounded-full border border-black ${compact ? "px-5 py-1.5 text-sm" : "px-8 py-3"}`;
	return (
		<div className="flex shrink-0 items-center gap-4">
			<RightsIcon object={object} className={compact ? "size-8" : "size-12"} />
			<button type="button" className={button}>
				{object.download ? "Download" : "Request information"}
			</button>
		</div>
	);
}

/**
 * Shows the active canvas's summary directly under the image, above Clover's
 * thumbnail strip. Clover's only plugin slot is inside its toolbar, so this
 * renders into its own element placed after `.clover-viewer-painting`.
 *
 * Also names the zoomable viewport: Clover 3.17 gives it `role="img"` with no
 * accessible name (fixed upstream in 4.0).
 */
function CaptionPlugin({
	useViewerState,
	actions,
	title,
}: Plugin & { actions?: ReactNode; title: string }) {
	const { activeCanvas, openSeadragonViewer, vault } = useViewerState();
	const [slot, setSlot] = useState<HTMLElement>();
	const canvas = vault.get({ id: activeCanvas, type: "Canvas" }) as {
		label?: LangMap;
		summary?: LangMap;
	};

	useEffect(() => {
		openSeadragonViewer?.element?.setAttribute(
			"aria-label",
			[title, toText(canvas?.label)].filter(Boolean).join(", "),
		);
	}, [openSeadragonViewer, title, canvas]);

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

	const summary = toText(canvas?.summary);
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
			className={[
				layout.split
					? ""
					: "[&_.caption-row]:px-8 [&_.clover-viewer-media-wrapper]:px-8",
				layout.pagerInline ? "pager-inline" : "",
				layout.pagerLeft ? "pager-left" : "",
			].join(" ")}
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
									componentProps: {
										title: object.title,
										actions:
											layout.actions === "caption" ? (
												<ImageActions object={object} compact />
											) : layout.actions === "rights" ? (
												<a
													href={`#${RIGHTS_ID}`}
													className="flex shrink-0 items-center gap-2 text-sm underline underline-offset-4"
												>
													<RightsIcon object={object} className="size-6" />
													Use this image
												</a>
											) : undefined,
									},
								},
							},
						},
					]}
				/>
			</div>
			{!layout.actions && (
				<div className={`mt-4 ${layout.split ? "" : "px-8"}`}>
					<ImageActions object={object} />
				</div>
			)}
		</figure>
	);
}

function FrontMatter({
	object,
	isHeading = false,
}: {
	object: ArtObject;
	isHeading?: boolean;
}) {
	const Title = isHeading ? "h1" : "p";
	return (
		<div className="max-w-sm space-y-2">
			<Title className="text-xl font-semibold">{object.title}</Title>
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
		<details
			id={slug(summary)}
			className="group scroll-mt-20 border-t border-zinc-300"
		>
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
	withActions,
}: {
	object: ArtObject;
	withFrontMatter: boolean;
	withActions: boolean;
}) {
	return (
		<>
			<nav
				aria-label="Sections"
				className="sticky top-0 z-10 mt-12 flex gap-6 overflow-x-auto border-y border-zinc-200 bg-white px-8 py-3 text-sm"
			>
				{[
					"Object details",
					"Additional information",
					"Provenance",
					"Rights and citation",
				].map((s) => (
					<a
						key={s}
						href={`#${slug(s)}`}
						className="whitespace-nowrap hover:underline"
					>
						{s}
					</a>
				))}
			</nav>
			<div className="grid gap-10 px-8 py-12 lg:grid-cols-12">
				<div className="self-start lg:sticky lg:top-20 lg:col-span-4">
					{withFrontMatter && <FrontMatter object={object} />}
				</div>
				<div className="flex flex-col gap-16 lg:col-span-8">
					<section id={slug("Object details")} className="scroll-mt-20">
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
					<section id={RIGHTS_ID} className="scroll-mt-20">
						<h2 className="mb-6 text-3xl font-semibold">Rights and citation</h2>
						<p className="text-sm">{object.copyright}</p>
						<p className="mt-4 text-sm text-zinc-600">
							{object.artist}, <i>{object.title}</i>, {object.date}. Fine Arts
							Museums of San Francisco, {object.citation}.
						</p>
						{withActions && (
							<div className="mt-6">
								<ImageActions object={object} />
							</div>
						)}
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
		<div className="flex flex-wrap gap-1">
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
			<nav
				aria-label="Mockup layout and object"
				className="flex flex-wrap items-center gap-x-6 gap-y-2 bg-zinc-900 px-4 py-2 text-sm text-white"
			>
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
			</nav>
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
				<nav aria-label="Site" className="flex gap-6 font-semibold">
					<a href="#top">Home</a>
					<a href="#top">Search</a>
				</nav>
			</header>
			<main>
				{layout.split ? (
					<div className="grid gap-8 px-8 pt-6 lg:grid-cols-[2fr_1fr]">
						<div className="min-w-0">{viewer}</div>
						<FrontMatter object={object} isHeading />
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
				<PageBody
					object={object}
					withFrontMatter={!layout.split}
					withActions={layout.actions === "rights"}
				/>
			</main>
		</>
	);
}

createRoot(document.getElementById("app") as HTMLElement).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
